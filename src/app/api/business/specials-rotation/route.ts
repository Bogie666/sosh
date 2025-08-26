// src/app/api/business/specials-rotation/route.ts
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

    // Get business profile with rotation settings
    const businessProfile = await prisma.businessProfile.findUnique({
      where: { businessId },
      select: {
        id: true,
        businessId: true,
        seasonalSettings: true
      }
    })

    // Extract rotation settings from seasonalSettings or use defaults
    let rotationSettings = {
      enabled: true,
      hvacPercentage: 33,
      plumbingPercentage: 33,
      electricalPercentage: 33,
      allServicesPercentage: 1
    }

    if (businessProfile?.seasonalSettings && typeof businessProfile.seasonalSettings === 'object') {
      const settings = businessProfile.seasonalSettings as any
      if (settings.specialsRotation) {
        rotationSettings = { ...rotationSettings, ...settings.specialsRotation }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        businessId,
        rotationSettings
      }
    })

  } catch (error) {
    console.error('Error fetching specials rotation settings:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch rotation settings' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { businessId, rotationSettings } = body

    if (!businessId || !rotationSettings) {
      return NextResponse.json(
        { success: false, error: 'Business ID and rotation settings are required' },
        { status: 400 }
      )
    }

    // Validate percentage totals
    const total = rotationSettings.hvacPercentage + rotationSettings.plumbingPercentage + 
                  rotationSettings.electricalPercentage + rotationSettings.allServicesPercentage
    
    if (Math.abs(total - 100) > 5) { // Allow some tolerance
      return NextResponse.json(
        { success: false, error: 'Percentages must total approximately 100%' },
        { status: 400 }
      )
    }

    // Get existing seasonal settings or create new structure
    const existingProfile = await prisma.businessProfile.findUnique({
      where: { businessId },
      select: { seasonalSettings: true }
    })

    let seasonalSettings = {}
    if (existingProfile?.seasonalSettings && typeof existingProfile.seasonalSettings === 'object') {
      seasonalSettings = existingProfile.seasonalSettings as any
    }

    // Update seasonal settings with rotation configuration
    const updatedSeasonalSettings = {
      ...seasonalSettings,
      specialsRotation: rotationSettings,
      updatedAt: new Date().toISOString()
    }

    // Update or create business profile with rotation settings
    const updatedProfile = await prisma.businessProfile.upsert({
      where: { businessId },
      update: {
        seasonalSettings: updatedSeasonalSettings,
        updatedAt: new Date()
      },
      create: {
        businessId,
        seasonalSettings: updatedSeasonalSettings,
        brandVoice: null,
        messageStyle: null,
        serviceTypes: [],
        serviceAreas: [],
        approvedTemplates: []
      }
    })

    console.log(`✅ Updated specials rotation settings for business ${businessId}`)
    console.log('🔄 New rotation settings:', rotationSettings)

    return NextResponse.json({
      success: true,
      data: {
        businessId: updatedProfile.businessId,
        rotationSettings
      }
    })

  } catch (error) {
    console.error('Error saving specials rotation settings:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save rotation settings' },
      { status: 500 }
    )
  }
}

// Additional helper endpoint to get rotation statistics
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { businessId } = body

    // This could be used to track rotation usage statistics
    // For now, just return current rotation state
    const rotationStats = {
      businessId,
      totalRotations: 0,
      serviceTypeDistribution: {
        hvac: 0,
        plumbing: 0,
        electrical: 0,
        all: 0
      },
      lastRotationDate: null,
      nextServiceType: 'hvac'
    }

    return NextResponse.json({
      success: true,
      data: rotationStats
    })

  } catch (error) {
    console.error('Error getting rotation statistics:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get rotation statistics' },
      { status: 500 }
    )
  }
}