// src/lib/twitter-api-manager.ts
import { BUSINESS_ACCOUNTS } from './business-account-mapping'
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

export interface TwitterMediaUploadResponse {
  media_id: string
  media_id_string: string
  size: number
  expires_after_secs: number
  image?: {
    image_type: string
    w: number
    h: number
  }
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
  
  constructor() {}

  /**
   * Get Twitter OAuth 1.0a configuration for a business
   */
  private getOAuth1Config(businessName: string): OAuth1Config | null {
    // Map business names to environment variables
    const envMap: Record<string, OAuth1Config> = {
      'lex-dallas': {
        consumerKey: process.env.LEX_X_CONSUMER_KEY || '',
        consumerSecret: process.env.LEX_X_CONSUMER_SECRET || '',
        accessToken: process.env.LEX_X_ACCESS_TOKEN || '',
        accessTokenSecret: process.env.LEX_X_ACCESS_TOKEN_SECRET || ''
      },
      'lex': {
        consumerKey: process.env.LEX_X_CONSUMER_KEY || '',
        consumerSecret: process.env.LEX_X_CONSUMER_SECRET || '',
        accessToken: process.env.LEX_X_ACCESS_TOKEN || '',
        accessTokenSecret: process.env.LEX_X_ACCESS_TOKEN_SECRET || ''
      },
      'lyons': {
        consumerKey: process.env.LYONS_X_CONSUMER_KEY || '',
        consumerSecret: process.env.LYONS_X_CONSUMER_SECRET || '',
        accessToken: process.env.LYONS_X_ACCESS_TOKEN || '',
        accessTokenSecret: process.env.LYONS_X_ACCESS_TOKEN_SECRET || ''
      },
      'ks': {
        consumerKey: process.env.KS_X_CONSUMER_KEY || '',
        consumerSecret: process.env.KS_X_CONSUMER_SECRET || '',
        accessToken: process.env.KS_X_ACCESS_TOKEN || '',
        accessTokenSecret: process.env.KS_X_ACCESS_TOKEN_SECRET || ''
      }
    }

    return envMap[businessName] || null
  }

  /**
   * Get Twitter configuration for a business (legacy OAuth 2.0 - for reading only)
   */
  private getBusinessConfig(businessName: string) {
    const businessConfig = BUSINESS_ACCOUNTS[businessName]
    return businessConfig?.accounts?.twitter
  }

  /**
   * Check if Twitter API is properly configured for a business
   */
  isConfigured(businessName: string): boolean {
    const oauth1Config = this.getOAuth1Config(businessName)
    return !!(oauth1Config?.consumerKey && oauth1Config?.consumerSecret && 
              oauth1Config?.accessToken && oauth1Config?.accessTokenSecret)
  }

  /**
   * Generate OAuth 1.0a signature
   */
  private generateOAuth1Signature(
    method: string,
    url: string,
    params: Record<string, string>,
    consumerSecret: string,
    tokenSecret: string
  ): string {
    // Sort parameters
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${this.percentEncode(key)}=${this.percentEncode(params[key])}`)
      .join('&')

    // Create signature base string
    const signatureBaseString = [
      method.toUpperCase(),
      this.percentEncode(url),
      this.percentEncode(sortedParams)
    ].join('&')

    // Create signing key
    const signingKey = `${this.percentEncode(consumerSecret)}&${this.percentEncode(tokenSecret)}`

    // Generate signature
    const signature = crypto
      .createHmac('sha1', signingKey)
      .update(signatureBaseString)
      .digest('base64')

    return signature
  }

  /**
   * Percent encode for OAuth
   */
  private percentEncode(str: string): string {
    return encodeURIComponent(str)
      .replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
  }

  /**
   * Generate OAuth 1.0a authorization header
   */
  private generateAuthHeader(
    method: string,
    url: string,
    config: OAuth1Config,
    additionalParams: Record<string, string> = {}
  ): string {
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

    const signature = this.generateOAuth1Signature(
      method,
      url,
      oauthParams,
      config.consumerSecret,
      config.accessTokenSecret
    )

    oauthParams.oauth_signature = signature

    const authString = Object.keys(oauthParams)
      .map(key => `${this.percentEncode(key)}="${this.percentEncode(oauthParams[key])}"`)
      .join(', ')

    return `OAuth ${authString}`
  }

  /**
   * Test the Twitter API connection
   */
  async testConnection(businessName: string): Promise<TwitterApiResponse> {
    try {
      const oauth1Config = this.getOAuth1Config(businessName)
      if (!oauth1Config) {
        return {
          success: false,
          error: 'Twitter OAuth 1.0a credentials not configured'
        }
      }

      const url = `${this.baseUrl}/users/me`
      const authHeader = this.generateAuthHeader('GET', url, oauth1Config)

      const response = await fetch(url, {
        headers: {
          'Authorization': authHeader
        }
      })

      const data = await response.json()

      if (data.errors) {
        return {
          success: false,
          error: `Twitter API Error: ${data.errors[0]?.message || 'Unknown error'}`
        }
      }

      return {
        success: true,
        data: {
          user: data.data
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown Twitter API error'
      }
    }
  }

  /**
   * Post a tweet using OAuth 1.0a
   */
  async postTweet(businessName: string, content: string, options: TwitterPostOptions = {}): Promise<TwitterApiResponse> {
    try {
      console.log(`🐦 Posting tweet for ${businessName}...`)
      
      const oauth1Config = this.getOAuth1Config(businessName)
      if (!oauth1Config) {
        console.error(`❌ OAuth 1.0a credentials not found for ${businessName}`)
        return {
          success: false,
          error: `Twitter OAuth 1.0a credentials not configured for business: ${businessName}`
        }
      }

      // Check content length (Twitter limit is 280 characters)
      if (content.length > 280) {
        return {
          success: false,
          error: `Tweet content exceeds 280 character limit (${content.length} characters)`
        }
      }

      const url = `${this.baseUrl}/tweets`
      const authHeader = this.generateAuthHeader('POST', url, oauth1Config)

      const tweetData: any = {
        text: content
      }

      // Add optional parameters
      if (options.reply_settings) {
        tweetData.reply_settings = options.reply_settings
      }

      if (options.media_ids && options.media_ids.length > 0) {
        tweetData.media = {
          media_ids: options.media_ids
        }
      }

      if (options.poll_options && options.poll_options.length > 0) {
        tweetData.poll = {
          options: options.poll_options,
          duration_minutes: options.poll_duration_minutes || 1440 // 24 hours default
        }
      }

      if (options.geo_place_id) {
        tweetData.geo = {
          place_id: options.geo_place_id
        }
      }

      console.log(`📝 Tweet content: ${content.substring(0, 50)}...`)
      console.log(`🔐 Using OAuth 1.0a authentication`)

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(tweetData)
      })

      console.log(`📡 Twitter API response status: ${response.status}`)

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`❌ Twitter API error: ${response.status} ${errorText}`)
        return {
          success: false,
          error: `Twitter API Error: ${response.status} ${errorText}`
        }
      }

      const data = await response.json()
      console.log(`📊 Twitter API response:`, data)

      if (data.errors) {
        console.error(`❌ Twitter API errors:`, data.errors)
        return {
          success: false,
          error: `Twitter Post Error: ${data.errors[0]?.message || 'Unknown error'}`
        }
      }

      if (data.data?.id) {
        console.log(`✅ Tweet posted successfully! ID: ${data.data.id}`)
        return {
          success: true,
          tweetId: data.data.id,
          data: data.data
        }
      } else {
        console.error(`❌ No tweet ID in response:`, data)
        return {
          success: false,
          error: 'Tweet posted but no ID returned'
        }
      }
    } catch (error) {
      console.error(`💥 Tweet posting failed for ${businessName}:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to post tweet'
      }
    }
  }

  /**
   * Generate OAuth 2.0 authorization URL (keeping for backwards compatibility)
   */
  getAuthorizationUrl(businessName: string, redirectUri: string, state?: string): string {
    const config = this.getBusinessConfig(businessName)
    if (!config?.clientId) {
      throw new Error(`Twitter configuration not found for business: ${businessName}`)
    }

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.clientId,
      redirect_uri: redirectUri,
      scope: 'tweet.read tweet.write users.read offline.access',
      state: state || '',
      code_challenge: 'challenge',
      code_challenge_method: 'plain'
    })

    return `https://twitter.com/i/oauth2/authorize?${params.toString()}`
  }

  /**
   * Exchange authorization code for access token (OAuth 2.0 - keeping for backwards compatibility)
   */
  async exchangeCodeForToken(businessName: string, code: string, redirectUri: string): Promise<TwitterApiResponse> {
    try {
      const config = this.getBusinessConfig(businessName)
      if (!config) {
        return {
          success: false,
          error: `Twitter configuration not found for business: ${businessName}`
        }
      }

      const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')

      const response = await fetch('https://api.twitter.com/2/oauth2/token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
          code_verifier: 'challenge'
        })
      })

      const data = await response.json()

      if (data.error) {
        return {
          success: false,
          error: `Twitter OAuth Error: ${data.error_description || data.error}`
        }
      }

      return {
        success: true,
        data: {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_in: data.expires_in,
          token_type: data.token_type
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to exchange code for token'
      }
    }
  }

  // Keep other methods unchanged for backwards compatibility
  async uploadMedia(businessName: string, mediaData: Buffer, mediaType: string): Promise<TwitterApiResponse> {
    try {
      const oauth1Config = this.getOAuth1Config(businessName)
      if (!oauth1Config) {
        return {
          success: false,
          error: `Twitter OAuth 1.0a credentials not configured for business: ${businessName}`
        }
      }

      // Twitter media upload still uses v1.1 with OAuth 1.0a
      const initUrl = `${this.uploadUrl}/media/upload.json`
      const authHeader = this.generateAuthHeader('POST', initUrl, oauth1Config, {
        command: 'INIT',
        total_bytes: mediaData.length.toString(),
        media_type: mediaType,
        media_category: 'tweet_image'
      })

      // Initialize upload
      const initResponse = await fetch(initUrl, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          command: 'INIT',
          total_bytes: mediaData.length.toString(),
          media_type: mediaType,
          media_category: 'tweet_image'
        })
      })

      const initData = await initResponse.json()

      if (initData.errors) {
        return {
          success: false,
          error: `Twitter Media Init Error: ${initData.errors[0]?.message}`
        }
      }

      const mediaId = initData.media_id_string

      // Upload media data
      const uploadAuthHeader = this.generateAuthHeader('POST', initUrl, oauth1Config, {
        command: 'APPEND',
        media_id: mediaId,
        segment_index: '0'
      })

      const uploadResponse = await fetch(initUrl, {
        method: 'POST',
        headers: {
          'Authorization': uploadAuthHeader,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          command: 'APPEND',
          media_id: mediaId,
          segment_index: '0',
          media: mediaData.toString('base64')
        })
      })

      // Finalize upload
      const finalizeAuthHeader = this.generateAuthHeader('POST', initUrl, oauth1Config, {
        command: 'FINALIZE',
        media_id: mediaId
      })

      const finalizeResponse = await fetch(initUrl, {
        method: 'POST',
        headers: {
          'Authorization': finalizeAuthHeader,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          command: 'FINALIZE',
          media_id: mediaId
        })
      })

      const finalizeData = await finalizeResponse.json()

      if (finalizeData.errors) {
        return {
          success: false,
          error: `Twitter Media Finalize Error: ${finalizeData.errors[0]?.message}`
        }
      }

      return {
        success: true,
        data: {
          media_id: mediaId,
          media_id_string: mediaId,
          size: mediaData.length,
          expires_after_secs: finalizeData.expires_after_secs
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload media'
      }
    }
  }

  async getTweet(businessName: string, tweetId: string): Promise<TwitterApiResponse> {
    try {
      const oauth1Config = this.getOAuth1Config(businessName)
      if (!oauth1Config) {
        return {
          success: false,
          error: 'Twitter OAuth 1.0a credentials not configured'
        }
      }

      const url = `${this.baseUrl}/tweets/${tweetId}?expansions=author_id&tweet.fields=created_at,public_metrics,context_annotations`
      const authHeader = this.generateAuthHeader('GET', url, oauth1Config)

      const response = await fetch(url, {
        headers: {
          'Authorization': authHeader
        }
      })

      const data = await response.json()

      if (data.errors) {
        return {
          success: false,
          error: `Twitter API Error: ${data.errors[0]?.message || 'Unknown error'}`
        }
      }

      return {
        success: true,
        data: data
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch tweet'
      }
    }
  }

  async deleteTweet(businessName: string, tweetId: string): Promise<TwitterApiResponse> {
    try {
      const oauth1Config = this.getOAuth1Config(businessName)
      if (!oauth1Config) {
        return {
          success: false,
          error: `Twitter OAuth 1.0a credentials not configured for business: ${businessName}`
        }
      }

      const url = `${this.baseUrl}/tweets/${tweetId}`
      const authHeader = this.generateAuthHeader('DELETE', url, oauth1Config)

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': authHeader
        }
      })

      const data = await response.json()

      if (data.errors) {
        return {
          success: false,
          error: `Twitter Delete Error: ${data.errors[0]?.message || 'Unknown error'}`
        }
      }

      return {
        success: true,
        data: data.data
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete tweet'
      }
    }
  }

  async getUserTweets(businessName: string, maxResults: number = 10): Promise<TwitterApiResponse> {
    try {
      const oauth1Config = this.getOAuth1Config(businessName)
      if (!oauth1Config) {
        return {
          success: false,
          error: 'Twitter OAuth 1.0a credentials not configured'
        }
      }

      // First get user ID
      const userUrl = `${this.baseUrl}/users/me`
      const userAuthHeader = this.generateAuthHeader('GET', userUrl, oauth1Config)

      const userResponse = await fetch(userUrl, {
        headers: {
          'Authorization': userAuthHeader
        }
      })

      const userData = await userResponse.json()

      if (userData.errors) {
        return {
          success: false,
          error: `Twitter API Error: ${userData.errors[0]?.message}`
        }
      }

      const userId = userData.data.id

      // Get user's tweets
      const tweetsUrl = `${this.baseUrl}/users/${userId}/tweets?max_results=${maxResults}&tweet.fields=created_at,public_metrics`
      const tweetsAuthHeader = this.generateAuthHeader('GET', tweetsUrl, oauth1Config)

      const tweetsResponse = await fetch(tweetsUrl, {
        headers: {
          'Authorization': tweetsAuthHeader
        }
      })

      const tweetsData = await tweetsResponse.json()

      if (tweetsData.errors) {
        return {
          success: false,
          error: `Twitter API Error: ${tweetsData.errors[0]?.message}`
        }
      }

      return {
        success: true,
        data: tweetsData.data || []
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch user tweets'
      }
    }
  }
}

export const twitterApiManager = new TwitterApiManager()