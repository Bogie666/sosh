// src/lib/ai-service.ts
// Unified AI service that uses business context for all generation.
// No hardcoded business data. Everything flows from the database through business-context.ts.

import { loadBusinessContext, FullBusinessContext, getImageUrlForPlatform } from './business-context'
import { buildContentPrompt, buildReviewResponsePrompt, ContentGenerationRequest } from './prompt-builder'
import { getPlatformSpec } from './platform-specs'
import { selectBestImage, ImageSelectionResult } from './image-selector'

export interface GenerationResult {
  success: boolean
  content?: string
  image?: ImageSelectionResult | null
  specialsIncluded?: string[]
  metadata?: Record<string, any>
  error?: string
}

class AIService {
  private apiKey: string | undefined
  private apiUrl = 'https://api.openai.com/v1/chat/completions'

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY
  }

  isConfigured(): boolean {
    return !!this.apiKey
  }

  /**
   * Generate social media content using full business context.
   * This is the primary entry point for content generation.
   */
  async generateContent(req: ContentGenerationRequest): Promise<GenerationResult> {
    try {
      if (!this.isConfigured()) {
        throw new Error('OpenAI API key not configured')
      }

      // 1. Load full business context from database
      const ctx = await loadBusinessContext(req.businessId)

      // 2. Build prompt using business context
      const prompt = buildContentPrompt(ctx, req)

      // 3. Generate content
      let content = await this.callOpenAI(
        prompt.systemPrompt,
        prompt.userPrompt,
        prompt.maxTokens,
        prompt.temperature
      )

      // 4. Clean the response
      content = this.cleanGeneratedContent(content, ctx.business)

      // 5. Handle Twitter length compliance
      if (req.platform === 'twitter' && content.length > 280) {
        content = await this.retryForTwitter(content, ctx, req)
      }

      // 6. Select best matching image
      let image: ImageSelectionResult | null = null
      if (req.includeImages && ctx.images.length > 0) {
        image = selectBestImage(ctx.images, content, req.day, req.platform)
      }

      // 7. Validate specials inclusion
      const specialsIncluded = this.checkSpecialsInContent(content, ctx, req)

      const spec = getPlatformSpec(req.platform)

      return {
        success: true,
        content,
        image,
        specialsIncluded,
        metadata: {
          platform: req.platform,
          characterCount: content.length,
          withinLimits: content.length <= spec.charLimit,
          platformLimit: spec.charLimit,
          day: req.day,
          businessId: req.businessId,
          businessName: ctx.business.displayName,
          hasImage: !!image,
          imageId: image?.image.id || null
        }
      }
    } catch (error) {
      console.error('Content generation failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Generate a review response using full business context.
   */
  async generateReviewResponse(
    review: {
      reviewerName: string
      rating: number
      content: string
      starRating?: string
    },
    businessId: string
  ): Promise<{ success: boolean; response?: string; metadata?: any; error?: string }> {
    try {
      if (!this.isConfigured()) {
        throw new Error('OpenAI API key not configured')
      }

      // Normalize rating
      const rating = typeof review.rating === 'number' ? review.rating :
        review.starRating === 'FIVE' ? 5 :
        review.starRating === 'FOUR' ? 4 :
        review.starRating === 'THREE' ? 3 :
        review.starRating === 'TWO' ? 2 : 1

      const ctx = await loadBusinessContext(businessId)

      const prompt = buildReviewResponsePrompt(ctx, {
        reviewerName: review.reviewerName,
        rating,
        content: review.content
      })

      let response = await this.callOpenAI(
        prompt.systemPrompt,
        prompt.userPrompt,
        prompt.maxTokens,
        prompt.temperature
      )

      // Clean up any remaining formal elements
      response = response
        .replace(/^Dear\s+/i, '')
        .replace(/\[Your Name\].*$/i, '')
        .replace(/Customer Service Team.*$/i, '')
        .replace(/\[Contact Information\].*$/i, '')
        .replace(/Warm regards,[\s\S]*$/i, '')
        .replace(/Best regards,[\s\S]*$/i, '')
        .replace(/Sincerely,[\s\S]*$/i, '')
        .trim()

      return {
        success: true,
        response,
        metadata: {
          businessId,
          businessName: ctx.business.displayName,
          rating,
          reviewerName: review.reviewerName,
          sentiment: rating >= 4 ? 'positive' : rating <= 2 ? 'negative' : 'neutral'
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate review response'
      }
    }
  }

  /**
   * General-purpose AI completion for analysis, JSON generation, etc.
   */
  async generateCompletion(
    prompt: string,
    options: {
      systemPrompt?: string
      maxTokens?: number
      temperature?: number
      responseFormat?: 'text' | 'json'
    } = {}
  ): Promise<{ success: boolean; content?: string; error?: string }> {
    try {
      if (!this.isConfigured()) {
        throw new Error('OpenAI API key not configured')
      }

      const {
        systemPrompt = 'You are a helpful AI assistant. Follow instructions precisely.',
        maxTokens = 800,
        temperature = 0.7,
        responseFormat = 'text'
      } = options

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          max_tokens: maxTokens,
          temperature,
          ...(responseFormat === 'json' && { response_format: { type: 'json_object' } })
        })
      })

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(`OpenAI API error: ${response.status} ${errorData}`)
      }

      const data = await response.json()
      const content = data.choices[0]?.message?.content?.trim()
      if (!content) throw new Error('No content returned from OpenAI')

      return { success: true, content }
    } catch (error) {
      console.error('AI completion failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Simple sentiment analysis based on rating
   */
  analyzeSentiment(review: any): string {
    const rating = typeof review.rating === 'number' ? review.rating :
      review.starRating === 'FIVE' ? 5 :
      review.starRating === 'FOUR' ? 4 :
      review.starRating === 'THREE' ? 3 :
      review.starRating === 'TWO' ? 2 : 1

    if (rating >= 4) return 'positive'
    if (rating >= 3) return 'neutral'
    return 'negative'
  }

  // --- Private methods ---

  private async callOpenAI(
    systemPrompt: string,
    userPrompt: string,
    maxTokens: number,
    temperature: number
  ): Promise<string> {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: maxTokens,
        temperature,
        top_p: 1,
        frequency_penalty: 0.1,
        presence_penalty: 0.1
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`OpenAI API error: ${response.status} ${errorData}`)
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content?.trim()
    if (!content) throw new Error('No content returned from OpenAI')

    return content
  }

  private cleanGeneratedContent(content: string, business: { displayName: string; phone: string; website: string }): string {
    let cleaned = content

    // Remove headers and labels
    cleaned = cleaned.replace(/^###?\s*(Facebook|Instagram|Twitter|Google|LinkedIn)\s*(Post|Update)?\s*(for|:).*$/gim, '')
    cleaned = cleaned.replace(/^(Facebook|Instagram|Twitter|Google|LinkedIn)\s*(Post|Update)?\s*:?\s*/gim, '')
    cleaned = cleaned.replace(/^Post\s*:?\s*/gim, '')
    cleaned = cleaned.replace(/^\*\*Post\s*:?\*\*\s*/gim, '')

    // Remove suggestions and instructions
    cleaned = cleaned.replace(/Feel free to adjust.*$/gim, '')
    cleaned = cleaned.replace(/You can customize.*$/gim, '')
    cleaned = cleaned.replace(/Don't forget to.*$/gim, '')
    cleaned = cleaned.replace(/\*\*Note:.*$/gim, '')
    cleaned = cleaned.replace(/Note:.*$/gim, '')
    cleaned = cleaned.replace(/^-{3,}.*$/gim, '')

    // Remove markdown formatting
    cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1')
    cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1')
    cleaned = cleaned.replace(/_{2}([^_]+)_{2}/g, '$1')
    cleaned = cleaned.replace(/_([^_]+)_/g, '$1')

    // Replace placeholders with actual business info
    cleaned = cleaned.replace(/\[Your Number\]/gi, business.phone)
    cleaned = cleaned.replace(/\[Company Name\]/gi, business.displayName)
    cleaned = cleaned.replace(/\[Phone Number\]/gi, business.phone)
    cleaned = cleaned.replace(/\[Business Name\]/gi, business.displayName)
    cleaned = cleaned.replace(/\[Website\]/gi, business.website)
    cleaned = cleaned.replace(/\[Phone\]/gi, business.phone)

    // Clean whitespace
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n')
    cleaned = cleaned.trim()

    return cleaned
  }

  private async retryForTwitter(
    originalContent: string,
    ctx: FullBusinessContext,
    req: ContentGenerationRequest
  ): Promise<string> {
    // Try up to 3 more times with increasingly strict prompts
    const retryPrompts = [
      `Rewrite this for Twitter in UNDER 270 characters. Keep the key message and include ${ctx.business.phone}:\n\n${originalContent}`,
      `Create a ${ctx.business.displayName} tweet. MAX 250 characters. Include ${ctx.business.phone}. Very brief and punchy.`,
      `${ctx.business.displayName} tweet under 240 chars with ${ctx.business.phone}. Super short.`
    ]

    for (const prompt of retryPrompts) {
      try {
        const retry = await this.callOpenAI(
          `You write tweets for ${ctx.business.displayName}. HARD LIMIT: 280 characters. Count carefully.`,
          prompt,
          100,
          0.7
        )
        const cleaned = this.cleanGeneratedContent(retry, ctx.business)
        if (cleaned.length <= 280) return cleaned
      } catch {
        continue
      }
    }

    // Last resort: intelligent truncation
    return this.intelligentTruncate(originalContent, 280)
  }

  private intelligentTruncate(content: string, maxLength: number): string {
    if (content.length <= maxLength) return content

    const sentences = content.split(/[.!?]+/)
    let truncated = ''
    for (const sentence of sentences) {
      const potential = truncated + (truncated ? '. ' : '') + sentence.trim()
      if (potential.length <= maxLength - 3) {
        truncated = potential
      } else break
    }
    if (truncated) return truncated + '...'

    // Word boundary fallback
    const words = content.split(' ')
    truncated = ''
    for (const word of words) {
      const potential = truncated + (truncated ? ' ' : '') + word
      if (potential.length <= maxLength - 3) {
        truncated = potential
      } else break
    }
    return truncated + '...'
  }

  private checkSpecialsInContent(
    content: string,
    ctx: FullBusinessContext,
    req: ContentGenerationRequest
  ): string[] {
    if (!req.includeSpecials) return []

    const allSpecials = ctx.monthlySpecials
      .filter(s => s.month === req.month)
      .flatMap(s => [...s.hvac, ...s.plumbing, ...s.electrical, ...s.all])

    return allSpecials.filter(special => {
      const words = special.toLowerCase().split(' ').filter(w => w.length > 3)
      return words.some(word => content.toLowerCase().includes(word))
    })
  }
}

export const aiService = new AIService()
export default aiService
