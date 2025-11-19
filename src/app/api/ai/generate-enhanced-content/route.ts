// src/app/api/ai/generate-enhanced-content/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { settingsAggregator } from '@/lib/settings-aggregator'
import { getEnhancedRelevantImages } from '@/lib/enhanced-image-matcher'
import { prisma } from '@/lib/prisma'

// Daily themes for content structure
const DAILY_THEMES = {
  monday: { theme: 'Monday Motivation', focus: 'Start week strong with service highlights', emoji: '💪' },
  tuesday: { theme: 'Tuesday Tips', focus: 'Educational HVAC/plumbing/electrical tips', emoji: '💡' },
  wednesday: { theme: 'Wednesday Specials', focus: 'Mid-week promotional offers', emoji: '🎯' },
  thursday: { theme: 'Thursday Maintenance', focus: 'Maintenance reminders and safety tips', emoji: '🔧' },
  friday: { theme: 'Friday Prep', focus: 'Weekend preparation and emergency service', emoji: '🏠' },
  saturday: { theme: 'Saturday Solutions', focus: 'Weekend project help and emergency availability', emoji: '🛠️' },
  sunday: { theme: 'Sunday Planning', focus: 'Week ahead preparation and maintenance planning', emoji: '📋' }
}

// Helper function to determine current season
function getCurrentSeason(month: number): string {
  if (month >= 3 && month <= 4) return 'Spring'
  if (month >= 5 && month <= 8) return 'Summer'
  if (month >= 9 && month <= 10) return 'Fall'
  return 'Winter'
}

// Helper function to get platform information
function getPlatformInfo(platform: string) {
  const platforms = {
    'google': { name: 'Google Business Profile', charLimit: 1500, optimal: '200-400' },
    'facebook': { name: 'Facebook', charLimit: 63206, optimal: '200-400' },
    'instagram': { name: 'Instagram', charLimit: 2200, optimal: '100-200' },
    'twitter': { name: 'X/Twitter', charLimit: 280, optimal: '240-270' }
  }
  return platforms[platform as keyof typeof platforms] || platforms.facebook
}

// Helper function for intelligent content truncation
function intelligentTruncate(content: string, maxLength: number): string {
  if (content.length <= maxLength) return content
  
  // Try to truncate at sentence boundary
  const sentences = content.split(/[.!?]+/)
  let truncated = ''
  
  for (const sentence of sentences) {
    const potential = truncated + (truncated ? '. ' : '') + sentence.trim()
    if (potential.length <= maxLength - 3) { // -3 for "..."
      truncated = potential
    } else {
      break
    }
  }
  
  if (truncated) return truncated + '...'
  
  // Fallback to word boundary
  const words = content.split(' ')
  truncated = ''
  
  for (const word of words) {
    const potential = truncated + (truncated ? ' ' : '') + word
    if (potential.length <= maxLength - 3) { // -3 for "..."
      truncated = potential
    } else {
      break
    }
  }
  
  return truncated + '...'
}

// Rotation state tracking (in production, this would be stored in database)
const rotationState: Record<string, { lastServiceType: string; dayCount: number }> = {}

/**
 * Select balanced specials with rotation to ensure equal service type distribution
 */
function selectBalancedSpecials(
  monthlySpecials: { hvac?: string[], plumbing?: string[], electrical?: string[], all?: string[] },
  businessId: string,
  day: string
): string[] {
  if (!monthlySpecials) return []

  // Initialize rotation state for this business
  if (!rotationState[businessId]) {
    rotationState[businessId] = { lastServiceType: '', dayCount: 0 }
  }

  const rotation = rotationState[businessId]
  rotation.dayCount++

  // Collect all available specials by service type
  const availableSpecials = {
    hvac: Array.isArray(monthlySpecials.hvac) ? monthlySpecials.hvac : [],
    plumbing: Array.isArray(monthlySpecials.plumbing) ? monthlySpecials.plumbing : [],
    electrical: Array.isArray(monthlySpecials.electrical) ? monthlySpecials.electrical : [],
    all: Array.isArray(monthlySpecials.all) ? monthlySpecials.all : []
  }

  // Determine which service type to focus on this time
  const serviceTypes = ['hvac', 'plumbing', 'electrical']
  let selectedServiceType: string

  // Ensure balanced rotation
  if (rotation.dayCount === 1) {
    selectedServiceType = serviceTypes[0]
  } else {
    const lastIndex = serviceTypes.indexOf(rotation.lastServiceType)
    const nextIndex = (lastIndex + 1) % serviceTypes.length
    selectedServiceType = serviceTypes[nextIndex]
  }

  rotation.lastServiceType = selectedServiceType

  // Build the selected specials array
  const selectedSpecials: string[] = []

  // Add one primary service special
  const primarySpecials = availableSpecials[selectedServiceType as keyof typeof availableSpecials]
  if (primarySpecials.length > 0) {
    const randomIndex = Math.floor(Math.random() * primarySpecials.length)
    selectedSpecials.push(primarySpecials[randomIndex])
  }

  // Add "all" service specials if available (but limit to avoid over-promotion)
  if (availableSpecials.all.length > 0 && selectedSpecials.length < 2) {
    const randomIndex = Math.floor(Math.random() * availableSpecials.all.length)
    selectedSpecials.push(availableSpecials.all[randomIndex])
  }

  // For Wednesday (specials day), try to add one more special from a different service
  if (day === 'wednesday' && selectedSpecials.length === 1) {
    const otherServices = serviceTypes.filter(service => service !== selectedServiceType)
    for (const service of otherServices) {
      const serviceSpecials = availableSpecials[service as keyof typeof availableSpecials]
      if (serviceSpecials.length > 0) {
        const randomIndex = Math.floor(Math.random() * serviceSpecials.length)
        selectedSpecials.push(serviceSpecials[randomIndex])
        break
      }
    }
  }

  console.log(`🔄 Rotation for ${businessId}: Day ${rotation.dayCount}, Service: ${selectedServiceType}, Selected: ${selectedSpecials.length} specials`)
  
  return selectedSpecials
}

/**
 * Get business information from database and settings
 */
async function getBusinessInfo(businessId: string) {
  try {
    // Get business from database
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      include: {
        businessProfile: true
      }
    })

    if (!business) {
      throw new Error(`Business not found: ${businessId}`)
    }

    return {
      id: business.id,
      name: business.name,
      displayName: business.displayName,
      phone: business.phone || getDefaultPhone(businessId),
      website: business.website || getDefaultWebsite(businessId),
      brandVoice: business.brandVoice || business.businessProfile?.brandVoice || getDefaultBrandVoice(businessId),
      tagline: business.tagline || getDefaultTagline(businessId),
      serviceTypes: business.businessProfile?.serviceTypes || getDefaultServiceTypes(business.type),
      serviceAreas: business.businessProfile?.serviceAreas || [],
      businessHours: business.businessProfile?.businessHours || null,
      emergencyContact: business.businessProfile?.emergencyContact || business.phone,
      messageStyle: business.businessProfile?.messageStyle || 'professional',
      voiceTone: business.businessProfile?.voiceTone || 'professional'
    }
  } catch (error) {
    console.error(`Error getting business info for ${businessId}:`, error)
    return getDefaultBusinessInfo(businessId)
  }
}

/**
 * Get default business information as fallback
 */
function getDefaultBusinessInfo(businessId: string) {
  const businessData = {
    'lex-dallas': {
      name: 'Lex Air Conditioning, Heating, Plumbing & Electrical',
      displayName: 'Lex Dallas',
      phone: '(972) 466-1917',
      website: 'https://lexairconditioning.com',
      brandVoice: 'Professional and polished, representing the gold standard of white glove service',
      tagline: 'The Gold Standard of White Glove Service',
      serviceTypes: ['hvac', 'plumbing', 'electrical'],
      serviceAreas: ['Dallas', 'Plano', 'Frisco', 'McKinney'],
      messageStyle: 'professional',
      voiceTone: 'professional',
      emergencyContact: '(972) 466-1917',
      businessHours: null
    },
    'lex-etx': {
      name: 'Lex ETX Air Conditioning, Heating, Plumbing & Electrical',
      displayName: 'Lex ETX',
      phone: '(903) 596-7020',
      website: 'https://lexetx.com',
      brandVoice: 'Honest and straightforward, providing quality workmanship with reliable service',
      tagline: 'Quality workmanship, honest service',
      serviceTypes: ['hvac', 'plumbing', 'electrical'],
      serviceAreas: ['Tyler', 'Longview', 'Marshall', 'Kilgore'],
      messageStyle: 'professional',
      voiceTone: 'professional',
      emergencyContact: '(903) 596-7020',
      businessHours: null
    },
    'lyons': {
      name: 'Lyons Air Conditioning and Heating',
      displayName: 'Lyons',
      phone: '(972) 428-2995',
      website: 'https://lyonsair.com',
      brandVoice: 'Confident and approachable, treating customers like royalty with unmatched service',
      tagline: 'The King of 5-Star Service',
      serviceTypes: ['hvac'],
      serviceAreas: ['Carrollton', 'Addison', 'Farmers Branch', 'Plano'],
      messageStyle: 'enthusiastic',
      voiceTone: 'enthusiastic',
      emergencyContact: '(972) 428-2995',
      businessHours: null
    }
  }
  
  const data = businessData[businessId as keyof typeof businessData]
  return data ? { id: businessId, ...data } : {
    id: businessId,
    name: businessId,
    displayName: businessId,
    phone: '(555) 123-4567',
    website: 'https://example.com',
    brandVoice: 'Professional service provider',
    tagline: 'Quality Service',
    serviceTypes: ['hvac', 'plumbing', 'electrical'],
    serviceAreas: [],
    messageStyle: 'professional',
    voiceTone: 'professional',
    emergencyContact: '(555) 123-4567',
    businessHours: null
  }
}

function getDefaultPhone(businessId: string): string {
  const phones = {
    'lex-dallas': '(972) 466-1917',
    'lex-etx': '(903) 596-7020',
    'lyons': '(972) 428-2995'
  }
  return phones[businessId as keyof typeof phones] || '(555) 123-4567'
}

function getDefaultWebsite(businessId: string): string {
  const websites = {
    'lex-dallas': 'https://lexairconditioning.com',
    'lex-etx': 'https://lexetx.com',
    'lyons': 'https://lyonsair.com'
  }
  return websites[businessId as keyof typeof websites] || 'https://example.com'
}

function getDefaultBrandVoice(businessId: string): string {
  const voices = {
    'lex-dallas': 'Professional and polished, representing the gold standard of white glove service',
    'lex-etx': 'Honest and straightforward, providing quality workmanship with reliable service',
    'lyons': 'Confident and approachable, treating customers like royalty with unmatched service'
  }
  return voices[businessId as keyof typeof voices] || 'Professional service provider'
}

function getDefaultTagline(businessId: string): string {
  const taglines = {
    'lex-dallas': 'The Gold Standard of White Glove Service',
    'lex-etx': 'Quality workmanship, honest service',
    'lyons': 'The King of 5-Star Service'
  }
  return taglines[businessId as keyof typeof taglines] || 'Quality Service'
}

function getDefaultServiceTypes(businessType: string): string[] {
  if (businessType === 'hvac') return ['hvac']
  if (businessType === 'plumbing') return ['plumbing']  
  if (businessType === 'electrical') return ['electrical']
  return ['hvac', 'plumbing', 'electrical']
}

/**
 * Clean unwanted formatting and placeholders from generated content
 */
function cleanGeneratedContent(content: string, businessInfo: any): string {
  let cleaned = content

  // Remove common unwanted headers and labels
  cleaned = cleaned.replace(/^###?\s*(Facebook|Instagram|Twitter|Google|LinkedIn)\s*(Post|Update)?\s*(for|:).*$/gim, '')
  cleaned = cleaned.replace(/^(Facebook|Instagram|Twitter|Google|LinkedIn)\s*(Post|Update)?\s*:?\s*/gim, '')
  cleaned = cleaned.replace(/^Post\s*:?\s*/gim, '')
  cleaned = cleaned.replace(/^\*\*Post\s*:?\*\*\s*/gim, '')
  
  // Remove unwanted suggestions and instructions
  cleaned = cleaned.replace(/Feel free to adjust.*$/gim, '')
  cleaned = cleaned.replace(/You can customize.*$/gim, '')
  cleaned = cleaned.replace(/Don't forget to.*$/gim, '')
  cleaned = cleaned.replace(/\*\*Note:.*$/gim, '')
  cleaned = cleaned.replace(/Note:.*$/gim, '')
  
  // Remove lines starting with "---"
  cleaned = cleaned.replace(/^-{3,}.*$/gim, '')
  
  // Clean up markdown formatting
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1') // Remove **bold**
  cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1')     // Remove *italic*
  cleaned = cleaned.replace(/_{2}([^_]+)_{2}/g, '$1') // Remove __bold__
  cleaned = cleaned.replace(/_([^_]+)_/g, '$1')       // Remove _italic_
  
  // Replace common placeholders with actual business info
  cleaned = cleaned.replace(/\[Your Number\]/g, businessInfo.phone)
  cleaned = cleaned.replace(/\[Company Name\]/g, businessInfo.displayName)
  cleaned = cleaned.replace(/\[Phone Number\]/g, businessInfo.phone)
  cleaned = cleaned.replace(/\[Business Name\]/g, businessInfo.displayName)
  cleaned = cleaned.replace(/\[Website\]/g, businessInfo.website)
  cleaned = cleaned.replace(/\[Phone\]/g, businessInfo.phone)
  
  // Clean up extra whitespace and empty lines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n')  // Max 2 consecutive newlines
  cleaned = cleaned.replace(/^\s+|\s+$/g, '')    // Trim whitespace
  cleaned = cleaned.replace(/\s{2,}/g, ' ')      // Replace multiple spaces with single space
  
  return cleaned
}

/**
 * Extract content blocks into organized format
 */
function organizeContentBlocks(contentBlocks: any[]) {
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
 * Generate content using OpenAI with proper business integration
 */
async function generateContentWithOpenAI(prompt: string, businessId: string, platform: string, day: string): Promise<string> {
  const openaiApiKey = process.env.OPENAI_API_KEY
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured')
  }

  const platformInfo = getPlatformInfo(platform)
  const isTwitter = platform === 'twitter'
  const maxAttempts = isTwitter ? 5 : 1
  let attemptCount = 0
  let enhancedPrompt = prompt
  let generatedContent = ''

  // Get business information
  const businessInfo = await getBusinessInfo(businessId)

  while (attemptCount < maxAttempts) {
    attemptCount++
    
    try {
      console.log(`🎯 Generation attempt ${attemptCount}${isTwitter ? ` for Twitter (${platformInfo.charLimit} char limit)` : ''}`)

      // Enhanced system prompt to prevent formatting issues
      const systemPrompt = `You are a professional social media content creator for HVAC, plumbing, and electrical service companies.

CRITICAL INSTRUCTIONS:
1. Return ONLY the final post content - nothing else
2. DO NOT include headers like "Facebook Post:" or "### Post for Business"
3. DO NOT include metadata, instructions, or suggestions 
4. DO NOT use markdown formatting like **bold** - use plain text with emojis for emphasis
5. DO NOT include placeholder text like [Your Number] or [Company Name]
6. DO NOT add suggestions like "Feel free to adjust..." at the end
7. Use actual business information when provided in the prompt
8. Create ready-to-publish content only
9. Include real contact information naturally in the content
10. Follow the brand voice and messaging style specified

The content should be engaging, professional, and include real business details like phone numbers and specific offers when provided.`

      // Enhanced user prompt with comprehensive business details
      const businessPrompt = `${enhancedPrompt}

🏢 BUSINESS INFORMATION FOR ${businessInfo.displayName.toUpperCase()}:
- Full Business Name: ${businessInfo.name}
- Display Name: ${businessInfo.displayName}
- Phone Number: ${businessInfo.phone}
- Website: ${businessInfo.website}
- Brand Voice: ${businessInfo.brandVoice}
- Tagline: ${businessInfo.tagline}
- Message Style: ${businessInfo.messageStyle}
- Voice Tone: ${businessInfo.voiceTone}
- Service Types: ${businessInfo.serviceTypes.join(', ')}
- Service Areas: ${businessInfo.serviceAreas.join(', ')}
- Emergency Contact: ${businessInfo.emergencyContact}

MANDATORY REQUIREMENTS:
- Use the EXACT phone number: ${businessInfo.phone}
- Use the EXACT website: ${businessInfo.website}
- Use the EXACT business name: ${businessInfo.displayName}
- Follow the brand voice: ${businessInfo.brandVoice}
- Match the message style: ${businessInfo.messageStyle}
- Include relevant service types: ${businessInfo.serviceTypes.join(', ')}
- NEVER use placeholders - use actual information only

Return ONLY the post content, ready to publish immediately.`

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
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
              content: businessPrompt
            }
          ],
          max_tokens: 500,
          temperature: 0.7,
          top_p: 1,
          frequency_penalty: 0.1,
          presence_penalty: 0.1
        })
      })

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      
      if (!result.choices || !result.choices[0]?.message?.content) {
        throw new Error('Invalid response from OpenAI API')
      }

      generatedContent = result.choices[0].message.content.trim()

      // Enhanced content cleaning with business info
      generatedContent = cleanGeneratedContent(generatedContent, businessInfo)
      
      console.log(`📝 Cleaned content (${generatedContent.length} chars):`, generatedContent.substring(0, 100) + '...')

      // For Twitter, check length and retry if needed
      if (isTwitter) {
        const contentLength = generatedContent.length
        
        if (contentLength > 280) {
          console.log(`⚠️ Twitter content too long: ${contentLength} chars. Attempt ${attemptCount}/${maxAttempts}`)
          
          if (attemptCount < maxAttempts) {
            // Make prompt more restrictive for retry
            if (attemptCount === 2) {
              enhancedPrompt = `${prompt}\n\nCRITICAL: MAXIMUM 270 characters total including spaces and hashtags. Current attempt: ${contentLength} chars - TOO LONG! Make much shorter.`
            } else if (attemptCount === 3) {
              enhancedPrompt = `Create short Twitter post for ${businessInfo.displayName} about ${day}. MAX 250 characters. Include ${businessInfo.phone} and 1-2 hashtags only. Very brief.`
            } else if (attemptCount === 4) {
              enhancedPrompt = `${businessInfo.displayName} ${day} tweet. Under 240 chars. ${businessInfo.phone} + hashtags. Super short.`
            }
            continue
          } else {
            // Last resort: intelligent truncation
            console.log(`⚠️ Max attempts reached. Truncating content...`)
            generatedContent = intelligentTruncate(generatedContent, 280)
          }
        }

        console.log(`✅ Twitter content generated successfully in ${attemptCount} attempts (${generatedContent.length} chars)`)
        break

      } else {
        // Non-Twitter platforms, accept on first attempt
        break
      }

    } catch (error) {
      console.error(`❌ Generation attempt ${attemptCount} failed:`, error)
      
      if (attemptCount >= maxAttempts) {
        throw new Error(`Content generation failed after ${maxAttempts} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
      
      // For retries, simplify the prompt
      enhancedPrompt = `Create a short ${platform} post for ${businessInfo.displayName} about ${day}. Include ${businessInfo.phone}. Keep under ${platformInfo.charLimit} characters.`
    }
  }

  if (!generatedContent) {
    throw new Error('Failed to generate content')
  }

  return generatedContent
}

/**
 * Search for relevant images with better error handling
 */
async function searchRelevantImages(
  businessId: string,
  content: string,
  day: string,
  platform: string,
  excludeImageIds: string[] = [] // NEW: Exclude already-selected images in batch
) {
  try {
    console.log(`🔍 Searching images for: businessId=${businessId}, day=${day}, platform=${platform}`)
    if (excludeImageIds.length > 0) {
      console.log(`🚫 Excluding ${excludeImageIds.length} already-selected images for batch variety`)
    }

    // Get business settings which includes image library
    const businessSettings = await settingsAggregator.getBusinessSettings(businessId)

    if (!businessSettings.imageLibrary || businessSettings.imageLibrary.length === 0) {
      console.log('📷 No image library found for business')
      return null
    }

    console.log(`📚 Image library size: ${businessSettings.imageLibrary.length} images`)

    // Import and use the enhanced image matcher properly
    const { getEnhancedRelevantImages: imageMatcherFunction } = await import('@/lib/enhanced-image-matcher')

    const imageResults = imageMatcherFunction(
      businessSettings,
      content,
      'weekly-automation', // contentType
      day,
      { businessId, platform }, // businessContext
      excludeImageIds // NEW: Pass excluded image IDs for batch variety
    )

    console.log('🎯 Image matching results:', {
      resultType: typeof imageResults,
      isArray: Array.isArray(imageResults),
      length: Array.isArray(imageResults) ? imageResults.length : 0,
      hasResults: !!imageResults
    })

    return imageResults

  } catch (error) {
    console.error('❌ Enhanced image matching failed:', error)
    return null
  }
}

/**
 * Helper functions to extract image data consistently
 */
function getImageUrl(imageResults: any): string | null {
  if (!imageResults) return null

  // Handle array of results
  if (Array.isArray(imageResults) && imageResults.length > 0) {
    const firstResult = imageResults[0]
    return firstResult.image?.cloudUrl || firstResult.selectedImage?.url || null
  }

  // Handle single result object
  if (imageResults.selectedImage?.url) {
    return imageResults.selectedImage.url
  }

  // Handle direct image object
  if (imageResults.image?.cloudUrl) {
    return imageResults.image.cloudUrl
  }

  return null
}

function getImageId(imageResults: any): string | null {
  if (!imageResults) return null

  // Handle array of results
  if (Array.isArray(imageResults) && imageResults.length > 0) {
    return imageResults[0].image?.id || null
  }

  // Handle single result object
  if (imageResults.selectedImage?.id) {
    return imageResults.selectedImage.id
  }

  // Handle direct image object
  if (imageResults.image?.id) {
    return imageResults.image.id
  }

  return null
}

function getImageDescription(imageResults: any): string | null {
  if (!imageResults) return null
  
  // Handle array of results
  if (Array.isArray(imageResults) && imageResults.length > 0) {
    const firstResult = imageResults[0]
    return firstResult.description || firstResult.image?.aiDescription || firstResult.selectedImage?.description || null
  }
  
  // Handle single result object
  if (imageResults.selectedImage?.description) {
    return imageResults.selectedImage.description
  }
  
  // Handle direct image object
  if (imageResults.image?.aiDescription) {
    return imageResults.image.aiDescription
  }
  
  return null
}

function getImageAlternatives(imageResults: any): any[] {
  if (!imageResults) return []
  
  // Handle array of results - return all except first as alternatives
  if (Array.isArray(imageResults) && imageResults.length > 1) {
    return imageResults.slice(1).map(result => ({
      url: result.image?.cloudUrl,
      description: result.description || result.image?.aiDescription,
      score: result.relevanceScore
    }))
  }
  
  // Handle single result object with alternatives
  if (imageResults.alternatives && Array.isArray(imageResults.alternatives)) {
    return imageResults.alternatives
  }
  
  return []
}

// SMART DATE FUNCTIONS
function getRelevantMonthsForSpecials(relevantMonths?: number[], postDate?: string, fallbackMonth?: number): number[] {
  if (relevantMonths && relevantMonths.length > 0) {
    // Use the provided relevant months from smart date logic
    console.log('📅 Using smart date relevant months:', relevantMonths)
    return relevantMonths
  }
  
  if (postDate) {
    // Use the post date's month
    const month = new Date(postDate).getMonth()
    console.log('📅 Using post date month:', month)
    return [month]
  }
  
  // Fallback to provided month or current month
  const month = fallbackMonth !== undefined ? fallbackMonth : new Date().getMonth()
  console.log('📅 Using fallback month:', month)
  return [month]
}

function getSeasonalContextFromDate(postDate?: string): string {
  const date = postDate ? new Date(postDate) : new Date()
  const month = date.getMonth()
  return getCurrentSeason(month)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      prompt,
      businessId,
      platform,
      contentType,
      includeSpecials = false,
      includeImages = false,
      includeContentBlocks = false,
      day,
      month = new Date().getMonth(), // Default to current month (fallback)
      // NEW: Smart date parameters
      postDate,
      relevantMonths,
      seasonalContext,
      // NEW: Batch image exclusion for variety
      excludeImageIds = []
    } = body

    console.log('🔧 Enhanced content generation request:', {
      businessId,
      platform,
      contentType,
      includeSpecials,
      includeImages,
      day,
      month,
      // NEW: Smart date logging
      postDate,
      relevantMonths,
      seasonalContext,
      hasSmartDates: !!(postDate || relevantMonths)
    })

    // Load business settings with better error handling
    let businessSettings
    try {
      businessSettings = await settingsAggregator.getBusinessSettings(businessId)
      console.log('📊 Loaded business settings:', {
        hasProfile: !!businessSettings.profile,
        monthlySpecialsCount: businessSettings.monthlySpecials?.length || 0,
        contentBlocksCount: businessSettings.contentBlocks?.length || 0,
        imageLibraryCount: businessSettings.imageLibrary?.length || 0
      })
    } catch (error) {
      console.error('❌ Failed to load business settings:', error)
      // Continue with minimal settings rather than failing
      businessSettings = {
        businessId,
        profile: null,
        contentBlocks: [],
        monthlySpecials: [],
        templatePreferences: null,
        imageLibrary: []
      }
    }

    // Get business information
    const businessInfo = await getBusinessInfo(businessId)
    console.log('🏢 Business info loaded:', {
      name: businessInfo.displayName,
      phone: businessInfo.phone,
      website: businessInfo.website,
      brandVoice: businessInfo.brandVoice?.substring(0, 50) + '...'
    })

    // Generate platform-specific content
    const platformInfo = getPlatformInfo(platform)
    const dayThemes = DAILY_THEMES
    
    // SMART DATE LOGIC: Use smart seasonal context or calculate from post date
    const smartSeasonalContext = seasonalContext || getSeasonalContextFromDate(postDate)
    
    // SMART DATE LOGIC: Get relevant months for specials
    const monthsToUse = getRelevantMonthsForSpecials(relevantMonths, postDate, month)
    
    // Enhanced prompt building with complete business integration
    let enhancedPrompt = `Create professional social media content for ${businessInfo.displayName}.`
    
    enhancedPrompt += `\n\n🎯 BUSINESS CONTEXT:`
    enhancedPrompt += `\nBusiness: ${businessInfo.name} (${businessInfo.displayName})`
    enhancedPrompt += `\nPhone: ${businessInfo.phone}`
    enhancedPrompt += `\nWebsite: ${businessInfo.website}`
    enhancedPrompt += `\nTagline: ${businessInfo.tagline}`
    enhancedPrompt += `\nServices: ${businessInfo.serviceTypes.join(', ')}`
    if (businessInfo.serviceAreas.length > 0) {
      enhancedPrompt += `\nService Areas: ${businessInfo.serviceAreas.join(', ')}`
    }
    
    enhancedPrompt += `\n\n🎨 BRAND GUIDELINES:`
    enhancedPrompt += `\nBrand Voice: ${businessInfo.brandVoice}`
    enhancedPrompt += `\nMessage Style: ${businessInfo.messageStyle}`
    enhancedPrompt += `\nVoice Tone: ${businessInfo.voiceTone}`
    
    enhancedPrompt += `\n\n📱 CONTENT REQUIREMENTS:`
    enhancedPrompt += `\nPlatform: ${platform}`
    enhancedPrompt += `\nContent theme: ${dayThemes[day as keyof typeof dayThemes]?.theme || day}`
    enhancedPrompt += `\nSeason: ${smartSeasonalContext} content considerations`
    
    // SMART DATE CONTEXT: Add post date context if available
    if (postDate) {
      const postDateObj = new Date(postDate)
      enhancedPrompt += `\nPost Date: ${postDateObj.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}`
    }

    // ENHANCED SPECIALS LOADING: Use smart months
    let selectedSpecials: string[] = []
    let specialsIncluded = false
    
    if (includeSpecials) {
      console.log('🎯 Processing monthly specials with smart dates...')
      console.log('📅 Months to check for specials:', monthsToUse.map(m => new Date(2024, m, 1).toLocaleString('en-US', { month: 'long' })))
      
      try {
        const currentYear = postDate ? new Date(postDate).getFullYear() : new Date().getFullYear()
        
        // Get specials for all relevant months
        const monthlySpecialsRecords = await prisma.monthlySpecial.findMany({
          where: {
            businessId,
            year: currentYear,
            month: { in: monthsToUse }
          }
        })
        
        console.log(`📋 Found ${monthlySpecialsRecords.length} monthly special records for months:`, monthsToUse)
        
        if (monthlySpecialsRecords.length > 0) {
          // Combine specials from all relevant months
          const allSpecials = {
            hvac: [] as string[],
            plumbing: [] as string[],
            electrical: [] as string[],
            all: [] as string[]
          }
          
          monthlySpecialsRecords.forEach(record => {
            if (record.hvac) allSpecials.hvac.push(...record.hvac)
            if (record.plumbing) allSpecials.plumbing.push(...record.plumbing)
            if (record.electrical) allSpecials.electrical.push(...record.electrical)
            if (record.all) allSpecials.all.push(...record.all)
          })
          
          console.log('🎯 Combined specials from all relevant months:', {
            hvac: allSpecials.hvac.length,
            plumbing: allSpecials.plumbing.length,
            electrical: allSpecials.electrical.length,
            all: allSpecials.all.length
          })
          
          selectedSpecials = selectBalancedSpecials(allSpecials, businessId, day)
          specialsIncluded = selectedSpecials.length > 0
          
          console.log('🎲 Selected specials after rotation:', selectedSpecials)
        } else {
          console.log(`⚠️ No monthly specials found for ${businessId}, year: ${currentYear}, months: ${monthsToUse.join(', ')}`)
        }
      } catch (error) {
        console.error('❌ Error loading monthly specials:', error)
      }
    }

    // Add specials to prompt if available
    if (selectedSpecials.length > 0) {
      enhancedPrompt += `\n\n🎯 PROMOTIONAL SPECIALS TO INCLUDE:`
      selectedSpecials.forEach((special, index) => {
        enhancedPrompt += `\n${index + 1}. ${special}`
      })
      enhancedPrompt += `\n\nIMPORTANT: You MUST include at least one of these specials in your content using the exact wording provided.`
    } else if (includeSpecials) {
      console.log('⚠️ Specials requested but none available - continuing without specials')
    }

    // Add content blocks if available
    if (includeContentBlocks && businessSettings.contentBlocks.length > 0) {
      const contentBlocks = organizeContentBlocks(businessSettings.contentBlocks)
      enhancedPrompt += `\n\n📞 AVAILABLE CONTENT BLOCKS:`
      
      Object.keys(contentBlocks).forEach(type => {
        enhancedPrompt += `\n${type.toUpperCase()}: ${contentBlocks[type].join(', ')}`
      })
    }

    // Final content guidelines with business-specific requirements
    enhancedPrompt += `\n\n✅ FINAL REQUIREMENTS:
- Professional, ${businessInfo.voiceTone} tone matching ${businessInfo.messageStyle} style
- Include compelling call-to-action
- Use EXACT phone number: ${businessInfo.phone}
- Use EXACT website: ${businessInfo.website}
- Use EXACT business name: ${businessInfo.displayName}
- Focus on customer benefits and value
- Use relevant hashtags (${platform === 'twitter' ? '2-3 max' : '3-5'})
- Incorporate seasonal relevance when appropriate (${smartSeasonalContext})
- Highlight expertise and reliability
- Emergency service availability when relevant
${selectedSpecials.length > 0 ? '- MUST mention the promotional specials listed above' : ''}

PLATFORM REQUIREMENTS:
- ${platform === 'twitter' ? 'Twitter/X: Maximum 280 characters including spaces, hashtags, and punctuation' : ''}
- ${platform === 'instagram' ? 'Instagram: Maximum 2,200 characters but aim for 100-200 for best engagement' : ''}
- ${platform === 'facebook' ? 'Facebook: Can be longer but aim for 200-400 characters for best engagement' : ''}
- ${platform === 'google' ? 'Google Business Profile: Maximum 1,500 characters but aim for 200-300' : ''}

Create engaging, platform-appropriate content that drives customer engagement and builds trust.`

    console.log('📝 Final prompt length:', enhancedPrompt.length)
    console.log('🎯 Smart date enhanced specials included:', specialsIncluded)
    console.log('📅 Relevant months used for specials:', monthsToUse.map(m => new Date(2024, m, 1).toLocaleString('en-US', { month: 'long' })))

    // Generate content with OpenAI
    let generatedContent = await generateContentWithOpenAI(enhancedPrompt, businessId, platform, day)

    // Enhanced image selection with better fallback and usage tracking
    let imageResults: any = null
    if (includeImages) {
      try {
        console.log('🖼️ Attempting to find relevant images...')
        
        imageResults = await searchRelevantImages(businessId, generatedContent, day, platform, excludeImageIds)
        
        console.log('🖼️ Image search results:', {
          hasResults: !!imageResults,
          isArray: Array.isArray(imageResults),
          length: Array.isArray(imageResults) ? imageResults.length : 0,
          firstResult: Array.isArray(imageResults) && imageResults.length > 0 ? {
            fileName: imageResults[0].image?.originalName,
            score: imageResults[0].relevanceScore,
            url: imageResults[0].image?.cloudUrl
          } : null
        })
        
        if (!imageResults || (Array.isArray(imageResults) && imageResults.length === 0)) {
          console.log('⚠️ No relevant images found, checking image library status...')
          
          // Check if business has any images at all
          const imageCount = await prisma.imageLibrary.count({
            where: { businessId, isActive: true }
          })
          
          if (imageCount === 0) {
            console.log('❌ No images in library for this business')
          } else {
            console.log(`📷 Found ${imageCount} images in library, but none matched search criteria`)
            
            // Fallback: Get any image from the library as backup
            const fallbackImage = await prisma.imageLibrary.findFirst({
              where: { businessId, isActive: true },
              orderBy: { uploadedAt: 'desc' }
            })
            
            if (fallbackImage) {
              console.log('🔄 Using fallback image:', fallbackImage.originalName)
              imageResults = [{
                image: fallbackImage,
                relevanceScore: 10,
                matchingFactors: ['fallback_image'],
                description: fallbackImage.aiDescription || 'Company image'
              }]
            }
          }
        }
        
        // CRITICAL: Update usage tracking for selected image
        if (imageResults && Array.isArray(imageResults) && imageResults.length > 0) {
          const selectedImage = imageResults[0].image
          if (selectedImage?.id) {
            try {
              await prisma.imageLibrary.update({
                where: { id: selectedImage.id },
                data: {
                  usageCount: { increment: 1 },
                  lastUsed: new Date()
                }
              })
              console.log('✅ Updated image usage tracking:', {
                imageId: selectedImage.id,
                fileName: selectedImage.originalName,
                newUsageCount: selectedImage.usageCount + 1
              })
            } catch (updateError) {
              console.error('⚠️ Failed to update image usage tracking:', updateError)
              // Don't fail the request if usage tracking fails
            }
          }
        }
      } catch (error) {
        console.error('❌ Image matching failed:', error)
      }
    }

    // Prepare response
    const characterCount = generatedContent.length
    const withinLimits = characterCount <= platformInfo.charLimit

    const metadata = {
      platform,
      characterCount,
      withinLimits,
      platformLimit: platformInfo.charLimit,
      day,
      contentType,
      businessId,
      // SMART DATE METADATA
      month: monthsToUse.length === 1 ? monthsToUse[0] : monthsToUse,
      postDate,
      relevantMonths: monthsToUse,
      seasonalContext: smartSeasonalContext,
      smartDatesUsed: !!(postDate || relevantMonths),
      generatedAt: new Date().toISOString(),
      specialsRequested: includeSpecials,
      specialsFound: specialsIncluded,
      specialsCount: selectedSpecials.length,
      imagesRequested: includeImages,
      imageFound: !!(getImageUrl(imageResults)),
      businessInfo: {
        name: businessInfo.displayName,
        phone: businessInfo.phone,
        website: businessInfo.website
      },
      imageSearchResults: Array.isArray(imageResults) ? imageResults.length : (imageResults ? 1 : 0),
      imageSelectionMethod: imageResults ? 'ai_matched' : 'none'
    }

    const response = {
      success: true,
      data: {
        content: generatedContent,
        characterCount,
        withinLimits,
        suggestedImage: getImageUrl(imageResults),
        suggestedImageUrl: getImageUrl(imageResults),
        selectedImageId: getImageId(imageResults), // NEW: Return image ID for batch exclusion
        imageDescription: getImageDescription(imageResults),
        imageAlternatives: getImageAlternatives(imageResults),
        templateUsed: contentType,
        monthlySpecials: selectedSpecials,
        specialsIncluded,
        metadata,
        // NEW: Smart date metadata in response
        smartDateMetadata: {
          postDate,
          relevantMonths: monthsToUse,
          seasonalContext: smartSeasonalContext,
          monthlySpecialsUsed: selectedSpecials.length,
          monthsCheckedForSpecials: monthsToUse.map(m => new Date(2024, m, 1).toLocaleString('en-US', { month: 'long' }))
        }
      }
    }

    // Enhanced debugging output
    console.log('✅ Generation completed with smart dates:', {
      contentLength: generatedContent.length,
      specialsIncluded: specialsIncluded,
      specialsCount: selectedSpecials.length,
      imageFound: !!(getImageUrl(imageResults)),
      withinLimits: withinLimits,
      businessName: businessInfo.displayName,
      phoneIncluded: generatedContent.includes(businessInfo.phone),
      websiteIncluded: generatedContent.includes(businessInfo.website.replace('https://', '').replace('www.', '')),
      // SMART DATE DEBUG
      smartPostDate: postDate,
      relevantMonths: monthsToUse.map(m => new Date(2024, m, 1).toLocaleString('en-US', { month: 'long' })),
      seasonalContext: smartSeasonalContext
    })

    return NextResponse.json(response)

  } catch (error) {
    console.error('❌ Enhanced content generation error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Content generation failed',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
