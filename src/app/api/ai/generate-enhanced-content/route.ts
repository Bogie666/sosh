// src/app/api/ai/generate-enhanced-content/route.ts
// Primary content generation endpoint.
// Uses unified AI service which loads all business context from the database.

import { NextRequest, NextResponse } from 'next/server'
import { aiService } from '@/lib/ai-service'
import { prisma } from '@/lib/prisma'
import { getPlatformSpec } from '@/lib/platform-specs'
import { getBestPostingTime } from '@/lib/posting-optimizer'
import { loadBusinessContext } from '@/lib/business-context'

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
      month = new Date().getMonth(),
      postDate,
      excludeImageIds = [],
      excludeThemes = [],
      serviceTypeFocus
    } = body

    if (!businessId || !platform) {
      return NextResponse.json(
        { success: false, error: 'businessId and platform are required' },
        { status: 400 }
      )
    }

    if (!aiService.isConfigured()) {
      return NextResponse.json(
        { success: false, error: 'AI service not configured. Check OpenAI API key.' },
        { status: 500 }
      )
    }

    // Determine the effective month from postDate if provided
    const effectiveMonth = postDate ? new Date(postDate).getMonth() : month

    // Generate content using the unified service
    const result = await aiService.generateContent({
      businessId,
      platform,
      day: day || getDayOfWeek(postDate),
      month: effectiveMonth,
      postDate,
      contentType,
      includeSpecials,
      includeImages,
      includeContentBlocks,
      customPrompt: prompt,
      excludeThemes,
      serviceTypeFocus,
      excludeImageIds
    })

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      )
    }

    // Update image usage tracking if an image was selected
    if (result.image?.image.id) {
      try {
        await prisma.imageLibrary.update({
          where: { id: result.image.image.id },
          data: {
            usageCount: { increment: 1 },
            lastUsed: new Date()
          }
        })
      } catch (updateError) {
        console.error('Failed to update image usage tracking:', updateError)
      }
    }

    // Get optimal posting time suggestion
    const dayName = day || getDayOfWeek(postDate)
    let suggestedPostingTime = null
    try {
      const ctx = await loadBusinessContext(businessId)
      suggestedPostingTime = getBestPostingTime(
        platform,
        dayName,
        ctx.business.postingSchedule
      )
    } catch {
      // Non-critical, skip
    }

    // Build response
    const spec = getPlatformSpec(platform)

    return NextResponse.json({
      success: true,
      content: result.content,
      metadata: {
        ...result.metadata,
        specialsIncluded: result.specialsIncluded || [],
        suggestedPostingTime
      },
      image: result.image ? {
        url: result.image.url,
        id: result.image.image.id,
        description: result.image.image.aiDescription || result.image.image.originalName,
        score: result.image.score,
        reasons: result.image.reasons,
        alternatives: result.image.alternatives.map(alt => ({
          url: alt.url,
          id: alt.image.id,
          description: alt.image.aiDescription || alt.image.originalName,
          score: alt.score
        }))
      } : null
    })

  } catch (error) {
    console.error('Enhanced content generation error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

function getDayOfWeek(postDate?: string): string {
  const date = postDate ? new Date(postDate) : new Date()
  return date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
}
