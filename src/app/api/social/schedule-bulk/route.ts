// src/app/api/social/schedule-bulk/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { ensureUserExists } from '@/lib/ensure-user'

interface BulkScheduleRequest {
  posts: {
    content: string
    platform: string
    businessId: string
    imageUrl?: string
    scheduledFor: string
  }[]
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { posts }: BulkScheduleRequest = await request.json()

    if (!posts || !Array.isArray(posts) || posts.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Posts array is required' },
        { status: 400 }
      )
    }

    // Ensure user exists in database before creating FK-linked ScheduledPost
    let userId: string
    try {
      const userResult = await ensureUserExists(session)
      userId = userResult.userId
      console.log(`📝 [schedule-bulk] User resolved: ${userId} (method: ${userResult.method})`)
    } catch (err) {
      console.error('❌ [schedule-bulk] Failed to ensure user:', err)
      return NextResponse.json(
        { success: false, error: err instanceof Error ? err.message : 'Failed to resolve user' },
        { status: 500 }
      )
    }

    const now = new Date()
    const results = []
    const errors = []

    // Process each post
    for (let i = 0; i < posts.length; i++) {
      const post = posts[i]
      
      try {
        // Validation for each post
        if (!post.content?.trim()) {
          errors.push(`Post ${i + 1}: Content is required`)
          continue
        }

        if (!post.platform) {
          errors.push(`Post ${i + 1}: Platform is required`)
          continue
        }

        if (!post.businessId) {
          errors.push(`Post ${i + 1}: Business ID is required`)
          continue
        }

        if (!post.scheduledFor) {
          errors.push(`Post ${i + 1}: Scheduled time is required`)
          continue
        }

        const scheduledDate = new Date(post.scheduledFor)
        
        if (scheduledDate <= now) {
          errors.push(`Post ${i + 1}: Scheduled time must be in the future`)
          continue
        }

        // Create scheduled post
        const scheduledPost = await prisma.scheduledPost.create({
          data: {
            userId, // Resolved by ensureUserExists above
            content: post.content.trim(),
            platforms: [post.platform],
            businesses: [post.businessId],
            images: post.imageUrl ? [post.imageUrl] : [],
            scheduledFor: scheduledDate,
            status: 'SCHEDULED'
          }
        })

        results.push({
          postId: scheduledPost.id,
          platform: post.platform,
          businessId: post.businessId,
          scheduledFor: scheduledDate.toISOString(),
          success: true
        })

        console.log(`✅ Bulk scheduled post ${i + 1}: ${scheduledPost.id} for ${post.platform}`)

      } catch (error) {
        console.error(`❌ Failed to schedule post ${i + 1}:`, error)
        errors.push(`Post ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    const successCount = results.length
    const errorCount = errors.length

    console.log(`📊 Bulk scheduling complete: ${successCount} successful, ${errorCount} failed`)

    return NextResponse.json({
      success: successCount > 0,
      error: successCount === 0 && errorCount > 0
        ? `All ${errorCount} posts failed to schedule: ${errors.slice(0, 3).join('; ')}`
        : undefined,
      results: {
        scheduled: results,
        errors: errors,
        summary: {
          total: posts.length,
          successful: successCount,
          failed: errorCount
        }
      },
      message: errorCount === 0
        ? `All ${successCount} posts scheduled successfully!`
        : `${successCount} posts scheduled, ${errorCount} failed`
    })

  } catch (error) {
    console.error('❌ Bulk scheduling failed:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Bulk scheduling failed' 
      },
      { status: 500 }
    )
  }
}