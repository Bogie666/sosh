// src/app/api/posting-optimization/route.ts
// Endpoint for posting time optimization suggestions

import { NextRequest, NextResponse } from 'next/server'
import { loadBusinessContext } from '@/lib/business-context'
import {
  getOptimalPostingTimes,
  getBestPostingTime,
  getWeeklySchedule,
  suggestBatchPostingTimes
} from '@/lib/posting-optimizer'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { businessId, platform, day, postCount, startDate } = body

    if (!businessId || !platform) {
      return NextResponse.json(
        { success: false, error: 'businessId and platform are required' },
        { status: 400 }
      )
    }

    // Load business posting schedule preferences
    let postingSchedule = null
    try {
      const ctx = await loadBusinessContext(businessId)
      postingSchedule = ctx.business.postingSchedule
    } catch {
      // Non-critical - use defaults
    }

    if (day) {
      // Single day optimization
      const times = getOptimalPostingTimes(platform, day, postingSchedule)
      const best = getBestPostingTime(platform, day, postingSchedule)

      return NextResponse.json({
        success: true,
        bestTime: best,
        allTimes: times,
        day,
        platform
      })
    }

    if (postCount && startDate) {
      // Batch optimization
      const suggestions = suggestBatchPostingTimes(
        platform,
        postCount,
        new Date(startDate),
        postingSchedule
      )

      return NextResponse.json({
        success: true,
        suggestions: suggestions.map(s => ({
          date: s.date.toISOString(),
          time: s.time
        })),
        platform
      })
    }

    // Full week schedule
    const schedule = getWeeklySchedule(platform, postingSchedule)

    return NextResponse.json({
      success: true,
      weeklySchedule: schedule,
      platform
    })

  } catch (error) {
    console.error('Posting optimization error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
