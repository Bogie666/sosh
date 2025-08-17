// src/app/api/images/bulk-delete/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { unlink } from 'fs/promises'
import { join } from 'path'

export async function POST(request: Request) {
  try {
    const { imageIds } = await request.json()

    if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Image IDs array is required'
      }, { status: 400 })
    }

    // Get image records first to access file paths
    const images = await prisma.imageLibrary.findMany({
      where: {
        id: { in: imageIds }
      }
    })

    // Delete files from filesystem (optional - in production you might want to keep them)
    const fileDeletePromises = images.map(async (image) => {
      try {
        const uploadDir = join(process.cwd(), 'public', 'uploads', 'images', image.businessId)
        
        // Delete original file
        const originalPath = join(uploadDir, image.fileName)
        await unlink(originalPath).catch(() => {}) // Ignore errors if file doesn't exist
        
        // Delete thumbnail
        if (image.thumbnailUrl) {
          const thumbnailFileName = image.thumbnailUrl.split('/').pop()
          if (thumbnailFileName) {
            const thumbnailPath = join(uploadDir, thumbnailFileName)
            await unlink(thumbnailPath).catch(() => {})
          }
        }
        
        // Delete platform-optimized versions
        if (image.platformUrls) {
          const platformUrls = image.platformUrls as any
          for (const platform of Object.keys(platformUrls)) {
            for (const variant of Object.keys(platformUrls[platform])) {
              const url = platformUrls[platform][variant]
              const fileName = url.split('/').pop()
              if (fileName) {
                const filePath = join(uploadDir, fileName)
                await unlink(filePath).catch(() => {})
              }
            }
          }
        }
      } catch (error) {
        console.error(`Failed to delete files for image ${image.id}:`, error)
      }
    })

    // Wait for file deletions to complete
    await Promise.all(fileDeletePromises)

    // Delete images from database
    const deleteResult = await prisma.imageLibrary.deleteMany({
      where: {
        id: { in: imageIds }
      }
    })

    return NextResponse.json({
      success: true,
      message: `Deleted ${deleteResult.count} images`,
      deletedCount: deleteResult.count
    })

  } catch (error) {
    console.error('Bulk delete operation failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Bulk delete operation failed'
    }, { status: 500 })
  }
}