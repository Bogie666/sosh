import { NextRequest, NextResponse } from 'next/server'
import { Storage } from '@google-cloud/storage'
import { v4 as uuidv4 } from 'uuid'

const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  credentials: process.env.GOOGLE_CLOUD_CREDENTIALS ? JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS) : undefined
})

const bucketName = process.env.GOOGLE_CLOUD_STORAGE_BUCKET || 'sosh-images'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const businessId = formData.get('businessId') as string || 'temp'
    
    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 })
    }

    console.log(`📤 Uploading temp image for GBP: ${file.name}`)

    // Generate unique filename
    const fileId = uuidv4()
    const extension = file.name.split('.').pop() || 'jpg'
    const fileName = `temp/gbp/${businessId}_${fileId}.${extension}`
    
    // Upload to cloud storage
    const bucket = storage.bucket(bucketName)
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    
    const cloudFile = bucket.file(fileName)
    await cloudFile.save(fileBuffer, {
      metadata: {
        contentType: file.type || 'image/jpeg'
      },
      public: true // Critical: Make sure it's publicly accessible for GBP
    })

    // Generate public URL
    const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`
    
    console.log(`✅ Temp image uploaded: ${publicUrl}`)
    
    return NextResponse.json({
      success: true,
      cloudUrl: publicUrl,
      fileName: fileName
    })

  } catch (error) {
    console.error('Temp upload error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    }, { status: 500 })
  }
}