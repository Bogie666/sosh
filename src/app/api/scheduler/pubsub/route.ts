// src/app/api/scheduler/pubsub/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Verify this is a legitimate Pub/Sub push request
    const userAgent = request.headers.get('user-agent')
    if (!userAgent?.includes('Google-Cloud-Pub-Sub')) {
      console.log('Unauthorized Pub/Sub request blocked')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('📢 Pub/Sub trigger received')

    // Parse the Pub/Sub message
    const body = await request.json()
    const pubsubMessage = body.message

    if (pubsubMessage) {
      // Decode the message data
      const messageData = Buffer.from(pubsubMessage.data, 'base64').toString()
      console.log('📝 Pub/Sub message:', messageData)

      // Call the same processing logic as the direct HTTP endpoint
      const processUrl = new URL('/api/scheduler/process-posts', request.url)
      
      const response = await fetch(processUrl.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-cloudscheduler': 'pubsub-trigger'  // Custom header for verification
        },
        body: JSON.stringify({
          trigger: 'pubsub',
          messageId: pubsubMessage.messageId,
          publishTime: pubsubMessage.publishTime
        })
      })

      const result = await response.json()
      
      if (response.ok) {
        console.log('✅ Pub/Sub processing completed successfully')
        return NextResponse.json({ 
          success: true, 
          processed: result.processed,
          ack: true  // Acknowledge the Pub/Sub message
        })
      } else {
        console.error('❌ Pub/Sub processing failed:', result)
        return NextResponse.json({ 
          error: 'Processing failed', 
          details: result,
          ack: false  // Don't acknowledge - message will be retried
        }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, message: 'No action required' })

  } catch (error) {
    console.error('❌ Pub/Sub handler failed:', error)
    return NextResponse.json(
      { 
        error: 'Pub/Sub processing failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        ack: false  // Don't acknowledge failed requests
      },
      { status: 500 }
    )
  }
}

// Also create a subscription setup helper
export async function GET() {
  return NextResponse.json({
    info: 'Pub/Sub endpoint for Cloud Scheduler',
    setup: 'Use gcloud pubsub subscriptions create to set up push subscription',
    endpoint: '/api/scheduler/pubsub'
  })
}