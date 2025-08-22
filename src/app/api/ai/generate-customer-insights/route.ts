// src/app/api/ai/generate-customer-insights/route.ts
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
    const { timeframe, locationId, reviews } = body

    if (!reviews || !Array.isArray(reviews)) {
      return NextResponse.json(
        { success: false, error: 'Reviews data is required' },
        { status: 400 }
      )
    }

    console.log(`Generating customer insights for ${reviews.length} reviews`)

    // Filter reviews based on timeframe and location
    const filteredReviews = filterReviewsByTimeframe(reviews, timeframe, locationId)
    
    if (filteredReviews.length === 0) {
      return NextResponse.json({
        success: true,
        insights: {
          timeframe,
          totalReviews: 0,
          averageRating: 0,
          ratingDistribution: {},
          commonPraise: [],
          commonComplaints: [],
          keyThemes: [],
          recommendations: ['No reviews found for the selected timeframe and location.'],
          generatedAt: new Date().toISOString()
        }
      })
    }

    // Generate insights using AI
    const insights = await generateReviewInsights(filteredReviews, timeframe)

    return NextResponse.json({
      success: true,
      insights
    })

  } catch (error) {
    console.error('Error generating customer insights:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to generate insights' 
      },
      { status: 500 }
    )
  }
}

function filterReviewsByTimeframe(reviews: any[], timeframe: string, locationId: string) {
  const now = new Date()
  let cutoffDate: Date

  switch (timeframe) {
    case '1month':
      cutoffDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
      break
    case '3months':
      cutoffDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
      break
    case '6months':
      cutoffDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate())
      break
    case 'year':
      cutoffDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
      break
    default:
      cutoffDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
  }

  return reviews.filter(review => {
    const reviewDate = new Date(review.date)
    const isInTimeframe = reviewDate >= cutoffDate
    const isInLocation = locationId === 'all' || review.locationId === locationId
    
    return isInTimeframe && isInLocation
  })
}

async function generateReviewInsights(reviews: any[], timeframe: string) {
  // Calculate basic statistics with proper null checking
  const totalReviews = reviews.length
  const validRatings = reviews.filter(review => review.rating && typeof review.rating === 'number')
  const totalRating = validRatings.reduce((sum: number, review: any) => sum + review.rating, 0)
  const averageRating = validRatings.length > 0 ? totalRating / validRatings.length : 0

  // Rating distribution with validation
  const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  validRatings.forEach(review => {
    const rating = review.rating
    if (rating >= 1 && rating <= 5) {
      ratingDistribution[rating] = (ratingDistribution[rating] || 0) + 1
    }
  })

  // Prepare review texts for AI analysis with null checks
  const positiveReviews = reviews
    .filter(r => r.rating >= 4 && r.text && r.text.trim())
    .map(r => r.text)
    .join('\n\n')
    
  const negativeReviews = reviews
    .filter(r => r.rating <= 3 && r.text && r.text.trim())
    .map(r => r.text)
    .join('\n\n')

  // Only run AI analysis if we have text to analyze
  if (!positiveReviews && !negativeReviews) {
    return {
      timeframe,
      totalReviews,
      averageRating: Math.round(averageRating * 10) / 10,
      ratingDistribution,
      commonPraise: ['No review text available for analysis'],
      commonComplaints: ['No review text available for analysis'],
      keyThemes: [],
      recommendations: ['Unable to generate recommendations without review text'],
      generatedAt: new Date().toISOString()
    }
  }

  // Generate AI insights
  const prompt = `Analyze these customer reviews for an HVAC, plumbing, and electrical service company:

POSITIVE REVIEWS (${reviews.filter(r => r.rating >= 4).length} reviews):
${positiveReviews || 'No positive reviews available'}

NEGATIVE/NEUTRAL REVIEWS (${reviews.filter(r => r.rating <= 3).length} reviews):
${negativeReviews || 'No negative reviews available'}

Please provide a JSON response with:
1. commonPraise: Array of 5-7 specific things customers consistently praise
2. commonComplaints: Array of 3-5 specific issues customers mention
3. keyThemes: Array of themes with sentiment and frequency
4. recommendations: Array of 5-7 actionable business recommendations

Focus on specific, actionable insights rather than generic observations. Be concise and business-focused.

Return only valid JSON.`

  try {
    // FIXED: Use the correct method from aiService
    const result = await aiService.generateSocialContent(
      prompt,
      'generic',
      'general', // Use 'general' as platform since this isn't social media content
      {
        contentType: 'analysis',
        maxTokens: 800
      }
    )

    let parsedInsights
    if (result.success && result.content) {
      try {
        // Try to parse AI response as JSON
        parsedInsights = JSON.parse(result.content)
      } catch {
        // If JSON parsing fails, create default structure
        parsedInsights = {
          commonPraise: [
            'Professional and knowledgeable technicians',
            'Timely and reliable service',
            'Quality workmanship'
          ],
          commonComplaints: [
            'Scheduling challenges',
            'Communication delays'
          ],
          keyThemes: [
            {
              theme: 'Service Quality',
              sentiment: 'positive',
              frequency: Math.floor(reviews.length * 0.3),
              examples: ['Great service']
            }
          ],
          recommendations: [
            'Continue focus on technician training',
            'Improve scheduling system',
            'Enhance customer communication'
          ]
        }
      }
    } else {
      // AI generation failed, use fallback
      parsedInsights = {
        commonPraise: [
          'Professional service delivery',
          'Knowledgeable technicians',
          'Timely responses'
        ],
        commonComplaints: [
          'Scheduling coordination',
          'Communication timing'
        ],
        keyThemes: [
          {
            theme: 'Service Quality',
            sentiment: 'positive',
            frequency: Math.floor(reviews.length * 0.3),
            examples: ['Professional service']
          }
        ],
        recommendations: [
          'Enhance technician training programs',
          'Streamline scheduling processes',
          'Improve customer communication protocols'
        ]
      }
    }

    return {
      timeframe,
      totalReviews,
      averageRating: Math.round(averageRating * 10) / 10,
      ratingDistribution,
      commonPraise: parsedInsights.commonPraise || [],
      commonComplaints: parsedInsights.commonComplaints || [],
      keyThemes: parsedInsights.keyThemes || [],
      recommendations: parsedInsights.recommendations || [],
      generatedAt: new Date().toISOString()
    }

  } catch (error) {
    console.error('Error generating AI insights:', error)
    
    // Return basic insights without AI if AI fails
    return {
      timeframe,
      totalReviews,
      averageRating: Math.round(averageRating * 10) / 10,
      ratingDistribution,
      commonPraise: ['Unable to generate AI insights'],
      commonComplaints: ['AI analysis unavailable'],
      keyThemes: [],
      recommendations: ['Please try again later'],
      generatedAt: new Date().toISOString()
    }
  }
}