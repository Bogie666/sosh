// src/app/api/images/reset-usage/route.ts
// Reset usageCount and lastUsed for images. Useful after testing to clear out
// tracking data that shouldn't count against the image diversity algorithm.

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { businessId } = body

    // Reset all images (scoped to a business if provided)
    const result = await prisma.imageLibrary.updateMany({
      where: businessId ? { businessId } : {},
      data: {
        usageCount: 0,
        lastUsed: null
      }
    })

    return NextResponse.json({
      success: true,
      count: result.count,
      message: `Reset usage for ${result.count} images${businessId ? ` for business ${businessId}` : ' across all businesses'}`
    })
  } catch (error) {
    console.error('Failed to reset image usage:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reset image usage'
    }, { status: 500 })
  }
}
