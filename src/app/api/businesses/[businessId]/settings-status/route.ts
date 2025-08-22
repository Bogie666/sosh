// src/app/api/businesses/[businessId]/settings-status/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { settingsAggregator } from '@/lib/settings-aggregator'

export async function GET(
  request: NextRequest,
  { params }: { params: { businessId: string } }
) {
  try {
    const { businessId } = params

    if (!businessId) {
      return NextResponse.json(
        { success: false, error: 'Business ID is required' },
        { status: 400 }
      )
    }

    // Get business settings
    const settings = await settingsAggregator.getBusinessSettings(businessId)
    
    // Validate settings
    const validation = settingsAggregator.validateBusinessSettings(settings)
    
    // Provide detailed status
    const status = {
      isConfigured: validation.isValid,
      warnings: validation.warnings,
      errors: validation.errors,
      details: {
        hasProfile: !!settings.profile,
        profileComplete: settings.profile ? 
          !!(settings.profile.brandVoice && settings.profile.messageStyle && settings.profile.voiceTone) : false,
        contentBlocksCount: settings.contentBlocks.length,
        monthlySpecialsCount: settings.monthlySpecials.length,
        imageLibraryCount: settings.imageLibrary.length,
        approvedTemplatesCount: settings.profile?.approvedTemplates?.length || 0,
        contentThemesCount: settings.profile?.contentThemes?.length || 0
      }
    }

    return NextResponse.json({
      success: true,
      businessId,
      ...status
    })

  } catch (error) {
    console.error(`Failed to check settings status for ${params.businessId}:`, error)
    return NextResponse.json({
      success: false,
      error: 'Failed to check business settings',
      isConfigured: false,
      warnings: [],
      errors: ['Failed to load business settings']
    })
  }
}