// src/lib/google-service-account.ts
import { google } from 'googleapis'
import { JWT } from 'google-auth-library'
import { getGoogleCredentials } from './google-credentials'

export class GoogleServiceAccountService {
  private jwtClient: JWT

  constructor() {
    const serviceAccountKey = getGoogleCredentials()
    
    if (!serviceAccountKey) {
      throw new Error('Google Service Account credentials not configured or invalid')
    }
    
    if (!serviceAccountKey.client_email || !serviceAccountKey.private_key) {
      throw new Error('Google Service Account credentials missing required fields')
    }
    
    this.jwtClient = new JWT({
      email: serviceAccountKey.client_email,
      key: serviceAccountKey.private_key,
      scopes: [
        'https://www.googleapis.com/auth/business.manage',
        'https://www.googleapis.com/auth/cloud-platform'
      ]
      // No subject needed since your existing service account already works
    })
  }

  /**
   * Get authenticated access token
   */
  async getAccessToken(): Promise<string> {
    try {
      const { token } = await this.jwtClient.getAccessToken()
      if (!token) {
        throw new Error('Failed to get access token from service account')
      }
      return token
    } catch (error) {
      console.error('Service account authentication failed:', error)
      throw new Error(`Service account auth failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Make authenticated API request
   */
  async makeApiRequest(url: string, options: any = {}): Promise<any> {
    try {
      const accessToken = await this.getAccessToken()
      
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          ...options.headers
        },
        body: options.body ? JSON.stringify(options.body) : undefined
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Google API request failed:`, {
          url,
          status: response.status,
          error: errorText
        })
        throw new Error(`Google API request failed: ${response.status} ${errorText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('API request error:', error)
      throw error
    }
  }

  /**
   * Get all business locations using service account
   */
  async getAllLocations(): Promise<{ success: boolean; locations?: any[]; error?: string }> {
    try {
      console.log('🔍 Service Account - Fetching business locations...')
      
      // Get accounts
      const accountsResponse = await this.makeApiRequest(
        'https://mybusinessaccountmanagement.googleapis.com/v1/accounts'
      )
      
      let allLocations: any[] = []
      
      if (accountsResponse.accounts) {
        for (const account of accountsResponse.accounts) {
          try {
            const locationsResponse = await this.makeApiRequest(
              `https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations?readMask=name,title,storeCode,websiteUri,phoneNumbers`
            )
            
            if (locationsResponse.locations) {
              const locationsWithAccount = locationsResponse.locations.map((location: any) => ({
                ...location,
                accountName: account.name,
                accountId: account.name.split('/')[1],
                locationId: location.name ? location.name.split('/').pop() : 'unknown'
              }))
              allLocations.push(...locationsWithAccount)
            }
          } catch (locationError) {
            console.error(`Failed to get locations for ${account.name}:`, locationError)
          }
        }
      }

      console.log(`✅ Service Account - Found ${allLocations.length} locations`)
      
      return {
        success: true,
        locations: allLocations
      }
    } catch (error) {
      console.error('❌ Service Account - Location fetch failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch locations'
      }
    }
  }

  /**
   * Create a Google Business Profile post using service account
   */
  async createPost(accountId: string, locationId: string, content: string, imageUrl?: string): Promise<{ success: boolean; postId?: string; error?: string }> {
    try {
      console.log(`📝 Service Account - Creating post for location ${locationId}`)
      
      const postData: any = {
        languageCode: 'en-US',
        summary: content,
        topicType: 'STANDARD'
      }

      // Add image if provided
      if (imageUrl) {
        postData.media = [{
          mediaFormat: 'PHOTO',
          sourceUrl: imageUrl
        }]
      }

      const response = await this.makeApiRequest(
        `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/localPosts`,
        {
          method: 'POST',
          body: postData
        }
      )

      console.log(`✅ Service Account - Post created successfully: ${response.name}`)
      
      return {
        success: true,
        postId: response.name
      }
    } catch (error) {
      console.error('❌ Service Account - Post creation failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create post'
      }
    }
  }

  /**
   * Get reviews using service account
   */
  async getAllReviews(): Promise<{ success: boolean; reviews?: any[]; error?: string }> {
    try {
      console.log('📖 Service Account - Fetching all reviews...')
      
      const locationsResult = await this.getAllLocations()
      if (!locationsResult.success || !locationsResult.locations) {
        throw new Error(locationsResult.error || 'No locations found')
      }

      let allReviews: any[] = []

      for (const location of locationsResult.locations) {
        try {
          const reviewsResponse = await this.makeApiRequest(
            `https://mybusiness.googleapis.com/v4/${location.name}/reviews`
          )

          if (reviewsResponse.reviews) {
            const reviewsWithLocation = reviewsResponse.reviews.map((review: any) => ({
              ...review,
              locationId: location.locationId,
              locationName: location.title || location.storeCode,
              accountId: location.accountId
            }))
            allReviews.push(...reviewsWithLocation)
          }
        } catch (reviewError) {
          console.error(`Failed to get reviews for ${location.title}:`, reviewError)
        }
      }

      console.log(`✅ Service Account - Found ${allReviews.length} reviews`)
      
      return {
        success: true,
        reviews: allReviews
      }
    } catch (error) {
      console.error('❌ Service Account - Reviews fetch failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch reviews'
      }
    }
  }

  /**
   * Reply to a review using service account
   */
  async replyToReview(reviewName: string, replyText: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`💬 Service Account - Replying to review: ${reviewName}`)
      
      await this.makeApiRequest(
        `https://mybusiness.googleapis.com/v4/${reviewName}/reply`,
        {
          method: 'PUT',
          body: {
            comment: replyText
          }
        }
      )

      console.log(`✅ Service Account - Review reply posted successfully`)
      
      return { success: true }
    } catch (error) {
      console.error('❌ Service Account - Review reply failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reply to review'
      }
    }
  }
}

// Create a singleton instance, but handle initialization errors gracefully
let googleServiceAccountInstance: GoogleServiceAccountService | null = null

try {
  googleServiceAccountInstance = new GoogleServiceAccountService()
} catch (error) {
  console.warn('Google Service Account not configured:', error)
  // Service will be null if not configured properly
}

export const googleServiceAccount = googleServiceAccountInstance as GoogleServiceAccountService