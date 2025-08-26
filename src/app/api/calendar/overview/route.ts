// src/app/api/calendar/overview/route.ts - Calendar overview and analytics
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') // Format: YYYY-MM
    const businessesParam = searchParams.get('businesses')
    const platformsParam = searchParams.get('platforms')

    if (!month) {
      return NextResponse.json(
        { success: false, error: 'Month parameter is required (YYYY-MM format)' },
        { status: 400 }
      )
    }

    const businesses = businessesParam ? businessesParam.split(',') : []
    const platforms = platformsParam ? platformsParam.split(',') : []

    // Calculate month boundaries
    const startDate = new Date(`${month}-01T00:00:00`)
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0, 23, 59, 59)

    // Get scheduled posts
    const scheduledPostsWhere: any = {
      scheduledFor: {
        gte: startDate,
        lte: endDate
      },
      status: {
        in: ['SCHEDULED', 'POSTING']
      }
    }

    if (businesses.length > 0) {
      scheduledPostsWhere.businesses = {
        hasSome: businesses
      }
    }

    if (platforms.length > 0) {
      scheduledPostsWhere.platforms = {
        hasSome: platforms
      }
    }

    const scheduledPosts = await prisma.scheduledPost.findMany({
      where: scheduledPostsWhere,
      select: {
        id: true,
        content: true,
        platforms: true,
        businesses: true,
        scheduledFor: true,
        status: true
      }
    })

    // Get posted content
    const postedContentWhere: any = {
      postedAt: {
        gte: startDate,
        lte: endDate
      },
      status: 'POSTED'
    }

    if (businesses.length > 0) {
      postedContentWhere.businessId = {
        in: businesses
      }
    }

    if (platforms.length > 0) {
      postedContentWhere.platform = {
        in: platforms.map(p => p.toUpperCase())
      }
    }

    const postedContent = await prisma.postHistory.findMany({
      where: postedContentWhere,
      select: {
        id: true,
        businessId: true,
        platform: true,
        content: true,
        postedAt: true,
        engagement: true
      }
    })

    // Calculate analytics
    const totalScheduled = scheduledPosts.reduce((total, post) => {
      return total + (post.platforms.length * post.businesses.length)
    }, 0)

    const totalPosted = postedContent.length

    const platformBreakdown = calculatePlatformBreakdown(scheduledPosts, postedContent, platforms)
    const businessBreakdown = calculateBusinessBreakdown(scheduledPosts, postedContent, businesses)
    const dailyBreakdown = calculateDailyBreakdown(scheduledPosts, postedContent, startDate, endDate)

    // Get engagement metrics
    const totalEngagement = postedContent.reduce((total, post) => {
      const engagement = post.engagement as any
      if (engagement && typeof engagement === 'object') {
        const likes = engagement.likes || 0
        const shares = engagement.shares || 0
        const comments = engagement.comments || 0
        return total + likes + shares + comments
      }
      return total
    }, 0)

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalScheduled,
          totalPosted,
          totalEngagement,
          averageEngagementPerPost: totalPosted > 0 ? Math.round(totalEngagement / totalPosted) : 0
        },
        breakdowns: {
          platforms: platformBreakdown,
          businesses: businessBreakdown,
          daily: dailyBreakdown
        },
        month: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          name: startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        }
      }
    })

  } catch (error) {
    console.error('Error fetching calendar overview:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch calendar overview' },
      { status: 500 }
    )
  }
}

// Helper function to calculate platform breakdown
function calculatePlatformBreakdown(scheduledPosts: any[], postedContent: any[], platforms: string[]) {
  const breakdown: Record<string, { scheduled: number; posted: number }> = {}

  // Initialize platforms
  platforms.forEach(platform => {
    breakdown[platform] = { scheduled: 0, posted: 0 }
  })

  // Count scheduled posts by platform
  scheduledPosts.forEach(post => {
    post.platforms.forEach((platform: string) => {
      if (platforms.length === 0 || platforms.includes(platform)) {
        if (!breakdown[platform]) breakdown[platform] = { scheduled: 0, posted: 0 }
        breakdown[platform].scheduled += post.businesses.length
      }
    })
  })

  // Count posted content by platform
  postedContent.forEach(post => {
    const platform = post.platform.toLowerCase()
    if (platforms.length === 0 || platforms.includes(platform)) {
      if (!breakdown[platform]) breakdown[platform] = { scheduled: 0, posted: 0 }
      breakdown[platform].posted += 1
    }
  })

  return breakdown
}

// Helper function to calculate business breakdown
function calculateBusinessBreakdown(scheduledPosts: any[], postedContent: any[], businesses: string[]) {
  const breakdown: Record<string, { scheduled: number; posted: number }> = {}

  // Initialize businesses
  businesses.forEach(business => {
    breakdown[business] = { scheduled: 0, posted: 0 }
  })

  // Count scheduled posts by business
  scheduledPosts.forEach(post => {
    post.businesses.forEach((businessId: string) => {
      if (businesses.length === 0 || businesses.includes(businessId)) {
        if (!breakdown[businessId]) breakdown[businessId] = { scheduled: 0, posted: 0 }
        breakdown[businessId].scheduled += post.platforms.length
      }
    })
  })

  // Count posted content by business
  postedContent.forEach(post => {
    const businessId = post.businessId
    if (businesses.length === 0 || businesses.includes(businessId)) {
      if (!breakdown[businessId]) breakdown[businessId] = { scheduled: 0, posted: 0 }
      breakdown[businessId].posted += 1
    }
  })

  return breakdown
}

// Helper function to calculate daily breakdown
function calculateDailyBreakdown(scheduledPosts: any[], postedContent: any[], startDate: Date, endDate: Date) {
  const breakdown: Record<string, { scheduled: number; posted: number }> = {}

  // Initialize all days in the month
  const currentDate = new Date(startDate)
  while (currentDate <= endDate) {
    const dateKey = currentDate.toISOString().split('T')[0]
    breakdown[dateKey] = { scheduled: 0, posted: 0 }
    currentDate.setDate(currentDate.getDate() + 1)
  }

  // Count scheduled posts by day
  scheduledPosts.forEach(post => {
    const dateKey = post.scheduledFor.toISOString().split('T')[0]
    if (breakdown[dateKey]) {
      breakdown[dateKey].scheduled += post.platforms.length * post.businesses.length
    }
  })

  // Count posted content by day
  postedContent.forEach(post => {
    const dateKey = post.postedAt.toISOString().split('T')[0]
    if (breakdown[dateKey]) {
      breakdown[dateKey].posted += 1
    }
  })

  return breakdown
}