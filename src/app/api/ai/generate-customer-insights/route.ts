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

    console.log(`📊 Generating customer insights for ${reviews.length} reviews`)

    // Filter reviews based on timeframe and location
    const filteredReviews = filterReviewsByTimeframe(reviews, timeframe, locationId)

    console.log(`📊 Filtered to ${filteredReviews.length} reviews for timeframe: ${timeframe}, location: ${locationId}`)
    
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
    case '1week':
      cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case '2weeks':
      cutoffDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
      break
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
  const prompt = `Analyze these customer reviews for a service company.

POSITIVE REVIEWS (${reviews.filter(r => r.rating >= 4).length} reviews):
${positiveReviews || 'No positive reviews available'}

NEGATIVE/NEUTRAL REVIEWS (${reviews.filter(r => r.rating <= 3).length} reviews):
${negativeReviews || 'No negative reviews available'}

Analyze the actual review content and provide a JSON response with these exact fields:

{
  "commonPraise": ["specific praise 1", "specific praise 2", ...],
  "commonComplaints": ["specific issue 1", "specific issue 2", ...],
  "keyThemes": [
    {
      "theme": "Theme Name",
      "sentiment": "positive" | "negative" | "neutral",
      "frequency": <number>,
      "examples": ["example quote 1"]
    }
  ],
  "recommendations": ["actionable recommendation 1", ...]
}

IMPORTANT INSTRUCTIONS:
- Extract 5-7 specific things customers ACTUALLY praised in these reviews
- Extract 3-5 specific issues customers ACTUALLY complained about
- Identify 4-6 key themes with real example quotes from the reviews
- Provide 5-7 actionable business recommendations based on these specific reviews
- Be specific and reference actual content from the reviews
- Do NOT provide generic placeholder insights
- Return ONLY valid JSON, no other text`

  try {
    // Use the new generateCompletion method that actually processes the prompt
    const result = await aiService.generateCompletion(prompt, {
      systemPrompt: 'You are a business analytics expert specializing in customer review analysis for service companies. Analyze the provided reviews carefully and extract specific, actionable insights. Always return valid JSON.',
      maxTokens: 1000,
      temperature: 0.3, // Lower temperature for more consistent, analytical output
      responseFormat: 'json'
    })

    let parsedInsights
    if (result.success && result.content) {
      console.log('✅ AI analysis successful, parsing response...')
      console.log('📝 Raw AI response:', result.content.substring(0, 200) + '...')

      try {
        // Try to parse AI response as JSON
        parsedInsights = JSON.parse(result.content)
        console.log('✅ Successfully parsed JSON insights')
        console.log('📊 Insights summary:', {
          praiseCount: parsedInsights.commonPraise?.length || 0,
          complaintsCount: parsedInsights.commonComplaints?.length || 0,
          themesCount: parsedInsights.keyThemes?.length || 0,
          recommendationsCount: parsedInsights.recommendations?.length || 0
        })
      } catch (parseError) {
        // If JSON parsing fails, create default structure
        console.error('❌ Failed to parse AI response as JSON:', parseError)
        console.log('📝 Full AI response:', result.content)
        parsedInsights = {
          commonPraise: [
            'Unable to parse AI response - check logs for details'
          ],
          commonComplaints: [
            'JSON parsing failed'
          ],
          keyThemes: [],
          recommendations: [
            'Please try generating insights again'
          ]
        }
      }
    } else {
      // AI generation failed, use fallback
      console.error('❌ AI generation failed:', result.error)
      parsedInsights = {
        commonPraise: [
          `AI analysis failed: ${result.error || 'Unknown error'}`
        ],
        commonComplaints: [
          'Unable to generate insights'
        ],
        keyThemes: [],
        recommendations: [
          'Please check your OpenAI API key and try again',
          'Ensure you have sufficient API credits'
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