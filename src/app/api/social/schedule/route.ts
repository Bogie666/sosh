// src/app/api/social/schedule/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

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

    // Ensure user exists in database (Prisma adapter is disabled, so users
    // aren't auto-created on sign-in. We need the record for the FK.)
    const userId = session.user.id
    await prisma.user.upsert({
      where: { id: userId },
      update: { name: session.user.name, email: session.user.email || '', image: session.user.image },
      create: { id: userId, name: session.user.name, email: session.user.email || '', image: session.user.image }
    })

    // Create scheduled post in database
    const scheduledPost = await prisma.scheduledPost.create({
      data: {
        userId: session.user.id,
        content: content.trim(),
        platforms: [platform], // Convert single platform to array
        businesses: [businessId], // Convert single business to array
        images: imageUrl ? [imageUrl] : [], // Convert single image to array if provided
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

    const scheduledPosts = await prisma.scheduledPost.findMany({
      where: {
        userId: session.user.id,
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