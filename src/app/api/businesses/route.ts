// src/app/api/businesses/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, displayName, type, phone, website, tagline, brandVoice } = body

    if (!name || !displayName) {
      return NextResponse.json(
        { success: false, error: 'Name and display name are required' },
        { status: 400 }
      )
    }

    // Generate a URL-safe ID from displayName
    const id = displayName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

    // Check if ID already exists
    const existing = await prisma.business.findUnique({ where: { id } })
    if (existing) {
      return NextResponse.json(
        { success: false, error: `A business with ID "${id}" already exists` },
        { status: 409 }
      )
    }

    const business = await prisma.business.create({
      data: {
        id,
        name,
        displayName,
        type: type || 'all',
        phone: phone || null,
        website: website || null,
        tagline: tagline || null,
        brandVoice: brandVoice || null
      }
    })

    // Create a default business profile
    await prisma.businessProfile.create({
      data: {
        businessId: business.id,
        brandVoice: brandVoice || '',
        messageStyle: 'professional',
        voiceTone: 'professional',
        serviceAreas: [],
        serviceTypes: type === 'all' ? ['hvac', 'plumbing', 'electrical'] : [type],
        contentThemes: [],
        approvedTemplates: [],
        certifications: []
      }
    })

    return NextResponse.json({
      success: true,
      business: {
        id: business.id,
        name: business.name,
        displayName: business.displayName,
        type: business.type,
        phone: business.phone,
        website: business.website,
        tagline: business.tagline
      }
    })
  } catch (error) {
    console.error('Failed to create business:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create business'
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    const businesses = await prisma.business.findMany({
      include: {
        businessProfile: true,
        contentBlocks: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' }
        },
        monthlySpecials: {
          where: {
            month: new Date().getMonth(),
            year: new Date().getFullYear()
          }
        },
        _count: {
          select: {
            imageLibrary: { where: { isActive: true } },
            postHistory: true
          }
        }
      },
      orderBy: { displayName: 'asc' }
    })

    return NextResponse.json({
      success: true,
      businesses: businesses.map(business => ({
        id: business.id,
        name: business.name,
        displayName: business.displayName,
        type: business.type,
        website: business.website,
        phone: business.phone,
        tagline: business.tagline,
        brandVoice: business.brandVoice,
        hasProfile: !!business.businessProfile,
        contentBlocksCount: business.contentBlocks.length,
        currentMonthSpecials: business.monthlySpecials.length,
        imagesCount: business._count.imageLibrary,
        postsCount: business._count.postHistory,
        businessProfile: business.businessProfile
      }))
    })
  } catch (error) {
    console.error('Failed to load businesses:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load businesses'
    }, { status: 500 })
  }
}