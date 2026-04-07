// src/app/api/ai/generate-review-response/route.ts
// Review response generation using full business context.

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
    const { review, businessName, locationName, businessId } = body

    if (!review) {
      return NextResponse.json(
        { success: false, error: 'Review data is required' },
        { status: 400 }
      )
    }

    // Resolve business ID - try direct ID first, then look up by name
    let resolvedBusinessId = businessId
    if (!resolvedBusinessId && (businessName || locationName)) {
      const business = await prisma.business.findFirst({
        where: {
          OR: [
            { displayName: businessName || locationName },
            { name: businessName || locationName },
            { id: businessName || locationName }
          ]
        }
      })
      resolvedBusinessId = business?.id
    }

    if (!resolvedBusinessId) {
      return NextResponse.json(
        { success: false, error: 'Business not found. Provide businessId or valid businessName.' },
        { status: 400 }
      )
    }

    // Normalize the review into a standard format
    const normalizedReview = {
      reviewerName: review.reviewer?.displayName || review.reviewerName || 'Customer',
      rating: normalizeRating(review),
      content: review.comment || review.content || '',
      starRating: review.starRating
    }

    // Generate response using the unified AI service (loads full business context)
    const result = await aiService.generateReviewResponse(normalizedReview, resolvedBusinessId)

    if (!result.success) {
      throw new Error(result.error)
    }

    const sentiment = aiService.analyzeSentiment({
      rating: normalizedReview.rating,
      starRating: review.starRating
    })

    return NextResponse.json({
      success: true,
      response: result.response,
      metadata: {
        ...result.metadata,
        sentiment
      }
    })

  } catch (error) {
    console.error('Error generating AI review response:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to generate review response' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    isConfigured: aiService.isConfigured(),
    features: {
      reviewResponses: true,
      socialContent: true,
      templates: true,
      sentimentAnalysis: true,
      imageSelection: true,
      postingOptimization: true,
      contentFreshness: true
    }
  })
}

function normalizeRating(review: any): number {
  if (typeof review.rating === 'number') return review.rating
  const map: Record<string, number> = {
    'FIVE': 5, 'FOUR': 4, 'THREE': 3, 'TWO': 2, 'ONE': 1
  }
  return map[review.starRating] || 3
}
