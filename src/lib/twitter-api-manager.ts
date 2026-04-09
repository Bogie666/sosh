// src/lib/twitter-api-manager.ts
// Twitter/X API manager using OAuth 1.0a.
// Resolves credentials from DB (PlatformConfig) first, falls back to env vars.

import { getPlatformCredentials } from './platform-credentials'
import crypto from 'crypto'

export interface TwitterPostOptions {
  reply_settings?: 'everyone' | 'mentioned_users' | 'following'
  media_ids?: string[]
  poll_options?: string[]
  poll_duration_minutes?: number
  geo_place_id?: string
  boost_tweet?: boolean
}

export interface TwitterApiResponse {
  success: boolean
  tweetId?: string
  error?: string
  data?: any
}

interface OAuth1Config {
  consumerKey: string
  consumerSecret: string
  accessToken: string
  accessTokenSecret: string
}

class TwitterApiManager {
  private baseUrl = 'https://api.twitter.com/2'
  private uploadUrl = 'https://upload.twitter.com/1.1'

  /**
   * Resolve OAuth 1.0a credentials for a business.
   * Checks PlatformConfig DB first, falls back to env vars.
   */
  private async resolveOAuth1Config(businessId: string): Promise<OAuth1Config | null> {
    const creds = await getPlatformCredentials(businessId, 'TWITTER')
    if (creds?.consumerKey && creds?.consumerSecret) {
      return {
        consumerKey: creds.consumerKey,
        consumerSecret: creds.consumerSecret,
        accessToken: creds.accessToken || '',
        accessTokenSecret: creds.accessTokenSecret || ''
      }
    }
    return null
  }

  // Sync check for backwards compat - only checks env vars
  isConfigured(businessName: string): boolean {
    const prefixMap: Record<string, string> = {
      'lex-dallas': 'LEX_X', 'lex': 'LEX_X', 'lex-etx': 'LEX_X',
      'lyons': 'LYONS_X', 'ks': 'KS_X'
    }
    const prefix = prefixMap[businessName]
    if (!prefix) return false
    return !!(process.env[`${prefix}_CONSUMER_KEY`] && process.env[`${prefix}_CONSUMER_SECRET`])
  }

  // --- OAuth 1.0a signing ---

  private generateOAuth1Signature(method: string, url: string, params: Record<string, string>, consumerSecret: string, tokenSecret: string): string {
    const sortedParams = Object.keys(params).sort().map(key => `${this.percentEncode(key)}=${this.percentEncode(params[key])}`).join('&')
    const signatureBaseString = [method.toUpperCase(), this.percentEncode(url), this.percentEncode(sortedParams)].join('&')
    const signingKey = `${this.percentEncode(consumerSecret)}&${this.percentEncode(tokenSecret)}`
    return crypto.createHmac('sha1', signingKey).update(signatureBaseString).digest('base64')
  }

  private percentEncode(str: string): string {
    return encodeURIComponent(str).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
  }

  private generateAuthHeader(method: string, url: string, config: OAuth1Config, additionalParams: Record<string, string> = {}): string {
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const nonce = crypto.randomBytes(16).toString('hex')
    const oauthParams: Record<string, string> = {
      oauth_consumer_key: config.consumerKey,
      oauth_token: config.accessToken,
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: timestamp,
      oauth_nonce: nonce,
      oauth_version: '1.0',
      ...additionalParams
    }
    const signature = this.generateOAuth1Signature(method, url, oauthParams, config.consumerSecret, config.accessTokenSecret)
    oauthParams.oauth_signature = signature
    const authString = Object.keys(oauthParams).map(key => `${this.percentEncode(key)}="${this.percentEncode(oauthParams[key])}"`).join(', ')
    return `OAuth ${authString}`
  }

  // --- Public API methods ---

  async testConnection(businessName: string): Promise<TwitterApiResponse> {
    try {
      const config = await this.resolveOAuth1Config(businessName)
      if (!config) return { success: false, error: 'Twitter OAuth 1.0a credentials not configured' }
      const url = `${this.baseUrl}/users/me`
      const authHeader = this.generateAuthHeader('GET', url, config)
      const response = await fetch(url, { headers: { 'Authorization': authHeader } })
      const data = await response.json()
      if (data.errors) return { success: false, error: `Twitter API Error: ${data.errors[0]?.message || 'Unknown error'}` }
      return { success: true, data: { user: data.data } }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown Twitter API error' }
    }
  }

  async postTweet(businessName: string, content: string, options: TwitterPostOptions = {}): Promise<TwitterApiResponse> {
    try {
      const config = await this.resolveOAuth1Config(businessName)
      if (!config) {
        return { success: false, error: `Twitter credentials not configured for: ${businessName}. Go to Settings > Business Profile > Platform Connections.` }
      }
      if (content.length > 280) {
        return { success: false, error: `Tweet exceeds 280 character limit (${content.length} chars)` }
      }

      const url = `${this.baseUrl}/tweets`
      const authHeader = this.generateAuthHeader('POST', url, config)
      const tweetData: any = { text: content }
      if (options.reply_settings) tweetData.reply_settings = options.reply_settings
      if (options.media_ids?.length) tweetData.media = { media_ids: options.media_ids }
      if (options.poll_options?.length) tweetData.poll = { options: options.poll_options, duration_minutes: options.poll_duration_minutes || 1440 }
      if (options.geo_place_id) tweetData.geo = { place_id: options.geo_place_id }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify(tweetData)
      })

      if (!response.ok) {
        const errorText = await response.text()
        return { success: false, error: `Twitter API Error: ${response.status} ${errorText}` }
      }

      const data = await response.json()
      if (data.errors) return { success: false, error: `Twitter Post Error: ${data.errors[0]?.message || 'Unknown error'}` }
      if (data.data?.id) return { success: true, tweetId: data.data.id, data: data.data }
      return { success: false, error: 'Tweet posted but no ID returned' }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to post tweet' }
    }
  }

  async uploadMedia(businessName: string, mediaData: Buffer, mediaType: string): Promise<TwitterApiResponse> {
    try {
      const config = await this.resolveOAuth1Config(businessName)
      if (!config) return { success: false, error: `Twitter credentials not configured for: ${businessName}` }

      const initUrl = `${this.uploadUrl}/media/upload.json`

      // INIT
      const initAuthHeader = this.generateAuthHeader('POST', initUrl, config, {
        command: 'INIT', total_bytes: mediaData.length.toString(), media_type: mediaType, media_category: 'tweet_image'
      })
      const initResponse = await fetch(initUrl, {
        method: 'POST',
        headers: { 'Authorization': initAuthHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ command: 'INIT', total_bytes: mediaData.length.toString(), media_type: mediaType, media_category: 'tweet_image' })
      })
      const initData = await initResponse.json()
      if (initData.errors) return { success: false, error: `Twitter Media Init Error: ${initData.errors[0]?.message}` }
      const mediaId = initData.media_id_string

      // APPEND
      const appendAuthHeader = this.generateAuthHeader('POST', initUrl, config, { command: 'APPEND', media_id: mediaId, segment_index: '0' })
      await fetch(initUrl, {
        method: 'POST',
        headers: { 'Authorization': appendAuthHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ command: 'APPEND', media_id: mediaId, segment_index: '0', media: mediaData.toString('base64') })
      })

      // FINALIZE
      const finalizeAuthHeader = this.generateAuthHeader('POST', initUrl, config, { command: 'FINALIZE', media_id: mediaId })
      const finalizeResponse = await fetch(initUrl, {
        method: 'POST',
        headers: { 'Authorization': finalizeAuthHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ command: 'FINALIZE', media_id: mediaId })
      })
      const finalizeData = await finalizeResponse.json()
      if (finalizeData.errors) return { success: false, error: `Twitter Media Finalize Error: ${finalizeData.errors[0]?.message}` }

      return { success: true, data: { media_id: mediaId, media_id_string: mediaId, size: mediaData.length, expires_after_secs: finalizeData.expires_after_secs } }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to upload media' }
    }
  }

  async getTweet(businessName: string, tweetId: string): Promise<TwitterApiResponse> {
    try {
      const config = await this.resolveOAuth1Config(businessName)
      if (!config) return { success: false, error: 'Twitter credentials not configured' }
      const url = `${this.baseUrl}/tweets/${tweetId}?expansions=author_id&tweet.fields=created_at,public_metrics,context_annotations`
      const authHeader = this.generateAuthHeader('GET', url, config)
      const response = await fetch(url, { headers: { 'Authorization': authHeader } })
      const data = await response.json()
      if (data.errors) return { success: false, error: `Twitter API Error: ${data.errors[0]?.message || 'Unknown error'}` }
      return { success: true, data }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch tweet' }
    }
  }

  async deleteTweet(businessName: string, tweetId: string): Promise<TwitterApiResponse> {
    try {
      const config = await this.resolveOAuth1Config(businessName)
      if (!config) return { success: false, error: `Twitter credentials not configured for: ${businessName}` }
      const url = `${this.baseUrl}/tweets/${tweetId}`
      const authHeader = this.generateAuthHeader('DELETE', url, config)
      const response = await fetch(url, { method: 'DELETE', headers: { 'Authorization': authHeader } })
      const data = await response.json()
      if (data.errors) return { success: false, error: `Twitter Delete Error: ${data.errors[0]?.message || 'Unknown error'}` }
      return { success: true, data: data.data }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to delete tweet' }
    }
  }

  async getUserTweets(businessName: string, maxResults: number = 10): Promise<TwitterApiResponse> {
    try {
      const config = await this.resolveOAuth1Config(businessName)
      if (!config) return { success: false, error: 'Twitter credentials not configured' }

      const userUrl = `${this.baseUrl}/users/me`
      const userAuthHeader = this.generateAuthHeader('GET', userUrl, config)
      const userResponse = await fetch(userUrl, { headers: { 'Authorization': userAuthHeader } })
      const userData = await userResponse.json()
      if (userData.errors) return { success: false, error: `Twitter API Error: ${userData.errors[0]?.message}` }

      const userId = userData.data.id
      const tweetsUrl = `${this.baseUrl}/users/${userId}/tweets?max_results=${maxResults}&tweet.fields=created_at,public_metrics`
      const tweetsAuthHeader = this.generateAuthHeader('GET', tweetsUrl, config)
      const tweetsResponse = await fetch(tweetsUrl, { headers: { 'Authorization': tweetsAuthHeader } })
      const tweetsData = await tweetsResponse.json()
      if (tweetsData.errors) return { success: false, error: `Twitter API Error: ${tweetsData.errors[0]?.message}` }
      return { success: true, data: tweetsData.data || [] }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch user tweets' }
    }
  }
}

export const twitterApiManager = new TwitterApiManager()
