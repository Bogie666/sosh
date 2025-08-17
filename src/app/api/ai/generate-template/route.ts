// src/app/api/ai/generate-template/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { aiService } from '@/lib/ai-service'

export async function POST(request: NextRequest) {
  try {
    if (!aiService.isConfigured()) {
      return NextResponse.json(
        { success: false, error: 'AI service not configured. Please check OpenAI API key.' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { 
      month, 
      specials, 
      businesses, 
      platforms, 
      type = 'template',
      customPrompt,
      templateType = 'seasonal_tip'
    } = body

    if (!month) {
      return NextResponse.json(
        { success: false, error: 'Month is required' },
        { status: 400 }
      )
    }

    if (!businesses?.length) {
      return NextResponse.json(
        { success: false, error: 'At least one business must be selected' },
        { status: 400 }
      )
    }

    // Generate content for the primary business (first selected)
    const primaryBusiness = businesses[0]
    const primaryPlatform = platforms?.[0] || 'facebook'

    let generatedContent = ''

    if (type === 'custom' && customPrompt) {
      // Generate custom content
      const result = await aiService.generateSocialContent(
        customPrompt,
        primaryBusiness,
        primaryPlatform
      )
      
      if (result.success) {
        generatedContent = result.content
      } else {
        throw new Error(result.error)
      }
    } else if (type === 'template') {
      // Generate template-based content
      let prompt = `Create engaging ${month} social media content`
      
      // Add specials information if provided
      if (specials && Object.keys(specials).length > 0) {
        const specialsList = Object.entries(specials)
          .flatMap(([category, items]) => 
            Array.isArray(items) ? items.map(item => `${category}: ${item}`) : []
          )
        
        if (specialsList.length > 0) {
          prompt += ` featuring these promotions: ${specialsList.join(', ')}`
        }
      }
      
      // Add business context
      if (businesses.length > 1) {
        prompt += `. This content will be used across multiple business locations: ${businesses.join(', ')}`
      }
      
      // Add platform context
      if (platforms && platforms.length > 0) {
        prompt += `. Optimize for these platforms: ${platforms.join(', ')}`
      }

      const result = await aiService.generateSocialContent(
        prompt,
        primaryBusiness,
        primaryPlatform
      )
      
      if (result.success) {
        generatedContent = result.content
      } else {
        throw new Error(result.error)
      }
    } else {
      // Generate content using predefined templates
      const result = await aiService.generateContentFromTemplate(
        templateType,
        primaryBusiness,
        primaryPlatform,
        {
          month,
          specials,
          businesses,
          platforms
        }
      )
      
      if (result.success) {
        generatedContent = result.content
      } else {
        throw new Error(result.error)
      }
    }

    // Add business-specific adaptations if multiple businesses
    if (businesses.length > 1) {
      generatedContent += `\n\n[Note: This content can be adapted for ${businesses.join(', ')}]`
    }

    return NextResponse.json({
      success: true,
      content: generatedContent,
      metadata: {
        month,
        businesses,
        platforms,
        type,
        specialsIncluded: specials ? Object.keys(specials).length : 0
      }
    })

  } catch (error) {
    console.error('Error generating AI content:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to generate content' 
      },
      { status: 500 }
    )
  }
}

// Also handle GET requests for template info
export async function GET() {
  try {
    const currentSeason = aiService.getCurrentSeason()
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
      isConfigured: aiService.isConfigured()
    })

  } catch (error) {
    console.error('Error getting AI info:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get AI information' },
      { status: 500 }
    )
  }
}