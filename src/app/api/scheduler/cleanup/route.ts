// src/app/api/scheduler/cleanup/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    // Verify this is a legitimate scheduler request
    const userAgent = request.headers.get('user-agent')
    const schedulerHeader = request.headers.get('x-cloudscheduler')
    
    if (!userAgent?.includes('Google-Cloud-Scheduler') && !schedulerHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🧹 Starting cleanup process...')

    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const cleanupResults = {
      oldScheduledPosts: 0,
      oldPostHistory: 0,
      tempFiles: 0,
      errors: [] as string[]
    }

    // 1. Clean up old scheduled posts (completed or failed, older than 7 days)
    try {
      const oldScheduledPosts = await prisma.scheduledPost.deleteMany({
        where: {
          OR: [
            { status: 'POSTED', updatedAt: { lt: sevenDaysAgo } },
            { status: 'FAILED', updatedAt: { lt: sevenDaysAgo } }
          ]
        }
      })
      cleanupResults.oldScheduledPosts = oldScheduledPosts.count
      console.log(`🗑️ Cleaned up ${oldScheduledPosts.count} old scheduled posts`)
    } catch (error) {
      const errorMsg = `Failed to clean scheduled posts: ${error instanceof Error ? error.message : 'Unknown error'}`
      console.error(errorMsg)
      cleanupResults.errors.push(errorMsg)
    }

    // 2. Clean up old post history (older than 30 days)
    try {
      const oldPostHistory = await prisma.postHistory.deleteMany({
        where: {
          postedAt: { lt: thirtyDaysAgo }
        }
      })
      cleanupResults.oldPostHistory = oldPostHistory.count
      console.log(`🗑️ Cleaned up ${oldPostHistory.count} old post history records`)
    } catch (error) {
      const errorMsg = `Failed to clean post history: ${error instanceof Error ? error.message : 'Unknown error'}`
      console.error(errorMsg)
      cleanupResults.errors.push(errorMsg)
    }

    // 3. Clean up temporary files from cloud storage
    try {
      const tempFilesCleanup = await cleanupTempFiles()
      cleanupResults.tempFiles = tempFilesCleanup.count
      if (tempFilesCleanup.errors.length > 0) {
        cleanupResults.errors.push(...tempFilesCleanup.errors)
      }
      console.log(`🗑️ Cleaned up ${tempFilesCleanup.count} temporary files`)
    } catch (error) {
      const errorMsg = `Failed to clean temp files: ${error instanceof Error ? error.message : 'Unknown error'}`
      console.error(errorMsg)
      cleanupResults.errors.push(errorMsg)
    }

    console.log('✅ Cleanup process completed')

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      results: cleanupResults
    })

  } catch (error) {
    console.error('❌ Cleanup process failed:', error)
    return NextResponse.json(
      { 
        error: 'Cleanup failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Helper function to clean up temporary files from cloud storage
async function cleanupTempFiles(): Promise<{ count: number; errors: string[] }> {
  const errors: string[] = []
  let count = 0

  try {
    const { Storage } = await import('@google-cloud/storage')
    const { getGoogleCredentials } = await import('@/lib/google-credentials')
    
    const storage = new Storage({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      credentials: getGoogleCredentials() || undefined
    })
    
    const bucketName = process.env.GOOGLE_CLOUD_STORAGE_BUCKET || 'sosh-images'
    const bucket = storage.bucket(bucketName)
    
    // Clean up temp files older than 1 day
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    
    const [files] = await bucket.getFiles({
      prefix: 'temp/',
      maxResults: 1000
    })
    
    console.log(`🔍 Found ${files.length} temp files to check`)
    
    for (const file of files) {
      try {
        const [metadata] = await file.getMetadata()
        
        // Handle case where timeCreated might be undefined
        if (!metadata.timeCreated) {
          console.log(`⚠️ No creation time for ${file.name}, skipping...`)
          continue
        }
        
        const fileCreated = new Date(metadata.timeCreated)
        
        if (fileCreated < oneDayAgo) {
          await file.delete()
          count++
          console.log(`🗑️ Deleted temp file: ${file.name}`)
        }
      } catch (fileError) {
        const errorMsg = `Failed to delete ${file.name}: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`
        console.error(errorMsg)
        errors.push(errorMsg)
      }
    }
    
  } catch (storageError) {
    const errorMsg = `Storage cleanup failed: ${storageError instanceof Error ? storageError.message : 'Unknown error'}`
    console.error(errorMsg)
    errors.push(errorMsg)
  }

  return { count, errors }
}