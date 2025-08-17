// src/app/api/ai/generate-review-response/route.ts
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
      review, 
      businessName,
      locationName 
    } = body

    if (!review) {
      return NextResponse.json(
        { success: false, error: 'Review data is required' },
        { status: 400 }
      )
    }

    if (!businessName && !locationName) {
      return NextResponse.json(
        { success: false, error: 'Business name or location name is required' },
        { status: 400 }
      )
    }

    // Use locationName if provided, otherwise use businessName
    const businessIdentifier = locationName || businessName

    console.log(`Generating AI review response for: ${businessIdentifier}`)
    console.log(`Review rating: ${review.starRating}`)
    console.log(`Review text: ${review.comment?.substring(0, 100)}...`)

    // Generate the review response using the enhanced AI service
    const result = await aiService.generateReviewResponse(
      review, 
      businessIdentifier
    )

    if (!result.success) {
      throw new Error(result.error)
    }

    // Analyze the review sentiment for additional context
    const sentiment = aiService.analyzeSentiment(review)

    return NextResponse.json({
      success: true,
      response: result.response,
      metadata: {
        ...result.metadata,
        sentiment: sentiment,
        businessIdentifier,
        tokensUsed: result.metadata?.tokens_used || 0
      }
    })

  } catch (error) {
    console.error('Error generating AI review response:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to generate review response' 
      },
      { status: 500 }
    )
  }
}

// Handle GET request to check AI service status
export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      isConfigured: aiService.isConfigured(),
      supportedBusinesses: ['lex', 'lyons', 'lex-etx'],
      features: {
        reviewResponses: true,
        socialContent: true,
        templates: true,
        sentimentAnalysis: true
      }
    })

  } catch (error) {
    console.error('Error getting AI service status:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get service status' },
      { status: 500 }
    )
  }
}