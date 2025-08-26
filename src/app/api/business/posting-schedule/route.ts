// src/app/api/business/posting-schedule/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')

    if (!businessId) {
      return NextResponse.json(
        { success: false, error: 'Business ID is required' },
        { status: 400 }
      )
    }

    // Get business profile with posting schedule
    const businessProfile = await prisma.businessProfile.findUnique({
      where: { businessId },
      select: {
        id: true,
        businessId: true,
        postingSchedule: true
      }
    })

    // Return posting schedule or default structure
    const postingSchedule = businessProfile?.postingSchedule || {
      platforms: {
        facebook: {
          enabled: true,
          daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
          postsPerDay: 1,
          timeDistribution: 'auto',
          customTimes: [],
          autoTimes: ['09:00']
        },
        instagram: {
          enabled: true,
          daysOfWeek: ['monday', 'wednesday', 'friday'],
          postsPerDay: 1,
          timeDistribution: 'auto',
          customTimes: [],
          autoTimes: ['14:00']
        },
        twitter: {
          enabled: false,
          daysOfWeek: [],
          postsPerDay: 1,
          timeDistribution: 'auto',
          customTimes: [],
          autoTimes: []
        },
        google: {
          enabled: false,
          daysOfWeek: [],
          postsPerDay: 1,
          timeDistribution: 'auto',
          customTimes: [],
          autoTimes: []
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        businessId,
        postingSchedule
      }
    })

  } catch (error) {
    console.error('Error fetching posting schedule:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch posting schedule' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { businessId, postingSchedule } = body

    if (!businessId || !postingSchedule) {
      return NextResponse.json(
        { success: false, error: 'Business ID and posting schedule are required' },
        { status: 400 }
      )
    }

    // Validate posting schedule structure
    if (!postingSchedule.platforms) {
      return NextResponse.json(
        { success: false, error: 'Invalid posting schedule format' },
        { status: 400 }
      )
    }

    // Update or create business profile with posting schedule
    const updatedProfile = await prisma.businessProfile.upsert({
      where: { businessId },
      update: {
        postingSchedule,
        updatedAt: new Date()
      },
      create: {
        businessId,
        postingSchedule,
        brandVoice: null,
        messageStyle: null,
        serviceTypes: [],
        serviceAreas: [],
        approvedTemplates: []
      }
    })

    console.log(`✅ Updated posting schedule for business ${businessId}`)

    return NextResponse.json({
      success: true,
      data: {
        businessId: updatedProfile.businessId,
        postingSchedule: updatedProfile.postingSchedule
      }
    })

  } catch (error) {
    console.error('Error saving posting schedule:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save posting schedule' },
      { status: 500 }
    )
  }
}