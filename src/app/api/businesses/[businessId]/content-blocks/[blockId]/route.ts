// src/app/api/businesses/[businessId]/content-blocks/[blockId]/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: Request,
  { params }: { params: { businessId: string; blockId: string } }
) {
  try {
    const { businessId, blockId } = params
    const data = await request.json()

    // Verify business and content block exist
    const contentBlock = await prisma.contentBlock.findUnique({
      where: { 
        id: blockId,
        businessId 
      }
    })

    if (!contentBlock) {
      return NextResponse.json({
        success: false,
        error: 'Content block not found'
      }, { status: 404 })
    }

    // Check for duplicate short codes if updating shortCode
    if (data.shortCode && data.shortCode !== contentBlock.shortCode) {
      const existingBlock = await prisma.contentBlock.findFirst({
        where: {
          businessId,
          shortCode: data.shortCode,
          isActive: true,
          id: { not: blockId } // Exclude current block
        }
      })

      if (existingBlock) {
        return NextResponse.json({
          success: false,
          error: 'Short code already exists for this business'
        }, { status: 400 })
      }
    }

    // Update content block
    const updatedBlock = await prisma.contentBlock.update({
      where: { id: blockId },
      data: {
        name: data.name || contentBlock.name,
        type: data.type || contentBlock.type,
        category: data.category || contentBlock.category,
        content: data.content || contentBlock.content,
        shortCode: data.shortCode !== undefined ? data.shortCode : contentBlock.shortCode,
        isActive: data.isActive !== undefined ? data.isActive : contentBlock.isActive,
        sortOrder: data.sortOrder !== undefined ? data.sortOrder : contentBlock.sortOrder
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Content block updated successfully',
      contentBlock: updatedBlock
    })

  } catch (error) {
    console.error('Failed to update content block:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update content block'
    }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { businessId: string; blockId: string } }
) {
  try {
    const { businessId, blockId } = params

    // Verify business and content block exist
    const contentBlock = await prisma.contentBlock.findUnique({
      where: { 
        id: blockId,
        businessId 
      }
    })

    if (!contentBlock) {
      return NextResponse.json({
        success: false,
        error: 'Content block not found'
      }, { status: 404 })
    }

    // Delete content block
    await prisma.contentBlock.delete({
      where: { id: blockId }
    })

    return NextResponse.json({
      success: true,
      message: 'Content block deleted successfully'
    })

  } catch (error) {
    console.error('Failed to delete content block:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete content block'
    }, { status: 500 })
  }
}