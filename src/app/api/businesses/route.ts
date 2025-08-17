// src/app/api/businesses/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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