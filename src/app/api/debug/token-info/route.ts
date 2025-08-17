// src/app/api/debug/token-info/route.ts
import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'No access token in session' })
    }

    // Check token info with Google
    try {
      const tokenInfoResponse = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${session.accessToken}`)
      const tokenInfo = await tokenInfoResponse.json()

      // Also try a simple API call to test the token
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`
        }
      })
      const userInfo = await userInfoResponse.json()

      return NextResponse.json({ 
        tokenInfo,
        userInfo,
        tokenLength: session.accessToken.length,
        tokenStart: session.accessToken.substring(0, 20) + '...',
        hasRefreshToken: !!session.refreshToken
      })

    } catch (apiError) {
      return NextResponse.json({ 
        error: 'Failed to validate token',
        details: apiError instanceof Error ? apiError.message : 'Unknown error',
        tokenLength: session.accessToken.length,
        tokenStart: session.accessToken.substring(0, 20) + '...'
      })
    }

  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
  }
}
