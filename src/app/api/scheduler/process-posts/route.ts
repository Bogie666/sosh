// src/app/api/scheduler/process-posts/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { metaApiManager } from '@/lib/meta-api-manager'
import { twitterApiManager } from '@/lib/twitter-api-manager'
import { googleServiceAccount } from '@/lib/google-service-account'

// Hardcoded business locations mapping (since service account can't see them yet)
const BUSINESS_LOCATIONS = {
  'lex-dallas': { accountId: '104110704176658195109', locationId: '6845140178757010963', name: 'Lex Air Conditioning - Dallas' },
  'lex-etx': { accountId: '104110704176658195109', locationId: '15942044655828192562', name: 'Lex Air Conditioning - ETX' },
  'lyons': { accountId: '104110704176658195109', locationId: '379116535546276113', name: 'Lyons Air Conditioning' },
  'ks': { accountId: '104110704176658195109', locationId: '6845140178757010963', name: 'K&S Heating and Air' }
}

// Verify the request is from Google Cloud Scheduler
function verifySchedulerRequest(request: NextRequest): boolean {
  const userAgent = request.headers.get('user-agent')
  const schedulerHeader = request.headers.get('x-cloudscheduler')
  
  return userAgent?.includes('Google-Cloud-Scheduler') || schedulerHeader !== null
}

export async function POST(request: NextRequest) {
  try {
    // Verify this is a legitimate scheduler request
    if (!verifySchedulerRequest(request)) {
      console.log('Unauthorized scheduler request blocked')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🕒 Processing scheduled posts...')
    
    // Get current time with a small buffer (5 minutes)
    const now = new Date()
    const bufferTime = new Date(now.getTime() + 5 * 60 * 1000) // 5 minutes ahead
    
    // Find all scheduled posts that are due to be published
    const duePosts = await prisma.scheduledPost.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledFor: {
          lte: bufferTime // Posts scheduled for now or earlier (with buffer)
        }
      },
      include: {
        user: true
      }
    })

    console.log(`📋 Found ${duePosts.length} posts due for publishing`)

    if (duePosts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No posts due for processing',
        processed: 0
      })
    }

    const results = []
    
    for (const post of duePosts) {
      console.log(`🚀 Processing post ${post.id} for platforms: ${post.platforms.join(', ')}`)
      
      try {
        // Mark as posting to prevent duplicate execution
        await prisma.scheduledPost.update({
          where: { id: post.id },
          data: { status: 'POSTING' }
        })

        const postResults = []

        // Process each platform
        for (const platform of post.platforms) {
          for (const businessId of post.businesses) {
            try {
              let success = false
              let error = 'Unknown error'
              let postId: string | undefined = undefined

              // Platform switching with service account for Google
              switch (platform.toLowerCase()) {
                case 'google':
                  console.log(`🏢 Posting to Google Business for business: ${businessId}`)
                  
                  // Check if Google service is configured
                  if (!googleServiceAccount) {
                    success = false
                    error = 'Google Service Account not configured'
                    break
                  }
                  
                  // Use hardcoded location mapping for now
                  const locationInfo = BUSINESS_LOCATIONS[businessId as keyof typeof BUSINESS_LOCATIONS]
                  
                  if (locationInfo) {
                    const imageUrl = post.images && post.images.length > 0 ? post.images[0] : undefined
                    console.log(`📍 Posting to ${locationInfo.name} (Account: ${locationInfo.accountId}, Location: ${locationInfo.locationId})`)
                    
                    const gbpResult = await googleServiceAccount.createPost(
                      locationInfo.accountId,
                      locationInfo.locationId,
                      post.content,
                      imageUrl
                    )
                    success = gbpResult.success
                    error = gbpResult.error || 'Unknown Google Business error'
                    postId = gbpResult.postId
                  } else {
                    success = false
                    error = `No Google Business location mapping found for business: ${businessId}`
                  }
                  break
                  
                case 'facebook':
                  console.log(`📘 Posting to Facebook for business: ${businessId}`)
                  const fbResult = await metaApiManager.postToFacebook(businessId, post.content)
                  success = fbResult.success
                  error = fbResult.error || 'Unknown Facebook error'
                  postId = fbResult.postId
                  break
                  
                case 'twitter':
                  console.log(`🐦 Posting to Twitter for business: ${businessId}`)
                  if (twitterApiManager.isConfigured(businessId)) {
                    const twitterOptions = {} // Empty options for now
                    const twitterResult = await twitterApiManager.postTweet(businessId, post.content, twitterOptions)
                    success = twitterResult.success
                    error = twitterResult.error || 'Unknown Twitter error'
                    postId = twitterResult.tweetId
                  } else {
                    success = false
                    error = `Twitter not configured for business: ${businessId}`
                  }
                  break
                  
                case 'instagram':
                  console.log(`📸 Instagram posting for business: ${businessId}`)
                  if (post.images && post.images.length > 0) {
                    const igResult = await metaApiManager.postToInstagram(businessId, post.content, post.images[0])
                    success = igResult.success
                    error = igResult.error || 'Unknown Instagram error'
                    postId = igResult.postId
                  } else {
                    success = false
                    error = 'Instagram requires images'
                  }
                  break
                  
                default:
                  success = false
                  error = `Unsupported platform: ${platform}`
              }
              
              postResults.push({
                platform,
                businessId,
                success,
                error: success ? undefined : error,
                postId
              })

              if (success) {
                console.log(`✅ Posted to ${platform} for business ${businessId}`)
              } else {
                console.error(`❌ Failed to post to ${platform} for business ${businessId}: ${error}`)
              }
              
            } catch (error) {
              console.error(`❌ Error posting to ${platform} for business ${businessId}:`, error)
              postResults.push({
                platform,
                businessId,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                postId: undefined
              })
            }
          }
        }

        // Check if all posts were successful
        const allSuccessful = postResults.every(result => result.success)
        
        // Update post status - only use valid PostStatus enum values
        const newStatus = allSuccessful ? 'POSTED' : 'FAILED'
        
        await prisma.scheduledPost.update({
          where: { id: post.id },
          data: {
            status: newStatus,
            errorMessage: allSuccessful ? null : 
              postResults.filter(r => !r.success).map(r => `${r.platform}: ${r.error}`).join('; ')
          }
        })

        // Create post history records
        for (const result of postResults) {
          if (result.success) {
            await prisma.postHistory.create({
              data: {
                businessId: result.businessId,
                platform: result.platform.toUpperCase() as any, // Convert to enum
                content: post.content,
                externalId: result.postId,
                images: post.images,
                status: 'POSTED',
                errorMessage: null
                // postedAt will be set automatically by @default(now())
              }
            })
          } else {
            await prisma.postHistory.create({
              data: {
                businessId: result.businessId,
                platform: result.platform.toUpperCase() as any, // Convert to enum
                content: post.content,
                externalId: null,
                images: post.images,
                status: 'FAILED',
                errorMessage: result.error
                // postedAt will be set automatically by @default(now())
              }
            })
          }
        }

        results.push({
          postId: post.id,
          status: newStatus,
          platformResults: postResults
        })

      } catch (error) {
        console.error(`❌ Failed to process post ${post.id}:`, error)
        
        // Mark as failed
        await prisma.scheduledPost.update({
          where: { id: post.id },
          data: {
            status: 'FAILED',
            errorMessage: error instanceof Error ? error.message : 'Processing failed'
          }
        })

        results.push({
          postId: post.id,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    console.log(`✅ Processed ${results.length} scheduled posts`)

    return NextResponse.json({
      success: true,
      processed: results.length,
      results
    })

  } catch (error) {
    console.error('❌ Scheduler process failed:', error)
    return NextResponse.json(
      { 
        error: 'Processing failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}