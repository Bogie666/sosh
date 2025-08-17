// src/app/api/google/reply-review/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { GoogleAuth } from 'google-auth-library'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.accessToken) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated with Google' },
        { status: 401 }
      )
    }

    const { reviewId, reviewName, reply, accountId, locationId } = await request.json()

    if (!reply || !reply.trim()) {
      return NextResponse.json(
        { success: false, error: 'Reply text is required' },
        { status: 400 }
      )
    }

    console.log('Posting reply to Google Business Profile:', {
      reviewId,
      reviewName,
      accountId,
      locationId,
      replyLength: reply.length
    })

    // Build the review name/path for the API call
    let fullReviewName = reviewName
    if (!fullReviewName && accountId && locationId && reviewId) {
      // The reviewId might already contain the full path or just be the ID
      if (reviewId.includes('accounts/')) {
        fullReviewName = reviewId
      } else {
        fullReviewName = `accounts/${accountId}/locations/${locationId}/reviews/${reviewId}`
      }
    }

    if (!fullReviewName) {
      return NextResponse.json(
        { success: false, error: 'Could not determine review path. Need reviewName or accountId+locationId+reviewId' },
        { status: 400 }
      )
    }

    console.log(`Posting reply to: ${fullReviewName}`)

    // Post the reply using Google Business Profile API
    const replyUrl = `https://mybusiness.googleapis.com/v4/${fullReviewName}/reply`
    
    const response = await fetch(replyUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        comment: reply
      })
    })

    console.log(`Google API response status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Google API error:', errorText)
      
      // Handle specific error cases
      if (response.status === 401) {
        return NextResponse.json(
          { success: false, error: 'Google authentication expired. Please reconnect your Google account.' },
          { status: 401 }
        )
      } else if (response.status === 403) {
        return NextResponse.json(
          { success: false, error: 'Permission denied. Make sure your Google account has permission to reply to reviews for this business.' },
          { status: 403 }
        )
      } else if (response.status === 404) {
        return NextResponse.json(
          { success: false, error: 'Review not found. It may have been deleted or the review ID is incorrect.' },
          { status: 404 }
        )
      } else {
        return NextResponse.json(
          { success: false, error: `Google API error: ${response.status} ${errorText}` },
          { status: response.status }
        )
      }
    }

    const result = await response.json()
    console.log('✅ Successfully posted reply to Google Business Profile')

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Reply posted successfully to Google Business Profile'
    })

  } catch (error) {
    console.error('Error in reply-review API:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to post reply' 
      },
      { status: 500 }
    )
  }
}

// Handle GET request to check API status
export async function GET() {
  try {
    const session = await auth()
    
    return NextResponse.json({
      success: true,
      authenticated: !!session?.accessToken,
      message: 'Google Business Profile reply API is available',
      requiredFields: ['reply', 'reviewId OR reviewName', 'accountId+locationId (if using reviewId)'],
      endpoints: {
        post: 'POST /api/google/reply-review',
        description: 'Posts a reply to a Google Business Profile review'
      }
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'API check failed' },
      { status: 500 }
    )
  }
}