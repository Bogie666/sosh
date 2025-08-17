// src/app/api/meta/debug/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    console.log('=== META DEBUG ROUTE ===')
    
    // Check environment variables directly
    const accessToken = process.env.META_ACCESS_TOKEN
    const appId = process.env.META_APP_ID
    const appSecret = process.env.META_APP_SECRET
    
    console.log('Environment variables:')
    console.log('- META_ACCESS_TOKEN exists:', !!accessToken)
    console.log('- META_ACCESS_TOKEN length:', accessToken?.length)
    console.log('- META_ACCESS_TOKEN preview:', accessToken?.substring(0, 20) + '...')
    console.log('- META_APP_ID exists:', !!appId)
    console.log('- META_APP_ID value:', appId)
    console.log('- META_APP_SECRET exists:', !!appSecret)
    console.log('- META_APP_SECRET length:', appSecret?.length)
    
    if (!accessToken) {
      return NextResponse.json({
        success: false,
        error: 'META_ACCESS_TOKEN not found in environment variables',
        debug: {
          hasAccessToken: false,
          hasAppId: !!appId,
          hasAppSecret: !!appSecret
        }
      })
    }

    // Test direct API call to Meta
    console.log('Testing direct Meta API call...')
    const response = await fetch(`https://graph.facebook.com/me?access_token=${accessToken}`)
    const data = await response.json()
    
    console.log('Meta API response status:', response.status)
    console.log('Meta API response data:', data)

    if (data.error) {
      return NextResponse.json({
        success: false,
        error: `Meta API Error: ${data.error.message}`,
        debug: {
          metaErrorCode: data.error.code,
          metaErrorType: data.error.type,
          metaErrorSubcode: data.error.error_subcode,
          hasValidToken: false
        }
      })
    }

    // If basic call works, try to get pages
    console.log('Basic Meta API call successful, testing pages...')
    const pagesResponse = await fetch(`https://graph.facebook.com/me/accounts?access_token=${accessToken}`)
    const pagesData = await pagesResponse.json()
    
    console.log('Pages API response status:', pagesResponse.status)
    console.log('Pages API response data:', pagesData)

    return NextResponse.json({
      success: true,
      user: {
        name: data.name,
        id: data.id
      },
      pages: pagesData.data || [],
      pageCount: pagesData.data?.length || 0,
      debug: {
        environmentVariables: {
          hasAccessToken: !!accessToken,
          hasAppId: !!appId,
          hasAppSecret: !!appSecret
        },
        apiCalls: {
          userInfoSuccess: true,
          pagesSuccess: !pagesData.error,
          pagesError: pagesData.error?.message
        }
      }
    })

  } catch (error) {
    console.error('Meta debug error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      debug: {
        caughtError: true,
        errorMessage: error instanceof Error ? error.message : 'Unknown'
      }
    }, { status: 500 })
  }
}