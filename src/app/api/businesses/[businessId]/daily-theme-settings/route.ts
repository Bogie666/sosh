// src/app/api/businesses/[businessId]/daily-theme-settings/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: { businessId: string } }
) {
  try {
    const { businessId } = params

    // Verify business exists
    const business = await prisma.business.findUnique({
      where: { id: businessId }
    })

    if (!business) {
      return NextResponse.json({
        success: false,
        error: 'Business not found'
      }, { status: 404 })
    }

    // Get daily theme settings from business profile
    // We'll store this in the existing businessProfile table for now
    const profile = await prisma.businessProfile.findUnique({
      where: { businessId }
    })

    // Extract daily theme settings from the profile
    let dailyThemeSettings = null
    if (profile && profile.autoPostSettings) {
      const autoPostSettings = profile.autoPostSettings as any
      dailyThemeSettings = autoPostSettings.dailyThemeSettings || null
    }

    return NextResponse.json({
      success: true,
      settings: dailyThemeSettings
    })

  } catch (error) {
    console.error('Failed to load daily theme settings:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load settings'
    }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { businessId: string } }
) {
  try {
    const { businessId } = params
    const data = await request.json()

    // Verify business exists
    const business = await prisma.business.findUnique({
      where: { id: businessId }
    })

    if (!business) {
      return NextResponse.json({
        success: false,
        error: 'Business not found'
      }, { status: 404 })
    }

    // Validate required fields
    if (!data.enabledDays || !Array.isArray(data.enabledDays)) {
      return NextResponse.json({
        success: false,
        error: 'Enabled days array is required'
      }, { status: 400 })
    }

    if (!data.contentStrategy || !['conservative', 'balanced', 'aggressive'].includes(data.contentStrategy)) {
      return NextResponse.json({
        success: false,
        error: 'Valid content strategy is required'
      }, { status: 400 })
    }

    // Check if business profile exists
    const existingProfile = await prisma.businessProfile.findUnique({
      where: { businessId }
    })

    if (existingProfile) {
      // Update existing profile with daily theme settings
      const currentAutoPostSettings = (existingProfile.autoPostSettings as any) || {}
      
      const updatedProfile = await prisma.businessProfile.update({
        where: { businessId },
        data: {
          autoPostSettings: {
            ...currentAutoPostSettings,
            dailyThemeSettings: {
              businessId,
              enabledDays: data.enabledDays,
              contentStrategy: data.contentStrategy,
              seasonalAdjustments: data.seasonalAdjustments || true,
              promotionFocus: data.promotionFocus || {
                primary: 'wednesday',
                secondary: 'monday'
              },
              customSettings: data.customSettings || {},
              updatedAt: new Date().toISOString()
            }
          }
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Daily theme settings updated successfully',
        settings: (updatedProfile.autoPostSettings as any).dailyThemeSettings
      })
    } else {
      // Create new business profile with daily theme settings
      const newProfile = await prisma.businessProfile.create({
        data: {
          businessId,
          brandVoice: 'Professional and helpful',
          messageStyle: 'informative',
          voiceTone: 'friendly',
          serviceAreas: [],
          serviceTypes: [],
          contentThemes: [],
          approvedTemplates: [],
          certifications: [],
          businessHours: {},
          autoPostSettings: {
            dailyThemeSettings: {
              businessId,
              enabledDays: data.enabledDays,
              contentStrategy: data.contentStrategy,
              seasonalAdjustments: data.seasonalAdjustments || true,
              promotionFocus: data.promotionFocus || {
                primary: 'wednesday',
                secondary: 'monday'
              },
              customSettings: data.customSettings || {},
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          }
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Daily theme settings created successfully',
        settings: (newProfile.autoPostSettings as any).dailyThemeSettings
      })
    }

  } catch (error) {
    console.error('Failed to save daily theme settings:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save settings'
    }, { status: 500 })
  }
}