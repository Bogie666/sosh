// src/app/api/scheduler/status/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const now = new Date()
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

    // Basic statistics - handle cases where tables might not exist yet
    let totalScheduled = 0
    let pendingPosts = 0
    let recentlyProcessed = 0
    let recentlyFailed = 0
    let upcomingPosts = 0

    try {
      totalScheduled = await prisma.scheduledPost.count({
        where: { status: 'SCHEDULED' }
      })

      pendingPosts = await prisma.scheduledPost.count({
        where: {
          status: 'SCHEDULED',
          scheduledFor: { lt: now }
        }
      })

      recentlyProcessed = await prisma.scheduledPost.count({
        where: {
          status: 'POSTED',
          updatedAt: { gte: twentyFourHoursAgo }
        }
      })

      recentlyFailed = await prisma.scheduledPost.count({
        where: {
          status: 'FAILED',
          updatedAt: { gte: twentyFourHoursAgo }
        }
      })

      upcomingPosts = await prisma.scheduledPost.count({
        where: {
          status: 'SCHEDULED',
          scheduledFor: {
            gte: now,
            lte: new Date(now.getTime() + 60 * 60 * 1000) // next hour
          }
        }
      })
    } catch (dbError) {
      console.log('Database query error (might be normal for new setup):', dbError)
    }

    // Calculate success rate
    const totalProcessed = recentlyProcessed + recentlyFailed
    const successRate = totalProcessed > 0 ? (recentlyProcessed / totalProcessed) * 100 : 100

    // Get recent errors (if possible)
    let recentErrors: any[] = []
    try {
      const errors = await prisma.scheduledPost.findMany({
        where: {
          status: 'FAILED',
          updatedAt: { gte: twentyFourHoursAgo }
        },
        select: {
          id: true,
          platforms: true,
          businesses: true,
          errorMessage: true,
          updatedAt: true,
          scheduledFor: true
        },
        orderBy: { updatedAt: 'desc' },
        take: 5
      })

      recentErrors = errors.map(error => ({
        id: error.id,
        platforms: error.platforms,
        businesses: error.businesses,
        error: error.errorMessage,
        scheduledFor: error.scheduledFor.toISOString(),
        failedAt: error.updatedAt.toISOString()
      }))
    } catch (errorQueryError) {
      console.log('Error query failed (normal for new setup):', errorQueryError)
    }

    // Get platform breakdown (if possible)
    let platformStats: any = {}
    try {
      const platformBreakdown = await prisma.postHistory.groupBy({
        by: ['platform', 'status'],
        where: {
          postedAt: { gte: twentyFourHoursAgo }
        },
        _count: true
      })

      platformStats = platformBreakdown.reduce((acc, item) => {
        const platform = item.platform.toLowerCase()
        if (!acc[platform]) {
          acc[platform] = { total: 0, posted: 0, failed: 0 }
        }
        acc[platform].total += item._count
        if (item.status === 'POSTED') {
          acc[platform].posted = item._count
        } else if (item.status === 'FAILED') {
          acc[platform].failed = item._count
        }
        return acc
      }, {} as Record<string, { total: number; posted: number; failed: number }>)
    } catch (platformError) {
      console.log('Platform stats query failed (normal for new setup):', platformError)
    }

    const status = {
      timestamp: now.toISOString(),
      overview: {
        totalScheduled,
        pendingPosts,
        upcomingInNextHour: upcomingPosts,
        successRate: Math.round(successRate * 100) / 100
      },
      last24Hours: {
        processed: recentlyProcessed,
        failed: recentlyFailed,
        total: totalProcessed
      },
      platformStats,
      recentErrors,
      health: {
        status: pendingPosts > 10 ? 'warning' : (recentlyFailed > recentlyProcessed && totalProcessed > 0 ? 'error' : 'healthy'),
        message: pendingPosts > 10 
          ? `${pendingPosts} posts are overdue for processing`
          : recentlyFailed > recentlyProcessed && totalProcessed > 0
          ? 'More posts are failing than succeeding'
          : 'System ready - no posts currently scheduled or all systems normal'
      }
    }

    return NextResponse.json(status)

  } catch (error) {
    console.error('❌ Status check failed:', error)
    return NextResponse.json(
      { 
        error: 'Status check failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        health: {
          status: 'error',
          message: 'Status endpoint encountered an error'
        }
      },
      { status: 500 }
    )
  }
}

// Simple health check
export async function HEAD() {
  try {
    // Very basic check - just test database connection
    await prisma.$queryRaw`SELECT 1 as test`
    
    return new NextResponse(null, { 
      status: 200,
      headers: {
        'X-Health-Status': 'healthy',
        'X-Timestamp': new Date().toISOString()
      }
    })
  } catch (error) {
    return new NextResponse(null, { 
      status: 503,
      headers: {
        'X-Health-Status': 'unhealthy',
        'X-Error': error instanceof Error ? error.message : 'Database connection failed'
      }
    })
  }
}