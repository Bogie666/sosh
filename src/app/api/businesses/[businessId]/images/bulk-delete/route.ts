// src/app/api/businesses/[businessId]/images/bulk-delete/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Storage } from '@google-cloud/storage'
import { getGoogleCredentials } from '@/lib/google-credentials'

// Initialize Google Cloud Storage
const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  credentials: getGoogleCredentials() || undefined
})

const bucketName = process.env.GOOGLE_CLOUD_STORAGE_BUCKET || 'sosh-images'
const bucket = storage.bucket(bucketName)

// POST - Bulk delete images
export async function POST(
  request: NextRequest,
  { params }: { params: { businessId: string } }
) {
  try {
    const { businessId } = params
    const { imageIds } = await request.json()

    if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No image IDs provided' },
        { status: 400 }
      )
    }

    // Get all images to delete (ensure they belong to this business)
    const images = await prisma.imageLibrary.findMany({
      where: { 
        id: { in: imageIds },
        businessId: businessId
      }
    })

    if (images.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid images found' },
        { status: 404 }
      )
    }

    const deleteResults = {
      totalRequested: imageIds.length,
      validImages: images.length,
      cloudStorageDeleted: 0,
      databaseDeleted: 0,
      errors: [] as string[]
    }

    // Delete from cloud storage
    for (const image of images) {
      try {
        const fileName = image.fileName
        const filePaths = [
          `images/${businessId}/${fileName}`, // Original
          `images/${businessId}/thumbs/thumb_${fileName.split('.')[0]}.jpg`, // Thumbnail
          // Platform-specific versions
          `images/${businessId}/facebook/fb_landscape_${fileName.split('.')[0]}.jpg`,
          `images/${businessId}/facebook/fb_square_${fileName.split('.')[0]}.jpg`,
          `images/${businessId}/instagram/ig_square_${fileName.split('.')[0]}.jpg`,
          `images/${businessId}/instagram/ig_portrait_${fileName.split('.')[0]}.jpg`,
          `images/${businessId}/twitter/tw_single_${fileName.split('.')[0]}.jpg`,
          `images/${businessId}/google/gb_square_${fileName.split('.')[0]}.jpg`
        ]

        // Delete all versions (don't fail if some don't exist)
        const deletePromises = filePaths.map(path => 
          bucket.file(path).delete().catch(err => {
            console.warn(`Warning: Could not delete ${path}:`, err.message)
          })
        )
        
        await Promise.allSettled(deletePromises)
        deleteResults.cloudStorageDeleted++
        
      } catch (error) {
        console.error(`Failed to delete cloud files for ${image.fileName}:`, error)
        deleteResults.errors.push(`Cloud storage deletion failed for ${image.originalName}`)
      }
    }

    // Delete from database
    try {
      const dbResult = await prisma.imageLibrary.deleteMany({
        where: { 
          id: { in: images.map(img => img.id) },
          businessId: businessId
        }
      })
      
      deleteResults.databaseDeleted = dbResult.count
      
    } catch (error) {
      console.error('Database deletion failed:', error)
      deleteResults.errors.push('Database deletion failed')
    }

    // Determine success status
    const isSuccess = deleteResults.databaseDeleted > 0
    const message = isSuccess 
      ? `Successfully deleted ${deleteResults.databaseDeleted} image(s)`
      : 'Failed to delete images'

    return NextResponse.json({
      success: isSuccess,
      message,
      results: deleteResults
    })

  } catch (error) {
    console.error('Bulk delete failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Bulk delete failed'
    }, { status: 500 })
  }
}