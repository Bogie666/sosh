// src/app/api/calendar/history/route.ts - Get posted content history for calendar
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

    // Build where clause for posted content
    const whereClause: any = {
      postedAt: {
        gte: new Date(startDate),
        lte: new Date(endDate + 'T23:59:59')
      },
      status: 'POSTED'
    }

    if (businesses.length > 0) {
      whereClause.businessId = {
        in: businesses
      }
    }

    if (platforms.length > 0) {
      whereClause.platform = {
        in: platforms.map(p => p.toUpperCase())
      }
    }

    // Get posted content from PostHistory table
    const postedContent = await prisma.postHistory.findMany({
      where: whereClause,
      select: {
        id: true,
        businessId: true,
        platform: true,
        content: true,
        externalId: true,
        images: true,
        status: true,
        postedAt: true,
        engagement: true
      },
      orderBy: {
        postedAt: 'desc'
      }
    })

    // Transform for calendar display
    const calendarPosts = postedContent.map(post => ({
      id: post.id,
      businessId: post.businessId,
      businessName: getBusinessName(post.businessId),
      platform: post.platform.toLowerCase(),
      date: post.postedAt,
      time: post.postedAt.toTimeString().slice(0, 5),
      content: post.content,
      status: 'posted',
      source: 'manual',
      imageUrl: post.images.length > 0 ? post.images[0] : null,
      characterCount: post.content.length,
      withinLimits: checkCharacterLimit(post.content, post.platform.toLowerCase()),
      externalId: post.externalId,
      engagement: post.engagement,
      metadata: {
        postedAt: post.postedAt,
        engagement: post.engagement
      }
    }))

    return NextResponse.json({
      success: true,
      posts: calendarPosts,
      total: calendarPosts.length
    })

  } catch (error) {
    console.error('Error fetching posted content history:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch content history' },
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