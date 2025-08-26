// src/app/api/test/service-account/route.ts
import { NextResponse } from 'next/server'
import { googleServiceAccount } from '@/lib/google-service-account'

export async function GET() {
  try {
    console.log('🧪 Testing service account access...')
    
    // Test 1: Get access token
    const accessToken = await googleServiceAccount.getAccessToken()
    console.log('✅ Service account authentication successful')
    console.log('📄 Token preview:', accessToken.substring(0, 20) + '...')
    
    // Test 2: Try to fetch locations
    const locationsResult = await googleServiceAccount.getAllLocations()
    
    if (locationsResult.success) {
      console.log(`✅ Service account can access ${locationsResult.locations?.length} locations`)
      
      return NextResponse.json({
        success: true,
        message: 'Service account is working correctly!',
        results: {
          tokenTest: '✅ Access token obtained',
          locationsTest: `✅ Found ${locationsResult.locations?.length} locations`,
          locations: locationsResult.locations?.map(loc => ({
            name: loc.title,
            locationId: loc.locationId,
            accountId: loc.accountId
          }))
        }
      })
    } else {
      return NextResponse.json({
        success: false,
        message: 'Service account authentication works, but location access failed',
        error: locationsResult.error,
        results: {
          tokenTest: '✅ Access token obtained',
          locationsTest: `❌ ${locationsResult.error}`
        }
      })
    }
    
  } catch (error) {
    console.error('❌ Service account test failed:', error)
    return NextResponse.json({
      success: false,
      message: 'Service account test failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      results: {
        tokenTest: '❌ Failed to get access token'
      }
    }, { status: 500 })
  }
}