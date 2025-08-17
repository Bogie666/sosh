// src/app/api/businesses/[businessId]/images/bulk-tag/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: { businessId: string } }
) {
  try {
    const businessId = params.businessId
    const body = await request.json()
    const { imageIds, tags } = body

    console.log('Bulk tag request:', { businessId, imageIds, tags })

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

    console.log(`Found ${currentImages.length} images to update`)

    // Update each image with new tags
    const updatePromises = currentImages.map(image => {
      const existingTags = image.manualTags as string[]
      const newTags = [...new Set([...existingTags, ...tags])] // Merge and deduplicate
      
      console.log(`Updating image ${image.id}: ${existingTags} + ${tags} = ${newTags}`)
      
      return prisma.imageLibrary.update({
        where: { id: image.id },
        data: { 
          manualTags: newTags,
          updatedAt: new Date()
        }
      })
    })

    const results = await Promise.all(updatePromises)
    console.log(`Successfully updated ${results.length} images`)

    return NextResponse.json({
      success: true,
      updatedCount: results.length,
      message: `Added tags to ${results.length} image(s)`
    })

  } catch (error) {
    console.error('Error adding tags to images:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to add tags to images' },
      { status: 500 }
    )
  }
}