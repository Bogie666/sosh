// src/app/api/google/reviews/route.ts - WORKING VERSION
import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import { googleBusinessApiManager } from '@/lib/google-business-api-manager'

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.accessToken) {
      console.error('No access token in session')
      return NextResponse.json({ 
        success: false, 
        error: 'Not authenticated',
        requiresAuth: true 
      }, { status: 401 })
    }

    console.log('=== FETCHING REVIEWS (WORKING VERSION) ===')
    console.log('Session exists:', !!session)
    console.log('Access token exists:', !!session.accessToken)

    // Hardcode the locations based on your successful locations API data
    const hardcodedLocations = [
      { accountId: '104110704176658195109', locationId: '6845140178757010963', title: 'K&S Heating and Air' },
      { accountId: '104110704176658195109', locationId: '379116535546276113', title: 'Lyons Air Conditioning and Heating' },
      { accountId: '104110704176658195109', locationId: '16617612224451799488', title: 'Lex - Air Conditioning, Heating, Plumbing, Electrical' },
      { accountId: '104110704176658195109', locationId: '15942044655828192562', title: 'Sherrell Air Conditioning & Heating' },
      { accountId: '102262219515631457064', locationId: '2211062401809147654', title: 'Lex Air Conditioning' },
      { accountId: '102262219515631457064', locationId: '1466833791482001835', title: 'Lex - Air Conditioning, Heating, Plumbing, Electrical' },
      { accountId: '102262219515631457064', locationId: '7913826327010230630', title: 'Lex - Air Conditioning, Heating, Plumbing, Electrical' },
      { accountId: '102262219515631457064', locationId: '7533141434923241855', title: 'Lex - Air Conditioning, Heating, Plumbing, Electrical' },
      { accountId: '102262219515631457064', locationId: '2476909653678359873', title: 'Lex - Air Conditioning, Heating, Plumbing, Electrical' }
    ]

    console.log(`Processing ${hardcodedLocations.length} locations for reviews`)

    // Get reviews for each location - SIMPLIFIED to avoid 400 errors
    let allReviews: any[] = []
    
    for (const location of hardcodedLocations) {
      try {
        console.log(`Fetching reviews for ${location.title} (${location.locationId})`)
        
        // ✅ SIMPLIFIED: Just use pageSize without orderBy that was causing 400 errors
        const reviewsUrl = `https://mybusiness.googleapis.com/v4/accounts/${location.accountId}/locations/${location.locationId}/reviews?pageSize=50`
        
        console.log(`Making request to: ${reviewsUrl}`)
        
        const reviewsResponse = await fetch(reviewsUrl, {
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json'
          }
        })

        console.log(`Reviews API response for ${location.title}: ${reviewsResponse.status}`)

        if (reviewsResponse.ok) {
          const reviewsData = await reviewsResponse.json()
          console.log(`Reviews data for ${location.title}:`, {
            reviewsCount: reviewsData.reviews?.length || 0,
            hasNextPage: !!reviewsData.nextPageToken
          })
          
          if (reviewsData.reviews && reviewsData.reviews.length > 0) {
            const reviewsWithLocation = reviewsData.reviews.map((review: any) => ({
              id: review.reviewId || review.name,
              name: review.reviewer?.displayName || 'Anonymous',
              rating: convertStarRatingToNumber(review.starRating),
              text: review.comment || '',
              reply: review.reviewReply?.comment || null,
              locationName: location.title,
              locationId: location.locationId,
              accountId: location.accountId,
              date: review.createTime || new Date().toISOString(),
              originalStarRating: review.starRating,
              originalReview: review
            }))
            
            allReviews.push(...reviewsWithLocation)
            console.log(`✅ Added ${reviewsWithLocation.length} reviews from ${location.title}`)
            
            // Optional: Try to get one more page if available
            if (reviewsData.nextPageToken) {
              console.log(`📄 Attempting second page for ${location.title}`)
              
              try {
                const secondPageUrl = `https://mybusiness.googleapis.com/v4/accounts/${location.accountId}/locations/${location.locationId}/reviews?pageSize=50&pageToken=${reviewsData.nextPageToken}`
                
                const secondPageResponse = await fetch(secondPageUrl, {
                  headers: {
                    'Authorization': `Bearer ${session.accessToken}`,
                    'Content-Type': 'application/json'
                  }
                })
                
                if (secondPageResponse.ok) {
                  const secondPageData = await secondPageResponse.json()
                  if (secondPageData.reviews && secondPageData.reviews.length > 0) {
                    const secondPageReviews = secondPageData.reviews.map((review: any) => ({
                      id: review.reviewId || review.name,
                      name: review.reviewer?.displayName || 'Anonymous',
                      rating: convertStarRatingToNumber(review.starRating),
                      text: review.comment || '',
                      reply: review.reviewReply?.comment || null,
                      locationName: location.title,
                      locationId: location.locationId,
                      accountId: location.accountId,
                      date: review.createTime || new Date().toISOString(),
                      originalStarRating: review.starRating,
                      originalReview: review
                    }))
                    
                    allReviews.push(...secondPageReviews)
                    console.log(`✅ Added ${secondPageReviews.length} more reviews from ${location.title} (page 2)`)
                  }
                }
              } catch (pageError) {
                console.warn(`Failed to get second page for ${location.title}:`, pageError)
              }
            }
          } else {
            console.log(`ℹ️ No reviews found for ${location.title}`)
          }
        } else {
          const errorText = await reviewsResponse.text()
          console.error(`❌ Error fetching reviews for ${location.title}: ${reviewsResponse.status}`, errorText)
        }
      } catch (error) {
        console.error(`💥 Exception fetching reviews for ${location.title}:`, error)
      }
    }

    console.log(`=== REVIEWS SUMMARY ===`)
    console.log(`Total locations processed: ${hardcodedLocations.length}`)
    console.log(`Total reviews found: ${allReviews.length}`)
    
    // Enhanced logging for results
    const reviewsByLocation = hardcodedLocations.map(location => ({
      location: location.title,
      count: allReviews.filter(r => r.locationId === location.locationId).length
    }))
    
    console.log('Reviews per location:')
    reviewsByLocation.forEach(({ location, count }) => {
      console.log(`  📍 ${location}: ${count} reviews`)
    })
    
    // Log some sample converted ratings for debugging
    if (allReviews.length > 0) {
      console.log('Sample rating conversions:')
      allReviews.slice(0, 5).forEach(review => {
        console.log(`${review.originalStarRating} → ${review.rating}`)
      })
    }
    
    console.log(`========================`)

    return NextResponse.json({ 
      success: true, 
      reviews: allReviews,
      totalCount: allReviews.length,
      locationsProcessed: hardcodedLocations.length,
      note: 'Working version - up to 100 reviews per location (2 pages)',
      debug: 'success'
    })

  } catch (error) {
    console.error('💥 Fatal error fetching reviews:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      debug: 'catch_error'
    }, { status: 500 })
  }
}

// ✅ Helper function to convert Google's star rating strings to numbers
function convertStarRatingToNumber(starRating: string): number {
  const ratingMap: Record<string, number> = {
    'ONE': 1,
    'TWO': 2,
    'THREE': 3,
    'FOUR': 4,
    'FIVE': 5
  }
  
  return ratingMap[starRating] || 0
}