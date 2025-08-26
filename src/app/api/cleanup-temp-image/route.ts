import { NextRequest, NextResponse } from 'next/server'
import { Storage } from '@google-cloud/storage'
import { getGoogleCredentials } from '@/lib/google-credentials'

const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  credentials: getGoogleCredentials() || undefined
})

const bucketName = process.env.GOOGLE_CLOUD_STORAGE_BUCKET || 'sosh-images'

export async function DELETE(request: NextRequest) {
  try {
    const { fileName } = await request.json()
    
    if (!fileName) {
      return NextResponse.json({ success: false, error: 'No fileName provided' }, { status: 400 })
    }

    // Only allow cleanup of temp files for security
    if (!fileName.startsWith('temp/gbp/')) {
      return NextResponse.json({ success: false, error: 'Can only cleanup temp files' }, { status: 403 })
    }

    console.log(`🗑️ Deleting temp file: ${fileName}`)

    const bucket = storage.bucket(bucketName)
    const file = bucket.file(fileName)
    
    // Check if file exists before trying to delete
    const [exists] = await file.exists()
    if (!exists) {
      console.log(`📁 File already deleted: ${fileName}`)
      return NextResponse.json({ success: true, message: 'File already deleted' })
    }

    await file.delete()
    console.log(`✅ Temp file deleted successfully: ${fileName}`)
    
    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Cleanup error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Cleanup failed'
    }, { status: 500 })
  }
}