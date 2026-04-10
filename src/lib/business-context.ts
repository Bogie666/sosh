// src/lib/business-context.ts
// Unified business context service - single source of truth for all business data
// No hardcoded fallbacks. Everything comes from the database.

import { prisma } from '@/lib/prisma'

export interface BusinessContext {
  id: string
  name: string
  displayName: string
  type: string
  phone: string
  website: string
  brandVoice: string
  tagline: string
  messageStyle: string
  voiceTone: string
  serviceTypes: string[]
  serviceAreas: string[]
  certifications: string[]
  emergencyContact: string
  afterHoursPhone: string
  licenseInfo: string
  businessHours: Record<string, any> | null
  contentThemes: string[]
  seasonalSettings: Record<string, any> | null
  holidaySettings: Record<string, any> | null
  postingSchedule: Record<string, any> | null
  aiGuidelines: string
}

export interface ContentBlockSet {
  phone: string[]
  cta: string[]
  hours: string[]
  licensing: string[]
  address: string[]
  custom: string[]
  [key: string]: string[]
}

export interface MonthlySpecialSet {
  month: number
  year: number
  hvac: string[]
  plumbing: string[]
  electrical: string[]
  all: string[]
}

export interface ImageAsset {
  id: string
  cloudUrl: string
  thumbnailUrl: string | null
  platformUrls: {
    facebook?: { landscape?: string; square?: string }
    instagram?: { square?: string; portrait?: string }
    twitter?: { single?: string; multi?: string }
    google?: { square?: string }
  }
  aiTags: string[]
  aiDescription: string | null
  manualTags: string[]
  category: string | null
  subcategory: string | null
  usageCount: number
  lastUsed: Date | null
  originalName: string
}

export interface CustomDailyTheme {
  theme: string
  focus: string
  emoji: string
  contentStyle: string
}

export interface ContentStrategy {
  contentStrategy: 'conservative' | 'balanced' | 'aggressive'
  enabledDays: string[]
  promotionFocus: { primary: string; secondary: string }
  seasonalAdjustments: boolean
}

export interface FullBusinessContext {
  business: BusinessContext
  contentBlocks: ContentBlockSet
  monthlySpecials: MonthlySpecialSet[]
  images: ImageAsset[]
  recentPostThemes: string[]
  customDailyThemes: Record<string, CustomDailyTheme> | null
  contentStrategy: ContentStrategy | null
}

// Cache with TTL
const contextCache = new Map<string, { data: FullBusinessContext; expires: number }>()
const CACHE_TTL = 3 * 60 * 1000 // 3 minutes

/**
 * Load complete business context from database.
 * This is the ONLY place business data should be loaded for AI generation.
 */
export async function loadBusinessContext(businessId: string): Promise<FullBusinessContext> {
  const cached = contextCache.get(businessId)
  if (cached && cached.expires > Date.now()) {
    return cached.data
  }

  const [business, profile, contentBlocks, specials, images, recentPosts] = await Promise.all([
    prisma.business.findUnique({ where: { id: businessId } }),
    prisma.businessProfile.findUnique({ where: { businessId } }),
    prisma.contentBlock.findMany({
      where: { businessId, isActive: true },
      orderBy: { sortOrder: 'asc' }
    }),
    prisma.monthlySpecial.findMany({
      where: { businessId, year: new Date().getFullYear() },
      orderBy: { month: 'asc' }
    }),
    prisma.imageLibrary.findMany({
      where: { businessId, isActive: true },
      orderBy: { uploadedAt: 'desc' },
      take: 100
    }),
    prisma.postHistory.findMany({
      where: { businessId, postedAt: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) } },
      orderBy: { postedAt: 'desc' },
      take: 30,
      select: { content: true, platform: true, postedAt: true }
    })
  ])

  if (!business) {
    throw new Error(`Business not found: ${businessId}`)
  }

  const ctx: FullBusinessContext = {
    business: {
      id: business.id,
      name: business.name,
      displayName: business.displayName,
      type: business.type,
      phone: business.phone || '',
      website: business.website || '',
      brandVoice: profile?.brandVoice || business.brandVoice || '',
      tagline: business.tagline || '',
      messageStyle: profile?.messageStyle || 'professional',
      voiceTone: profile?.voiceTone || 'professional',
      serviceTypes: profile?.serviceTypes || inferServiceTypes(business.type),
      serviceAreas: profile?.serviceAreas || [],
      certifications: profile?.certifications || [],
      emergencyContact: profile?.emergencyContact || business.phone || '',
      afterHoursPhone: profile?.afterHoursPhone || '',
      licenseInfo: profile?.licenseInfo || '',
      businessHours: profile?.businessHours as Record<string, any> | null,
      contentThemes: profile?.contentThemes || [],
      seasonalSettings: profile?.seasonalSettings as Record<string, any> | null,
      holidaySettings: profile?.holidaySettings as Record<string, any> | null,
      postingSchedule: profile?.postingSchedule as Record<string, any> | null,
      aiGuidelines: ((profile?.autoPostSettings as any)?.aiGuidelines) || '',
    },
    contentBlocks: organizeBlocks(contentBlocks),
    monthlySpecials: specials.map((s: any) => ({
      month: s.month,
      year: s.year,
      hvac: s.hvac,
      plumbing: s.plumbing,
      electrical: s.electrical,
      all: s.all
    })),
    images: images.map((img: any) => ({
      id: img.id,
      cloudUrl: img.cloudUrl,
      thumbnailUrl: img.thumbnailUrl,
      platformUrls: img.platformUrls as ImageAsset['platformUrls'],
      aiTags: img.aiTags,
      aiDescription: img.aiDescription,
      manualTags: img.manualTags,
      category: img.category,
      subcategory: img.subcategory,
      usageCount: img.usageCount,
      lastUsed: img.lastUsed,
      originalName: img.originalName
    })),
    recentPostThemes: extractRecentThemes(recentPosts.map((p: any) => p.content)),
    customDailyThemes: extractCustomThemes(profile),
    contentStrategy: extractContentStrategy(profile)
  }

  contextCache.set(businessId, { data: ctx, expires: Date.now() + CACHE_TTL })
  return ctx
}

/**
 * Load multiple business contexts at once
 */
export async function loadMultipleBusinessContexts(
  businessIds: string[]
): Promise<Record<string, FullBusinessContext>> {
  const results: Record<string, FullBusinessContext> = {}
  const promises = businessIds.map(async id => {
    try {
      results[id] = await loadBusinessContext(id)
    } catch (err) {
      console.error(`Failed to load context for ${id}:`, err)
    }
  })
  await Promise.all(promises)
  return results
}

/**
 * Get specials for a specific month, with fallback to adjacent months
 */
export function getSpecialsForMonth(
  ctx: FullBusinessContext,
  month: number,
  serviceType?: string
): string[] {
  const monthSpecials = ctx.monthlySpecials.find(s => s.month === month)
  if (!monthSpecials) return []

  if (serviceType && serviceType !== 'all') {
    const typeSpecials = monthSpecials[serviceType as keyof MonthlySpecialSet]
    if (Array.isArray(typeSpecials)) {
      return [...typeSpecials, ...monthSpecials.all]
    }
  }

  return [
    ...monthSpecials.hvac,
    ...monthSpecials.plumbing,
    ...monthSpecials.electrical,
    ...monthSpecials.all
  ]
}

/**
 * Get the best image URL for a specific platform
 */
export function getImageUrlForPlatform(image: ImageAsset, platform: string): string {
  const urls = image.platformUrls
  switch (platform) {
    case 'facebook':
      return urls.facebook?.landscape || urls.facebook?.square || image.cloudUrl
    case 'instagram':
      return urls.instagram?.square || urls.instagram?.portrait || image.cloudUrl
    case 'twitter':
      return urls.twitter?.single || urls.twitter?.multi || image.cloudUrl
    case 'google':
      return urls.google?.square || image.cloudUrl
    default:
      return image.cloudUrl
  }
}

/** Clear cache for a business or all */
export function clearBusinessContextCache(businessId?: string) {
  if (businessId) {
    contextCache.delete(businessId)
  } else {
    contextCache.clear()
  }
}

// --- Internal helpers ---

function inferServiceTypes(businessType: string): string[] {
  if (businessType === 'all') return ['hvac', 'plumbing', 'electrical']
  return businessType.split(',').map(t => t.trim()).filter(Boolean)
}

function organizeBlocks(blocks: any[]): ContentBlockSet {
  const result: ContentBlockSet = {
    phone: [], cta: [], hours: [], licensing: [], address: [], custom: []
  }
  for (const block of blocks) {
    const type = block.type || 'custom'
    if (!result[type]) result[type] = []
    result[type].push(block.content)
  }
  return result
}

function extractRecentThemes(contents: string[]): string[] {
  const themes: string[] = []
  const themeKeywords: Record<string, string[]> = {
    'maintenance': ['maintenance', 'tune-up', 'tune up', 'check-up', 'inspection'],
    'emergency': ['emergency', '24/7', 'urgent', 'same-day'],
    'seasonal': ['summer', 'winter', 'spring', 'fall', 'season', 'weather'],
    'promotion': ['special', 'discount', 'offer', 'deal', 'save', '%', '$ off'],
    'education': ['tip', 'did you know', 'learn', 'guide', 'how to'],
    'testimonial': ['review', 'customer', 'testimonial', 'star', 'feedback'],
    'team': ['team', 'technician', 'staff', 'family', 'meet'],
    'safety': ['safety', 'carbon monoxide', 'fire', 'protect', 'detector']
  }

  for (const content of contents) {
    const lower = content.toLowerCase()
    for (const [theme, keywords] of Object.entries(themeKeywords)) {
      if (keywords.some(kw => lower.includes(kw))) {
        themes.push(theme)
        break // One theme per post
      }
    }
  }

  return themes
}

function extractCustomThemes(profile: any): Record<string, CustomDailyTheme> | null {
  if (!profile?.autoPostSettings) return null
  const settings = profile.autoPostSettings as any
  const customThemes = settings?.dailyThemeSettings?.customThemes
  if (!customThemes || typeof customThemes !== 'object') return null
  if (Object.keys(customThemes).length === 0) return null
  return customThemes
}

function extractContentStrategy(profile: any): ContentStrategy | null {
  if (!profile?.autoPostSettings) return null
  const dts = (profile.autoPostSettings as any)?.dailyThemeSettings
  if (!dts) return null
  return {
    contentStrategy: dts.contentStrategy || 'balanced',
    enabledDays: dts.enabledDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    promotionFocus: dts.promotionFocus || { primary: 'wednesday', secondary: 'monday' },
    seasonalAdjustments: dts.seasonalAdjustments ?? true
  }
}
