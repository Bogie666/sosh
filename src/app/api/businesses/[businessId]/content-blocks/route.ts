// src/app/api/businesses/[businessId]/content-blocks/route.ts
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

    // Get content blocks
    const contentBlocks = await prisma.contentBlock.findMany({
      where: { businessId },
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'asc' }
      ]
    })

    return NextResponse.json({
      success: true,
      contentBlocks
    })

  } catch (error) {
    console.error('Failed to load content blocks:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load content blocks'
    }, { status: 500 })
  }
}

export async function POST(
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
    if (!data.name || !data.content) {
      return NextResponse.json({
        success: false,
        error: 'Name and content are required'
      }, { status: 400 })
    }

    // Check for duplicate short codes (if provided)
    if (data.shortCode) {
      const existingBlock = await prisma.contentBlock.findFirst({
        where: {
          businessId,
          shortCode: data.shortCode,
          isActive: true
        }
      })

      if (existingBlock) {
        return NextResponse.json({
          success: false,
          error: 'Short code already exists for this business'
        }, { status: 400 })
      }
    }

    // Create content block
    const contentBlock = await prisma.contentBlock.create({
      data: {
        businessId,
        name: data.name,
        type: data.type || 'custom',
        category: data.category || 'custom',
        content: data.content,
        shortCode: data.shortCode || null,
        isActive: data.isActive !== false, // Default to true
        sortOrder: data.sortOrder || 0
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Content block created successfully',
      contentBlock
    })

  } catch (error) {
    console.error('Failed to create content block:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create content block'
    }, { status: 500 })
  }
}