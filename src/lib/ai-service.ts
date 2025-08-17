// src/lib/ai-service.ts
interface ReviewData {
  starRating?: string
  comment?: string
  reviewer?: {
    displayName?: string
  }
}

interface GenerateContentOptions {
  type: 'template' | 'custom' | 'review-response' | 'seasonal_tip' | 'maintenance_reminder' | 'weather_alert' | 'promotion' | 'customer_story' | 'company_update' | 'emergency_service'
  prompt?: string
  reviewText?: string
  rating?: number
  businessName?: string
  month?: string
  specials?: any
  platform?: string
  customPrompt?: string
}

interface ContentTemplate {
  prompt: string
  category: string
  bestTimes: string[]
  frequency: string
}

interface PlatformSpecs {
  maxLength: number
  recommendedLength: number
  hashtags: string
  emojis: string
  callToAction: string
}

export class AIService {
  private apiKey: string
  private apiUrl = 'https://api.openai.com/v1/chat/completions'

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || ''
    
    if (!this.apiKey) {
      console.warn('OpenAI API key not found. AI features will be disabled.')
    }
  }

  // Detect which business based on location name
  detectBusiness(locationName: string): string {
    const name = locationName.toLowerCase()
    
    if (name.includes('lex') && !name.includes('etx')) {
      return 'lex'
    } else if (name.includes('lyons')) {
      return 'lyons'
    } else if (name.includes('etx') || name.includes('tyler')) {
      return 'lex-etx'
    }
    
    return 'generic'
  }

  // Get custom prompt based on business name for review responses
  getBusinessPrompt(businessName: string, reviewRating: number, reviewText: string, reviewerName: string): string {
    const business = this.detectBusiness(businessName)
    
    switch (business) {
      case 'lex':
        return this.getLexPrompt(reviewRating, reviewText, reviewerName)
      case 'lyons':
        return this.getLyonsPrompt(reviewRating, reviewText, reviewerName)
      case 'lex-etx':
        return this.getETXPrompt(reviewRating, reviewText, reviewerName)
      default:
        return this.getGenericPrompt(businessName, reviewRating, reviewText, reviewerName)
    }
  }

  // Lex Dallas custom prompt
  private getLexPrompt(reviewRating: number, reviewText: string, reviewerName: string): string {
  if (reviewRating >= 4) {
    // Positive reviews
    return `You are responding on behalf of **Lex Air Conditioning, Plumbing, and Electrical**, known for *The Gold Standard of White Glove Service*. 

Review Details:
- Rating: ${reviewRating}/5 stars
- Customer: ${reviewerName}
- Review: "${reviewText}"

Write a warm, professional response that:
* Starts with "Thank you, ${reviewerName}!" or "${reviewerName}, thank you so much!"
* Shows genuine excitement and gratitude (professional enthusiasm)
* Maybe includes one tasteful emoji if it feels natural
* Mentions our commitment to white glove service
* Invites them to call us for future needs
* Keeps it under 60 words
* Sounds polished but authentic

This is a positive review - celebrate their experience while maintaining our premium, professional image!`
  } else {
    // Negative/neutral reviews
    return `You are responding on behalf of **Lex Air Conditioning, Plumbing, and Electrical**, known for *The Gold Standard of White Glove Service*. 

Review Details:
- Rating: ${reviewRating}/5 stars
- Customer: ${reviewerName}
- Review: "${reviewText}"

Write a professional, empathetic response that:
* Starts with "${reviewerName}, thank you for your feedback" or "Thank you for sharing your experience, ${reviewerName}"
* NO EMOJIS - keep it completely professional
* Acknowledges their concerns sincerely
* Takes responsibility without making excuses
* Offers to make it right or improve
* Mentions learning from their feedback
* Sounds like a premium service company that genuinely cares
* Keeps it under 75 words

This is constructive feedback - use it as an opportunity to show our commitment to excellence and continuous improvement.`
  }
}

// Lyons Custom Prompt:
private getLyonsPrompt(reviewRating: number, reviewText: string, reviewerName: string): string {
  if (reviewRating >= 4) {
    // Positive reviews
    return `You are responding on behalf of **Lyons Heating and Air**, *The King of 5-Star Service* - the confident, family-run company in DFW.

Review Details:
- Rating: ${reviewRating}/5 stars
- Customer: ${reviewerName}
- Review: "${reviewText}"

Write a confident, appreciative response that:
* Starts with "Thank you, ${reviewerName}!" or "${reviewerName}, this made our day!"
* Shows confident pride in our work (not arrogant, just assured)
* Maybe includes subtle dry humor if it fits naturally
* One emoji max, and only if it adds warmth
* Mentions treating customers like royalty
* Shows family business warmth
* Keeps it under 60 words

This is a positive review - show appreciation with that signature Lyons confidence and charm!`
  } else {
    // Negative/neutral reviews
    return `You are responding on behalf of **Lyons Heating and Air**, *The King of 5-Star Service* - the family-run company that stands behind our work.

Review Details:
- Rating: ${reviewRating}/5 stars
- Customer: ${reviewerName}
- Review: "${reviewText}"

Write a confident, professional response that:
* Starts with "${reviewerName}, we appreciate your honest feedback" or "Thank you for this feedback, ${reviewerName}"
* NO EMOJIS - keep it professional
* Acknowledges their concerns with confidence, not defensiveness
* Takes ownership and offers solutions
* Shows we stand behind our work
* Mentions learning from their experience
* Sounds like a family business that genuinely cares about every customer
* Keeps it under 75 words

This is valuable feedback - show our commitment to earning back their trust and improving our service.`
  }
}

// LEX ETX Custom Prompt:
private getETXPrompt(reviewRating: number, reviewText: string, reviewerName: string): string {
  if (reviewRating >= 4) {
    // Positive reviews
    return `You are responding on behalf of **Lex ETX** in Tyler, TX - known for quality workmanship and honest, reliable service.

Review Details:
- Rating: ${reviewRating}/5 stars
- Customer: ${reviewerName}
- Review: "${reviewText}"

Write a warm, genuine response that:
* Starts with "Thank you, ${reviewerName}!" or "${reviewerName}, we sure appreciate you!"
* Shows authentic East Texas appreciation
* Maybe includes "y'all" if it fits naturally (but don't force it)
* One emoji if it adds genuine warmth, but keep it simple
* Sounds like talking to a neighbor, not a corporate response
* Mentions our commitment to doing things right
* Keeps it short and sweet (under 50 words)

This is a positive review - show that genuine East Texas hospitality and make them feel like family!`
  } else {
    // Negative/neutral reviews
    return `You are responding on behalf of **Lex ETX** in Tyler, TX - the local folks who believe in doing things the right way.

Review Details:
- Rating: ${reviewRating}/5 stars
- Customer: ${reviewerName}
- Review: "${reviewText}"

Write an honest, straightforward response that:
* Starts with "${reviewerName}, thank you for letting us know" or "We appreciate your feedback, ${reviewerName}"
* NO EMOJIS - keep it sincere and professional
* Speaks honestly about the situation, no corporate fluff
* Takes responsibility directly
* Offers practical solutions
* Shows we learn from every experience
* Sounds like a neighbor who made a mistake and wants to make it right
* Keeps it under 65 words

This is important feedback - respond with the honest, straightforward approach our East Texas customers expect.`
  }
}
  // Generic prompt for other businesses (fallback)
  private getGenericPrompt(businessName: string, reviewRating: number, reviewText: string, reviewerName: string): string {
  return `You are responding to a customer review for ${businessName}. Write a friendly, engaging response.

Review Details:
- Rating: ${reviewRating}/5 stars
- Customer: ${reviewerName}
- Review: "${reviewText}"

Guidelines:
- NEVER start with "Dear" - use "Hey ${reviewerName}!" or "Thanks ${reviewerName}!" instead
- Keep it under 75 words
- Be warm, genuine, and conversational
- ${reviewRating >= 4 ? 'Show excitement and gratitude' : ''}
- ${reviewRating <= 3 ? 'Acknowledge concerns and offer to help' : ''}
- ${reviewRating <= 2 ? 'Apologize sincerely and show you care' : ''}
- Use a friendly, approachable tone
- Add an emoji if it feels natural

${reviewRating >= 4 ? 'This is a positive review - celebrate it!' : reviewRating >= 3 ? 'This is a neutral review - be helpful and understanding.' : 'This is a negative review - be empathetic and solution-focused.'}`
}

  // Generate a professional review response with custom business prompts
  async generateReviewResponse(review: ReviewData, businessName: string, options = {}): Promise<any> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured')
    }

    try {
      // Convert Google's string rating format to numbers
      let reviewRating = 0
      if (review.starRating) {
        const ratingMap: Record<string, number> = {
          'ONE': 1, 'TWO': 2, 'THREE': 3, 'FOUR': 4, 'FIVE': 5
        }
        reviewRating = ratingMap[review.starRating] || 0
      }

      const reviewText = review.comment || ''
      const reviewerName = review.reviewer?.displayName || 'Customer'
      
      // Get the custom prompt for this business
      const prompt = this.getBusinessPrompt(businessName, reviewRating, reviewText, reviewerName)

      const requestBody = {
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at writing authentic, brand-appropriate responses to customer reviews. Follow the specific guidelines provided for each business to maintain their unique voice and values.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 200,
        temperature: 0.7,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      }

      console.log(`Generating AI review response for ${businessName}...`)
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(`OpenAI API error: ${response.status} ${errorData}`)
      }

      const data = await response.json()
      const generatedResponse = data.choices[0]?.message?.content?.trim()

      if (!generatedResponse) {
        throw new Error('No response generated from OpenAI')
      }

      console.log(`AI review response generated successfully for ${businessName}`)
      return {
        success: true,
        response: generatedResponse,
        metadata: {
          business: this.detectBusiness(businessName),
          rating: reviewRating,
          tokens_used: data.usage?.total_tokens || 0
        }
      }

    } catch (error) {
      console.error('Error generating AI review response:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Get current season for seasonal content
  getCurrentSeason(): string {
    const month = new Date().getMonth() + 1 // 1-12
    if (month >= 3 && month <= 5) return 'spring'
    if (month >= 6 && month <= 8) return 'summer'
    if (month >= 9 && month <= 11) return 'fall'
    return 'winter'
  }

  // Get content templates for different post types
  getContentTemplate(templateType: string, options: any = {}): ContentTemplate {
    const currentMonth = new Date().getMonth() + 1 // 1-12
    const currentSeason = this.getCurrentSeason()
    
    const templates: Record<string, ContentTemplate> = {
      seasonal_tip: {
        prompt: this.getSeasonalTip(currentSeason, currentMonth),
        category: 'Educational',
        bestTimes: ['9:00 AM', '2:00 PM', '6:00 PM'],
        frequency: 'weekly'
      },
      maintenance_reminder: {
        prompt: this.getMaintenanceReminder(currentSeason),
        category: 'Service',
        bestTimes: ['8:00 AM', '1:00 PM', '5:00 PM'],
        frequency: 'bi-weekly'
      },
      weather_alert: {
        prompt: this.getWeatherAlert(currentSeason),
        category: 'Urgent',
        bestTimes: ['7:00 AM', '12:00 PM', '7:00 PM'],
        frequency: 'as-needed'
      },
      promotion: {
        prompt: 'Create a post about our current service promotion with a limited-time offer that encourages customers to book now',
        category: 'Marketing',
        bestTimes: ['10:00 AM', '3:00 PM', '7:00 PM'],
        frequency: 'monthly'
      },
      customer_story: {
        prompt: 'Create a post highlighting excellent customer service and quality workmanship without using specific customer names',
        category: 'Social Proof',
        bestTimes: ['11:00 AM', '4:00 PM', '8:00 PM'],
        frequency: 'bi-weekly'
      },
      company_update: {
        prompt: 'Create a post about company news, team growth, or service area expansion that builds trust and community connection',
        category: 'Company',
        bestTimes: ['9:00 AM', '1:00 PM', '6:00 PM'],
        frequency: 'monthly'
      },
      emergency_service: {
        prompt: 'Create a post about 24/7 emergency service availability, emphasizing reliability and quick response times',
        category: 'Service',
        bestTimes: ['6:00 AM', '6:00 PM', '9:00 PM'],
        frequency: 'monthly'
      },
      custom: {
        prompt: options.customPrompt || 'Create an engaging post about HVAC services',
        category: 'Custom',
        bestTimes: ['9:00 AM', '2:00 PM', '6:00 PM'],
        frequency: 'as-needed'
      }
    }

    return templates[templateType] || templates.custom
  }

  // Get seasonal tips based on current weather
  private getSeasonalTip(season: string, month: number): string {
    const tips: Record<string, string[]> = {
      spring: [
        'Spring AC prep tips: cleaning filters, checking refrigerant levels, and scheduling maintenance',
        'Preparing your HVAC system for warmer weather with spring maintenance checklist',
        'Energy efficiency tips for the transition from heating to cooling season'
      ],
      summer: [
        'Beat the Texas heat: essential AC maintenance tips to keep your system running efficiently',
        'Signs your AC needs immediate attention before the peak summer heat arrives',
        'Energy-saving tips to reduce your cooling costs during hot summer months',
        'Importance of changing air filters during peak AC season'
      ],
      fall: [
        'Preparing your heating system for cooler weather: fall maintenance checklist',
        'Transitioning from cooling to heating: what homeowners need to know',
        'Fall HVAC tips to ensure comfort and efficiency throughout winter'
      ],
      winter: [
        'Winter heating efficiency tips to keep your home warm and energy bills low',
        'Protecting your HVAC system during freezing Texas weather',
        'Emergency heating tips when your system needs immediate attention',
        'Indoor air quality tips for winter when windows stay closed'
      ]
    }

    const seasonTips = tips[season] || tips.summer
    return seasonTips[Math.floor(Math.random() * seasonTips.length)]
  }

  // Get maintenance reminders
  private getMaintenanceReminder(season: string): string {
    const reminders: Record<string, string> = {
      spring: 'Spring HVAC maintenance special: schedule your AC tune-up before the heat arrives',
      summer: 'Don\'t wait for a breakdown: schedule your AC maintenance during peak season',
      fall: 'Fall maintenance special: prepare your heating system for winter',
      winter: 'Winter heating system check: ensure your family stays warm and safe'
    }

    return reminders[season] || reminders.summer
  }

  // Get weather-related alerts
  private getWeatherAlert(season: string): string {
    const alerts: Record<string, string> = {
      spring: 'Spring weather prep: protect your HVAC system from storms and temperature swings',
      summer: 'Extreme heat warning: tips to keep your AC running during record temperatures',
      fall: 'Fall weather transition: switching from AC to heat mode safely',
      winter: 'Winter freeze protection: preventing frozen pipes and HVAC damage'
    }

    return alerts[season] || alerts.summer
  }

  // Get platform specifications
  getPlatformSpecs(platform: string): PlatformSpecs {
    const specs: Record<string, PlatformSpecs> = {
      facebook: {
        maxLength: 63206, // Facebook has a high limit
        recommendedLength: 200, // But shorter is better for engagement
        hashtags: 'optional',
        emojis: 'encouraged',
        callToAction: 'encouraged'
      },
      instagram: {
        maxLength: 2200,
        recommendedLength: 150,
        hashtags: 'highly recommended',
        emojis: 'essential',
        callToAction: 'encouraged'
      },
      twitter: {
        maxLength: 280,
        recommendedLength: 240,
        hashtags: 'recommended',
        emojis: 'encouraged',
        callToAction: 'brief'
      },
      google: {
        maxLength: 1500,
        recommendedLength: 200,
        hashtags: 'optional',
        emojis: 'moderate',
        callToAction: 'professional'
      }
    }
    
    return specs[platform] || specs.facebook
  }

  // Get social media prompt for business
  getSocialMediaPrompt(business: string, platform: string, prompt: string, specs: PlatformSpecs): string {
    const businessVoices: Record<string, any> = {
      lex: {
        tone: 'professional and polished',
        brand: 'Lex Air Conditioning, Plumbing, and Electrical',
        tagline: 'The Gold Standard of White Glove Service',
        personality: 'Expert, reliable, premium service provider'
      },
      lyons: {
        tone: 'confident and approachable',
        brand: 'Lyons Heating and Air',
        tagline: 'The King of 5-Star Service',
        personality: 'Confident, family-oriented, treats customers like royalty'
      },
      'lex-etx': {
        tone: 'honest and straightforward',
        brand: 'Lex ETX',
        tagline: 'Quality workmanship, honest service',
        personality: 'Reliable, no-nonsense, trustworthy local experts'
      }
    }

    const voice = businessVoices[business] || businessVoices['lex-etx']
    
    let platformGuidance = ''
    if (platform === 'twitter') {
      platformGuidance = `
TWITTER-SPECIFIC REQUIREMENTS:
- MUST be under 280 characters total
- Use concise, punchy language
- Include 1-2 relevant hashtags maximum
- Make every word count
- Create urgency or curiosity to drive engagement
- Use line breaks sparingly (they count as characters)
- End with a call-to-action when possible
- DO NOT put quotes around the tweet content`
    }
    
    return `Create a ${platform} post for ${voice.brand} about: ${prompt}

Brand Voice: ${voice.tone}
Brand Promise: ${voice.tagline}
Personality: ${voice.personality}

Platform Requirements:
- Keep under ${specs.recommendedLength} characters for best engagement
- ${specs.hashtags === 'highly recommended' ? 'Include 3-5 relevant hashtags' : specs.hashtags === 'recommended' ? 'Include 1-2 hashtags' : 'Use hashtags sparingly'}
- ${specs.emojis === 'essential' ? 'Use emojis throughout' : specs.emojis === 'encouraged' ? 'Include relevant emojis' : 'Use emojis moderately'}
- ${specs.callToAction === 'encouraged' ? 'Include a clear call-to-action' : specs.callToAction === 'brief' ? 'Include a brief call-to-action' : 'Keep call-to-action brief and natural'}

${platformGuidance}

Content should:
- Sound authentic to the brand voice
- Engage local DFW customers
- Highlight expertise without being salesy
- Include seasonal relevance when appropriate
- Drive customer engagement

Write only the post content, ready to publish. Count characters carefully.`
  }

  // Generate social media content with platform-specific formatting
  async generateSocialContent(prompt: string, businessName: string, platform = 'google', options: any = {}): Promise<any> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured')
    }

    try {
      const business = this.detectBusiness(businessName)
      const platformSpecs = this.getPlatformSpecs(platform)
      const businessPrompt = this.getSocialMediaPrompt(business, platform, prompt, platformSpecs)

      const requestBody = {
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert social media content creator specializing in HVAC, plumbing, and electrical businesses. Create engaging, platform-appropriate content that drives customer engagement.'
          },
          {
            role: 'user',
            content: businessPrompt
          }
        ],
        max_tokens: 300,
        temperature: 0.8,
        top_p: 1
      }

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(`OpenAI API error: ${response.status} ${errorData}`)
      }

      const data = await response.json()
      const generatedContent = data.choices[0]?.message?.content?.trim()

      // Format content for platform
      const formattedContent = this.formatContentForPlatform(generatedContent, platform, business)

      return {
        success: true,
        content: formattedContent,
        platform: platform,
        business: business,
        tokens_used: data.usage?.total_tokens || 0
      }

    } catch (error) {
      console.error('Error generating social content:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Enhanced format content for platform with Twitter focus
  formatContentForPlatform(content: string, platform: string, business: string): string {
    let formatted = content
    
    // FIRST: Remove any quotes that AI might have added around the content
    formatted = formatted.replace(/^["']|["']$/g, '').trim()
    
    switch (platform) {
      case 'instagram':
        if (!formatted.includes('#')) {
          formatted += this.addDefaultHashtags(business, platform)
        }
        break
        
      case 'twitter':
        // Ensure Twitter post is under character limit
        if (formatted.length > 280) {
          // Try to trim at word boundary
          formatted = formatted.substring(0, 270)
          const lastSpace = formatted.lastIndexOf(' ')
          if (lastSpace > 200) {
            formatted = formatted.substring(0, lastSpace) + '...'
          } else {
            formatted = formatted.substring(0, 270) + '...'
          }
        }
        
        // Ensure hashtags are included for Twitter
        if (!formatted.includes('#') && formatted.length < 250) {
          const hashtags = this.addDefaultHashtags(business, platform)
          if (formatted.length + hashtags.length <= 280) {
            formatted += hashtags
          }
        }
        break
        
      case 'facebook':
        // Facebook allows longer content, no special formatting needed
        break
    }
    
    return formatted
  }

  // Updated default hashtags with Twitter considerations
  addDefaultHashtags(business: string, platform: string): string {
    const hashtags: Record<string, string[]> = {
      lex: ['#HVAC', '#Plumbing', '#Electrical', '#DallasTX', '#QualityService'],
      lyons: ['#HVAC', '#AirConditioning', '#Heating', '#DFW', '#5StarService'],
      'lex-etx': ['#HVAC', '#Heating', '#Cooling', '#TylerTX', '#TrustedExperts']
    }
    
    const businessTags = hashtags[business] || hashtags['lex-etx']
    
    // Twitter gets fewer hashtags due to character limit
    const tagCount = platform === 'instagram' ? 5 : platform === 'twitter' ? 2 : 3
    
    return '\n\n' + businessTags.slice(0, tagCount).join(' ')
  }

  // Generate content using predefined templates
  async generateContentFromTemplate(templateType: string, businessName: string, platform = 'google', options: any = {}): Promise<any> {
    const template = this.getContentTemplate(templateType, options)
    return this.generateSocialContent(template.prompt, businessName, platform, {
      ...options,
      contentType: templateType,
      template: template
    })
  }

  // Main generate content method for the new system
  async generateContent(options: GenerateContentOptions): Promise<string> {
    try {
      if (options.type === 'review-response') {
        // Handle review responses
        const reviewData: ReviewData = {
          starRating: this.ratingToStarRating(options.rating || 0),
          comment: options.reviewText || '',
          reviewer: { displayName: 'Customer' }
        }
        
        const result = await this.generateReviewResponse(reviewData, options.businessName || '', {})
        return result.success ? result.response : 'Error generating response'
      } else if (options.type === 'template') {
        // Handle monthly template generation
        const template = this.getContentTemplate('seasonal_tip', {
          month: options.month,
          specials: options.specials
        })
        
        const result = await this.generateSocialContent(
          `Create content for ${options.month} featuring: ${JSON.stringify(options.specials)}`,
          options.businessName || 'lex',
          'facebook'
        )
        
        return result.success ? result.content : 'Error generating content'
      } else {
        // Handle custom content generation
        const result = await this.generateSocialContent(
          options.prompt || 'Create engaging social media content',
          options.businessName || 'lex',
          options.platform || 'facebook'
        )
        
        return result.success ? result.content : 'Error generating content'
      }
    } catch (error) {
      console.error('AI generation failed:', error)
      throw error
    }
  }

  // Helper to convert numeric rating to Google's string format
  private ratingToStarRating(rating: number): string {
    const ratingMap: Record<number, string> = {
      1: 'ONE', 2: 'TWO', 3: 'THREE', 4: 'FOUR', 5: 'FIVE'
    }
    return ratingMap[rating] || 'THREE'
  }

  // Analyze review sentiment
  analyzeSentiment(review: ReviewData): any {
    // Convert Google's string rating format to numbers
    let rating = 0
    if (review.starRating) {
      const ratingMap: Record<string, number> = {
        'ONE': 1, 'TWO': 2, 'THREE': 3, 'FOUR': 4, 'FIVE': 5
      }
      rating = ratingMap[review.starRating] || 0
    }
    
    const text = review.comment || ''
    
    let sentiment = 'neutral'
    let priority = 'normal'
    
    if (rating >= 4) {
      sentiment = 'positive'
    } else if (rating <= 2) {
      sentiment = 'negative'
      priority = 'high'
    } else if (rating === 3) {
      sentiment = 'mixed'
      priority = 'medium'
    }
    
    // Check for urgent keywords
    const urgentKeywords = ['terrible', 'awful', 'worst', 'never again', 'disgusting', 'horrible', 'angry', 'furious']
    const hasUrgentKeywords = urgentKeywords.some(keyword => 
      text.toLowerCase().includes(keyword)
    )
    
    if (hasUrgentKeywords && rating <= 2) {
      priority = 'urgent'
    }
    
    return {
      sentiment,
      priority,
      rating,
      needsResponse: rating <= 4, // Respond to 4-star and below
      suggestedTone: rating >= 4 ? 'grateful' : rating >= 3 ? 'understanding' : 'apologetic'
    }
  }

  // Check if API key is configured
  isConfigured(): boolean {
    return !!this.apiKey
  }
}

export const aiService = new AIService()