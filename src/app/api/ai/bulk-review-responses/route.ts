// src/app/api/ai/bulk-review-responses/route.ts
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
      reviews // Array of review objects with full review data
    } = body

    if (!reviews || !Array.isArray(reviews) || reviews.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Reviews array is required and cannot be empty' },
        { status: 400 }
      )
    }

    console.log(`Generating AI responses for ${reviews.length} reviews`)

    const results = []
    const errors = []

    // Process each review
    for (let i = 0; i < reviews.length; i++) {
      const review = reviews[i]
      
      try {
        console.log(`Processing review ${i + 1}/${reviews.length} from ${review.locationName}`)

        // Generate the review response using the enhanced AI service
        const result = await aiService.generateReviewResponse(
          {
            starRating: review.rating <= 1 ? 'ONE' : 
                       review.rating <= 2 ? 'TWO' : 
                       review.rating <= 3 ? 'THREE' : 
                       review.rating <= 4 ? 'FOUR' : 'FIVE',
            comment: review.text || '',
            reviewer: { displayName: review.name || 'Customer' }
          },
          review.locationName || review.businessName || 'business'
        )

        if (result.success) {
          results.push({
            reviewId: review.id,
            response: result.response,
            metadata: result.metadata
          })
          console.log(`✅ Generated response for review ${review.id}`)
        } else {
          errors.push({
            reviewId: review.id,
            error: result.error
          })
          console.error(`❌ Failed to generate response for review ${review.id}:`, result.error)
        }
      } catch (error) {
        console.error(`💥 Error processing review ${review.id}:`, error)
        errors.push({
          reviewId: review.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }

      // Small delay to prevent rate limiting
      if (i < reviews.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    const successCount = results.length
    const errorCount = errors.length

    console.log(`Bulk generation completed: ${successCount} successful, ${errorCount} failed`)

    return NextResponse.json({
      success: true,
      results,
      errors,
      summary: {
        total: reviews.length,
        successful: successCount,
        failed: errorCount,
        successRate: Math.round((successCount / reviews.length) * 100)
      }
    })

  } catch (error) {
    console.error('Error in bulk review response generation:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to generate bulk review responses' 
      },
      { status: 500 }
    )
  }
}

// Handle GET request to check service status
export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      isConfigured: aiService.isConfigured(),
      maxBatchSize: 50, // Recommend maximum reviews per batch
      rateLimitInfo: {
        delayBetweenRequests: 1000, // ms
        recommendedBatchSize: 10
      },
      supportedBusinesses: ['lex', 'lyons', 'lex-etx'],
      features: {
        bulkGeneration: true,
        sentimentAnalysis: true,
        businessSpecificVoice: true
      }
    })

  } catch (error) {
    console.error('Error getting bulk review service status:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get service status' },
      { status: 500 }
    )
  }
}