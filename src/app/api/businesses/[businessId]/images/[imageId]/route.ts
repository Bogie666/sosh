// src/app/api/businesses/[businessId]/images/[imageId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Storage } from '@google-cloud/storage'

// Initialize Google Cloud Storage
const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  credentials: process.env.GOOGLE_CLOUD_CREDENTIALS ? JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS) : undefined
})

const bucketName = process.env.GOOGLE_CLOUD_STORAGE_BUCKET || 'sosh-images'
const bucket = storage.bucket(bucketName)

// PATCH - Update image metadata (tags, category, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { businessId: string; imageId: string } }
) {
  try {
    const { businessId, imageId } = params
    const updates = await request.json()

    // Verify image exists and belongs to this business
    const existingImage = await prisma.imageLibrary.findUnique({
      where: { 
        id: imageId,
        businessId: businessId
      }
    })

    if (!existingImage) {
      return NextResponse.json(
        { success: false, error: 'Image not found' },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: any = {}

    if (updates.manualTags !== undefined) {
      updateData.manualTags = Array.isArray(updates.manualTags) 
        ? updates.manualTags.filter(Boolean) 
        : []
    }

    if (updates.aiTags !== undefined) {
      updateData.aiTags = Array.isArray(updates.aiTags) 
        ? updates.aiTags.filter(Boolean) 
        : []
    }

    if (updates.category !== undefined) {
      updateData.category = updates.category || null
    }

    if (updates.subcategory !== undefined) {
      updateData.subcategory = updates.subcategory || null
    }

    // Update in database
    const updatedImage = await prisma.imageLibrary.update({
      where: { id: imageId },
      data: {
        ...updateData,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Image updated successfully',
      image: updatedImage
    })

  } catch (error) {
    console.error('Failed to update image:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update image'
    }, { status: 500 })
  }
}

// DELETE - Remove image from both database and cloud storage
export async function DELETE(
  request: NextRequest,
  { params }: { params: { businessId: string; imageId: string } }
) {
  try {
    const { businessId, imageId } = params

    // Get image details from database
    const image = await prisma.imageLibrary.findUnique({
      where: { 
        id: imageId,
        businessId: businessId // Ensure user can only delete their business images
      }
    })

    if (!image) {
      return NextResponse.json(
        { success: false, error: 'Image not found' },
        { status: 404 }
      )
    }

    // Delete from cloud storage
    try {
      // Extract the file path from the cloud URL
      const fileName = image.fileName
      const originalPath = `images/${businessId}/${fileName}`
      const thumbnailPath = `images/${businessId}/thumbs/thumb_${fileName.split('.')[0]}.jpg`
      
      // Delete original image
      await bucket.file(originalPath).delete()
      
      // Delete thumbnail
      await bucket.file(thumbnailPath).delete()
      
      // Delete platform-specific versions if they exist
      const platformPaths = [
        `images/${businessId}/facebook/fb_landscape_${fileName.split('.')[0]}.jpg`,
        `images/${businessId}/facebook/fb_square_${fileName.split('.')[0]}.jpg`,
        `images/${businessId}/instagram/ig_square_${fileName.split('.')[0]}.jpg`,
        `images/${businessId}/instagram/ig_portrait_${fileName.split('.')[0]}.jpg`,
        `images/${businessId}/twitter/tw_single_${fileName.split('.')[0]}.jpg`,
        `images/${businessId}/google/gb_square_${fileName.split('.')[0]}.jpg`
      ]
      
      // Delete platform versions (don't fail if they don't exist)
      await Promise.allSettled(
        platformPaths.map(path => bucket.file(path).delete())
      )
      
      console.log(`✅ Deleted cloud storage files for ${fileName}`)
    } catch (storageError) {
      console.warn('Warning: Failed to delete some cloud storage files:', storageError)
      // Continue with database deletion even if cloud deletion fails
    }

    // Delete from database
    await prisma.imageLibrary.delete({
      where: { id: imageId }
    })

    return NextResponse.json({
      success: true,
      message: 'Image deleted successfully'
    })

  } catch (error) {
    console.error('Failed to delete image:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete image'
    }, { status: 500 })
  }
}