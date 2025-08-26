// src/app/api/calendar/posts/route.ts - Get scheduled posts for calendar
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const businessesParam = searchParams.get('businesses')
    const platformsParam = searchParams.get('platforms')

    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'Start date and end date are required' },
        { status: 400 }
      )
    }

    const businesses = businessesParam ? businessesParam.split(',') : []
    const platforms = platformsParam ? platformsParam.split(',') : []

    // Build where clause
    const whereClause: any = {
      scheduledFor: {
        gte: new Date(startDate),
        lte: new Date(endDate + 'T23:59:59')
      },
      status: {
        in: ['SCHEDULED', 'POSTING']
      }
    }

    if (businesses.length > 0) {
      whereClause.businesses = {
        hasSome: businesses
      }
    }

    if (platforms.length > 0) {
      whereClause.platforms = {
        hasSome: platforms
      }
    }

    // Get scheduled posts from database
    const scheduledPosts = await prisma.scheduledPost.findMany({
      where: whereClause,
      select: {
        id: true,
        content: true,
        platforms: true,
        businesses: true,
        images: true,
        scheduledFor: true,
        status: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        scheduledFor: 'asc'
      }
    })

    // Transform posts for calendar display
    const calendarPosts = scheduledPosts.flatMap(post => {
      const posts: any[] = []
      
      // Create individual posts for each platform/business combination
      post.platforms.forEach(platform => {
        post.businesses.forEach(businessId => {
          posts.push({
            id: `${post.id}-${platform}-${businessId}`,
            originalId: post.id,
            businessId,
            businessName: getBusinessName(businessId),
            platform,
            date: post.scheduledFor,
            time: post.scheduledFor.toTimeString().slice(0, 5),
            content: post.content,
            status: post.status.toLowerCase(),
            source: 'scheduled',
            imageUrl: post.images.length > 0 ? post.images[0] : null,
            characterCount: post.content.length,
            withinLimits: checkCharacterLimit(post.content, platform),
            metadata: {
              createdAt: post.createdAt,
              updatedAt: post.updatedAt
            }
          })
        })
      })
      
      return posts
    })

    return NextResponse.json({
      success: true,
      posts: calendarPosts,
      total: calendarPosts.length
    })

  } catch (error) {
    console.error('Error fetching calendar posts:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch calendar posts' },
      { status: 500 }
    )
  }
}

// Helper function to get business display name
function getBusinessName(businessId: string): string {
  const businessNames: Record<string, string> = {
    'lex-dallas': 'Lex Dallas',
    'lex-etx': 'Lex ETX',
    'lyons': 'Lyons'
  }
  return businessNames[businessId] || businessId
}

// Helper function to check character limits
function checkCharacterLimit(content: string, platform: string): boolean {
  const limits: Record<string, number> = {
    twitter: 280,
    instagram: 2200,
    facebook: 63206,
    google: 1500
  }
  const limit = limits[platform] || 1000
  return content.length <= limit
}