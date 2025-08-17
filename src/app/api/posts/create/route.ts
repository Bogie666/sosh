// src/app/api/posts/create/route.ts
import { auth } from '@/auth'
import { GoogleBusinessService, formatPostForGBP } from '@/lib/google-auth'
import { twitterApiManager } from '@/lib/twitter-api-manager'
import { metaApiManager } from '@/lib/meta-api-manager'

import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session || !session.accessToken) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const postData = await request.json()
    const { content, contentType, platforms, businesses, scheduling } = postData

    if (!content?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Content is required' },
        { status: 400 }
      )
    }

    if (!platforms?.length) {
      return NextResponse.json(
        { success: false, error: 'At least one platform must be selected' },
        { status: 400 }
      )
    }

    if (!businesses?.length) {
      return NextResponse.json(
        { success: false, error: 'At least one business must be selected' },
        { status: 400 }
      )
    }

    const results: any[] = []
    const errors: any[] = []

    // Initialize services
    const googleService = new GoogleBusinessService(session.accessToken)

    // Get business locations if posting to Google
    let businessLocations: any[] = []
if (platforms.includes('google')) {
  const locationsResult = await googleService.getAllLocations()
  if (locationsResult.success && locationsResult.locations) {
    businessLocations = locationsResult.locations
  }
}

    // Process each business
    for (const businessBrand of businesses) {
      const businessName = getBusinessName(businessBrand)
      
      // Post to each selected platform
      for (const platform of platforms) {
        try {
          let result
          
          switch (platform) {
            case 'google':
              // Find matching business locations
              const matchingLocations = businessLocations.filter(loc => 
                businessBrand === 'lex' ? loc.locationName.toLowerCase().includes('lex') :
                businessBrand === 'lyons' ? loc.locationName.toLowerCase().includes('lyons') :
                businessBrand === 'ks' ? (loc.locationName.toLowerCase().includes('k&s') || loc.locationName.toLowerCase().includes('k & s')) :
                false
              )
              
              // Post to each location
              for (const location of matchingLocations) {
                const gbpPostData = formatPostForGBP(content, contentType)
                const postResult = await googleService.createPost(
                  location.accountId,
                  location.locationId,
                  gbpPostData
                )
                
                if (postResult.success) {
                  results.push({
                    businessName: location.locationName,
                    platform: 'google',
                    success: true,
                    postId: postResult.post?.name
                  })
                } else {
                  errors.push({
                    businessName: location.locationName,
                    platform: 'google',
                    error: postResult.error
                  })
                }
              }
              break
              
            case 'twitter':
            result = await twitterApiManager.postTweet(businessName, content)
              if (result.success) {
                results.push({
                  businessName,
                  platform: 'twitter',
                  success: true,
                  postId: result.tweetId
                })
              } else {
                errors.push({
                  businessName,
                  platform: 'twitter',
                  error: result.error
                })
              }
              break
              
            case 'facebook':
            result = await metaApiManager.postToFacebook(businessName, content)
              if (result.success) {
                results.push({
                  businessName,
                  platform: 'facebook',
                  success: true,
                  postId: result.postId
                })
              } else {
                errors.push({
                  businessName,
                  platform: 'facebook',
                  error: result.error
                })
              }
              break
              
            case 'instagram':
            result = await metaApiManager.postToInstagram(businessName, content)
              if (result.success) {
                results.push({
                  businessName,
                  platform: 'instagram',
                  success: true,
                  postId: result.postId
                })
              } else {
                errors.push({
                  businessName,
                  platform: 'instagram',
                  error: result.error
                })
              }
              break
              
            default:
              errors.push({
                businessName,
                platform,
                error: `Unknown platform: ${platform}`
              })
          }
        } catch (error) {
          errors.push({
            businessName,
            platform,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      successCount: results.length,
      results,
      errors
    })

  } catch (error) {
    console.error('API Error - Create Posts:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}

function getBusinessName(businessBrand: string): string {
  const businessNames = {
    lex: 'Lex - Air Conditioning, Heating, Plumbing, Electrical',
    lyons: 'Lyons Air Conditioning and Heating',
    ks: 'K&S Heating and Air'
  }
  return businessNames[businessBrand as keyof typeof businessNames] || businessNames.lex
}