// src/lib/prompt-builder.ts
// Intelligent AI prompt builder that deeply integrates business context.
// Industry-agnostic - works for any business type, not just HVAC/plumbing/electrical.

import {
  FullBusinessContext,
  BusinessContext,
  getSpecialsForMonth,
  ImageAsset
} from './business-context'
import { getPlatformSpec, getPlatformSpecsForPrompt } from './platform-specs'
import { DAILY_THEMES, CONTENT_STRATEGIES, DailyThemeService } from './daily-theme-constants'

export interface ContentGenerationRequest {
  businessId: string
  platform: string
  day: string
  month: number
  year?: number
  postDate?: string
  contentType?: string
  includeSpecials: boolean
  includeImages: boolean
  includeContentBlocks: boolean
  customPrompt?: string
  excludeThemes?: string[]
  serviceTypeFocus?: string
}

interface PromptParts {
  systemPrompt: string
  userPrompt: string
  maxTokens: number
  temperature: number
}

/**
 * Build a complete system + user prompt pair for content generation.
 * The system prompt establishes the AI's persona based on the business.
 * The user prompt contains the specific request with all context.
 */
export function buildContentPrompt(
  ctx: FullBusinessContext,
  req: ContentGenerationRequest
): PromptParts {
  const biz = ctx.business
  const spec = getPlatformSpec(req.platform)
  const dailyTheme = DailyThemeService.getDailyTheme(req.day)
  const season = getSeason(req.month)

  // --- System prompt: shaped by the business's actual voice ---
  const systemPrompt = buildSystemPrompt(biz)

  // --- User prompt: the specific content request ---
  const sections: string[] = []

  // 1. Core request
  sections.push(buildCoreRequest(biz, req, dailyTheme, season))

  // 2. Platform requirements
  sections.push(getPlatformSpecsForPrompt(req.platform))

  // 3. Monthly specials
  if (req.includeSpecials) {
    const specialsSection = buildSpecialsSection(ctx, req)
    if (specialsSection) sections.push(specialsSection)
  }

  // 4. Content blocks (contact info, CTAs, etc.)
  if (req.includeContentBlocks) {
    const blocksSection = buildContentBlocksSection(ctx)
    if (blocksSection) sections.push(blocksSection)
  }

  // 5. Image context - tell the AI what images are actually available
  if (req.includeImages) {
    const imageSection = buildImageContextSection(ctx, req)
    if (imageSection) sections.push(imageSection)
  }

  // 6. Content freshness - avoid repeating recent themes
  const freshnessSection = buildFreshnessSection(ctx, req)
  if (freshnessSection) sections.push(freshnessSection)

  // 7. Final output rules
  sections.push(buildOutputRules(biz, spec))

  return {
    systemPrompt,
    userPrompt: sections.join('\n\n---\n\n'),
    maxTokens: spec.maxTokens,
    temperature: 0.8
  }
}

/**
 * Build a prompt for review responses that uses full business context.
 */
export function buildReviewResponsePrompt(
  ctx: FullBusinessContext,
  review: {
    reviewerName: string
    rating: number
    content: string
  }
): PromptParts {
  const biz = ctx.business
  const firstName = review.reviewerName.split(' ')[0] || 'there'
  const isPositive = review.rating >= 4
  const isNegative = review.rating <= 2

  const systemPrompt = `You are the voice of ${biz.displayName}. You respond to customer reviews in a way that reflects the brand.

Brand voice: ${biz.brandVoice || 'Professional and friendly'}
Tone: ${biz.voiceTone || 'professional'}
Style: ${biz.messageStyle || 'professional'}

Guidelines:
- Sound like a real person who works at ${biz.displayName}, not a corporate bot
- Use the customer's first name naturally
- Keep responses to 2-3 sentences maximum
- Be genuine and warm, never formulaic
- Never include signatures, formal closings, or contact info templates
- Never start with "Dear"
- Match the brand's personality in every word`

  let approach = ''
  if (isPositive) {
    approach = `This is a positive ${review.rating}-star review. Express genuine gratitude. Reference something specific from their review to show you actually read it. Keep it brief and authentic.`
  } else if (isNegative) {
    approach = `This is a negative ${review.rating}-star review. Acknowledge their specific concern genuinely. Apologize briefly if warranted. Offer to make it right without being defensive. Show you care about their experience.`
  } else {
    approach = `This is a neutral ${review.rating}-star review. Thank them warmly. Address any specific points they raised. Invite them to reach out if there's anything you can improve.`
  }

  const userPrompt = `Write a reply to this customer review for ${biz.displayName}:

Customer: ${firstName}
Rating: ${review.rating}/5
Review: "${review.content || 'No comment provided'}"

${approach}

${biz.tagline ? `Remember the brand tagline: "${biz.tagline}" - let this spirit guide your response.` : ''}

Write ONLY the response text. No labels, headers, or metadata.`

  return {
    systemPrompt,
    userPrompt,
    maxTokens: 200,
    temperature: 0.7
  }
}

// --- Internal prompt section builders ---

function buildSystemPrompt(biz: BusinessContext): string {
  const serviceDescription = biz.serviceTypes.length > 0
    ? biz.serviceTypes.join(', ')
    : biz.type

  const parts = [
    `You are the social media voice of ${biz.displayName}, a ${serviceDescription} company.`
  ]

  if (biz.brandVoice) {
    parts.push(`\nYour brand voice: ${biz.brandVoice}`)
  }

  if (biz.tagline) {
    parts.push(`Brand tagline: "${biz.tagline}" - this captures the essence of who you are.`)
  }

  parts.push(`\nTone: ${biz.voiceTone || 'professional'}
Writing style: ${biz.messageStyle || 'professional'}`)

  if (biz.serviceAreas.length > 0) {
    parts.push(`You serve: ${biz.serviceAreas.join(', ')}`)
  }

  if (biz.certifications.length > 0) {
    parts.push(`Certifications: ${biz.certifications.join(', ')}`)
  }

  parts.push(`\nCritical rules:
1. Return ONLY the final post content - no headers, labels, or metadata
2. Use plain text with emojis - no markdown formatting (**bold**, *italic*)
3. Never use placeholder text like [Your Number] or [Company Name]
4. Never add suggestions like "Feel free to adjust..."
5. Include real contact information naturally when appropriate
6. Every post should reflect the brand voice described above
7. Create content that is ready to publish immediately`)

  return parts.join('\n')
}

function buildCoreRequest(
  biz: BusinessContext,
  req: ContentGenerationRequest,
  dailyTheme: any,
  season: string
): string {
  const parts = [`Create a ${req.platform} post for ${biz.displayName}.`]

  if (req.customPrompt) {
    parts.push(`\nSpecific request: ${req.customPrompt}`)
  }

  if (dailyTheme) {
    parts.push(`\nContent theme: ${dailyTheme.theme} ${dailyTheme.emoji}
Focus: ${dailyTheme.focus}
Style: ${dailyTheme.contentStyle}`)
  }

  parts.push(`Season: ${season}`)

  if (req.postDate) {
    const d = new Date(req.postDate)
    parts.push(`Post date: ${d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}`)
  }

  // Business identity
  parts.push(`\nBusiness details:
- Name: ${biz.displayName} (${biz.name})
- Phone: ${biz.phone}
- Website: ${biz.website}
- Services: ${biz.serviceTypes.join(', ')}${biz.serviceAreas.length > 0 ? `\n- Service areas: ${biz.serviceAreas.join(', ')}` : ''}${biz.tagline ? `\n- Tagline: "${biz.tagline}"` : ''}`)

  return parts.join('\n')
}

function buildSpecialsSection(ctx: FullBusinessContext, req: ContentGenerationRequest): string | null {
  const specials = getSpecialsForMonth(ctx, req.month, req.serviceTypeFocus)
  if (specials.length === 0) return null

  // Pick 1-2 specials, rotating based on day to avoid repetition
  const dayIndex = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(req.day.toLowerCase())
  const startIndex = dayIndex >= 0 ? dayIndex % specials.length : 0
  const selected = specials.slice(startIndex, startIndex + 2)
  if (selected.length < 2 && specials.length > 1) {
    selected.push(specials[(startIndex + 1) % specials.length])
  }

  return `PROMOTIONAL SPECIALS - Include at least one naturally in the post:
${selected.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Weave the special into the content naturally - don't just paste it at the end. Make the reader feel they're getting an insider deal.`
}

function buildContentBlocksSection(ctx: FullBusinessContext): string | null {
  const blocks = ctx.contentBlocks
  const hasContent = Object.values(blocks).some(arr => arr.length > 0)
  if (!hasContent) return null

  const parts = ['Available contact and business information to use naturally:']

  if (blocks.phone.length > 0) parts.push(`Phone: ${blocks.phone[0]}`)
  if (blocks.cta.length > 0) parts.push(`Call-to-action options: ${blocks.cta.join(' | ')}`)
  if (blocks.hours.length > 0) parts.push(`Hours: ${blocks.hours[0]}`)
  if (blocks.licensing.length > 0) parts.push(`Credentials: ${blocks.licensing[0]}`)
  if (blocks.address.length > 0) parts.push(`Address: ${blocks.address[0]}`)

  return parts.join('\n')
}

function buildImageContextSection(ctx: FullBusinessContext, req: ContentGenerationRequest): string | null {
  if (ctx.images.length === 0) return null

  // Give the AI a summary of available images so it can write content that pairs well
  const categories = new Map<string, number>()
  const topDescriptions: string[] = []

  for (const img of ctx.images.slice(0, 20)) {
    const cat = img.category || 'general'
    categories.set(cat, (categories.get(cat) || 0) + 1)
    if (img.aiDescription && topDescriptions.length < 5) {
      topDescriptions.push(img.aiDescription)
    }
  }

  const categoryList = Array.from(categories.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([cat, count]) => `${cat} (${count})`)
    .join(', ')

  return `IMAGE LIBRARY CONTEXT:
The post will be paired with a photo from our library. Write content that pairs well with professional service imagery.
Available image categories: ${categoryList}
${topDescriptions.length > 0 ? `\nSample image descriptions:\n${topDescriptions.map(d => `- ${d}`).join('\n')}` : ''}

Write your content so it complements visual imagery. Reference the work, team, or results shown rather than describing something we don't have a photo of.`
}

function buildFreshnessSection(ctx: FullBusinessContext, req: ContentGenerationRequest): string | null {
  if (ctx.recentPostThemes.length === 0) return null

  // Count recent theme frequency
  const freq = new Map<string, number>()
  for (const theme of ctx.recentPostThemes) {
    freq.set(theme, (freq.get(theme) || 0) + 1)
  }

  const overusedThemes = Array.from(freq.entries())
    .filter(([, count]) => count >= 3)
    .map(([theme]) => theme)

  // Also check excludeThemes from request
  const allExcluded = [...overusedThemes, ...(req.excludeThemes || [])]
  if (allExcluded.length === 0) return null

  return `CONTENT FRESHNESS:
The following themes have been used frequently in recent posts. Avoid these angles and find a fresh approach:
${allExcluded.map(t => `- ${t}`).join('\n')}

Bring a new perspective or angle that hasn't been covered recently.`
}

function buildOutputRules(biz: BusinessContext, spec: any): string {
  const rules = [
    `MANDATORY OUTPUT RULES:`,
    `- Use EXACTLY this phone number if included: ${biz.phone}`,
    `- Use EXACTLY this website if included: ${biz.website}`,
    `- Use EXACTLY this business name: ${biz.displayName}`,
    `- Match the brand voice: ${biz.voiceTone}, ${biz.messageStyle}`,
    `- Stay within ${spec.charLimit} characters (aim for ${spec.recommendedLength})`,
    `- Return ONLY the post content. No labels, headers, or commentary.`
  ]

  return rules.join('\n')
}

function getSeason(month: number): string {
  if (month >= 2 && month <= 4) return 'Spring'
  if (month >= 5 && month <= 7) return 'Summer'
  if (month >= 8 && month <= 10) return 'Fall'
  return 'Winter'
}
