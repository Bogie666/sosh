// src/app/api/social/create-posts/route.ts
import { auth } from '@/auth'
import { GoogleBusinessService, formatPostForGBP } from '@/lib/google-auth'
import { twitterApiManager } from '@/lib/twitter-api-manager'
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

    // Parse FormData for image uploads
    const formData = await request.formData()
    
    const content = formData.get('content') as string
    const contentType = formData.get('contentType') as string
    const platforms = JSON.parse(formData.get('platforms') as string)
    const businesses = JSON.parse(formData.get('businesses') as string)
    const scheduling = JSON.parse(formData.get('scheduling') as string)
    const imageCount = parseInt(formData.get('imageCount') as string) || 0

    // Extract images from FormData
    const images: File[] = []
    for (let i = 0; i < imageCount; i++) {
      const image = formData.get(`image_${i}`) as File
      if (image) {
        images.push(image)
      }
    }

    console.log('=== SOCIAL POSTS API ===')
    console.log('Session exists:', !!session)
    console.log('Access token exists:', !!session.accessToken)
    console.log('Request data received:', {
      content: content?.substring(0, 100) + (content?.length > 100 ? '...' : ''),
      contentType,
      platforms,
      businesses,
      scheduling,
      imageCount: images.length
    })

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

    console.log(`Creating posts for ${businesses.length} businesses on ${platforms.length} platforms`)
    console.log('Businesses:', businesses)
    console.log('Platforms:', platforms)
    if (images.length > 0) {
      console.log('Images:', images.map(img => ({ name: img.name, size: img.size, type: img.type })))
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
      console.log(`Processing business: ${businessBrand}`)
      
      // Post to each selected platform
      for (const platform of platforms) {
        console.log(`Processing platform: ${platform} for business: ${businessBrand}`)
        
        try {
          let result
          
          switch (platform) {
            case 'google':
              // Find matching business locations
              const matchingLocations = businessLocations.filter(loc => 
                businessBrand === 'lex-dallas' ? loc.locationName.toLowerCase().includes('lex') && !loc.locationName.toLowerCase().includes('etx') :
                businessBrand === 'lex-etx' ? loc.locationName.toLowerCase().includes('etx') :
                businessBrand === 'lyons' ? loc.locationName.toLowerCase().includes('lyons') :
                businessBrand === 'ks' ? (loc.locationName.toLowerCase().includes('k&s') || loc.locationName.toLowerCase().includes('k & s')) :
                false
              )
              
              // Post to each location
              for (const location of matchingLocations) {
                const gbpPostData = formatPostForGBP(content, contentType)
                
                // TODO: Add image support for Google Business Profile
                // if (images.length > 0) {
                //   gbpPostData.media = await uploadImagesToGBP(images)
                // }
                
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
                    postId: postResult.post?.name,
                    hasImages: images.length > 0
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
              console.log('Twitter posting - using Twitter API manager')
              
              let mediaIds: string[] = []
              
              // Upload images to Twitter if any
              if (images.length > 0) {
                console.log(`Uploading ${images.length} images to Twitter...`)
                
                for (const image of images) {
                  try {
                    // Convert File to Buffer
                    const arrayBuffer = await image.arrayBuffer()
                    const buffer = Buffer.from(arrayBuffer)
                    
                    console.log(`Uploading image: ${image.name} (${image.type}, ${buffer.length} bytes)`)
                    
                    const uploadResult = await twitterApiManager.uploadMedia(
                      businessBrand,
                      buffer,
                      image.type
                    )
                    
                    if (uploadResult.success && uploadResult.data?.media_id_string) {
                      mediaIds.push(uploadResult.data.media_id_string)
                      console.log(`✅ Image uploaded: ${uploadResult.data.media_id_string}`)
                    } else {
                      console.error(`❌ Image upload failed: ${uploadResult.error}`)
                      // Continue with other images rather than failing completely
                    }
                  } catch (imageError) {
                    console.error(`❌ Error processing image ${image.name}:`, imageError)
                  }
                }
              }
              
              // Post tweet with media
              result = await twitterApiManager.postTweet(businessBrand, content, {
                media_ids: mediaIds.length > 0 ? mediaIds : undefined
              })
              
              if (result.success) {
                console.log(`✅ Twitter success: ${businessBrand}`)
                results.push({
                  businessName,
                  platform: 'twitter',
                  success: true,
                  postId: result.tweetId,
                  hasImages: mediaIds.length > 0,
                  mediaIds: mediaIds
                })
              } else {
                console.error(`❌ Twitter error: ${result.error}`)
                errors.push({
                  businessName,
                  platform: 'twitter',
                  error: result.error
                })
              }
              break
              
            case 'facebook':
              // TODO: Implement Facebook posting with images
              console.log('Facebook posting - not yet implemented with images')
              errors.push({
                businessName,
                platform: 'facebook',
                error: 'Facebook posting with images not yet implemented'
              })
              break
              
            case 'instagram':
              // TODO: Implement Instagram posting with images
              console.log('Instagram posting - not yet implemented with images')
              errors.push({
                businessName,
                platform: 'instagram',
                error: 'Instagram posting with images not yet implemented'
              })
              break
              
            default:
              errors.push({
                businessName,
                platform,
                error: `Unknown platform: ${platform}`
              })
          }
        } catch (error) {
          console.error(`Error posting to ${platform} for ${businessBrand}:`, error)
          errors.push({
            businessName,
            platform,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }
    }

    console.log('=== RESULTS ===')
    console.log(`Total attempts: ${results.length + errors.length}`)
    console.log(`Successful: ${results.length}`)
    console.log(`Failed: ${errors.length}`)
    console.log(`Success rate: ${Math.round((results.length / (results.length + errors.length)) * 100)}%`)

    return NextResponse.json({
      success: true,
      successCount: results.length,
      totalAttempts: results.length + errors.length,
      results,
      errors: errors.length > 0 ? errors : undefined,
      hasImages: images.length > 0,
      imageCount: images.length
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
    'lex-dallas': 'Lex - Air Conditioning, Heating, Plumbing, Electrical',
    'lex-etx': 'Lex ETX - Air Conditioning, Heating, Plumbing, Electrical', 
    'lyons': 'Lyons Air Conditioning and Heating',
    'ks': 'K&S Heating and Air'
  }
  return businessNames[businessBrand as keyof typeof businessNames] || businessNames['lex-dallas']
}