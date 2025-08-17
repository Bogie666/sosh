// src/app/api/businesses/[businessId]/images/[imageId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PUT - Update individual image
export async function PUT(
  request: NextRequest,
  { params }: { params: { businessId: string; imageId: string } }
) {
  try {
    const { businessId, imageId } = params
    const body = await request.json()

    // Verify image belongs to business
    const existingImage = await prisma.imageLibrary.findFirst({
      where: {
        id: imageId,
        businessId
      }
    })

    if (!existingImage) {
      return NextResponse.json(
        { success: false, error: 'Image not found' },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date()
    }

    if (body.category !== undefined) {
      updateData.category = body.category
    }

    if (body.subcategory !== undefined) {
      updateData.subcategory = body.subcategory
    }

    if (body.manualTags !== undefined) {
      updateData.manualTags = body.manualTags
    }

    if (body.isActive !== undefined) {
      updateData.isActive = body.isActive
    }

    if (body.location !== undefined) {
      updateData.location = body.location
    }

    if (body.workOrder !== undefined) {
      updateData.workOrder = body.workOrder
    }

    if (body.customer !== undefined) {
      updateData.customer = body.customer
    }

    // Update the image
    const updatedImage = await prisma.imageLibrary.update({
      where: { id: imageId },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      image: updatedImage,
      message: 'Image updated successfully'
    })

  } catch (error) {
    console.error('Error updating image:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update image' },
      { status: 500 }
    )
  }
}

// DELETE - Delete individual image
export async function DELETE(
  request: NextRequest,
  { params }: { params: { businessId: string; imageId: string } }
) {
  try {
    const { businessId, imageId } = params

    // Get image details for file cleanup
    const image = await prisma.imageLibrary.findFirst({
      where: {
        id: imageId,
        businessId
      }
    })

    if (!image) {
      return NextResponse.json(
        { success: false, error: 'Image not found' },
        { status: 404 }
      )
    }

    // Delete from database
    await prisma.imageLibrary.delete({
      where: { id: imageId }
    })

    // Clean up files (best effort)
    try {
      const { unlink } = await import('fs/promises')
      const { join } = await import('path')
      
      const uploadDir = join(process.cwd(), 'public', 'uploads', 'images', businessId)
      
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
      console.warn(`Failed to delete files for image ${imageId}:`, err)
    }

    return NextResponse.json({
      success: true,
      message: 'Image deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting image:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete image' },
      { status: 500 }
    )
  }
}

// GET - Get individual image details
export async function GET(
  request: NextRequest,
  { params }: { params: { businessId: string; imageId: string } }
) {
  try {
    const { businessId, imageId } = params

    const image = await prisma.imageLibrary.findFirst({
      where: {
        id: imageId,
        businessId,
        isActive: true
      }
    })

    if (!image) {
      return NextResponse.json(
        { success: false, error: 'Image not found' },
        { status: 404 }
      )
    }

    // Increment usage count
    await prisma.imageLibrary.update({
      where: { id: imageId },
      data: { 
        usageCount: image.usageCount + 1,
        lastUsed: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      image: {
        ...image,
        usageCount: image.usageCount + 1,
        lastUsed: new Date()
      }
    })

  } catch (error) {
    console.error('Error fetching image:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch image' },
      { status: 500 }
    )
  }
}