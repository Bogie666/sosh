// src/app/api/businesses/[businessId]/platform-config/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { savePlatformCredentials, getPlatformStatuses } from '@/lib/platform-credentials'

// GET - Load all platform configs for a business
export async function GET(
  request: NextRequest,
  { params }: { params: { businessId: string } }
) {
  try {
    const { businessId } = params

    const business = await prisma.business.findUnique({ where: { id: businessId } })
    if (!business) {
      return NextResponse.json({ success: false, error: 'Business not found' }, { status: 404 })
    }

    const configs = await prisma.platformConfig.findMany({
      where: { businessId },
      select: {
        id: true,
        platform: true,
        isActive: true,
        status: true,
        lastTested: true,
        errorMessage: true,
        createdAt: true,
        updatedAt: true,
        // Don't return raw credentials - return field presence instead
        credentials: true
      }
    })

    // Parse credentials to return field names (not values) for UI display
    const safeConfigs = configs.map(config => {
      let credentialFields: string[] = []
      try {
        const parsed = JSON.parse(config.credentials)
        credentialFields = Object.keys(parsed).filter(k => !!parsed[k])
      } catch {}

      return {
        id: config.id,
        platform: config.platform,
        isActive: config.isActive,
        status: config.status,
        lastTested: config.lastTested,
        errorMessage: config.errorMessage,
        hasCredentials: credentialFields.length > 0,
        configuredFields: credentialFields
      }
    })

    // Also check for legacy env var configs
    const statuses = await getPlatformStatuses(businessId)

    return NextResponse.json({
      success: true,
      configs: safeConfigs,
      statuses
    })
  } catch (error) {
    console.error('Failed to load platform configs:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load platform configs'
    }, { status: 500 })
  }
}

// PUT - Save/update platform credentials for a business
export async function PUT(
  request: NextRequest,
  { params }: { params: { businessId: string } }
) {
  try {
    const { businessId } = params
    const body = await request.json()
    const { platform, credentials } = body

    if (!platform || !credentials) {
      return NextResponse.json(
        { success: false, error: 'Platform and credentials are required' },
        { status: 400 }
      )
    }

    const validPlatforms = ['GOOGLE', 'FACEBOOK', 'INSTAGRAM', 'TWITTER']
    const normalizedPlatform = platform.toUpperCase()
    if (!validPlatforms.includes(normalizedPlatform)) {
      return NextResponse.json(
        { success: false, error: `Invalid platform: ${platform}` },
        { status: 400 }
      )
    }

    const business = await prisma.business.findUnique({ where: { id: businessId } })
    if (!business) {
      return NextResponse.json({ success: false, error: 'Business not found' }, { status: 404 })
    }

    const saved = await savePlatformCredentials(businessId, normalizedPlatform as any, credentials)

    if (saved) {
      return NextResponse.json({
        success: true,
        message: `${platform} credentials saved for ${business.displayName}`
      })
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to save credentials' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Failed to save platform config:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save platform config'
    }, { status: 500 })
  }
}

// DELETE - Remove a platform config
export async function DELETE(
  request: NextRequest,
  { params }: { params: { businessId: string } }
) {
  try {
    const { businessId } = params
    const { searchParams } = new URL(request.url)
    const platform = searchParams.get('platform')?.toUpperCase()

    if (!platform) {
      return NextResponse.json(
        { success: false, error: 'Platform query parameter is required' },
        { status: 400 }
      )
    }

    await prisma.platformConfig.deleteMany({
      where: { businessId, platform: platform as any }
    })

    return NextResponse.json({ success: true, message: `${platform} config removed` })
  } catch (error) {
    console.error('Failed to delete platform config:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete config'
    }, { status: 500 })
  }
}
