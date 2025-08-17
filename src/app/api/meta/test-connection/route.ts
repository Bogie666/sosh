// src/app/api/meta/test-connection/route.ts
import { NextResponse } from 'next/server'
import { metaApiManager } from '@/lib/meta-api-manager'

export async function GET() {
  try {
    console.log('=== META CONNECTION TEST ===')
    console.log('Meta configured:', metaApiManager.isConfigured())
    console.log('Access token exists:', !!process.env.META_ACCESS_TOKEN)
    console.log('App ID exists:', !!process.env.META_APP_ID)
    console.log('App Secret exists:', !!process.env.META_APP_SECRET)

    // Test the basic connection first
    const connectionTest = await metaApiManager.testConnection()
    console.log('Connection test result:', connectionTest)
    
    if (!connectionTest.success) {
      return NextResponse.json({
        success: false,
        error: connectionTest.error,
        configured: metaApiManager.isConfigured(),
        debug: {
          hasAccessToken: !!process.env.META_ACCESS_TOKEN,
          hasAppId: !!process.env.META_APP_ID,
          hasAppSecret: !!process.env.META_APP_SECRET
        }
      })
    }

    // If connection works, also get available pages
    console.log('Basic connection successful, fetching pages...')
    const pagesResult = await metaApiManager.getPages()
    console.log('Pages result:', pagesResult)
    
    return NextResponse.json({
      success: true,
      user: connectionTest.data?.user,
      id: connectionTest.data?.id,
      pages: pagesResult.success ? pagesResult.data : [],
      pageCount: pagesResult.success ? pagesResult.data?.length : 0,
      configured: true,
      debug: {
        connectionSuccess: true,
        pagesSuccess: pagesResult.success,
        pagesError: pagesResult.error
      }
    })

  } catch (error) {
    console.error('Meta connection test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      configured: metaApiManager.isConfigured(),
      debug: {
        caughtError: true,
        errorMessage: error instanceof Error ? error.message : 'Unknown'
      }
    }, { status: 500 })
  }
}

// POST method to test posting capability
export async function POST(request: Request) {
  try {
    const { businessName, testMessage } = await request.json()
    
    if (!businessName) {
      return NextResponse.json({
        success: false,
        error: 'Business name is required for posting test'
      }, { status: 400 })
    }

    const testContent = testMessage || 'Test post from Social Media Manager - please ignore'
    
    console.log(`Testing Facebook post for business: ${businessName}`)
    console.log(`Test content: ${testContent}`)
    
    // Test Facebook posting
    const facebookResult = await metaApiManager.postToFacebook(businessName, testContent)
    console.log('Facebook posting result:', facebookResult)
    
    return NextResponse.json({
      success: facebookResult.success,
      results: {
        facebook: facebookResult
      },
      error: facebookResult.success ? undefined : facebookResult.error
    })

  } catch (error) {
    console.error('Meta posting test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}