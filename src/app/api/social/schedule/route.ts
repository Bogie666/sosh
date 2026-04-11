// src/app/api/social/schedule/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { ensureUserExists } from '@/lib/ensure-user'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { content, platform, businessId, imageUrl, scheduledFor } = await request.json()

    // Validation
    if (!content?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Content is required' },
        { status: 400 }
      )
    }

    if (!platform) {
      return NextResponse.json(
        { success: false, error: 'Platform is required' },
        { status: 400 }
      )
    }

    if (!businessId) {
      return NextResponse.json(
        { success: false, error: 'Business ID is required' },
        { status: 400 }
      )
    }

    if (!scheduledFor) {
      return NextResponse.json(
        { success: false, error: 'Scheduled time is required' },
        { status: 400 }
      )
    }

    // Parse and validate scheduled date
    const scheduledDate = new Date(scheduledFor)
    const now = new Date()

    if (scheduledDate <= now) {
      return NextResponse.json(
        { success: false, error: 'Scheduled time must be in the future' },
        { status: 400 }
      )
    }

    // Ensure user exists in database before creating FK-linked ScheduledPost
    let userId: string
    try {
      const userResult = await ensureUserExists(session)
      userId = userResult.userId
      console.log(`📝 [schedule] User resolved: ${userId} (method: ${userResult.method})`)
    } catch (err) {
      console.error('❌ [schedule] Failed to ensure user:', err)
      return NextResponse.json(
        { success: false, error: err instanceof Error ? err.message : 'Failed to resolve user' },
        { status: 500 }
      )
    }

    // Create scheduled post in database
    const scheduledPost = await prisma.scheduledPost.create({
      data: {
        userId, // Resolved by ensureUserExists above
        content: content.trim(),
        platforms: [platform],
        businesses: [businessId],
        images: imageUrl ? [imageUrl] : [],
        scheduledFor: scheduledDate,
        status: 'SCHEDULED'
      }
    })

    console.log(`✅ Scheduled post created: ${scheduledPost.id} for ${platform} at ${scheduledDate.toISOString()}`)

    return NextResponse.json({
      success: true,
      postId: scheduledPost.id,
      scheduledFor: scheduledDate.toISOString(),
      message: `Post scheduled for ${scheduledDate.toLocaleString()}`
    })

  } catch (error) {
    console.error('❌ Failed to schedule post:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to schedule post' 
      },
      { status: 500 }
    )
  }
}

// GET method to retrieve scheduled posts
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'SCHEDULED'
    const limit = parseInt(searchParams.get('limit') || '50')

    // Resolve user ID for consistency
    let userId: string
    try {
      const userResult = await ensureUserExists(session)
      userId = userResult.userId
    } catch {
      return NextResponse.json({ success: true, posts: [], count: 0 })
    }

    const scheduledPosts = await prisma.scheduledPost.findMany({
      where: {
        userId,
        status: status as any
      },
      orderBy: {
        scheduledFor: 'asc'
      },
      take: limit
    })

    return NextResponse.json({
      success: true,
      posts: scheduledPosts,
      count: scheduledPosts.length
    })

  } catch (error) {
    console.error('❌ Failed to fetch scheduled posts:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch scheduled posts' 
      },
      { status: 500 }
    )
  }
}