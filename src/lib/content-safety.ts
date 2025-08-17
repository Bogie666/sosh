// src/lib/content-safety.ts
import { prisma } from '@/lib/prisma'

interface BusinessData {
  id: string
  name: string
  displayName: string
  phone?: string
  website?: string
  businessProfile?: {
    brandVoice: string
    emergencyContact?: string
    licenseInfo?: string
  }
  contentBlocks: Array<{
    shortCode: string
    content: string
    type: string
  }>
}

interface SafetyCheckResult {
  isValid: boolean
  issues: string[]
  suggestions: string[]
  businessData: BusinessData | null
}

export class ContentSafetyService {
  
  /**
   * Validate content against business data to prevent AI hallucination
   */
  async validateBusinessContent(
    content: string, 
    businessId: string,
    checkContactInfo: boolean = true
  ): Promise<SafetyCheckResult> {
    
    const issues: string[] = []
    const suggestions: string[] = []
    
    try {
      // Get business data with profile and content blocks
      const businessData = await this.getBusinessData(businessId)
      
      if (!businessData) {
        return {
          isValid: false,
          issues: ['Business not found'],
          suggestions: [],
          businessData: null
        }
      }

      if (checkContactInfo) {
        // Check for potential hallucinated phone numbers
        const phoneIssues = this.checkPhoneNumbers(content, businessData)
        issues.push(...phoneIssues.issues)
        suggestions.push(...phoneIssues.suggestions)

        // Check for potential hallucinated URLs
        const urlIssues = this.checkUrls(content, businessData)
        issues.push(...urlIssues.issues)
        suggestions.push(...urlIssues.suggestions)
      }

      // Check for consistent brand voice
      const brandIssues = this.checkBrandConsistency(content, businessData)
      suggestions.push(...brandIssues.suggestions)

      return {
        isValid: issues.length === 0,
        issues,
        suggestions,
        businessData
      }
      
    } catch (error) {
      console.error('Content safety check failed:', error)
      return {
        isValid: false,
        issues: ['Content safety check failed'],
        suggestions: [],
        businessData: null
      }
    }
  }

  /**
   * Generate safe content using business data and content blocks
   */
  async generateSafeContent(
    prompt: string,
    businessId: string,
    platforms: string[] = [],
    useContentBlocks: boolean = true
  ): Promise<{content: string, usedBlocks: string[]}> {
    
    const businessData = await this.getBusinessData(businessId)
    if (!businessData) {
      throw new Error('Business not found')
    }

    // Build context from business data
    const businessContext = this.buildBusinessContext(businessData, useContentBlocks)
    
    // Create safe AI prompt
    const safePrompt = this.createSafePrompt(prompt, businessContext, platforms)
    
    // Generate content (you'll integrate this with your existing AI generation)
    const generatedContent = await this.generateWithOpenAI(safePrompt, businessData)
    
    // Extract which content blocks were used
    const usedBlocks = this.extractUsedContentBlocks(generatedContent, businessData.contentBlocks)
    
    return {
      content: generatedContent,
      usedBlocks
    }
  }

  /**
   * Get comprehensive business data
   */
  private async getBusinessData(businessId: string): Promise<BusinessData | null> {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      include: {
        businessProfile: true,
        contentBlocks: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' }
        }
      }
    })

    if (!business) return null

    return {
      id: business.id,
      name: business.name,
      displayName: business.displayName,
      phone: business.phone,
      website: business.website,
      businessProfile: business.businessProfile ? {
        brandVoice: business.businessProfile.brandVoice || '',
        emergencyContact: business.businessProfile.emergencyContact,
        licenseInfo: business.businessProfile.licenseInfo
      } : undefined,
      contentBlocks: business.contentBlocks.map(block => ({
        shortCode: block.shortCode || '',
        content: block.content,
        type: block.type
      }))
    }
  }

  /**
   * Check for hallucinated phone numbers
   */
  private checkPhoneNumbers(content: string, businessData: BusinessData) {
    const issues: string[] = []
    const suggestions: string[] = []
    
    // Phone number regex patterns
    const phonePatterns = [
      /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, // US phone numbers
      /\d{3}-\d{3}-\d{4}/g,
      /\d{10}/g
    ]
    
    const validPhones = [
      businessData.phone,
      businessData.businessProfile?.emergencyContact
    ].filter(Boolean)
    
    for (const pattern of phonePatterns) {
      const matches = content.match(pattern)
      if (matches) {
        for (const match of matches) {
          const cleanMatch = match.replace(/\D/g, '') // Remove non-digits
          const isValid = validPhones.some(validPhone => 
            validPhone && validPhone.replace(/\D/g, '') === cleanMatch
          )
          
          if (!isValid) {
            issues.push(`Potential hallucinated phone number: ${match}`)
            suggestions.push(`Use business phone: ${businessData.phone} or emergency contact: ${businessData.businessProfile?.emergencyContact}`)
          }
        }
      }
    }
    
    return { issues, suggestions }
  }

  /**
   * Check for hallucinated URLs
   */
  private checkUrls(content: string, businessData: BusinessData) {
    const issues: string[] = []
    const suggestions: string[] = []
    
    const urlPattern = /(https?:\/\/[^\s]+|www\.[^\s]+|\b[a-zA-Z0-9-]+\.(com|net|org|edu|gov|biz|info)\b)/g
    const matches = content.match(urlPattern)
    
    if (matches && businessData.website) {
      const businessDomain = businessData.website.replace(/https?:\/\//, '').replace(/^www\./, '')
      
      for (const match of matches) {
        const matchDomain = match.replace(/https?:\/\//, '').replace(/^www\./, '')
        
        if (!matchDomain.includes(businessDomain)) {
          issues.push(`Potential hallucinated URL: ${match}`)
          suggestions.push(`Use business website: ${businessData.website}`)
        }
      }
    }
    
    return { issues, suggestions }
  }

  /**
   * Check brand voice consistency
   */
  private checkBrandConsistency(content: string, businessData: BusinessData) {
    const suggestions: string[] = []
    
    if (businessData.businessProfile?.brandVoice) {
      const brandVoice = businessData.businessProfile.brandVoice.toLowerCase()
      const contentLower = content.toLowerCase()
      
      // Check for brand voice keywords
      if (brandVoice.includes('professional') && contentLower.includes('awesome') || contentLower.includes('epic')) {
        suggestions.push('Consider using more professional language consistent with brand voice')
      }
      
      if (brandVoice.includes('enthusiastic') && !contentLower.includes('!')) {
        suggestions.push('Consider adding enthusiasm with exclamation marks or positive language')
      }
      
      if (brandVoice.includes('technical') && !contentLower.match(/\b(hvac|plumbing|electrical|system|efficiency|maintenance)\b/)) {
        suggestions.push('Consider adding technical terminology relevant to your services')
      }
    }
    
    return { suggestions }
  }

  /**
   * Build context from business data
   */
  private buildBusinessContext(businessData: BusinessData, useContentBlocks: boolean) {
    let context = `Business: ${businessData.displayName} (${businessData.name})\n`
    
    if (businessData.phone) {
      context += `Phone: ${businessData.phone}\n`
    }
    
    if (businessData.website) {
      context += `Website: ${businessData.website}\n`
    }
    
    if (businessData.businessProfile?.brandVoice) {
      context += `Brand Voice: ${businessData.businessProfile.brandVoice}\n`
    }
    
    if (useContentBlocks && businessData.contentBlocks.length > 0) {
      context += '\nAvailable Content Blocks:\n'
      businessData.contentBlocks.forEach(block => {
        context += `${block.shortCode}: ${block.content}\n`
      })
    }
    
    return context
  }

  /**
   * Create safe AI prompt
   */
  private createSafePrompt(userPrompt: string, businessContext: string, platforms: string[]) {
    const platformInfo = platforms.length > 0 ? `Platforms: ${platforms.join(', ')}\n` : ''
    
    return `${businessContext}
${platformInfo}
IMPORTANT RULES:
1. ONLY use the phone number and website provided in the business context
2. NEVER generate or invent contact information
3. Use the brand voice described above
4. If content blocks are available, you may reference them using their short codes
5. Stay factual and professional

User Request: ${userPrompt}

Generate appropriate social media content following these rules:`
  }

  /**
   * Generate content with OpenAI (integrate with your existing system)
   */
  private async generateWithOpenAI(prompt: string, businessData: BusinessData): Promise<string> {
    // This is a placeholder - integrate with your existing OpenAI generation
    // For now, return a safe default
    return `${businessData.displayName} provides quality service! Contact us at ${businessData.phone} or visit ${businessData.website}`
  }

  /**
   * Extract which content blocks were used
   */
  private extractUsedContentBlocks(content: string, contentBlocks: Array<{shortCode: string, content: string}>) {
    const usedBlocks: string[] = []
    
    contentBlocks.forEach(block => {
      if (block.shortCode && content.includes(block.shortCode)) {
        usedBlocks.push(block.shortCode)
      }
    })
    
    return usedBlocks
  }
}

// Export singleton instance
export const contentSafety = new ContentSafetyService()