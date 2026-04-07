// src/app/api/ai/generate-content/route.ts
// Simple content generation endpoint that delegates to the unified AI service.

import { NextRequest, NextResponse } from 'next/server'
import { aiService } from '@/lib/ai-service'
import { prisma } from '@/lib/prisma'
import { getPlatformSpec, getAllPlatforms } from '@/lib/platform-specs'

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
      businessId,
      businessName,
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

    // Resolve business ID
    let resolvedId = businessId
    if (!resolvedId && businessName) {
      const business = await prisma.business.findFirst({
        where: {
          OR: [
            { id: businessName },
            { displayName: businessName },
            { name: businessName }
          ]
        }
      })
      resolvedId = business?.id
    }

    if (!resolvedId) {
      return NextResponse.json(
        { success: false, error: 'Business not found. Provide businessId or businessName.' },
        { status: 400 }
      )
    }

    // Use the unified generation service
    const result = await aiService.generateContent({
      businessId: resolvedId,
      platform,
      day: options.day || new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase(),
      month: options.month || new Date().getMonth(),
      includeSpecials: options.includeSpecials !== false,
      includeImages: options.includeImages === true,
      includeContentBlocks: options.useContentBlocks !== false,
      customPrompt: prompt || `Create ${templateType} content`,
      contentType
    })

    if (!result.success) {
      throw new Error(result.error)
    }

    const spec = getPlatformSpec(platform)

    return NextResponse.json({
      success: true,
      content: result.content,
      metadata: {
        business: result.metadata?.businessName,
        platform,
        contentLength: result.content?.length || 0,
        platformSpecs: {
          maxLength: spec.charLimit,
          recommendedLength: spec.recommendedLength,
          withinLimits: (result.content?.length || 0) <= spec.charLimit
        },
        generatedAt: new Date().toISOString()
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
  try {
    // Load businesses dynamically from database
    const businesses = await prisma.business.findMany({
      select: { id: true, displayName: true, brandVoice: true, tagline: true }
    })

    const platforms = getAllPlatforms().map((p: any) => ({
      id: p.id,
      name: p.name,
      icon: p.icon,
      charLimit: p.charLimit,
      recommendedLength: p.recommendedLength
    }))

    return NextResponse.json({
      success: true,
      isConfigured: aiService.isConfigured(),
      currentSeason: getSeason(new Date().getMonth()),
      supportedPlatforms: platforms,
      supportedBusinesses: businesses.map((b: any) => ({
        id: b.id,
        name: b.displayName,
        voice: b.brandVoice || 'Professional',
        tagline: b.tagline || ''
      })),
      features: {
        reviewResponses: true,
        socialContent: true,
        templates: true,
        sentimentAnalysis: true,
        weeklyAutomation: true,
        platformOptimization: true,
        imageSelection: true,
        contentFreshness: true,
        postingTimeOptimization: true
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

function getSeason(month: number): string {
  if (month >= 2 && month <= 4) return 'Spring'
  if (month >= 5 && month <= 7) return 'Summer'
  if (month >= 8 && month <= 10) return 'Fall'
  return 'Winter'
}
