// src/app/api/images/bulk-tag/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const { imageIds, tag } = await request.json()

    if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Image IDs array is required'
      }, { status: 400 })
    }

    if (!tag || typeof tag !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Tag is required'
      }, { status: 400 })
    }

    // Update all images to add the tag
    const updatedImages = await Promise.all(
      imageIds.map(async (imageId: string) => {
        const image = await prisma.imageLibrary.findUnique({
          where: { id: imageId }
        })

        if (!image) return null

        // Add tag if it doesn't already exist
        const currentTags = image.manualTags || []
        const newTags = currentTags.includes(tag) 
          ? currentTags 
          : [...currentTags, tag]

        return prisma.imageLibrary.update({
          where: { id: imageId },
          data: { manualTags: newTags }
        })
      })
    )

    const successCount = updatedImages.filter(Boolean).length

    return NextResponse.json({
      success: true,
      message: `Added tag "${tag}" to ${successCount} images`,
      updatedCount: successCount
    })

  } catch (error) {
    console.error('Bulk tag operation failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Bulk tag operation failed'
    }, { status: 500 })
  }
}

