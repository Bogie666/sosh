// src/lib/ai-service.ts
import { DailyThemeService, DAILY_THEMES, CONTENT_STRATEGIES } from './daily-theme-constants'
import { settingsAggregator, BusinessSettings } from './settings-aggregator'
import { prisma } from './prisma'

interface ContentGenerationOptions {
  businessId: string
  day: string
  platform: string
  month: number
  includeSpecials?: boolean
  includeImages?: boolean
  useContentBlocks?: boolean
  customPrompt?: string
  templateOverride?: string
}

interface GenerationResult {
  success: boolean
  content?: string
  suggestedImage?: string
  templateUsed?: string
  specialsIncluded?: string[]
  contentBlocksUsed?: string[]
  metadata?: any
  error?: string
}

interface PlatformSpecs {
  maxLength: number
  recommendedLength: number
  emojis: 'encouraged' | 'moderate' | 'minimal'
  hashtagCount: number
  callToAction: 'required' | 'encouraged' | 'brief'
}

class EnhancedAIService {
  private apiKey: string | undefined
  private apiUrl = 'https://api.openai.com/v1/chat/completions'

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY
  }

  /**
   * Check if AI service is properly configured
   */
  isConfigured(): boolean {
    return !!this.apiKey
  }

  /**
   * Main content generation method with full integration
   */
  async generateEnhancedContent(options: ContentGenerationOptions): Promise<GenerationResult> {
    try {
      if (!this.isConfigured()) {
        throw new Error('OpenAI API key not configured')
      }

      console.log(`🤖 Enhanced generation for ${options.businessId} - ${options.day} - ${options.platform}`)

      // 1. Load business settings and data
      const businessSettings = await settingsAggregator.getBusinessSettings(options.businessId)
      const dailyTheme = DailyThemeService.getDailyTheme(options.day)
      const platformSpecs = this.getPlatformSpecs(options.platform)

      if (!dailyTheme) {
        throw new Error(`Invalid day: ${options.day}`)
      }

      // 2. Get daily theme settings for this business
      const dailyThemeSettings = await this.getDailyThemeSettings(options.businessId)
      const contentStrategy = dailyThemeSettings?.contentStrategy || 'balanced'
      const strategyConfig = CONTENT_STRATEGIES[contentStrategy]

      // 3. Get monthly specials if requested
      let monthlySpecials: string[] = []
      if (options.includeSpecials && businessSettings?.monthlySpecials) {
        monthlySpecials = this.getRelevantSpecials(businessSettings, options.month)
      }

      // 4. Get content blocks if requested
      let contentBlocks: Record<string, string[]> = {}
      if (options.useContentBlocks && businessSettings?.contentBlocks) {
        contentBlocks = this.organizeContentBlocks(businessSettings.contentBlocks)
      }

      // 5. Get appropriate templates for this day and strategy
      const recommendedTemplates = DailyThemeService.getTemplatesForDay(options.day, contentStrategy)
      const actualTemplate = options.templateOverride || recommendedTemplates[0]

      // 6. Load database templates
      const databaseTemplates = await this.loadDatabaseTemplates(options.businessId, actualTemplate)

      // 7. Generate content with comprehensive prompt
      const generationPrompt = this.buildEnhancedPrompt({
        businessSettings,
        dailyTheme,
        platformSpecs,
        monthlySpecials,
        contentBlocks,
        template: actualTemplate,
        databaseTemplates,
        strategyConfig,
        options
      })

      console.log(`📝 Generation prompt: ${generationPrompt.substring(0, 200)}...`)

      // 8. Call OpenAI with structured prompt
      const aiResponse = await this.callOpenAI(generationPrompt, options.platform)

      // 9. Process and validate response
      const processedResult = this.processAIResponse(aiResponse, {
        monthlySpecials,
        includeImages: options.includeImages || false,
        platform: options.platform,
        templateUsed: actualTemplate
      })

      console.log(`✅ Generated content: ${processedResult.content?.substring(0, 100)}...`)

      return processedResult

    } catch (error) {
      console.error('Enhanced content generation failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Get daily theme settings for a business
   */
  private async getDailyThemeSettings(businessId: string): Promise<any> {
    try {
      const profile = await prisma.businessProfile.findUnique({
        where: { businessId }
      })

      if (profile?.autoPostSettings) {
        return (profile.autoPostSettings as any)?.dailyThemeSettings
      }
      return null
    } catch (error) {
      console.error('Failed to load daily theme settings:', error)
      return null
    }
  }

  /**
   * Get relevant monthly specials for current month
   */
  private getRelevantSpecials(businessSettings: BusinessSettings, month: number): string[] {
    const monthSpecials = businessSettings.monthlySpecials.find(special => special.month === month)
    if (!monthSpecials) return []

    // Combine all types of specials
    return [
      ...monthSpecials.hvac,
      ...monthSpecials.plumbing,
      ...monthSpecials.electrical,
      ...monthSpecials.all
    ].slice(0, 3) // Limit to 3 specials max
  }

  /**
   * Organize content blocks by type
   */
  private organizeContentBlocks(contentBlocks: any[]): Record<string, string[]> {
    const organized: Record<string, string[]> = {}
    
    contentBlocks.forEach(block => {
      if (!organized[block.type]) {
        organized[block.type] = []
      }
      organized[block.type].push(block.content)
    })

    return organized
  }

  /**
   * Load database templates for the specified template type
   */
  private async loadDatabaseTemplates(businessId: string, templateType: string): Promise<any[]> {
    try {
      // Map template type to database categories
      const categories = DailyThemeService.getDatabaseCategories(templateType)
      
      const templates = await prisma.contentTemplate.findMany({
        where: {
          OR: [
            { category: { in: categories } },
            { businesses: { has: businessId } },
            { isPublic: true }
          ]
        },
        orderBy: { usageCount: 'desc' },
        take: 3 // Limit to top 3 templates
      })

      return templates
    } catch (error) {
      console.error('Failed to load database templates:', error)
      return []
    }
  }

  /**
   * Build comprehensive AI prompt with all context
   */
  private buildEnhancedPrompt(context: {
    businessSettings: BusinessSettings
    dailyTheme: any
    platformSpecs: PlatformSpecs
    monthlySpecials: string[]
    contentBlocks: Record<string, string[]>
    template: string
    databaseTemplates: any[]
    strategyConfig: any
    options: ContentGenerationOptions
  }): string {
    const { businessSettings, dailyTheme, platformSpecs, monthlySpecials, contentBlocks, template, strategyConfig, options } = context

    let prompt = `Create a ${options.platform} social media post for ${businessSettings.businessId.replace('-', ' ').toUpperCase()}, a professional HVAC, plumbing, and electrical service company.

🎯 DAILY THEME: ${dailyTheme.theme} ${dailyTheme.emoji}
📋 TEMPLATE TYPE: ${template}
📱 PLATFORM: ${options.platform} (max ${platformSpecs.maxLength} characters)
📅 FOCUS: ${dailyTheme.focus}
🎨 CONTENT STYLE: ${dailyTheme.contentStyle}
📊 STRATEGY: ${strategyConfig.name} (${strategyConfig.description})

BUSINESS CONTEXT:`

    // Add business profile info
    if (businessSettings.profile) {
      prompt += `
- Brand Voice: ${businessSettings.profile.brandVoice}
- Message Style: ${businessSettings.profile.messageStyle}
- Voice Tone: ${businessSettings.profile.voiceTone}
- Service Areas: ${businessSettings.profile.serviceAreas.join(', ')}`
    }

    // Add monthly specials with explicit instructions
    if (monthlySpecials.length > 0) {
      prompt += `

🎯 MONTHLY SPECIALS (MUST INCLUDE 1-2):
${monthlySpecials.map((special, i) => `${i + 1}. ${special}`).join('\n')}

❗ CRITICAL: You MUST include at least ONE of these exact specials in your content. Use the exact wording provided.`
    }

    // Add content blocks
    if (Object.keys(contentBlocks).length > 0) {
      prompt += `

📞 CONTACT INFORMATION:`
      if (contentBlocks.phone) {
        prompt += `\n- Phone: ${contentBlocks.phone[0]}`
      }
      if (contentBlocks.cta) {
        prompt += `\n- Call-to-Action: ${contentBlocks.cta[0]}`
      }
      if (contentBlocks.hours) {
        prompt += `\n- Hours: ${contentBlocks.hours[0]}`
      }
    }

    // Add image requirement
    if (options.includeImages) {
      prompt += `

📸 IMAGE REQUIREMENT - MANDATORY:
You MUST end your post with exactly this format:
[IMAGE: specific description of relevant HVAC/plumbing/electrical photo]

Examples:
[IMAGE: HVAC technician servicing air conditioning unit]
[IMAGE: Plumber installing water heater in garage]
[IMAGE: Electrician upgrading electrical panel]`
    }

    // Add platform-specific requirements
    prompt += `

📱 PLATFORM REQUIREMENTS:
- Keep under ${platformSpecs.maxLength} characters
- Use ${platformSpecs.emojis === 'encouraged' ? '3-4 relevant emojis' : 'emojis moderately'}
- Include ${platformSpecs.callToAction === 'required' ? 'a strong' : 'a brief'} call-to-action
- ${platformSpecs.hashtagCount > 0 ? `Include ${platformSpecs.hashtagCount} relevant hashtags` : 'Use hashtags sparingly'}`

    // Add final instructions
    prompt += `

✅ FINAL REQUIREMENTS:
1. Write for ${dailyTheme.theme} with ${dailyTheme.contentStyle} tone
2. Focus on: ${dailyTheme.focus}
3. ${monthlySpecials.length > 0 ? 'MUST include 1-2 of the exact monthly specials listed above' : 'Focus on service value and expertise'}
4. ${options.includeImages ? 'MUST end with [IMAGE: description]' : 'End with strong call-to-action'}
5. Use proper business contact information from content blocks
6. Stay professional, helpful, and engaging
7. Make customers want to take action

Return ONLY the final post content, ready to publish immediately.`

    return prompt
  }

  /**
   * Call OpenAI API with proper configuration
   */
  private async callOpenAI(prompt: string, platform: string): Promise<string> {
    const maxTokens = this.getMaxTokensForPlatform(platform)

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an expert social media content creator specializing in HVAC, plumbing, and electrical businesses. You create engaging, platform-appropriate content that drives customer engagement and includes specific business details like monthly specials and contact information. You always follow instructions precisely and include all required elements.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: maxTokens,
        temperature: 0.8,
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

    if (!content) {
      throw new Error('No content returned from OpenAI')
    }

    return content
  }

  /**
   * Process and validate AI response
   */
  private processAIResponse(aiContent: string, context: {
    monthlySpecials: string[]
    includeImages: boolean
    platform: string
    templateUsed: string
  }): GenerationResult {
    let content = aiContent

    // Clean unwanted formatting
    content = content.replace(/^(Facebook|Instagram|Twitter|Google):\s*/i, '')
    content = content.replace(/\*\*([^*]+)\*\*/g, '$1')
    content = content.replace(/^Post:\s*/i, '')
    content = content.trim()

    // Extract image suggestion
    const imageMatch = content.match(/\[IMAGE:\s*([^\]]+)\]/i)
    const suggestedImage = imageMatch ? imageMatch[1].trim() : undefined
    const cleanContent = content.replace(/\[IMAGE:\s*[^\]]+\]/gi, '').trim()

    // Validate specials inclusion
    let specialsIncluded: string[] = []
    if (context.monthlySpecials.length > 0) {
      specialsIncluded = context.monthlySpecials.filter(special => {
        // Check if key words from the special appear in content
        const specialWords = special.toLowerCase().split(' ').filter(word => word.length > 3)
        return specialWords.some(word => cleanContent.toLowerCase().includes(word))
      })
    }

    // Validate image suggestion
    const hasImageSuggestion = !!suggestedImage
    if (context.includeImages && !hasImageSuggestion) {
      console.warn('⚠️ AI did not include required image suggestion')
    }

    // Check character count
    const platformSpecs = this.getPlatformSpecs(context.platform)
    const withinLimits = cleanContent.length <= platformSpecs.maxLength

    return {
      success: true,
      content: cleanContent,
      suggestedImage,
      templateUsed: context.templateUsed,
      specialsIncluded,
      metadata: {
        originalLength: aiContent.length,
        finalLength: cleanContent.length,
        withinLimits,
        hasImageSuggestion,
        specialsValidation: {
          available: context.monthlySpecials.length,
          included: specialsIncluded.length,
          list: specialsIncluded
        }
      }
    }
  }

  /**
   * Get platform specifications
   */
  getPlatformSpecs(platform: string): PlatformSpecs {
    const specs = {
      facebook: {
        maxLength: 63206,
        recommendedLength: 400,
        emojis: 'encouraged' as const,
        hashtagCount: 2,
        callToAction: 'encouraged' as const
      },
      instagram: {
        maxLength: 2200,
        recommendedLength: 200,
        emojis: 'encouraged' as const,
        hashtagCount: 5,
        callToAction: 'brief' as const
      },
      twitter: {
        maxLength: 280,
        recommendedLength: 260,
        emojis: 'moderate' as const,
        hashtagCount: 2,
        callToAction: 'brief' as const
      },
      google: {
        maxLength: 1500,
        recommendedLength: 300,
        emojis: 'minimal' as const,
        hashtagCount: 0,
        callToAction: 'required' as const
      }
    }

    return specs[platform as keyof typeof specs] || specs.facebook
  }

  /**
   * Get max tokens for platform
   */
  private getMaxTokensForPlatform(platform: string): number {
    const tokenLimits = {
      twitter: 100,
      instagram: 300,
      facebook: 500,
      google: 400
    }
    return tokenLimits[platform as keyof typeof tokenLimits] || 400
  }

  /**
   * Legacy method for backward compatibility
   */
  async generateSocialContent(prompt: string, businessName: string, platform: string = 'facebook', options: any = {}): Promise<any> {
    try {
      // Convert legacy call to enhanced generation
      const result = await this.generateEnhancedContent({
        businessId: businessName,
        day: options.day || 'monday',
        platform,
        month: options.month || new Date().getMonth(),
        includeSpecials: options.includeSpecials !== false,
        includeImages: options.includeImages !== false,
        useContentBlocks: options.useContentBlocks !== false,
        customPrompt: prompt
      })

      // Convert to legacy format
      return {
        success: result.success,
        content: result.content || '',
        platform,
        business: businessName,
        tokens_used: 0,
        error: result.error
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Generation failed',
        platform,
        business: businessName
      }
    }
  }

  /**
   * Legacy template method
   */
  async generateContentFromTemplate(templateType: string, businessName: string, platform: string = 'facebook', options: any = {}): Promise<any> {
    return this.generateSocialContent(
      `Create ${templateType} content for ${businessName}`,
      businessName,
      platform,
      { ...options, templateOverride: templateType }
    )
  }

  /**
   * Review response generation
   */
  async generateReviewResponse(review: any, businessName: string, options: any = {}): Promise<any> {
  const customerName = review.reviewer?.displayName || 'Customer'
  const firstName = customerName.split(' ')[0] || customerName
  
  // Determine if it's a positive or negative review
  const rating = review.starRating === 'FIVE' ? 5 :
                review.starRating === 'FOUR' ? 4 :
                review.starRating === 'THREE' ? 3 :
                review.starRating === 'TWO' ? 2 :
                review.starRating === 'ONE' ? 1 : 3
  
  const isPositive = rating >= 4
  const isNegative = rating <= 2
  
  const prompt = `Generate a natural, conversational reply to this customer review for ${businessName}:

Customer: ${firstName}
Rating: ${rating}/5 stars
Review: ${review.comment || 'No comment provided'}

TONE GUIDELINES:
- Sound like a real person, not a corporate robot
- Use the customer's first name naturally (not "Dear [Name]")
- Keep it to 2-3 sentences maximum
- Be genuine and warm, not formal
- NO corporate jargon or templates
- NO formal signatures or contact info

${isPositive ? `POSITIVE REVIEW APPROACH:
- Start with "Thanks" or "Thank you"
- Mention something specific they said
- Show genuine appreciation
- Keep it brief and authentic

Example style: "Thanks so much, ${firstName}! We're really glad [specific detail]. Thanks for choosing us! 😊"` : ''}

${isNegative ? `NEGATIVE REVIEW APPROACH:
- Acknowledge their concern genuinely
- Apologize briefly if appropriate  
- Offer to make it right
- Sound helpful, not defensive

Example style: "Hi ${firstName}, I'm sorry to hear about [specific issue]. We'd love to make this right - please give us a call so we can fix this for you."` : ''}

NEUTRAL REVIEW APPROACH:
- Thank them for feedback
- Address any specific points
- Sound friendly and approachable

Generate a natural reply that sounds like it's from a real person who cares about customers:`

  try {
    const response = await this.callOpenAI(prompt, 'general')
    
    // Clean up any remaining formal elements the AI might add
    let cleanedResponse = response
      .replace(/^Dear\s+/i, '')
      .replace(/\[Your Name\].*$/i, '')
      .replace(/Customer Service Team.*$/i, '')
      .replace(/\[Contact Information\].*$/i, '')
      .replace(/Warm regards,.*$/i, '')
      .replace(/Best regards,.*$/i, '')
      .replace(/Sincerely,.*$/i, '')
      .trim()
    
    return {
      success: true,
      response: cleanedResponse,
      metadata: {
        business: businessName,
        rating: review.starRating,
        customerName: firstName,
        reviewType: isPositive ? 'positive' : isNegative ? 'negative' : 'neutral'
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
   * Simple sentiment analysis
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

  /**
   * General AI completion - for analysis, JSON generation, and non-social-media tasks
   * This method actually uses the prompt you pass to it!
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
        systemPrompt = 'You are a helpful AI assistant. Follow instructions precisely and provide accurate, well-structured responses.',
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
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: prompt
            }
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

      if (!content) {
        throw new Error('No content returned from OpenAI')
      }

      return {
        success: true,
        content
      }

    } catch (error) {
      console.error('AI completion failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

// Export singleton instance
export const aiService = new EnhancedAIService()
export default aiService