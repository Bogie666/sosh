// src/app/api/calendar/reschedule/route.ts - Reschedule posts from calendar
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { postId, newDate, newTime } = body

    if (!postId || !newDate) {
      return NextResponse.json(
        { success: false, error: 'Post ID and new date are required' },
        { status: 400 }
      )
    }

    // Parse the new scheduled date/time
    const scheduledFor = new Date(`${newDate.split('T')[0]}T${newTime || '09:00'}:00`)

    if (isNaN(scheduledFor.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Invalid date/time format' },
        { status: 400 }
      )
    }

    // Check if this is a composite ID (from calendar display)
    let actualPostId = postId
    if (postId.includes('-')) {
      // Extract the original post ID from composite ID
      actualPostId = postId.split('-')[0]
    }

    // Update the scheduled post
    const updatedPost = await prisma.scheduledPost.update({
      where: { id: actualPostId },
      data: {
        scheduledFor,
        updatedAt: new Date()
      }
    })

    console.log(`✅ Rescheduled post ${actualPostId} to ${scheduledFor}`)

    return NextResponse.json({
      success: true,
      message: 'Post rescheduled successfully',
      post: {
        id: updatedPost.id,
        scheduledFor: updatedPost.scheduledFor,
        updatedAt: updatedPost.updatedAt
      }
    })

  } catch (error) {
    console.error('Error rescheduling post:', error)
    
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return NextResponse.json(
        { success: false, error: 'Post not found or cannot be rescheduled' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to reschedule post' },
      { status: 500 }
    )
  }
}

// DELETE endpoint for removing scheduled posts
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const postId = searchParams.get('postId')

    if (!postId) {
      return NextResponse.json(
        { success: false, error: 'Post ID is required' },
        { status: 400 }
      )
    }

    // Check if this is a composite ID (from calendar display)
    let actualPostId = postId
    if (postId.includes('-')) {
      // Extract the original post ID from composite ID
      actualPostId = postId.split('-')[0]
    }

    // Delete the scheduled post
    await prisma.scheduledPost.delete({
      where: { id: actualPostId }
    })

    console.log(`🗑️ Deleted scheduled post ${actualPostId}`)

    return NextResponse.json({
      success: true,
      message: 'Post deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting post:', error)
    
    if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to delete post' },
      { status: 500 }
    )
  }
}