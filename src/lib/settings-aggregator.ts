// src/lib/settings-aggregator.ts
import { prisma } from '@/lib/prisma'

export interface BusinessSettings {
  businessId: string
  profile: BusinessProfile | null
  contentBlocks: ContentBlock[]
  monthlySpecials: MonthlySpecial[]
  templatePreferences: TemplatePreferences | null
  imageLibrary: ImageLibraryItem[]
}

export interface BusinessProfile {
  id?: string
  businessId: string
  brandVoice: string
  messageStyle: string
  voiceTone: string
  emergencyContact?: string
  afterHoursPhone?: string
  licenseInfo?: string
  certifications: string[]
  businessHours: any
  serviceAreas: string[]
  serviceTypes: string[]
  contentThemes: string[]
  approvedTemplates: string[]
}

export interface TemplatePreferences {
  id?: string
  businessId: string
  approvedTemplates: string[]
  contentThemes: string[]
  autoPostSettings?: {
    templatePreferences?: {
      [templateType: string]: {
        isEnabled: boolean
        tone: string
        includePromotions: boolean
        maxLength: number
        callToActionStyle: string
      }
    }
  }
}

export interface ContentBlock {
  id: string
  businessId: string
  name: string
  type: string
  category: string
  content: string
  shortCode?: string
  isActive: boolean
  sortOrder: number
  usageCount: number
}

export interface MonthlySpecial {
  id: string
  businessId: string
  month: number
  year: number
  hvac: string[]
  plumbing: string[]
  electrical: string[]
  all: string[]
  createdAt: string
  updatedAt: string
}

export interface ImageLibraryItem {
  id: string
  businessId: string
  fileName: string
  originalName: string
  fileSize: number
  mimeType: string
  dimensions: { width: number; height: number }
  cloudUrl: string
  thumbnailUrl?: string
  platformUrls: {
    facebook?: { landscape?: string; square?: string }
    instagram?: { square?: string; portrait?: string }
    twitter?: { single?: string; multi?: string }
    google?: { square?: string }
  }
  aiTags: string[]
  aiConfidence: any
  aiDescription?: string
  manualTags: string[]
  category?: string
  subcategory?: string
  isActive: boolean
  usageCount: number
  lastUsed?: string
  uploadedAt: string
}

class SettingsAggregator {
  private cache = new Map<string, { data: BusinessSettings; timestamp: number }>()
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

  /**
   * Get all settings for a business with caching
   */
  async getBusinessSettings(businessId: string): Promise<BusinessSettings> {
    // Check cache first
    const cached = this.cache.get(businessId)
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      return cached.data
    }

    try {
      // Fetch all settings in parallel for efficiency
      const [
        business,
        profile,
        contentBlocks,
        monthlySpecials,
        templatePreferences,
        imageLibrary
      ] = await Promise.all([
        prisma.business.findUnique({ where: { id: businessId } }),
        this.getBusinessProfile(businessId),
        this.getContentBlocks(businessId),
        this.getMonthlySpecials(businessId),
        this.getTemplatePreferences(businessId),
        this.getImageLibrary(businessId)
      ])

      if (!business) {
        throw new Error(`Business not found: ${businessId}`)
      }

      const settings: BusinessSettings = {
        businessId,
        profile,
        contentBlocks,
        monthlySpecials,
        templatePreferences,
        imageLibrary
      }

      // Cache the result
      this.cache.set(businessId, {
        data: settings,
        timestamp: Date.now()
      })

      return settings
    } catch (error) {
      console.error(`Failed to fetch settings for business ${businessId}:`, error)
      throw error
    }
  }

  /**
   * Get multiple business settings at once
   */
  async getMultipleBusinessSettings(businessIds: string[]): Promise<Record<string, BusinessSettings>> {
    const results: Record<string, BusinessSettings> = {}
    
    // Use Promise.allSettled to handle individual failures gracefully
    const settingsPromises = businessIds.map(async (businessId) => {
      try {
        const settings = await this.getBusinessSettings(businessId)
        return { businessId, settings, success: true }
      } catch (error) {
        console.error(`Failed to load settings for ${businessId}:`, error)
        return { businessId, error, success: false }
      }
    })

    const settingsResults = await Promise.allSettled(settingsPromises)
    
    settingsResults.forEach((result) => {
      if (result.status === 'fulfilled' && result.value.success && result.value.settings) {
        results[result.value.businessId] = result.value.settings
      }
    })

    return results
  }

  /**
   * Get business profile with defaults if none exists
   */
  private async getBusinessProfile(businessId: string): Promise<BusinessProfile | null> {
    try {
      const profile = await prisma.businessProfile.findUnique({
        where: { businessId }
      })

      return profile as BusinessProfile | null
    } catch (error) {
      console.error(`Failed to fetch business profile for ${businessId}:`, error)
      return null
    }
  }

  /**
   * Get active content blocks for a business
   */
  private async getContentBlocks(businessId: string): Promise<ContentBlock[]> {
    try {
      const blocks = await prisma.contentBlock.findMany({
        where: { 
          businessId,
          isActive: true
        },
        orderBy: { sortOrder: 'asc' }
      })

      return blocks as ContentBlock[]
    } catch (error) {
      console.error(`Failed to fetch content blocks for ${businessId}:`, error)
      return []
    }
  }

  /**
   * Get monthly specials for current year
   */
  private async getMonthlySpecials(businessId: string): Promise<MonthlySpecial[]> {
    try {
      const currentYear = new Date().getFullYear()
      const specials = await prisma.monthlySpecial.findMany({
        where: { 
          businessId,
          year: currentYear
        },
        orderBy: { month: 'asc' }
      })

      return specials.map(special => ({
        ...special,
        createdAt: special.createdAt.toISOString(),
        updatedAt: special.updatedAt.toISOString()
      })) as MonthlySpecial[]
    } catch (error) {
      console.error(`Failed to fetch monthly specials for ${businessId}:`, error)
      return []
    }
  }

  /**
   * Get template preferences with defaults
   */
  private async getTemplatePreferences(businessId: string): Promise<TemplatePreferences | null> {
    try {
      const preferences = await prisma.businessProfile.findUnique({
        where: { businessId },
        select: {
          id: true,
          businessId: true,
          approvedTemplates: true,
          contentThemes: true
        }
      })

      if (!preferences) {
        return null
      }

      return {
        id: preferences.id,
        businessId: preferences.businessId,
        approvedTemplates: preferences.approvedTemplates || [],
        contentThemes: preferences.contentThemes || [],
        autoPostSettings: {
          templatePreferences: {}
        }
      } as TemplatePreferences
    } catch (error) {
      console.error(`Failed to fetch template preferences for ${businessId}:`, error)
      return null
    }
  }

  /**
   * Get active images from library
   */
  private async getImageLibrary(businessId: string): Promise<ImageLibraryItem[]> {
    try {
      const images = await prisma.imageLibrary.findMany({
        where: { 
          businessId,
          isActive: true
        },
        orderBy: { uploadedAt: 'desc' },
        take: 50 // Limit to most recent 50 images for performance
      })

      return images.map(image => ({
        ...image,
        dimensions: image.dimensions as { width: number; height: number },
        uploadedAt: image.uploadedAt.toISOString(),
        lastUsed: image.lastUsed?.toISOString()
      })) as unknown as ImageLibraryItem[]
    } catch (error) {
      console.error(`Failed to fetch image library for ${businessId}:`, error)
      return []
    }
  }

  /**
   * Clear cache for a specific business or all businesses
   */
  clearCache(businessId?: string): void {
    if (businessId) {
      this.cache.delete(businessId)
    } else {
      this.cache.clear()
    }
  }

  /**
   * Validate business settings for content generation
   */
  validateBusinessSettings(settings: BusinessSettings): {
    isValid: boolean
    warnings: string[]
    errors: string[]
  } {
    const warnings: string[] = []
    const errors: string[] = []

    // Check business profile
    if (!settings.profile) {
      errors.push('Business profile is required for content generation')
    } else {
      if (!settings.profile.brandVoice) {
        warnings.push('Brand voice not set - using default voice')
      }
      if (!settings.profile.messageStyle) {
        warnings.push('Message style not set - using professional style')
      }
      if (settings.profile.approvedTemplates.length === 0) {
        warnings.push('No approved templates - all templates will be available')
      }
    }

    // Check monthly specials
    if (settings.monthlySpecials.length === 0) {
      warnings.push('No monthly specials configured for current year')
    }

    // Check content blocks
    if (settings.contentBlocks.length === 0) {
      warnings.push('No content blocks configured - missing reusable content')
    }

    // Check image library
    if (settings.imageLibrary.length === 0) {
      warnings.push('No images in library - posts will be text-only')
    }

    return {
      isValid: errors.length === 0,
      warnings,
      errors
    }
  }

  /**
   * Get content blocks by type for easy injection
   */
  getContentBlocksByType(settings: BusinessSettings): Record<string, ContentBlock[]> {
    const blocksByType: Record<string, ContentBlock[]> = {}
    
    settings.contentBlocks.forEach(block => {
      if (!blocksByType[block.type]) {
        blocksByType[block.type] = []
      }
      blocksByType[block.type].push(block)
    })

    return blocksByType
  }

  /**
   * Get relevant monthly specials for a service type
   */
  getRelevantSpecials(
    settings: BusinessSettings, 
    month: number, 
    serviceType?: 'hvac' | 'plumbing' | 'electrical' | 'all'
  ): string[] {
    const monthSpecials = settings.monthlySpecials.find(s => s.month === month)
    if (!monthSpecials) return []

    if (!serviceType) {
      // Return all specials
      return [
        ...monthSpecials.hvac,
        ...monthSpecials.plumbing,
        ...monthSpecials.electrical,
        ...monthSpecials.all
      ]
    }

    return monthSpecials[serviceType] || []
  }

  /**
   * Find relevant images based on content analysis
   */
  getRelevantImages(
    settings: BusinessSettings,
    contentType: string,
    keywords: string[] = []
  ): ImageLibraryItem[] {
    const relevantImages = settings.imageLibrary.filter(image => {
      // Check category match
      if (image.category === contentType) return true
      
      // Check AI tags for keyword matches
      const allTags = [...image.aiTags, ...image.manualTags].map(tag => tag.toLowerCase())
      const hasKeywordMatch = keywords.some(keyword => 
        allTags.some(tag => tag.includes(keyword.toLowerCase()))
      )
      
      return hasKeywordMatch
    })

    // Sort by usage count (less used images first) to promote variety
    return relevantImages.sort((a, b) => a.usageCount - b.usageCount)
  }
}

// Export singleton instance
export const settingsAggregator = new SettingsAggregator()