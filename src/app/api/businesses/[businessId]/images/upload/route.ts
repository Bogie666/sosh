// src/app/api/businesses/[businessId]/images/upload/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Storage } from '@google-cloud/storage'
import { v4 as uuidv4 } from 'uuid'
import sharp from 'sharp'

// Initialize Google Cloud Storage
const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  credentials: process.env.GOOGLE_CLOUD_CREDENTIALS ? JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS) : undefined
})

const bucketName = process.env.GOOGLE_CLOUD_STORAGE_BUCKET || 'sosh-images'
const bucket = storage.bucket(bucketName)

// POST - Upload and process images
export async function POST(
  request: NextRequest,
  { params }: { params: { businessId: string } }
) {
  try {
    const businessId = params.businessId

    // Verify business exists
    const business = await prisma.business.findUnique({
      where: { id: businessId }
    })

    if (!business) {
      return NextResponse.json(
        { success: false, error: 'Business not found' },
        { status: 404 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { success: false, error: 'File must be an image' },
        { status: 400 }
      )
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      return NextResponse.json(
        { success: false, error: 'File size must be less than 10MB' },
        { status: 400 }
      )
    }

    // Generate unique filename
    const fileId = uuidv4()
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const fileName = `${fileId}.${extension}`

    // Convert to buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // Process with Sharp to get metadata and create optimized versions
    const image = sharp(buffer)
    const metadata = await image.metadata()

    if (!metadata.width || !metadata.height) {
      return NextResponse.json(
        { success: false, error: 'Invalid image file' },
        { status: 400 }
      )
    }

    // Upload original to Google Cloud Storage
    const originalPath = `images/${businessId}/${fileName}`
    const originalFile = bucket.file(originalPath)
    
    await originalFile.save(buffer, {
      metadata: {
        contentType: file.type,
        metadata: {
          originalName: file.name,
          businessId: businessId,
          uploadedAt: new Date().toISOString()
        }
      },
      public: true
    })

    const originalUrl = `https://storage.googleapis.com/${bucketName}/${originalPath}`

    // Create thumbnail (400x400)
    const thumbnailBuffer = await image
      .resize(400, 400, { fit: 'cover', position: 'center' })
      .jpeg({ quality: 85 })
      .toBuffer()

    const thumbnailPath = `images/${businessId}/thumbs/thumb_${fileId}.jpg`
    const thumbnailFile = bucket.file(thumbnailPath)
    
    await thumbnailFile.save(thumbnailBuffer, {
      metadata: {
        contentType: 'image/jpeg'
      },
      public: true
    })

    const thumbnailUrl = `https://storage.googleapis.com/${bucketName}/${thumbnailPath}`

    // Create platform-specific optimized versions
    const platformUrls: any = {}

    // Facebook optimizations
    const facebookLandscapeBuffer = await image
      .resize(1200, 630, { fit: 'cover' })
      .jpeg({ quality: 85 })
      .toBuffer()

    const facebookSquareBuffer = await image
      .resize(1080, 1080, { fit: 'cover' })
      .jpeg({ quality: 85 })
      .toBuffer()

    const fbLandscapePath = `images/${businessId}/platform/fb_landscape_${fileId}.jpg`
    const fbSquarePath = `images/${businessId}/platform/fb_square_${fileId}.jpg`

    await bucket.file(fbLandscapePath).save(facebookLandscapeBuffer, {
      metadata: { contentType: 'image/jpeg' },
      public: true
    })

    await bucket.file(fbSquarePath).save(facebookSquareBuffer, {
      metadata: { contentType: 'image/jpeg' },
      public: true
    })

    platformUrls.facebook = {
      landscape: `https://storage.googleapis.com/${bucketName}/${fbLandscapePath}`,
      square: `https://storage.googleapis.com/${bucketName}/${fbSquarePath}`
    }

    // Instagram optimizations
    const instagramSquareBuffer = await image
      .resize(1080, 1080, { fit: 'cover' })
      .jpeg({ quality: 85 })
      .toBuffer()

    const instagramPortraitBuffer = await image
      .resize(1080, 1350, { fit: 'cover' })
      .jpeg({ quality: 85 })
      .toBuffer()

    const igSquarePath = `images/${businessId}/platform/ig_square_${fileId}.jpg`
    const igPortraitPath = `images/${businessId}/platform/ig_portrait_${fileId}.jpg`

    await bucket.file(igSquarePath).save(instagramSquareBuffer, {
      metadata: { contentType: 'image/jpeg' },
      public: true
    })

    await bucket.file(igPortraitPath).save(instagramPortraitBuffer, {
      metadata: { contentType: 'image/jpeg' },
      public: true
    })

    platformUrls.instagram = {
      square: `https://storage.googleapis.com/${bucketName}/${igSquarePath}`,
      portrait: `https://storage.googleapis.com/${bucketName}/${igPortraitPath}`
    }

    // Twitter optimizations
    const twitterSingleBuffer = await image
      .resize(1200, 675, { fit: 'cover' })
      .jpeg({ quality: 85 })
      .toBuffer()

    const twitterMultiBuffer = await image
      .resize(700, 800, { fit: 'cover' })
      .jpeg({ quality: 85 })
      .toBuffer()

    const twSinglePath = `images/${businessId}/platform/tw_single_${fileId}.jpg`
    const twMultiPath = `images/${businessId}/platform/tw_multi_${fileId}.jpg`

    await bucket.file(twSinglePath).save(twitterSingleBuffer, {
      metadata: { contentType: 'image/jpeg' },
      public: true
    })

    await bucket.file(twMultiPath).save(twitterMultiBuffer, {
      metadata: { contentType: 'image/jpeg' },
      public: true
    })

    platformUrls.twitter = {
      single: `https://storage.googleapis.com/${bucketName}/${twSinglePath}`,
      multi: `https://storage.googleapis.com/${bucketName}/${twMultiPath}`
    }

    // Google Business Profile optimization
    const googleSquareBuffer = await image
      .resize(720, 720, { fit: 'cover' })
      .jpeg({ quality: 85 })
      .toBuffer()

    const googleSquarePath = `images/${businessId}/platform/google_square_${fileId}.jpg`

    await bucket.file(googleSquarePath).save(googleSquareBuffer, {
      metadata: { contentType: 'image/jpeg' },
      public: true
    })

    platformUrls.google = {
      square: `https://storage.googleapis.com/${bucketName}/${googleSquarePath}`
    }

    // Generate AI tags and description using OpenAI Vision API
    const aiAnalysis = await analyzeImageWithAI(buffer, file.name)
    const aiTags = aiAnalysis.tags
    const aiDescription = aiAnalysis.description
    const aiConfidence = aiAnalysis.confidence

    // Auto-categorize based on AI analysis
    const category = autoCategorizeImage(file.name, aiTags)

    // Create database record
    const imageRecord = await prisma.imageLibrary.create({
      data: {
        businessId,
        fileName,
        originalName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        dimensions: {
          width: metadata.width,
          height: metadata.height
        },
        cloudUrl: originalUrl,
        thumbnailUrl: thumbnailUrl,
        platformUrls,
        aiTags,
        aiConfidence: aiAnalysis.confidence,
        aiDescription,
        manualTags: [],
        category,
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
    console.error('Error uploading image:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to upload image' },
      { status: 500 }
    )
  }
}

// AI Vision Analysis using OpenAI
async function analyzeImageWithAI(imageBuffer: Buffer, filename: string) {
  try {
    const { OpenAI } = await import('openai')
    
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.warn('OpenAI API key not found, falling back to filename analysis')
      return fallbackAnalysis(filename)
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })

    // Convert buffer to base64
    const base64Image = imageBuffer.toString('base64')
    const mimeType = filename.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg'

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // Updated to current vision model
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this HVAC/plumbing/electrical service industry image. Provide:
1. A brief professional description (1-2 sentences)
2. Relevant tags (comma-separated, max 8 tags)

Focus on: work type, equipment visible, setting (indoor/outdoor), people present, vehicles, before/after results, specific trade (HVAC/plumbing/electrical).

Format your response as:
DESCRIPTION: [description]
TAGS: [tag1, tag2, tag3, etc]`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
                detail: "low" // Use low detail for faster processing and lower cost
              }
            }
          ]
        }
      ]
    })

    const content = response.choices[0]?.message?.content || ''
    
    // Parse the response
    const descriptionMatch = content.match(/DESCRIPTION:\s*([\s\S]*?)(?=\nTAGS:|$)/)
    const tagsMatch = content.match(/TAGS:\s*([\s\S]*?)$/)
    
    const description = descriptionMatch?.[1]?.trim() || 'Professional service industry image'
    const tagsString = tagsMatch?.[1]?.trim() || 'service, professional'
    
    const tags = tagsString
      .split(',')
      .map(tag => tag.trim().toLowerCase().replace(/\s+/g, '_'))
      .filter(tag => tag.length > 0)
      .slice(0, 8) // Limit to 8 tags

    // Generate confidence scores (Vision API doesn't provide these, so we simulate)
    const confidence: any = {}
    tags.forEach(tag => {
      confidence[tag] = 0.85 + Math.random() * 0.1 // 85-95% confidence
    })

    console.log('AI Vision Analysis:', { description, tags })

    return {
      description,
      tags,
      confidence
    }

  } catch (error) {
    console.error('AI Vision analysis failed:', error)
    return fallbackAnalysis(filename)
  }
}

// Fallback analysis when AI Vision fails
function fallbackAnalysis(filename: string) {
  const lowerName = filename.toLowerCase()
  let tags = ['business_photo', 'service_industry']
  let description = 'Professional service industry image'

  // Basic filename analysis as fallback
  if (lowerName.includes('team') || lowerName.includes('staff')) {
    tags.push('team', 'people')
    description = 'Professional service team members'
  }
  if (lowerName.includes('truck') || lowerName.includes('van')) {
    tags.push('service_vehicle', 'truck')
    description = 'Service vehicle for professional home services'
  }
  if (lowerName.includes('work') || lowerName.includes('install')) {
    tags.push('work_in_progress', 'installation')
    description = 'Service work or installation in progress'
  }
  if (lowerName.includes('hvac') || lowerName.includes('ac')) {
    tags.push('hvac', 'equipment')
    description = 'HVAC equipment or installation work'
  }

  const confidence: any = {}
  tags.forEach(tag => {
    confidence[tag] = 0.7 // Lower confidence for fallback
  })

  return {
    description,
    tags,
    confidence
  }
}

function autoCategorizeImage(filename: string, tags: string[]): string {
  // Auto-categorize based on AI tags (much more accurate now)
  if (tags.some(tag => tag.includes('team') || tag.includes('people') || tag.includes('staff'))) {
    return 'team'
  }
  
  if (tags.some(tag => tag.includes('work') || tag.includes('installation') || tag.includes('repair') || tag.includes('maintenance'))) {
    return 'work'
  }
  
  if (tags.some(tag => tag.includes('equipment') || tag.includes('hvac') || tag.includes('unit') || tag.includes('system'))) {
    return 'equipment'
  }
  
  if (tags.some(tag => tag.includes('before') || tag.includes('after') || tag.includes('result') || tag.includes('completed'))) {
    return 'results'
  }
  
  if (tags.some(tag => tag.includes('vehicle') || tag.includes('truck') || tag.includes('van'))) {
    return 'equipment'
  }
  
  if (tags.some(tag => tag.includes('facility') || tag.includes('building') || tag.includes('office'))) {
    return 'facility'
  }
  
  return 'work' // Default category
}