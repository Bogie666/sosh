// src/app/api/twitter/test-connection/route.ts
import { NextResponse } from 'next/server'
import { twitterApiManager } from '@/lib/twitter-api-manager'
import { BUSINESS_ACCOUNTS } from '@/lib/business-account-mapping'

export async function GET() {
  try {
    const results: any = {}
    const errors: any = {}
    let hasAnyConnection = false
    let totalConnected = 0

    console.log('=== TWITTER CONNECTION TEST ===')

    // Test each business that has Twitter configured
    for (const [businessId, config] of Object.entries(BUSINESS_ACCOUNTS)) {
      if (config.accounts.twitter) {
        console.log(`Testing Twitter for business: ${businessId}`)
        const isConfigured = twitterApiManager.isConfigured(businessId)
        
        if (isConfigured) {
          const connectionTest = await twitterApiManager.testConnection(businessId)
          results[businessId] = {
            configured: true,
            connected: connectionTest.success,
            user: connectionTest.data?.user,
            error: connectionTest.error,
            businessName: config.displayName
          }
          
          if (connectionTest.success) {
            hasAnyConnection = true
            totalConnected++
            console.log(`✅ ${businessId} connected successfully`)
          } else {
            console.log(`❌ ${businessId} connection failed: ${connectionTest.error}`)
          }
        } else {
          results[businessId] = {
            configured: false,
            connected: false,
            error: 'Twitter API credentials not configured',
            businessName: config.displayName
          }
          console.log(`⚠️ ${businessId} not configured`)
        }
      }
    }

    return NextResponse.json({
      success: hasAnyConnection,
      message: hasAnyConnection 
        ? 'At least one Twitter connection is working'
        : 'No working Twitter connections found',
      businesses: results,
      totalBusinesses: totalConnected, // Return count of connected businesses for the UI
      totalConfigured: Object.keys(results).length
    })

  } catch (error) {
    console.error('Twitter connection test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      totalBusinesses: 0
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

    // Find the business ID that matches the business name
    let businessId = businessName
    for (const [id, config] of Object.entries(BUSINESS_ACCOUNTS)) {
      if (config.displayName.toLowerCase().includes(businessName.toLowerCase()) || 
          config.name === businessName) {
        businessId = id
        break
      }
    }

    if (!twitterApiManager.isConfigured(businessId)) {
      return NextResponse.json({
        success: false,
        error: `Twitter not configured for business: ${businessName}`
      }, { status: 400 })
    }

    const testContent = testMessage || 'Test tweet from Social Media Manager 🚀 #SocialMediaAutomation'
    
    // Ensure content is within Twitter's character limit
    if (testContent.length > 280) {
      return NextResponse.json({
        success: false,
        error: `Test message too long (${testContent.length} characters). Twitter limit is 280.`
      }, { status: 400 })
    }

    const tweetResult = await twitterApiManager.postTweet(businessId, testContent)
    
    return NextResponse.json({
      success: tweetResult.success,
      tweetId: tweetResult.tweetId,
      businessId: businessId,
      characterCount: testContent.length,
      error: tweetResult.success ? undefined : tweetResult.error
    })

  } catch (error) {
    console.error('Twitter posting test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}