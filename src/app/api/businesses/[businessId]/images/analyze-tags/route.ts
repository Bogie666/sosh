// src/app/api/businesses/[businessId]/images/analyze-tags/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { businessId: string } }
) {
  try {
    const { businessId } = params
    const body = await request.json()
    const { imageIds } = body

    console.log(`🔍 Analyzing tags for images in business ${businessId}`)

    // Get images to analyze
    const images = await prisma.imageLibrary.findMany({
      where: {
        id: imageIds ? { in: imageIds } : undefined,
        businessId: businessId
      },
      select: {
        id: true,
        originalName: true,
        aiDescription: true,
        aiTags: true,
        manualTags: true,
        category: true
      }
    })

    if (images.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No images found'
      }, { status: 404 })
    }

    // Analyze each image and suggest improvements
    const suggestions = images.map(image => {
      const allTags = [...(image.aiTags || []), ...(image.manualTags || [])]
      const description = image.aiDescription || ''
      const filename = image.originalName.toLowerCase()

      const suggestions: string[] = []
      const missingTags: string[] = []

      // Service type suggestions based on description/filename
      if ((description.includes('hvac') || filename.includes('hvac') || description.includes('air')) && !allTags.some(tag => tag.includes('hvac'))) {
        missingTags.push('hvac', 'hvac_work')
      }
      if ((description.includes('plumbing') || filename.includes('plumb') || description.includes('water')) && !allTags.some(tag => tag.includes('plumbing'))) {
        missingTags.push('plumbing', 'plumbing_work')
      }
      if ((description.includes('electrical') || filename.includes('electric') || description.includes('wiring')) && !allTags.some(tag => tag.includes('electrical'))) {
        missingTags.push('electrical', 'electrical_work')
      }

      // People/team suggestions
      if ((description.includes('person') || description.includes('people') || description.includes('team')) && !allTags.some(tag => tag.includes('team') || tag.includes('people'))) {
        missingTags.push('team', 'professional')
      }

      // Work type suggestions
      if ((description.includes('install') || description.includes('installation')) && !allTags.some(tag => tag.includes('installation'))) {
        missingTags.push('installation', 'work')
      }
      if ((description.includes('repair') || description.includes('fix')) && !allTags.some(tag => tag.includes('repair'))) {
        missingTags.push('repair', 'service')
      }

      // Vehicle suggestions
      if ((description.includes('truck') || description.includes('van') || filename.includes('truck')) && !allTags.some(tag => tag.includes('truck') || tag.includes('vehicle'))) {
        missingTags.push('service_vehicle', 'truck')
      }

      // Quality suggestions
      if (allTags.length === 0) {
        suggestions.push('Image has no tags - consider adding basic descriptive tags')
        missingTags.push('professional', 'service')
      }
      
      if (!image.category || image.category === 'other') {
        suggestions.push('Image needs a proper category assignment')
      }

      if (!image.aiDescription || image.aiDescription.length < 10) {
        suggestions.push('Image needs a better description')
      }

      return {
        imageId: image.id,
        imageName: image.originalName,
        currentTags: allTags,
        suggestedTags: missingTags.slice(0, 5), // Limit suggestions
        suggestions,
        category: image.category
      }
    })

    return NextResponse.json({
      success: true,
      analysis: suggestions,
      totalImages: images.length,
      imagesNeedingImprovement: suggestions.filter(s => s.suggestions.length > 0 || s.suggestedTags.length > 0).length
    })

  } catch (error) {
    console.error('Tag analysis failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Tag analysis failed'
    }, { status: 500 })
  }
}