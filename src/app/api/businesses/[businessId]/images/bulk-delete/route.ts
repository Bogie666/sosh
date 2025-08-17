// src/app/api/businesses/[businessId]/images/bulk-delete/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { unlink } from 'fs/promises'
import { join } from 'path'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { businessId: string } }
) {
  try {
    const businessId = params.businessId
    const body = await request.json()
    const { imageIds } = body

    if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Image IDs are required' },
        { status: 400 }
      )
    }

    // Get images to delete (for file cleanup)
    const imagesToDelete = await prisma.imageLibrary.findMany({
      where: {
        id: { in: imageIds },
        businessId
      }
    })

    // Delete from database
    const deleteResult = await prisma.imageLibrary.deleteMany({
      where: {
        id: { in: imageIds },
        businessId
      }
    })

    // Clean up files (best effort - don't fail if file deletion fails)
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'images', businessId)
    
    for (const image of imagesToDelete) {
      try {
        // Delete original file
        await unlink(join(uploadDir, image.fileName))
        
        // Delete thumbnail
        if (image.thumbnailUrl) {
          const thumbnailFileName = image.thumbnailUrl.split('/').pop()
          if (thumbnailFileName) {
            await unlink(join(uploadDir, thumbnailFileName))
          }
        }
        
        // Delete platform optimized versions
        if (image.platformUrls) {
          for (const platform of Object.values(image.platformUrls) as any[]) {
            for (const url of Object.values(platform) as string[]) {
              const fileName = url.split('/').pop()
              if (fileName) {
                try {
                  await unlink(join(uploadDir, fileName))
                } catch (err) {
                  // Ignore individual file deletion errors
                }
              }
            }
          }
        }
      } catch (err) {
        console.warn(`Failed to delete files for image ${image.id}:`, err)
      }
    }

    return NextResponse.json({
      success: true,
      deletedCount: deleteResult.count,
      message: `Deleted ${deleteResult.count} image(s)`
    })

  } catch (error) {
    console.error('Error deleting images:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete images' },
      { status: 500 }
    )
  }
}

// src/app/api/businesses/[businessId]/images/bulk-tag/route.ts
export async function PUT(
  request: NextRequest,
  { params }: { params: { businessId: string } }
) {
  try {
    const businessId = params.businessId
    const body = await request.json()
    const { imageIds, tags } = body

    if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Image IDs are required' },
        { status: 400 }
      )
    }

    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Tags are required' },
        { status: 400 }
      )
    }

    // Get current images
    const currentImages = await prisma.imageLibrary.findMany({
      where: {
        id: { in: imageIds },
        businessId
      }
    })

    // Update each image with new tags
    const updatePromises = currentImages.map(image => {
      const existingTags = image.manualTags as string[]
      const newTags = [...new Set([...existingTags, ...tags])] // Merge and deduplicate
      
      return prisma.imageLibrary.update({
        where: { id: image.id },
        data: { 
          manualTags: newTags,
          updatedAt: new Date()
        }
      })
    })

    await Promise.all(updatePromises)

    return NextResponse.json({
      success: true,
      updatedCount: currentImages.length,
      message: `Added tags to ${currentImages.length} image(s)`
    })

  } catch (error) {
    console.error('Error adding tags to images:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to add tags to images' },
      { status: 500 }
    )
  }
}