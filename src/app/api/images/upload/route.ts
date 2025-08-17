// src/app/api/images/upload/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'
import sharp from 'sharp'

// Platform-specific image requirements (from your specs)
const PLATFORM_SPECS = {
  facebook: {
    landscape: { width: 1200, height: 630 },
    square: { width: 1080, height: 1080 }
  },
  instagram: {
    square: { width: 1080, height: 1080 },
    portrait: { width: 1080, height: 1350 },
    stories: { width: 1080, height: 1920 }
  },
  twitter: {
    single: { width: 1200, height: 675 },
    multi: { width: 700, height: 800 }
  },
  google: {
    square: { width: 720, height: 720 }
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('image') as File
    const businessId = formData.get('businessId') as string

    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'No image file provided'
      }, { status: 400 })
    }

    if (!businessId) {
      return NextResponse.json({
        success: false,
        error: 'Business ID is required'
      }, { status: 400 })
    }

    // Verify business exists
    const business = await prisma.business.findUnique({
      where: { id: businessId }
    })

    if (!business) {
      return NextResponse.json({
        success: false,
        error: 'Business not found'
      }, { status: 404 })
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid file type. Please use JPG, PNG, GIF, or WebP.'
      }, { status: 400 })
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({
        success: false,
        error: 'File too large. Maximum size is 10MB.'
      }, { status: 400 })
    }

    // Generate unique filename
    const fileId = uuidv4()
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const fileName = `${fileId}.${fileExtension}`

    // Create upload directory if it doesn't exist
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'images', businessId)
    await mkdir(uploadDir, { recursive: true })

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Get image metadata
    const metadata = await sharp(buffer).metadata()
    const dimensions = {
      width: metadata.width || 0,
      height: metadata.height || 0
    }

    // Save original image
    const originalPath = join(uploadDir, fileName)
    await writeFile(originalPath, buffer)

    // Generate thumbnail (400x400)
    const thumbnailFileName = `${fileId}_thumb.jpg`
    const thumbnailPath = join(uploadDir, thumbnailFileName)
    await sharp(buffer)
      .resize(400, 400, { 
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 85 })
      .toFile(thumbnailPath)

    // Generate platform-optimized versions
    const platformUrls: any = {}
    
    for (const [platform, specs] of Object.entries(PLATFORM_SPECS)) {
      platformUrls[platform] = {}
      
      for (const [variant, size] of Object.entries(specs)) {
        const platformFileName = `${fileId}_${platform}_${variant}.jpg`
        const platformPath = join(uploadDir, platformFileName)
        
        await sharp(buffer)
          .resize(size.width, size.height, {
            fit: 'cover',
            position: 'center'
          })
          .jpeg({ quality: 90 })
          .toFile(platformPath)
        
        platformUrls[platform][variant] = `/uploads/images/${businessId}/${platformFileName}`
      }
    }

    // Generate AI tags using OpenAI Vision API
    let aiTags: string[] = []
    let aiDescription = ''
    let aiConfidence: any = {}

    try {
      const aiResult = await generateAITags(buffer, business)
      aiTags = aiResult.tags
      aiDescription = aiResult.description
      aiConfidence = aiResult.confidence
    } catch (error) {
      console.error('AI tagging failed:', error)
      // Continue without AI tags - not a critical failure
    }

    // Save to database
    const imageRecord = await prisma.imageLibrary.create({
      data: {
        businessId,
        fileName,
        originalName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        dimensions,
        cloudUrl: `/uploads/images/${businessId}/${fileName}`,
        thumbnailUrl: `/uploads/images/${businessId}/${thumbnailFileName}`,
        platformUrls,
        aiTags,
        aiConfidence,
        aiDescription,
        manualTags: [],
        category: categorizeImage(aiTags),
        isActive: true,
        usageCount: 0
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Image uploaded and processed successfully',
      image: imageRecord
    })

  } catch (error) {
    console.error('Image upload failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Image upload failed'
    }, { status: 500 })
  }
}

// AI tagging function using OpenAI Vision API
async function generateAITags(imageBuffer: Buffer, business: any) {
  const openaiApiKey = process.env.OPENAI_API_KEY
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured')
  }

  // Convert buffer to base64
  const base64Image = imageBuffer.toString('base64')
  const mimeType = 'image/jpeg' // We'll standardize to JPEG for AI processing

  const prompt = `Analyze this image for a ${business.type} business (${business.displayName}). 

Identify relevant tags from these categories:
- Work types: hvac_work, plumbing_work, electrical_work, installation, repair, maintenance
- Equipment: hvac_unit, water_heater, electrical_panel, pipes, ductwork, tools
- People: team_photo, technician, customer, group_photo
- Vehicles: service_truck, van, company_vehicle
- Results: before_photo, after_photo, completed_work
- Facility: office, warehouse, job_site

Return ONLY a JSON object with this exact format:
{
  "tags": ["tag1", "tag2", "tag3"],
  "description": "Brief description of what's shown in the image",
  "confidence": {"tag1": 0.95, "tag2": 0.87}
}`

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`,
                  detail: 'low' // Use 'low' for faster processing
                }
              }
            ]
          }
        ],
        max_tokens: 300,
        temperature: 0.3
      })
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    if (!content) {
      throw new Error('No content in OpenAI response')
    }

    // Parse the JSON response
    const aiResult = JSON.parse(content)
    
    return {
      tags: aiResult.tags || [],
      description: aiResult.description || '',
      confidence: aiResult.confidence || {}
    }

  } catch (error) {
    console.error('OpenAI Vision API error:', error)
    // Return default values if AI processing fails
    return {
      tags: ['uploaded_image'],
      description: 'Image uploaded to library',
      confidence: {}
    }
  }
}

// Categorize image based on AI tags
function categorizeImage(tags: string[]): string {
  if (tags.some(tag => tag.includes('team') || tag.includes('group') || tag.includes('technician'))) {
    return 'team'
  }
  if (tags.some(tag => tag.includes('work') || tag.includes('installation') || tag.includes('repair'))) {
    return 'work'
  }
  if (tags.some(tag => tag.includes('equipment') || tag.includes('unit') || tag.includes('tools'))) {
    return 'equipment'
  }
  if (tags.some(tag => tag.includes('before') || tag.includes('after') || tag.includes('completed'))) {
    return 'results'
  }
  if (tags.some(tag => tag.includes('office') || tag.includes('warehouse') || tag.includes('facility'))) {
    return 'facility'
  }
  
  return 'work' // Default category
}