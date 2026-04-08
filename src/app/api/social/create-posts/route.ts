// src/app/api/social/create-posts/route.ts
import { auth } from '@/auth'
import { GoogleBusinessService, formatPostForGBP } from '@/lib/google-auth'
import { twitterApiManager } from '@/lib/twitter-api-manager'
import { NextRequest, NextResponse } from 'next/server'
import { metaApiManager } from '@/lib/meta-api-manager'
import { prisma } from '@/lib/prisma'


async function uploadTempImageForInstagram(imageBuffer: Buffer, originalName: string, businessId: string): Promise<string> {
  try {
    const { Storage } = await import('@google-cloud/storage')
    const { v4: uuidv4 } = await import('uuid')
    const { getGoogleCredentials } = await import('@/lib/google-credentials')
    
    const storage = new Storage({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      credentials: getGoogleCredentials() || undefined
    })
    
    const bucketName = process.env.GOOGLE_CLOUD_STORAGE_BUCKET || 'sosh-images'
    const bucket = storage.bucket(bucketName)
    
    // Generate unique filename for temp Instagram image
    const fileId = uuidv4()
    const extension = originalName.split('.').pop() || 'jpg'
    const fileName = `temp/instagram/${businessId}_${fileId}.${extension}`
    
    console.log(`📤 Uploading temp Instagram image: ${fileName}`)
    
    // Upload to cloud storage
    const cloudFile = bucket.file(fileName)
    await cloudFile.save(imageBuffer, {
      metadata: {
        contentType: 'image/jpeg'
      },
      public: true // Critical: Make sure it's publicly accessible for Instagram
    })
    
    // Generate public URL
    const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`
    
    console.log(`✅ Temp Instagram image uploaded: ${publicUrl}`)
    
    return publicUrl
    
  } catch (error) {
    console.error('Failed to upload temp image for Instagram:', error)
    throw new Error('Failed to prepare image for Instagram')
  }
}

/**
 * Clean up temporary Instagram images (call this after successful posting)
 */
async function cleanupTempInstagramImage(imageUrl: string) {
  try {
    const { Storage } = await import('@google-cloud/storage')
    
    const storage = new Storage({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      credentials: process.env.GOOGLE_CLOUD_CREDENTIALS ? JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS) : undefined
    })
    
    const bucketName = process.env.GOOGLE_CLOUD_STORAGE_BUCKET || 'sosh-images'
    const bucket = storage.bucket(bucketName)
    
    // Extract filename from URL
    const urlParts = imageUrl.split('/')
    const fileName = urlParts.slice(-3).join('/') // Get 'temp/instagram/filename.jpg'
    
    if (fileName.startsWith('temp/instagram/')) {
      const file = bucket.file(fileName)
      await file.delete()
      console.log(`🗑️ Cleaned up temp Instagram image: ${fileName}`)
    }
    
  } catch (error) {
    // Don't throw - cleanup failure shouldn't break the flow
    console.warn('Failed to cleanup temp Instagram image:', error)
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
    
    // NEW: Handle library images
    const libraryImageIdsString = formData.get('libraryImageIds') as string
    const libraryImageIds = libraryImageIdsString ? JSON.parse(libraryImageIdsString) : []

    // NEW: Handle AI-selected image URL (from content generator)
    const aiImageUrl = formData.get('aiImageUrl') as string | null

    // Extract directly uploaded images from FormData (for backward compatibility)
    const uploadedImages: File[] = []
    for (let i = 0; i < imageCount; i++) {
      const image = formData.get(`image_${i}`) as File
      if (image) {
        uploadedImages.push(image)
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
      imageCount: uploadedImages.length,
      libraryImageCount: libraryImageIds.length,
      aiImageUrl: aiImageUrl ? aiImageUrl.substring(0, 80) + '...' : null
    })

    // Download AI-selected image if provided
    let aiImages: File[] = []
    if (aiImageUrl) {
      try {
        console.log(`🤖 Downloading AI-selected image: ${aiImageUrl.substring(0, 80)}...`)
        const response = await fetch(aiImageUrl)
        if (response.ok) {
          const buffer = await response.arrayBuffer()
          const contentType = response.headers.get('content-type') || 'image/jpeg'
          const extension = contentType.includes('png') ? 'png' : 'jpg'
          const imageFile = new File([buffer], `ai-selected.${extension}`, { type: contentType })
          aiImages.push(imageFile)
          console.log(`✅ AI image downloaded: ${buffer.byteLength} bytes`)
        } else {
          console.error(`❌ Failed to download AI image: ${response.status}`)
        }
      } catch (error) {
        console.error('❌ Failed to download AI-selected image:', error)
      }
    }

    // NEW: Fetch library images and convert to usable format
    let libraryImages: File[] = []
    if (libraryImageIds.length > 0) {
      console.log('🖼️ Fetching library images:', libraryImageIds)
      
      try {
        const libraryImageRecords = await prisma.imageLibrary.findMany({
          where: {
            id: { in: libraryImageIds },
            isActive: true
          }
        })

        console.log(`📸 Found ${libraryImageRecords.length} library images`)

        // Download library images and convert to Files for posting
        for (const imageRecord of libraryImageRecords) {
          try {
            console.log(`⬇️ Downloading image: ${imageRecord.originalName}`)
            const response = await fetch(imageRecord.cloudUrl)
            
            if (!response.ok) {
              console.error(`Failed to download image ${imageRecord.id}: ${response.status}`)
              continue
            }

            const imageBuffer = await response.arrayBuffer()
            const imageFile = new File(
              [imageBuffer], 
              imageRecord.originalName, 
              { type: imageRecord.mimeType }
            )

            libraryImages.push(imageFile)
            console.log(`✅ Downloaded: ${imageRecord.originalName} (${imageBuffer.byteLength} bytes)`)
          } catch (downloadError) {
            console.error(`Failed to download library image ${imageRecord.id}:`, downloadError)
          }
        }

        console.log(`🎯 Successfully prepared ${libraryImages.length} library images for posting`)
      } catch (error) {
        console.error('Failed to fetch library images:', error)
      }
    }

    // Combine all image sources: uploaded + library + AI-selected
    const images = [...uploadedImages, ...libraryImages, ...aiImages]
    console.log(`📊 Total images for posting: ${images.length} (${uploadedImages.length} uploaded + ${libraryImages.length} library + ${aiImages.length} AI-selected)`)

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
                console.log(`🢠Posting to Google Business Profile: ${location.locationName}`)
                
                if (images.length > 0) {
                  console.log(`📸 Including ${images.length} images in GBP post`)
                }
                
                // Use enhanced createPost method with image support
                const postResult = await googleService.createPost(
                  location.accountId,
                  location.locationId,
                  formatPostForGBP(content, contentType),
                  images.length > 0 ? images : undefined
                )
                
                if (postResult.success) {
                  console.log(`✅ Google Business Profile success: ${location.locationName} - Post: ${postResult.post?.name}`)
                  results.push({
                    businessName: location.locationName,
                    platform: 'google',
                    success: true,
                    postId: postResult.post?.name,
                    hasImages: postResult.hasImages || false,
                    mediaCount: postResult.mediaCount || 0
                  })
                } else {
                  console.error(`❌ Google Business Profile failed: ${location.locationName} - ${postResult.error}`)
                  errors.push({
                    businessName: location.locationName,
                    platform: 'google',
                    error: postResult.error
                  })
                }
              }
              break
              
            case 'twitter':
              console.log('🐦 Twitter posting - using Twitter API manager')
              
              let mediaIds: string[] = []
              
              // ✅ Twitter image upload looks good
              if (images.length > 0) {
                console.log(`📤 Uploading ${images.length} images to Twitter...`)
                
                for (const image of images) {
                  try {
                    // Convert File to Buffer
                    const arrayBuffer = await image.arrayBuffer()
                    const buffer = Buffer.from(arrayBuffer)
                    
                    console.log(`📤 Uploading image: ${image.name} (${image.type}, ${buffer.length} bytes)`)
                    
                    const uploadResult = await twitterApiManager.uploadMedia(
                      businessBrand,
                      buffer,
                      image.type
                    )
                    
                    if (uploadResult.success && uploadResult.data?.media_id_string) {
                      mediaIds.push(uploadResult.data.media_id_string)
                      console.log(`✅ Twitter image uploaded: ${uploadResult.data.media_id_string}`)
                    } else {
                      console.error(`❌ Twitter image upload failed: ${uploadResult.error}`)
                      // Continue with other images rather than failing completely
                    }
                  } catch (imageError) {
                    console.error(`❌ Error processing Twitter image ${image.name}:`, imageError)
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
              console.log(`📘 Posting to Facebook for business: ${businessBrand}`)
              
              try {
                // Use the first image if available
                const facebookImage = images.length > 0 ? images[0] : undefined
                
                if (facebookImage) {
                  console.log(`📸 Posting to Facebook with image: ${facebookImage.name}`)
                } else {
                  console.log(`📝 Posting text-only to Facebook`)
                }
                
                const facebookResult = await metaApiManager.postToFacebook(
                  businessBrand, 
                  content, 
                  {}, // options
                  facebookImage // image file
                )
                
                if (facebookResult.success) {
                  console.log(`✅ Facebook success: ${businessBrand} - Post ID: ${facebookResult.postId}`)
                  results.push({
                    businessName,
                    platform: 'facebook',
                    success: true,
                    postId: facebookResult.postId,
                    hasImages: !!facebookImage,
                    mediaIds: [], 
                    data: facebookResult.data
                  })
                } else {
                  console.error(`❌ Facebook posting failed for ${businessBrand}:`, facebookResult.error)
                  errors.push({
                    businessName,
                    platform: 'facebook',
                    error: facebookResult.error
                  })
                }
                
              } catch (error) {
                console.error(`❌ Facebook posting error for ${businessBrand}:`, error)
                errors.push({
                  businessName,
                  platform: 'facebook',
                  error: error instanceof Error ? error.message : 'Facebook posting failed'
                })
              }
              break
              
            case 'instagram':
              console.log(`📷 Posting to Instagram for business: ${businessBrand}`)
              
              try {
                // Instagram requires images - check if we have any
                if (images.length === 0) {
                  console.error(`❌ Instagram requires images for posts`)
                  errors.push({
                    businessName,
                    platform: 'instagram',
                    error: 'Instagram requires at least one image for posts'
                  })
                  break
                }

                // For now, use the first image (Instagram API supports single image posts more reliably)
                const primaryImage = images[0]
                
                // ✅ FIXED: Use the properly scoped function
                let imageUrl: string
                
                try {
                  // Create a temporary upload for Instagram posting
                  const arrayBuffer = await primaryImage.arrayBuffer()
                  const buffer = Buffer.from(arrayBuffer)
                  
                  // Save this temporarily to cloud storage
                  imageUrl = await uploadTempImageForInstagram(buffer, primaryImage.name, businessBrand)
                  
                } catch (imageError) {
                  console.error(`❌ Failed to prepare image for Instagram:`, imageError)
                  errors.push({
                    businessName,
                    platform: 'instagram',
                    error: 'Failed to prepare image for Instagram posting'
                  })
                  break
                }

                // Post to Instagram using metaApiManager
                const instagramResult = await metaApiManager.postToInstagram(businessBrand, content, imageUrl)
                
                if (instagramResult.success) {
                  console.log(`✅ Instagram success: ${businessBrand} - Post ID: ${instagramResult.postId}`)
                  results.push({
                    businessName,
                    platform: 'instagram',
                    success: true,
                    postId: instagramResult.postId,
                    hasImages: true,
                    mediaIds: [instagramResult.postId], // Instagram uses post ID as media reference
                    imageUrl: imageUrl
                  })
                  
                  // Optional: Clean up temp file after successful posting
                  cleanupTempInstagramImage(imageUrl).catch(console.warn)
                } else {
                  console.error(`❌ Instagram posting failed for ${businessBrand}:`, instagramResult.error)
                  errors.push({
                    businessName,
                    platform: 'instagram',
                    error: instagramResult.error
                  })
                }
                
              } catch (error) {
                console.error(`❌ Instagram posting error for ${businessBrand}:`, error)
                errors.push({
                  businessName,
                  platform: 'instagram',
                  error: error instanceof Error ? error.message : 'Instagram posting failed'
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
      imageCount: images.length,
      libraryImageCount: libraryImages.length,
      uploadedImageCount: uploadedImages.length
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