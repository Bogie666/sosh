// src/lib/meta-api-manager.ts
import { BUSINESS_ACCOUNTS } from './business-account-mapping'

export interface MetaPostOptions {
  message?: string
  link?: string
  scheduled_publish_time?: number
  published?: boolean
}

export interface MetaApiResponse {
  success: boolean
  postId?: string
  error?: string
  data?: any
}

export interface MetaPageInfo {
  id: string
  name: string
  access_token: string
  category: string
  tasks?: string[]
}

class MetaApiManager {
  private baseUrl = 'https://graph.facebook.com/v18.0'
  private accessToken: string
  private appId: string
  private appSecret: string

  constructor() {
    this.accessToken = process.env.META_ACCESS_TOKEN || ''
    this.appId = process.env.META_APP_ID || ''
    this.appSecret = process.env.META_APP_SECRET || ''
  }

  /**
   * Check if Meta API is properly configured
   */
  isConfigured(): boolean {
    return !!(this.accessToken && this.appId && this.appSecret)
  }

  /**
   * Test the Meta API connection
   */
  async testConnection(): Promise<MetaApiResponse> {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          error: 'Meta API not configured. Please check environment variables.'
        }
      }

      const response = await fetch(`${this.baseUrl}/me?access_token=${this.accessToken}`)
      const data = await response.json()

      if (data.error) {
        return {
          success: false,
          error: `Meta API Error: ${data.error.message}`
        }
      }

      return {
        success: true,
        data: {
          user: data.name,
          id: data.id
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown Meta API error'
      }
    }
  }

  /**
   * Get pages managed by the user
   */
  async getPages(): Promise<MetaApiResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}/me/accounts?access_token=${this.accessToken}`
      )
      const data = await response.json()

      if (data.error) {
        return {
          success: false,
          error: `Meta API Error: ${data.error.message}`
        }
      }

      const pages = data.data?.map((page: any) => ({
        id: page.id,
        name: page.name,
        access_token: page.access_token,
        category: page.category,
        tasks: page.tasks
      })) || []

      return {
        success: true,
        data: pages
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch pages'
      }
    }
  }

  /**
   * Get page information by page ID
   */
  async getPageInfo(pageId: string): Promise<MetaApiResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}/${pageId}?fields=id,name,category,fan_count,followers_count&access_token=${this.accessToken}`
      )
      const data = await response.json()

      if (data.error) {
        return {
          success: false,
          error: `Meta API Error: ${data.error.message}`
        }
      }

      return {
        success: true,
        data: data
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch page info'
      }
    }
  }

  /**
   * Post to Facebook page
   */
  async postToFacebook(businessName: string, content: string, options: MetaPostOptions = {}, imageFile?: File): Promise<MetaApiResponse> {
  try {
    // Map business names to actual page IDs and get page-specific tokens
    const pageMapping: Record<string, { pageId: string, needsPageToken: boolean }> = {
      'lex-dallas': { pageId: '117276454970502', needsPageToken: true },  // Lex Air Conditioning and Heating
      'lex': { pageId: '117276454970502', needsPageToken: true },         // Same as lex-dallas
      'lex-etx': { pageId: '104687012905700', needsPageToken: true },     // Lex ETX
      'lyons': { pageId: '172733356071633', needsPageToken: true }        // Lyons Air & Heat
    }

    const pageInfo = pageMapping[businessName.toLowerCase()]
    
    if (!pageInfo) {
      return {
        success: false,
        error: `Facebook page not found for business: ${businessName}. Available: ${Object.keys(pageMapping).join(', ')}`
      }
    }

    console.log(`Posting to Facebook page ${pageInfo.pageId} for business: ${businessName}`)

    // Get page-specific access token
    let pageAccessToken = this.accessToken
    
    if (pageInfo.needsPageToken) {
      console.log('Getting page-specific access token...')
      try {
        const pagesResponse = await fetch(`${this.baseUrl}/me/accounts?access_token=${this.accessToken}`)
        const pagesData = await pagesResponse.json()
        
        if (pagesData.data) {
          const page = pagesData.data.find((p: any) => p.id === pageInfo.pageId)
          if (page && page.access_token) {
            pageAccessToken = page.access_token
            console.log('Found page-specific access token')
          } else {
            console.log('No page-specific token found, using user token')
          }
        }
      } catch (tokenError) {
        console.log('Failed to get page token, using user token:', tokenError)
      }
    }

    // Handle image posting vs text-only posting
    if (imageFile) {
      console.log(`📸 Posting with image: ${imageFile.name} (${imageFile.size} bytes)`)
      
      // Create FormData for image upload
      const formData = new FormData()
      formData.append('source', imageFile)
      formData.append('message', content)
      formData.append('access_token', pageAccessToken)
      
      // Add any additional options
      Object.keys(options).forEach(key => {
        if (key !== 'message') {
          formData.append(key, String(options[key as keyof MetaPostOptions]))
        }
      })

      console.log('Uploading image to Facebook...')

      const response = await fetch(
        `${this.baseUrl}/${pageInfo.pageId}/photos`,
        {
          method: 'POST',
          body: formData
        }
      )

      const data = await response.json()
      console.log('Facebook photo API response:', data)

      if (data.error) {
        return {
          success: false,
          error: `Facebook Photo Post Error: ${data.error.message} (Code: ${data.error.code})`
        }
      }

      return {
        success: true,
        postId: data.id,
        data: data
      }

    } else {
      // Text-only post (existing logic)
      const postData = {
        message: content,
        access_token: pageAccessToken,
        ...options
      }

      console.log('Posting text-only content to Facebook...')

      const response = await fetch(
        `${this.baseUrl}/${pageInfo.pageId}/feed`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(postData)
        }
      )

      const data = await response.json()
      console.log('Facebook API response:', data)

      if (data.error) {
        return {
          success: false,
          error: `Facebook Post Error: ${data.error.message} (Code: ${data.error.code})`
        }
      }

      return {
        success: true,
        postId: data.id,
        data: data
      }
    }
  } catch (error) {
    console.error('Facebook posting error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to post to Facebook'
    }
  }
}

  /**
   * Post to Instagram (requires Facebook page connection)
   */
  async postToInstagram(businessName: string, content: string, imageUrl?: string): Promise<MetaApiResponse> {
    try {
      // Map business names to actual page IDs from the debug results
      const pageMapping: Record<string, string> = {
        'lex-dallas': '117276454970502',  // Lex Air Conditioning and Heating
        'lex': '117276454970502',         // Same as lex-dallas
        'lex-etx': '104687012905700',     // Lex ETX
        'lyons': '172733356071633'        // Lyons Air & Heat
      }

      const pageId = pageMapping[businessName.toLowerCase()]
      
      if (!pageId) {
        return {
          success: false,
          error: `Instagram page not found for business: ${businessName}. Available: ${Object.keys(pageMapping).join(', ')}`
        }
      }

      console.log(`Attempting Instagram post for page ${pageId} for business: ${businessName}`)

      // First, get the Instagram business account ID
      const igAccountResponse = await fetch(
        `${this.baseUrl}/${pageId}?fields=instagram_business_account&access_token=${this.accessToken}`
      )
      const igAccountData = await igAccountResponse.json()

      if (igAccountData.error || !igAccountData.instagram_business_account) {
        return {
          success: false,
          error: 'Instagram Business Account not connected to this Facebook page'
        }
      }

      const igAccountId = igAccountData.instagram_business_account.id

      let mediaObject: any = {
        caption: content,
        access_token: this.accessToken
      }

      // If image URL provided, create media with image
      if (imageUrl) {
        mediaObject.image_url = imageUrl
      } else {
        // Text-only post (Instagram Story or Reels might be required)
        return {
          success: false,
          error: 'Instagram requires media (image/video) for posts. Text-only posts not supported.'
        }
      }

      // Step 1: Create media object
      const createMediaResponse = await fetch(
        `${this.baseUrl}/${igAccountId}/media`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(mediaObject)
        }
      )

      const createMediaData = await createMediaResponse.json()

      if (createMediaData.error) {
        return {
          success: false,
          error: `Instagram Media Creation Error: ${createMediaData.error.message}`
        }
      }

      // Step 2: Publish the media
      const publishResponse = await fetch(
        `${this.baseUrl}/${igAccountId}/media_publish`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            creation_id: createMediaData.id,
            access_token: this.accessToken
          })
        }
      )

      const publishData = await publishResponse.json()

      if (publishData.error) {
        return {
          success: false,
          error: `Instagram Publish Error: ${publishData.error.message}`
        }
      }

      return {
        success: true,
        postId: publishData.id,
        data: publishData
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to post to Instagram'
      }
    }
  }

  /**
   * Get insights for a Facebook post
   */
  async getPostInsights(postId: string): Promise<MetaApiResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}/${postId}/insights?metric=post_impressions,post_engaged_users&access_token=${this.accessToken}`
      )
      const data = await response.json()

      if (data.error) {
        return {
          success: false,
          error: `Meta Insights Error: ${data.error.message}`
        }
      }

      return {
        success: true,
        data: data.data
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch post insights'
      }
    }
  }

  /**
   * Schedule a post for later
   */
  async schedulePost(businessName: string, platform: 'facebook' | 'instagram', content: string, scheduledTime: Date, imageUrl?: string): Promise<MetaApiResponse> {
    const scheduledTimestamp = Math.floor(scheduledTime.getTime() / 1000)
    
    // Facebook scheduled posts
    if (platform === 'facebook') {
      return await this.postToFacebook(businessName, content, {
        scheduled_publish_time: scheduledTimestamp,
        published: false
      })
    }
    
    // Instagram scheduled posts
    if (platform === 'instagram') {
      return {
        success: false,
        error: 'Instagram post scheduling not yet implemented via Meta API'
      }
    }

    return {
      success: false,
      error: `Unsupported platform for scheduling: ${platform}`
    }
  }
}

export const metaApiManager = new MetaApiManager()