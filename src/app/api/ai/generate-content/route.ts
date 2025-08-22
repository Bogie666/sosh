// src/app/api/ai/generate-content/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { aiService } from '@/lib/ai-service'

// Helper function to determine current season (Dallas, TX climate)
function getCurrentSeason(month: number): string {
  if (month >= 2 && month <= 4) return 'Spring' // March-May: Mild, unpredictable
  if (month >= 5 && month <= 9) return 'Summer' // June-October: Hot and humid
  if (month >= 10 && month <= 11) return 'Fall' // November-December: Pleasant
  return 'Winter' // January-February: Mild winter
}

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
      prompt,
      businessName = 'lex',
      platform = 'facebook',
      templateType,
      contentType = 'custom',
      options = {}
    } = body

    if (!prompt && !templateType) {
      return NextResponse.json(
        { success: false, error: 'Either prompt or templateType is required' },
        { status: 400 }
      )
    }

    console.log(`Generating AI content for: ${businessName} on ${platform}`)
    console.log(`Content type: ${contentType}`)
    console.log(`Template: ${templateType || 'custom'}`)

    let result

    if (templateType) {
      // Generate content using a predefined template
      result = await aiService.generateContentFromTemplate(
        templateType,
        businessName,
        platform,
        options
      )
    } else {
      // Generate custom content
      result = await aiService.generateSocialContent(
        prompt,
        businessName,
        platform,
        options
      )
    }

    if (!result.success) {
      throw new Error(result.error)
    }

    // Get platform specifications for reference
    const platformSpecs = aiService.getPlatformSpecs(platform)

    return NextResponse.json({
      success: true,
      content: result.content,
      metadata: {
        business: result.business,
        platform: result.platform,
        tokensUsed: result.tokens_used || 0,
        contentLength: result.content.length,
        platformSpecs: {
          maxLength: platformSpecs.maxLength,
          recommendedLength: platformSpecs.recommendedLength,
          withinLimits: result.content.length <= platformSpecs.maxLength
        },
        generatedAt: new Date().toISOString()
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

// Enhanced GET request for available templates and platform info
export async function GET() {
  try {
    const currentSeason = getCurrentSeason(new Date().getMonth())
    
    const availableTemplates = [
      {
        id: 'seasonal_tip',
        name: 'Seasonal Tips',
        description: 'Weather-appropriate HVAC tips and advice',
        category: 'Educational',
        frequency: 'Weekly'
      },
      {
        id: 'maintenance_reminder',
        name: 'Maintenance Reminders',
        description: 'Seasonal maintenance and tune-up reminders',
        category: 'Service',
        frequency: 'Bi-weekly'
      },
      {
        id: 'weather_alert',
        name: 'Weather Alerts',
        description: 'Weather-related HVAC protection tips',
        category: 'Urgent',
        frequency: 'As-needed'
      },
      {
        id: 'promotion',
        name: 'Promotions',
        description: 'Service promotions and special offers',
        category: 'Marketing',
        frequency: 'Monthly'
      },
      {
        id: 'customer_story',
        name: 'Customer Stories',
        description: 'Success stories and testimonials',
        category: 'Social Proof',
        frequency: 'Bi-weekly'
      },
      {
        id: 'company_update',
        name: 'Company Updates',
        description: 'Company news and announcements',
        category: 'Company',
        frequency: 'Monthly'
      },
      {
        id: 'emergency_service',
        name: 'Emergency Service',
        description: '24/7 emergency service availability',
        category: 'Service',
        frequency: 'Monthly'
      }
    ]

    const supportedPlatforms = [
      {
        id: 'facebook',
        name: 'Facebook',
        icon: '📘',
        specs: aiService.getPlatformSpecs('facebook')
      },
      {
        id: 'instagram',
        name: 'Instagram',
        icon: '📷',
        specs: aiService.getPlatformSpecs('instagram')
      },
      {
        id: 'twitter',
        name: 'X/Twitter',
        icon: '🐦',
        specs: aiService.getPlatformSpecs('twitter')
      },
      {
        id: 'google',
        name: 'Google Business Profile',
        icon: '🏢',
        specs: aiService.getPlatformSpecs('google')
      }
    ]

    const supportedBusinesses = [
      {
        id: 'lex',
        name: 'Lex Dallas',
        voice: 'Professional and polished',
        tagline: 'The Gold Standard of White Glove Service'
      },
      {
        id: 'lyons',
        name: 'Lyons',
        voice: 'Confident and approachable',
        tagline: 'The King of 5-Star Service'
      },
      {
        id: 'lex-etx',
        name: 'Lex ETX',
        voice: 'Honest and straightforward',
        tagline: 'Quality workmanship, honest service'
      }
    ]

    return NextResponse.json({
      success: true,
      isConfigured: aiService.isConfigured(),
      currentSeason,
      availableTemplates,
      supportedPlatforms,
      supportedBusinesses,
      features: {
        reviewResponses: true,
        socialContent: true,
        templates: true,
        sentimentAnalysis: true,
        weeklyAutomation: true,
        platformOptimization: true
      }
    })

  } catch (error) {
    console.error('Error getting AI service info:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get service information' },
      { status: 500 }
    )
  }
}