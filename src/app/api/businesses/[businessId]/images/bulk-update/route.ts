// src/app/api/businesses/[businessId]/images/bulk-update/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { businessId: string } }
) {
  try {
    const { businessId } = params
    const body = await request.json()
    
    const {
      imageIds,
      action,
      tags,
      category,
      description
    } = body

    console.log(`🔄 Bulk ${action} for ${imageIds?.length} images in business ${businessId}`)

    // Validate input
    if (!businessId || !imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Business ID and image IDs are required'
      }, { status: 400 })
    }

    if (!action || !['addTags', 'removeTags', 'setCategory', 'setDescription'].includes(action)) {
      return NextResponse.json({
        success: false,
        error: 'Valid action is required (addTags, removeTags, setCategory, setDescription)'
      }, { status: 400 })
    }

    // Verify all images exist and belong to the business
    const existingImages = await prisma.imageLibrary.findMany({
      where: {
        id: { in: imageIds },
        businessId: businessId
      },
      select: { id: true, manualTags: true }
    })

    if (existingImages.length !== imageIds.length) {
      return NextResponse.json({
        success: false,
        error: 'Some images not found or access denied'
      }, { status: 404 })
    }

    let updatePromises: Promise<any>[] = []

    switch (action) {
      case 'addTags':
        if (!tags || !Array.isArray(tags)) {
          return NextResponse.json({
            success: false,
            error: 'Tags array is required for addTags action'
          }, { status: 400 })
        }

        // Clean and validate tags
        const cleanTags = tags
          .map(tag => String(tag).trim().toLowerCase().replace(/\s+/g, '_'))
          .filter(tag => tag.length > 0 && tag.length <= 50)

        updatePromises = existingImages.map(image => {
          const currentTags = image.manualTags || []
          const newTags = [...new Set([...currentTags, ...cleanTags])].slice(0, 20)
          
          return prisma.imageLibrary.update({
            where: { id: image.id },
            data: {
              manualTags: newTags,
              updatedAt: new Date()
            }
          })
        })
        break

      case 'removeTags':
        if (!tags || !Array.isArray(tags)) {
          return NextResponse.json({
            success: false,
            error: 'Tags array is required for removeTags action'
          }, { status: 400 })
        }

        updatePromises = existingImages.map(image => {
          const currentTags = image.manualTags || []
          const filteredTags = currentTags.filter(tag => !tags.includes(tag))
          
          return prisma.imageLibrary.update({
            where: { id: image.id },
            data: {
              manualTags: filteredTags,
              updatedAt: new Date()
            }
          })
        })
        break

      case 'setCategory':
        if (!category) {
          return NextResponse.json({
            success: false,
            error: 'Category is required for setCategory action'
          }, { status: 400 })
        }

        const validCategories = ['work', 'team', 'equipment', 'results', 'facility', 'vehicles', 'other']
        const validCategory = validCategories.includes(category) ? category : 'work'

        updatePromises = imageIds.map(imageId =>
          prisma.imageLibrary.update({
            where: { id: imageId },
            data: {
              category: validCategory,
              updatedAt: new Date()
            }
          })
        )
        break

      case 'setDescription':
        if (description === undefined) {
          return NextResponse.json({
            success: false,
            error: 'Description is required for setDescription action'
          }, { status: 400 })
        }

        updatePromises = imageIds.map(imageId =>
          prisma.imageLibrary.update({
            where: { id: imageId },
            data: {
              aiDescription: String(description).substring(0, 500), // Limit description length
              updatedAt: new Date()
            }
          })
        )
        break

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 })
    }

    // Execute all updates
    await Promise.all(updatePromises)

    console.log(`✅ Bulk ${action} completed for ${imageIds.length} images`)

    return NextResponse.json({
      success: true,
      message: `Bulk ${action} completed successfully`,
      updatedCount: imageIds.length
    })

  } catch (error) {
    console.error('Bulk update failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Bulk update failed'
    }, { status: 500 })
  }
}