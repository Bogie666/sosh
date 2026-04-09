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
  excludeImageIds?: string[]
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
  // Use custom daily theme from business settings if available, else fall back to defaults
  const customTheme = ctx.customDailyThemes?.[req.day.toLowerCase()]
  const defaultTheme = DailyThemeService.getDailyTheme(req.day)
  const dailyTheme = customTheme
    ? { theme: customTheme.theme, focus: customTheme.focus, emoji: customTheme.emoji, contentStyle: customTheme.contentStyle, templates: defaultTheme?.templates || [], description: customTheme.focus, promotionWeight: defaultTheme?.promotionWeight || 50 }
    : defaultTheme
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
7. Create content that is ready to publish immediately
8. Do NOT mention the day of the week in the post unless it's truly natural and relevant. The content themes below are internal guidance for you, not text to include in the post.`)

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
    // Frame themes as internal direction, not content to include
    parts.push(`\nINTERNAL CONTENT DIRECTION (do not put these labels in the post):
Topic angle: ${dailyTheme.focus}
Tone: ${dailyTheme.contentStyle}`)
  }

  // Give the AI a variety of angles to choose from instead of always defaulting to season
  const contentAngles = getContentAngleVariety(biz, season, req.day)
  parts.push(`\n${contentAngles}`)

  if (req.postDate) {
    const d = new Date(req.postDate)
    parts.push(`Post date: ${d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`)
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

  if (specials.length === 0) {
    // No specials configured - give the AI general promotional guidance instead
    const biz = ctx.business
    const serviceList = biz.serviceTypes.length > 0 ? biz.serviceTypes.join(', ') : 'our services'
    return `PROMOTIONAL ANGLE:
No specific monthly specials are set right now, so create general promotional content. Ideas:
- Highlight the value and quality of ${biz.displayName}'s ${serviceList}
- Emphasize what sets the business apart (reliability, expertise, speed, customer care)
- Mention free estimates, financing options, or satisfaction guarantees if relevant
- Create urgency around why acting now matters (busy season, aging equipment, peace of mind)
- Encourage the reader to call or book now${biz.tagline ? `\n- Reinforce the brand promise: "${biz.tagline}"` : ''}

Keep it natural and compelling - sell the benefit, not the feature.`
  }

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

/**
 * Generate a varied content angle so posts don't all sound the same.
 * Uses the day of week to rotate through different angles deterministically,
 * so a batch of 5 posts gets 5 different approaches.
 */
function getContentAngleVariety(biz: BusinessContext, season: string, day: string): string {
  const dayIndex = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    .indexOf(day.toLowerCase())

  // Pool of diverse content angles - the AI picks up on whichever one it gets
  const angles = [
    // Expertise & trust
    `CONTENT ANGLE: Highlight what makes ${biz.displayName} the experts. Focus on experience, training, or a specific skill that builds trust. Do NOT mention the season.`,
    // Customer benefit
    `CONTENT ANGLE: Focus on a specific customer benefit or problem you solve. Paint a picture of the comfort, safety, or savings the customer gets. Season is ${season} but don't lead with it.`,
    // Urgency / availability
    `CONTENT ANGLE: Create a sense of urgency or timeliness - why should someone act now? Mention availability, response times, or limited capacity. Don't reference the season directly.`,
    // Behind the scenes / team
    `CONTENT ANGLE: Show the human side - the team, the work ethic, or what a typical day looks like. Make the reader feel connected to the people behind the business. No seasonal references needed.`,
    // Education / tips
    `CONTENT ANGLE: Share a genuinely useful tip or piece of advice the reader can act on. Position ${biz.displayName} as the knowledgeable resource. You may briefly reference ${season} weather if the tip is weather-related, but it shouldn't dominate the post.`,
    // Social proof / results
    `CONTENT ANGLE: Emphasize results, reliability, or reputation. Reference the kind of outcomes customers experience. Do NOT mention the season.`,
    // Community / local
    `CONTENT ANGLE: Connect with the local community. Reference serving the ${biz.serviceAreas.length > 0 ? biz.serviceAreas.slice(0, 2).join(' and ') : 'local'} area, being a neighbor, or community involvement. No seasonal angle.`
  ]

  // Use day index to pick an angle, cycling through the pool
  const selectedAngle = angles[Math.abs(dayIndex) % angles.length]

  return selectedAngle
}
