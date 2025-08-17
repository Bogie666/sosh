// src/lib/google-business-api-manager.ts
import { OAuth2Client } from 'google-auth-library'
import { BUSINESS_ACCOUNTS } from './business-account-mapping'

export interface GoogleBusinessLocation {
  name: string
  title: string
  storeCode?: string
  websiteUri?: string
  phoneNumbers?: any[]
  accountName: string
  accountDisplayName: string
  accountId: string
  locationId: string
}

export interface GoogleBusinessPost {
  topicType: 'STANDARD' | 'EVENT' | 'OFFER'
  languageCode: string
  summary: string
  callToAction?: {
    actionType: 'BOOK' | 'ORDER' | 'SHOP' | 'LEARN_MORE' | 'SIGN_UP' | 'CALL'
    url?: string
  }
  media?: {
    mediaFormat: 'PHOTO'
    sourceUrl: string
  }[]
  event?: {
    title: string
    schedule: {
      startDate: { year: number; month: number; day: number }
      startTime?: { hours: number; minutes: number }
      endDate: { year: number; month: number; day: number }
      endTime?: { hours: number; minutes: number }
    }
  }
  offer?: {
    couponCode?: string
    redeemOnlineUrl?: string
    termsConditions?: string
  }
}

export interface GoogleBusinessReview {
  name: string
  reviewer: {
    profilePhotoUrl: string
    displayName: string
    isAnonymous: boolean
  }
  starRating: number
  comment: string
  createTime: string
  updateTime: string
  reviewReply?: {
    comment: string
    updateTime: string
  }
}

export interface GoogleApiResponse {
  success: boolean
  data?: any
  error?: string
  locations?: GoogleBusinessLocation[]
  reviews?: GoogleBusinessReview[]
  postId?: string
}

class GoogleBusinessApiManager {
  private oauth2Client: OAuth2Client
  private baseUrl = 'https://mybusinessbusinessinformation.googleapis.com/v1'
  private postsUrl = 'https://mybusiness.googleapis.com/v4'
  private accountsUrl = 'https://mybusinessaccountmanagement.googleapis.com/v1'

  constructor() {
    this.oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    )
  }

  /**
   * Set access token for the OAuth2 client
   */
  setAccessToken(accessToken: string): void {
    this.oauth2Client.setCredentials({
      access_token: accessToken
    })
  }

  /**
   * Check if Google Business API is properly configured
   */
  isConfigured(): boolean {
    return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
  }

  /**
   * Make authenticated API request
   */
  private async makeApiRequest(url: string, options: any = {}): Promise<any> {
    const accessToken = this.oauth2Client.credentials.access_token
    
    if (!accessToken) {
      throw new Error('No access token available')
    }

    console.log(`Making Google API request to: ${url}`)

    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    })

    console.log(`Response status: ${response.status} ${response.statusText}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Google API request failed:`, {
        url,
        status: response.status,
        statusText: response.statusText,
        error: errorText
      })
      throw new Error(`Google API request failed: ${response.status} ${errorText}`)
    }

    const responseData = await response.json()
    return responseData
  }

  /**
   * Get all business accounts and locations
   */
  async getAllLocations(): Promise<GoogleApiResponse> {
    try {
      let allLocations: GoogleBusinessLocation[] = []

      // Step 1: Get business accounts
      let allAccounts: any[] = []
      
      try {
        // Get regular accounts
        const accountsResponse = await this.makeApiRequest(`${this.accountsUrl}/accounts`)
        if (accountsResponse.accounts) {
          allAccounts.push(...accountsResponse.accounts)
        }
      } catch (error) {
        console.log('Regular accounts API failed:', error)
      }
      
      try {
        // Get business groups
        const groupsResponse = await this.makeApiRequest(
          `${this.accountsUrl}/accounts?filter=type:BUSINESS_GROUP`
        )
        if (groupsResponse.accounts) {
          allAccounts.push(...groupsResponse.accounts)
        }
      } catch (error) {
        console.log('Business groups query failed:', error)
      }

      console.log(`Found ${allAccounts.length} accounts/groups`)

      // Step 2: Get locations for each account
      for (const account of allAccounts) {
        try {
          const accountName = account.name
          const readMask = 'name,title,storeCode,websiteUri,phoneNumbers'
          const locationsUrl = `${this.baseUrl}/${accountName}/locations?readMask=${readMask}`
          
          const locationsResponse = await this.makeApiRequest(locationsUrl)
          
          if (locationsResponse.locations && locationsResponse.locations.length > 0) {
            const locationsWithAccount = locationsResponse.locations.map((location: any) => ({
              ...location,
              accountName: accountName,
              accountDisplayName: account.accountName || account.name,
              accountId: accountName.split('/')[1],
              locationId: location.name ? location.name.split('/').pop() : 'unknown'
            }))
            
            allLocations.push(...locationsWithAccount)
          }
        } catch (locationError) {
          console.error(`Failed to get locations for ${account.name}:`, locationError)
        }
      }

      return {
        success: true,
        locations: allLocations,
        data: allLocations
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch locations'
      }
    }
  }

  /**
   * Get location details by location name
   */
  async getLocationDetails(locationName: string): Promise<GoogleApiResponse> {
    try {
      const readMask = 'name,title,storeCode,websiteUri,phoneNumbers,categories,latlng,openingHours,specialHours'
      const response = await this.makeApiRequest(
        `${this.baseUrl}/${locationName}?readMask=${readMask}`
      )

      return {
        success: true,
        data: response
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch location details'
      }
    }
  }

  /**
   * Get reviews for a location
   */
  async getLocationReviews(locationName: string): Promise<GoogleApiResponse> {
    try {
      const reviewsUrl = `${this.baseUrl}/${locationName}/reviews`
      const response = await this.makeApiRequest(reviewsUrl)

      const reviews = response.reviews?.map((review: any) => ({
        name: review.name,
        reviewer: review.reviewer,
        starRating: review.starRating,
        comment: review.comment,
        createTime: review.createTime,
        updateTime: review.updateTime,
        reviewReply: review.reviewReply
      })) || []

      return {
        success: true,
        reviews: reviews,
        data: { reviews, totalReviews: reviews.length }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch reviews'
      }
    }
  }

  /**
   * Reply to a review
   */
  async replyToReview(reviewName: string, replyText: string): Promise<GoogleApiResponse> {
    try {
      const replyUrl = `${this.baseUrl}/${reviewName}/reply`
      const response = await this.makeApiRequest(replyUrl, {
        method: 'PUT',
        body: {
          comment: replyText
        }
      })

      return {
        success: true,
        data: response
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reply to review'
      }
    }
  }

  /**
   * Create a Google Business Profile post
   */
  async createPost(accountId: string, locationId: string, post: GoogleBusinessPost): Promise<GoogleApiResponse> {
    try {
      // Use the correct endpoint format that matches your working reviews API
      const postsUrl = `${this.postsUrl}/accounts/${accountId}/locations/${locationId}/localPosts`
      console.log(`Creating post at: ${postsUrl}`)
      
      const response = await this.makeApiRequest(postsUrl, {
        method: 'POST',
        body: post
      })

      return {
        success: true,
        postId: response.name,
        data: response
      }
    } catch (error) {
      console.error('Error creating Google Business post:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create post'
      }
    }
  }

  /**
   * Create a standard post with text
   */
  async createStandardPost(accountId: string, locationId: string, content: string, callToActionUrl?: string): Promise<GoogleApiResponse> {
    const post: GoogleBusinessPost = {
      topicType: 'STANDARD',
      languageCode: 'en',
      summary: content
    }

    if (callToActionUrl) {
      post.callToAction = {
        actionType: 'LEARN_MORE',
        url: callToActionUrl
      }
    }

    return await this.createPost(accountId, locationId, post)
  }

  /**
   * Create an event post
 */
async createEventPost(
  accountId: string,
  locationId: string,
  content: string, 
  eventTitle: string,
  startDate: Date,
  endDate: Date
): Promise<GoogleApiResponse> {
  const post: GoogleBusinessPost = {
    topicType: 'EVENT',
    languageCode: 'en',
    summary: content,
    event: {
      title: eventTitle,
      schedule: {
        startDate: {
          year: startDate.getFullYear(),
          month: startDate.getMonth() + 1,
          day: startDate.getDate()
        },
        endDate: {
          year: endDate.getFullYear(),
          month: endDate.getMonth() + 1,
          day: endDate.getDate()
        }
      }
    }
  }

  return await this.createPost(accountId, locationId, post)
}
  /**
 * Create an offer post
 */
async createOfferPost(
  accountId: string,
  locationId: string,
  content: string, 
  couponCode?: string,
  redeemUrl?: string,
  terms?: string
): Promise<GoogleApiResponse> {
  const post: GoogleBusinessPost = {
    topicType: 'OFFER',
    languageCode: 'en',
    summary: content,
    offer: {
      couponCode,
      redeemOnlineUrl: redeemUrl,
      termsConditions: terms
    }
  }

  return await this.createPost(accountId, locationId, post)
}

/**
   * Get posts for a location
   */
  async getLocationPosts(accountId: string, locationId: string): Promise<GoogleApiResponse> {
    try {
      const postsUrl = `${this.postsUrl}/accounts/${accountId}/locations/${locationId}/localPosts`
      const response = await this.makeApiRequest(postsUrl)

      return {
        success: true,
        data: response.localPosts || []
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch posts'
      }
    }
  }

  /**
   * Delete a post
   */
  async deletePost(postName: string): Promise<GoogleApiResponse> {
    try {
      const response = await this.makeApiRequest(`${this.postsUrl}/${postName}`, {
        method: 'DELETE'
      })

      return {
        success: true,
        data: response
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete post'
      }
    }
  }

  /**
   * Get insights for a location
   */
  async getLocationInsights(accountId: string, locationId: string, startDate: Date, endDate: Date): Promise<GoogleApiResponse> {
    try {
      const locationName = `accounts/${accountId}/locations/${locationId}`
      const insights = await this.makeApiRequest(
        `${this.baseUrl}/${locationName}:reportInsights`,
        {
          method: 'POST',
          body: {
            locationNames: [locationName],
            basicRequest: {
              metricRequests: [
                { metric: 'ALL' }
              ],
              timeRange: {
                startTime: startDate.toISOString(),
                endTime: endDate.toISOString()
              }
            }
          }
        }
      )

      return {
        success: true,
        data: insights
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch insights'
      }
    }
  }

  /**
   * Get location by business name (helper method)
   */
  async getLocationByBusinessName(businessName: string): Promise<GoogleApiResponse> {
    try {
      const businessConfig = BUSINESS_ACCOUNTS[businessName]
      if (!businessConfig?.accounts?.google) {
        return {
          success: false,
          error: `Google Business configuration not found for: ${businessName}`
        }
      }

      const accountId = businessConfig.accounts.google.accountId
      const locationId = businessConfig.accounts.google.locationIds?.[0]
      
      if (!accountId || !locationId) {
        return {
          success: false,
          error: `Missing account ID or location ID for business: ${businessName}`
        }
      }

      // Return the IDs that can be used with other methods
      return {
        success: true,
        data: {
          accountId,
          locationId,
          businessName,
          locationName: `accounts/${accountId}/locations/${locationId}`
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get location by business name'
      }
    }
  }
}

export const googleBusinessApiManager = new GoogleBusinessApiManager()