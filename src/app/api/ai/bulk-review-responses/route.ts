// src/app/api/ai/bulk-review-responses/route.ts
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
    const { reviews } = body

    if (!reviews || !Array.isArray(reviews) || reviews.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Reviews array is required and cannot be empty' },
        { status: 400 }
      )
    }

    const results = []
    const errors = []

    for (let i = 0; i < reviews.length; i++) {
      const review = reviews[i]

      try {
        // Resolve business ID from the review's location/business info
        let businessId = review.businessId
        if (!businessId && (review.locationName || review.businessName)) {
          const business = await prisma.business.findFirst({
            where: {
              OR: [
                { displayName: review.locationName || review.businessName },
                { name: review.locationName || review.businessName },
                { id: review.locationName || review.businessName }
              ]
            }
          })
          businessId = business?.id
        }

        if (!businessId) {
          errors.push({ reviewId: review.id, error: 'Could not resolve business' })
          continue
        }

        const result = await aiService.generateReviewResponse(
          {
            reviewerName: review.name || review.reviewer?.displayName || 'Customer',
            rating: review.rating || 3,
            content: review.text || review.comment || '',
            starRating: review.starRating
          },
          businessId
        )

        if (result.success) {
          results.push({
            reviewId: review.id,
            response: result.response,
            metadata: result.metadata
          })
        } else {
          errors.push({ reviewId: review.id, error: result.error })
        }
      } catch (error) {
        errors.push({
          reviewId: review.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }

      // Rate limiting delay
      if (i < reviews.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    return NextResponse.json({
      success: true,
      results,
      errors,
      summary: {
        total: reviews.length,
        successful: results.length,
        failed: errors.length,
        successRate: Math.round((results.length / reviews.length) * 100)
      }
    })

  } catch (error) {
    console.error('Error in bulk review response generation:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to generate bulk review responses' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    isConfigured: aiService.isConfigured(),
    maxBatchSize: 50,
    rateLimitInfo: {
      delayBetweenRequests: 1000,
      recommendedBatchSize: 10
    },
    features: {
      bulkGeneration: true,
      sentimentAnalysis: true,
      businessSpecificVoice: true,
      contentFreshness: true
    }
  })
}
