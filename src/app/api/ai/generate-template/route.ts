// src/app/api/ai/generate-template/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { aiService } from '@/lib/ai-service'
import { prisma } from '@/lib/prisma'

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

    if (!businesses?.length) {
      return NextResponse.json(
        { success: false, error: 'At least one business must be selected' },
        { status: 400 }
      )
    }

    const primaryBusiness = businesses[0]
    const primaryPlatform = platforms?.[0] || 'facebook'

    // Resolve the business ID
    let businessId = primaryBusiness
    const business = await prisma.business.findFirst({
      where: {
        OR: [
          { id: primaryBusiness },
          { displayName: primaryBusiness },
          { name: primaryBusiness }
        ]
      }
    })
    if (business) businessId = business.id

    // Build custom prompt if needed
    let prompt = customPrompt || `Create engaging ${month || 'monthly'} social media content`

    if (specials && Object.keys(specials).length > 0) {
      const specialsList = Object.entries(specials)
        .flatMap(([category, items]) =>
          Array.isArray(items) ? items.map(item => `${category}: ${item}`) : []
        )
      if (specialsList.length > 0) {
        prompt += ` featuring these promotions: ${specialsList.join(', ')}`
      }
    }

    // Use the unified content generation
    const result = await aiService.generateContent({
      businessId,
      platform: primaryPlatform,
      day: new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase(),
      month: month ? getMonthNumber(month) : new Date().getMonth(),
      includeSpecials: !!specials,
      includeImages: false,
      includeContentBlocks: true,
      customPrompt: prompt,
      contentType: templateType
    })

    if (!result.success) {
      throw new Error(result.error)
    }

    return NextResponse.json({
      success: true,
      content: result.content,
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
      { success: false, error: error instanceof Error ? error.message : 'Failed to generate content' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    currentSeason: getSeason(new Date().getMonth()),
    availableTemplates: [
      'seasonal_tip', 'maintenance_reminder', 'weather_alert',
      'promotion', 'customer_story', 'company_update', 'emergency_service'
    ],
    isConfigured: aiService.isConfigured()
  })
}

function getSeason(month: number): string {
  if (month >= 2 && month <= 4) return 'Spring'
  if (month >= 5 && month <= 7) return 'Summer'
  if (month >= 8 && month <= 10) return 'Fall'
  return 'Winter'
}

function getMonthNumber(monthName: string): number {
  const months: Record<string, number> = {
    january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
    july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
  }
  return months[monthName.toLowerCase()] ?? new Date().getMonth()
}
