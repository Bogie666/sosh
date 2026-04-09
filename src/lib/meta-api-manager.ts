// src/lib/meta-api-manager.ts
// Meta (Facebook/Instagram) API manager.
// Resolves credentials from DB (PlatformConfig) first, falls back to env vars.

import { getPlatformCredentials } from './platform-credentials'

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

  private getGlobalAccessToken(): string {
    return process.env.META_ACCESS_TOKEN || ''
  }

  isConfigured(): boolean {
    return !!(this.getGlobalAccessToken() && process.env.META_APP_ID && process.env.META_APP_SECRET)
  }

  async testConnection(): Promise<MetaApiResponse> {
    try {
      const token = this.getGlobalAccessToken()
      if (!token) {
        return { success: false, error: 'Meta API not configured. Please check environment variables.' }
      }
      const response = await fetch(`${this.baseUrl}/me?access_token=${token}`)
      const data = await response.json()
      if (data.error) return { success: false, error: `Meta API Error: ${data.error.message}` }
      return { success: true, data: { user: data.name, id: data.id } }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown Meta API error' }
    }
  }

  async getPages(): Promise<MetaApiResponse> {
    try {
      const token = this.getGlobalAccessToken()
      const response = await fetch(`${this.baseUrl}/me/accounts?access_token=${token}`)
      const data = await response.json()
      if (data.error) return { success: false, error: `Meta API Error: ${data.error.message}` }
      const pages = data.data?.map((page: any) => ({
        id: page.id, name: page.name, access_token: page.access_token, category: page.category, tasks: page.tasks
      })) || []
      return { success: true, data: pages }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch pages' }
    }
  }

  /**
   * Resolve the Facebook page ID and access token for a business.
   * Checks PlatformConfig DB first, falls back to env vars.
   */
  private async resolvePageCredentials(businessId: string): Promise<{ pageId: string; accessToken: string } | null> {
    // Try DB credentials
    const creds = await getPlatformCredentials(businessId, 'FACEBOOK')
    if (creds?.pageId) {
      return {
        pageId: creds.pageId,
        accessToken: creds.accessToken || this.getGlobalAccessToken()
      }
    }
    return null
  }

  /**
   * Get page-specific access token (needed for posting as the page)
   */
  private async getPageAccessToken(pageId: string, userToken: string): Promise<string> {
    try {
      const pagesResponse = await fetch(`${this.baseUrl}/me/accounts?access_token=${userToken}`)
      const pagesData = await pagesResponse.json()
      if (pagesData.data) {
        const page = pagesData.data.find((p: any) => p.id === pageId)
        if (page?.access_token) return page.access_token
      }
    } catch (e) {
      console.log('Failed to get page-specific token, using user token')
    }
    return userToken
  }

  async postToFacebook(businessName: string, content: string, options: MetaPostOptions = {}, imageFile?: File): Promise<MetaApiResponse> {
    try {
      const pageCreds = await this.resolvePageCredentials(businessName)
      if (!pageCreds) {
        return { success: false, error: `Facebook page not configured for business: ${businessName}. Go to Settings > Business Profile > Platform Connections to set it up.` }
      }

      const { pageId, accessToken: baseToken } = pageCreds
      console.log(`Posting to Facebook page ${pageId} for business: ${businessName}`)

      // Get page-specific access token for posting
      const pageAccessToken = await this.getPageAccessToken(pageId, baseToken)

      if (imageFile) {
        console.log(`📸 Posting with image: ${imageFile.name} (${imageFile.size} bytes)`)
        const formData = new FormData()
        formData.append('source', imageFile)
        formData.append('message', content)
        formData.append('access_token', pageAccessToken)
        Object.keys(options).forEach(key => {
          if (key !== 'message') formData.append(key, String(options[key as keyof MetaPostOptions]))
        })

        const response = await fetch(`${this.baseUrl}/${pageId}/photos`, { method: 'POST', body: formData })
        const data = await response.json()
        if (data.error) return { success: false, error: `Facebook Photo Post Error: ${data.error.message} (Code: ${data.error.code})` }
        return { success: true, postId: data.id, data }
      } else {
        const postData = { message: content, access_token: pageAccessToken, ...options }
        const response = await fetch(`${this.baseUrl}/${pageId}/feed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(postData)
        })
        const data = await response.json()
        if (data.error) return { success: false, error: `Facebook Post Error: ${data.error.message} (Code: ${data.error.code})` }
        return { success: true, postId: data.id, data }
      }
    } catch (error) {
      console.error('Facebook posting error:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Failed to post to Facebook' }
    }
  }

  async postToInstagram(businessName: string, content: string, imageUrl?: string): Promise<MetaApiResponse> {
    try {
      // Instagram uses the same Facebook page to discover the IG business account
      const pageCreds = await this.resolvePageCredentials(businessName)
      if (!pageCreds) {
        return { success: false, error: `Instagram not configured for business: ${businessName}. Go to Settings > Business Profile > Platform Connections.` }
      }

      const { pageId, accessToken } = pageCreds
      console.log(`Attempting Instagram post for page ${pageId} for business: ${businessName}`)

      // Get the Instagram business account ID from the Facebook page
      const igAccountResponse = await fetch(`${this.baseUrl}/${pageId}?fields=instagram_business_account&access_token=${accessToken}`)
      const igAccountData = await igAccountResponse.json()

      if (igAccountData.error || !igAccountData.instagram_business_account) {
        return { success: false, error: 'Instagram Business Account not connected to this Facebook page' }
      }

      const igAccountId = igAccountData.instagram_business_account.id

      if (!imageUrl) {
        return { success: false, error: 'Instagram requires media (image/video) for posts.' }
      }

      // Step 1: Create media object
      const createMediaResponse = await fetch(`${this.baseUrl}/${igAccountId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caption: content, image_url: imageUrl, access_token: accessToken })
      })
      const createMediaData = await createMediaResponse.json()
      if (createMediaData.error) {
        return { success: false, error: `Instagram Media Creation Error: ${createMediaData.error.message}` }
      }

      // Step 2: Publish the media
      const publishResponse = await fetch(`${this.baseUrl}/${igAccountId}/media_publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creation_id: createMediaData.id, access_token: accessToken })
      })
      const publishData = await publishResponse.json()
      if (publishData.error) {
        return { success: false, error: `Instagram Publish Error: ${publishData.error.message}` }
      }

      return { success: true, postId: publishData.id, data: publishData }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to post to Instagram' }
    }
  }

  async getPostInsights(postId: string): Promise<MetaApiResponse> {
    try {
      const token = this.getGlobalAccessToken()
      const response = await fetch(`${this.baseUrl}/${postId}/insights?metric=post_impressions,post_engaged_users&access_token=${token}`)
      const data = await response.json()
      if (data.error) return { success: false, error: `Meta Insights Error: ${data.error.message}` }
      return { success: true, data: data.data }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch post insights' }
    }
  }

  async schedulePost(businessName: string, platform: 'facebook' | 'instagram', content: string, scheduledTime: Date, imageUrl?: string): Promise<MetaApiResponse> {
    const scheduledTimestamp = Math.floor(scheduledTime.getTime() / 1000)
    if (platform === 'facebook') {
      return await this.postToFacebook(businessName, content, { scheduled_publish_time: scheduledTimestamp, published: false })
    }
    return { success: false, error: `Scheduled posting not yet implemented for ${platform}` }
  }
}

export const metaApiManager = new MetaApiManager()
