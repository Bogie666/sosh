// Enhanced API Route: /api/ai/generate-enhanced-content/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { settingsAggregator } from '@/lib/settings-aggregator'
import { getEnhancedRelevantImages } from '@/lib/enhanced-image-matcher'

// Helper function to determine current season (Dallas, TX climate)
function getCurrentSeason(month: number): string {
  if (month >= 2 && month <= 4) return 'Spring' // March-May: Mild, unpredictable
  if (month >= 5 && month <= 9) return 'Summer' // June-October: Hot and humid
  if (month >= 10 && month <= 11) return 'Fall' // November-December: Pleasant
  return 'Winter' // January-February: Mild winter
}

// Get platform information
function getPlatformInfo(platform: string) {
  const platformMap = {
    facebook: { charLimit: 63206, recommendedLength: 400 },
    instagram: { charLimit: 2200, recommendedLength: 200 },
    twitter: { charLimit: 280, recommendedLength: 260 },
    google: { charLimit: 1500, recommendedLength: 300 }
  }
  
  return platformMap[platform as keyof typeof platformMap] || { charLimit: 1000, recommendedLength: 300 }
}

export async function POST(request: NextRequest) {
  try {
    const openaiApiKey = process.env.OPENAI_API_KEY
    if (!openaiApiKey) {
      return NextResponse.json(
        { success: false, error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { 
      prompt,
      businessId,
      platform = 'facebook',
      contentType = 'weekly-automation',
      includeSpecials = true,
      includeImages = true,
      includeContentBlocks = true,
      day = 'monday'
    } = body

    console.log(`🎯 Enhanced generation for ${businessId} - ${day} - ${platform}`)

    if (!prompt || !businessId) {
      return NextResponse.json(
        { success: false, error: 'Prompt and businessId are required' },
        { status: 400 }
      )
    }

    // Load business settings
    let businessSettings = null
    let enhancedPrompt = prompt
    let usedSpecials: string[] = []
    let usedContentBlocks: string[] = []

    try {
      console.log(`📊 Loading business settings for ${businessId}`)
      businessSettings = await settingsAggregator.getBusinessSettings(businessId)
      
      if (businessSettings?.profile) {
        console.log(`✅ Business settings loaded for ${businessSettings.profile.businessId}`)
        
        // Build enhanced prompt with business context
        enhancedPrompt = await buildEnhancedPrompt(
          prompt,
          businessSettings,
          platform,
          contentType,
          includeSpecials,
          includeContentBlocks,
          day,
          businessId
        )
        
        // Track what we're using
        if (includeSpecials) {
          const currentMonth = new Date().getMonth()
          usedSpecials = settingsAggregator.getRelevantSpecials(businessSettings, currentMonth).slice(0, 2)
        }
        
        if (includeContentBlocks) {
          const contentBlocks = settingsAggregator.getContentBlocksByType(businessSettings)
          usedContentBlocks = Object.keys(contentBlocks)
        }
      }
    } catch (error) {
      console.error(`⚠️ Failed to load business settings:`, error)
      // Continue without enhanced settings
    }

    console.log(`🤖 Generating content with enhanced prompt`)

    // Generate content using OpenAI
    let content = await generateContentWithOpenAI(enhancedPrompt, platform)
    
    if (!content) {
      throw new Error('Failed to generate content')
    }

    console.log(`✅ Content generated: "${content.substring(0, 100)}..."`)

    let businessName = businessId
    
    if (businessSettings) {
      try {
        const { prisma } = await import('@/lib/prisma')
        const business = await prisma.business.findUnique({
          where: { id: businessSettings.businessId }
        })
        // Use the FULL business name, not the shorthand displayName
        if (business?.name) {
          businessName = business.name  
        }
      } catch (error) {
        console.warn('Could not fetch business name:', error)
        // Fall back to businessId
        businessName = businessSettings.businessId
      }
    }

    content = cleanGeneratedContent(content, platform, businessName)
    console.log(`🧹 Content cleaned for ${businessName}, final result: "${content.substring(0, 100)}..."`)

    // Enhanced image selection using the new system
    let imageResults = {
      suggestedImageUrl: undefined as string | undefined,
      imageDescription: undefined as string | undefined,
      imageAlternatives: [] as any[],
      imageAnalysis: {} as any
    }

    if (includeImages && businessSettings?.imageLibrary?.length) {
      console.log(`🖼️ Starting enhanced image selection for ${day} content`)
      
      try {
        const scoredImages = getEnhancedRelevantImages(
          businessSettings,
          content,
          contentType,
          day,
          {
            businessId,
            platform,
            brandVoice: businessSettings.profile?.brandVoice
          }
        )

        if (scoredImages.length > 0) {
          // Select the best image
          const bestImage = scoredImages[0]
          imageResults.suggestedImageUrl = bestImage.image.cloudUrl
          imageResults.imageDescription = bestImage.description
          imageResults.imageAnalysis = {
            relevanceScore: bestImage.relevanceScore,
            matchingFactors: bestImage.matchingFactors,
            totalCandidates: businessSettings.imageLibrary.length,
            relevantCandidates: scoredImages.length
          }
          
          // Provide alternatives (top 4 other images)
          imageResults.imageAlternatives = scoredImages.slice(1, 5).map(scored => ({
            id: scored.image.id,
            cloudUrl: scored.image.cloudUrl,
            thumbnailUrl: scored.image.thumbnailUrl,
            originalName: scored.image.originalName,
            aiDescription: scored.image.aiDescription,
            relevanceScore: scored.relevanceScore,
            matchingFactors: scored.matchingFactors.slice(0, 3) // Top 3 factors
          }))

          console.log(`✅ Selected image: ${bestImage.image.originalName} (score: ${bestImage.relevanceScore})`)
          console.log(`📊 Matching factors: ${bestImage.matchingFactors.slice(0, 3).join(', ')}`)
          
          // Update usage count
          try {
            await updateImageUsageCount(bestImage.image.id)
          } catch (error) {
            console.warn('Failed to update image usage count:', error)
          }
        } else {
          console.log(`⚠️ No relevant images found for ${contentType} content`)
          imageResults.imageDescription = `Professional ${contentType} content image needed`
        }
      } catch (error) {
        console.error('Enhanced image selection failed:', error)
        imageResults.imageDescription = 'Image selection temporarily unavailable'
      }
    }

    // Calculate platform compliance
    const platformInfo = getPlatformInfo(platform)
    const characterCount = content.length
    const withinLimits = characterCount <= (platformInfo?.charLimit || 10000)

    console.log(`✅ Enhanced content generation completed for ${day}`)

    return NextResponse.json({
      success: true,
      content: content,
      metadata: {
        businessId,
        businessName: businessSettings?.profile?.businessId || businessId,
        platform,
        contentType,
        day,
        characterCount,
        withinLimits,
        platformLimit: platformInfo?.charLimit,
        
        // Enhanced image metadata
        suggestedImage: imageResults.suggestedImageUrl,
        imageDescription: imageResults.imageDescription,
        hasActualImage: !!imageResults.suggestedImageUrl,
        imageAlternatives: imageResults.imageAlternatives,
        imageAnalysis: imageResults.imageAnalysis,
        
        // Content enhancement metadata
        usedContentBlocks,
        usedSpecials,
        specialsCount: usedSpecials.length,
        enhancedPromptUsed: enhancedPrompt !== prompt,
        settingsUsed: !!businessSettings,
        
        generatedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('⚠️ Enhanced content generation failed:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Content generation failed'
      },
      { status: 500 }
    )
  }
}

// Helper function to build enhanced prompt with business context
async function buildEnhancedPrompt(
  basePrompt: string,
  businessSettings: any,
  platform: string,
  contentType: string,
  includeSpecials: boolean,
  includeContentBlocks: boolean,
  day: string,
  businessId: string
): Promise<string> {
  let enhancedPrompt = basePrompt
  
  // Get the FULL business name for the prompt (not the shorthand displayName)
  let businessName = businessSettings?.businessId || businessId
  
  // Try to get the actual FULL business name from the database
  try {
    const { prisma } = await import('@/lib/prisma')
    const business = await prisma.business.findUnique({
      where: { id: businessSettings?.businessId || businessId }
    })
    // Use the FULL business name from the 'name' field, not 'displayName'
    if (business?.name) {
      businessName = business.name  // e.g., "Lex Air Conditioning, Heating, Plumbing, Electrical"
    }
  } catch (error) {
    console.warn('Could not fetch business name for prompt:', error)
  }
  
  // Add business voice and context
  if (businessSettings.profile) {
    const profile = businessSettings.profile
    enhancedPrompt += `\n\nBusiness Context: ${profile.brandVoice || 'Professional service provider'}`
    
    if (profile.serviceTypes?.length) {
      enhancedPrompt += `\nServices: ${profile.serviceTypes.join(', ')}`
    }
    
    if (profile.serviceAreas?.length) {
      enhancedPrompt += `\nService Areas: ${profile.serviceAreas.join(', ')}`
    }
  }
  
  // Add monthly specials context
  if (includeSpecials && businessSettings.monthlySpecials) {
    const currentMonth = new Date().getMonth()
    const relevantSpecials = settingsAggregator.getRelevantSpecials(businessSettings, currentMonth)
    
    if (relevantSpecials.length > 0) {
      enhancedPrompt += `\n\nCurrent Promotions (use 1-2 relevant ones):\n${relevantSpecials.slice(0, 3).map(special => `• ${special}`).join('\n')}`
    }
  }
  
  // Add content blocks for contact info and CTAs
  if (includeContentBlocks && businessSettings.contentBlocks) {
    const contactBlocks = businessSettings.contentBlocks.filter((block: any) => 
      block.category === 'contact' && block.isActive
    ).slice(0, 2)
    
    const ctaBlocks = businessSettings.contentBlocks.filter((block: any) => 
      block.category === 'cta' && block.isActive
    ).slice(0, 1)
    
    if (contactBlocks.length > 0 || ctaBlocks.length > 0) {
      enhancedPrompt += `\n\nAvailable Content Elements (use naturally):`
      contactBlocks.forEach((block: any) => {
        enhancedPrompt += `\n• Contact: ${block.content}`
      })
      ctaBlocks.forEach((block: any) => {
        enhancedPrompt += `\n• CTA: ${block.content}`
      })
    }
  }
  
  // Add platform and day-specific guidance
  enhancedPrompt += `\n\nPlatform: ${platform} | Day Theme: ${day} | Content Type: ${contentType}`
  enhancedPrompt += `\n\nIMPORTANT: Business name is "${businessName}". NEVER use placeholders like [Your Business Name] or [Business Name]. Always use the actual name: ${businessName}`
  enhancedPrompt += `\n\nCreate engaging, platform-appropriate content that naturally incorporates relevant business information and maintains the brand voice. Focus on value and customer engagement.`
  
  return enhancedPrompt
}

// Generate content using OpenAI
async function generateContentWithOpenAI(prompt: string, platform: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are an expert social media content creator specializing in home service businesses (HVAC, plumbing, electrical). 

IMPORTANT: Create exactly ONE social media post. Do not create multiple posts, do not number posts, do not use "Post 1:", "Post 2:" or similar formatting.

CRITICAL: NEVER use placeholders like [Your Business Name], [Business Name], [Company Name] or similar. Always use the actual business name provided in the prompt.

PLATFORM REQUIREMENTS:
- Twitter/X: Maximum 280 characters including spaces, hashtags, and punctuation
- Instagram: Maximum 2,200 characters but aim for 100-200 for best engagement
- Facebook: Can be longer but aim for 200-400 characters for best engagement  
- Google Business Profile: Maximum 1,500 characters but aim for 200-300

Create engaging, platform-appropriate content that drives customer engagement and builds trust. Focus on being helpful, professional, and authentic.

Format: Write the content as a single cohesive social media post without any post numbering or multiple post formatting.`
        },
        {
          role: 'user',
          content: `${prompt}

CRITICAL: Generate only ONE single social media post. Do not create multiple posts or use numbering like "Post 1:", "Post 2:", etc. Just write one complete social media post. Do not use any placeholders - use the actual business name provided.`
        }
      ],
      max_tokens: 300,
      temperature: 0.8,
      top_p: 1
    })
  })

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`)
  }

  const data = await response.json()
  let content = data.choices[0]?.message?.content?.trim() || ''
  
  // ADDITIONAL SAFETY: Clean any post numbering that might slip through
  content = cleanMultiplePostFormat(content)
  
  return content
}

// Add this helper function to clean any multiple post formatting
function cleanMultiplePostFormat(content: string): string {
  // Remove "Post 1:", "Post 2:", etc. from the beginning
  content = content.replace(/^Post \d+:\s*/i, '')
  
  // If content contains multiple "Post X:" sections, take only the first one
  const postSections = content.split(/\n\s*Post \d+:/i)
  if (postSections.length > 1) {
    content = postSections[0].trim()
  }
  
  // Remove any trailing incomplete sentences that might be cut off
  const sentences = content.split(/[.!?]/)
  if (sentences.length > 1 && sentences[sentences.length - 1].trim().length < 10) {
    sentences.pop() // Remove the last incomplete sentence
    content = sentences.join('.') + (sentences.length > 0 ? '.' : '')
  }
  
  return content.trim()
}

// NEW: Function to clean generated content and replace placeholders
function cleanGeneratedContent(content: string, platform: string, businessName?: string): string {
  let cleaned = content

  // Remove common AI artifacts first
  cleaned = cleaned.replace(/^(Here's|Here is).*?:\s*/i, '')
  cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, '$1') // Remove markdown bold
  cleaned = cleaned.replace(/^#+\s*/gm, '') // Remove markdown headers
  
  // CRITICAL FIX: Replace business name placeholders
  if (businessName) {
    console.log(`🔧 Replacing placeholders with business name: ${businessName}`)
    
    // Common placeholder patterns to replace
    const placeholderPatterns = [
      /\[Your Business Name\]/gi,
      /\[Business Name\]/gi,
      /\[Your Company Name\]/gi,
      /\[Company Name\]/gi,
      /\[YOUR BUSINESS NAME\]/gi,
      /\[BUSINESS NAME\]/gi,
      /#YourBusinessName/gi,
      /#BusinessName/gi,
      /\{Business Name\}/gi,
      /\{YOUR_BUSINESS_NAME\}/gi,
      /\{BUSINESS_NAME\}/gi,
      /\[YourBusinessName\]/gi,
      /YourBusinessName/gi, // Sometimes AI drops the brackets
      /\[your business name\]/gi,
      /\[your company\]/gi,
      /Your Business Name/gi, // Sometimes without brackets
      /Your Company Name/gi,
      /\[Insert Business Name\]/gi,
      /\[INSERT BUSINESS NAME\]/gi,
      /\[Company\]/gi,
      /\[Business\]/gi
    ]
    
    // Replace all placeholder patterns with actual business name
    placeholderPatterns.forEach(pattern => {
      const beforeReplace = cleaned
      cleaned = cleaned.replace(pattern, businessName)
      if (beforeReplace !== cleaned) {
        console.log(`✅ Replaced placeholder pattern: ${pattern.source}`)
      }
    })
    
    // Also handle hashtag placeholders specifically
    cleaned = cleaned.replace(/#\[.*?business.*?name.*?\]/gi, `#${businessName.replace(/\s+/g, '')}`)
    cleaned = cleaned.replace(/#\{.*?business.*?name.*?\}/gi, `#${businessName.replace(/\s+/g, '')}`)
  }
  
  // Clean up any remaining bracket artifacts
  cleaned = cleaned.replace(/\[\s*\]/g, '') // Empty brackets
  cleaned = cleaned.replace(/\{\s*\}/g, '') // Empty braces
  
  // Remove platform-specific prefixes that AI sometimes adds
  const platformPrefixes = [
    /^(Facebook|Instagram|Twitter|Google Business Profile?):\s*/i,
    /^Caption:\s*/i,
    /^Tweet:\s*/i,
    /^Post:\s*/i,
    /^Social Media Post:\s*/i
  ]
  
  platformPrefixes.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '')
  })
  
  // Final cleanup
  cleaned = cleaned.trim()
  cleaned = cleaned.replace(/\s+/g, ' ') // Remove duplicate spaces
  
  return cleaned
}

// Update image usage count
async function updateImageUsageCount(imageId: string): Promise<void> {
  try {
    // This would be implemented based on your database structure
    // await prisma.imageLibrary.update({
    //   where: { id: imageId },
    //   data: { usageCount: { increment: 1 }, lastUsed: new Date() }
    // })
    console.log(`Updated usage count for image ${imageId}`)
  } catch (error) {
    console.error('Failed to update image usage:', error)
  }
}

export async function GET() {
  try {
    const currentSeason = getCurrentSeason(new Date().getMonth())
    const availableTemplates = [
      'seasonal_tip',
      'maintenance_reminder', 
      'weather_alert',
      'promotion',
      'customer_story',
      'company_update',
      'emergency_service'
    ]

    return NextResponse.json({
      success: true,
      currentSeason,
      availableTemplates,
      isConfigured: !!process.env.OPENAI_API_KEY // Fixed: aiService is not imported in this file
    })

  } catch (error) {
    console.error('Error getting AI info:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get AI information' },
      { status: 500 }
    )
  }
}