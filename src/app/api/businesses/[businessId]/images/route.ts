// src/app/api/businesses/[businessId]/images/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Fetch images for a business with advanced filtering and pagination
export async function GET(
  request: NextRequest,
  { params }: { params: { businessId: string } }
) {
  try {
    const { businessId } = params
    const { searchParams } = new URL(request.url)
    
    // Query parameters
    const category = searchParams.get('category')
    const tags = searchParams.get('tags')?.split(',')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

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

    // Build where clause
    const whereClause: any = {
      businessId,
      isActive: true
    }

    if (category) {
      whereClause.category = category
    }

    if (tags && tags.length > 0) {
      whereClause.OR = [
        { aiTags: { hasSome: tags } },
        { manualTags: { hasSome: tags } }
      ]
    }

    // Get images with pagination
    const images = await prisma.imageLibrary.findMany({
      where: whereClause,
      orderBy: [
        { uploadedAt: 'desc' }
      ],
      take: limit,
      skip: offset
    })

    // Get total count for pagination
    const totalCount = await prisma.imageLibrary.count({
      where: whereClause
    })

    return NextResponse.json({
      success: true,
      images,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      }
    })

  } catch (error) {
    console.error('Failed to load images:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load images'
    }, { status: 500 })
  }
}