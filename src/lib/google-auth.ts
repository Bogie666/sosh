// src/lib/google-auth.ts
import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'

export class GoogleBusinessService {
  private oauth2Client: OAuth2Client

  constructor(accessToken: string) {
    this.oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    )
    
    this.oauth2Client.setCredentials({
      access_token: accessToken
    })
  }

  async getAllLocations() {
    try {
      console.log('Fetching business locations...')
      
      // Get accounts first
      const accountsUrl = 'https://mybusinessaccountmanagement.googleapis.com/v1/accounts'
      const accountsResponse = await this.makeApiRequest(accountsUrl)
      
      let allLocations: any[] = []
      
      if (accountsResponse.accounts) {
        for (const account of accountsResponse.accounts) {
          const locationsResult = await this.getLocationsForAccount(account.name)
          if (locationsResult.success) {
            allLocations.push(...locationsResult.locations)
          }
        }
      }

      return {
        success: true,
        locations: allLocations.map(this.formatLocationForUI),
        totalCount: allLocations.length
      }
    } catch (error) {
      console.error('Error fetching locations:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch locations'
      }
    }
  }

  async getLocationsForAccount(accountName: string) {
    try {
      const readMask = 'name,title,storeCode,websiteUri,phoneNumbers'
      const url = `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=${readMask}`
      
      const response = await this.makeApiRequest(url)
      
      return {
        success: true,
        locations: response.locations || []
      }
    } catch (error) {
      console.error(`Error fetching locations for ${accountName}:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch locations'
      }
    }
  }

  async getAllReviews() {
    try {
      console.log('Fetching all reviews...')
      
      const locationsResult = await this.getAllLocations()
      if (!locationsResult.success) {
        throw new Error(locationsResult.error)
      }

      const locations = locationsResult.locations || []
      let allReviews: any[] = []

      for (const location of locations) {
        try {
          const reviewsResult = await this.getReviewsForLocation(location.accountId, location.locationId)
          if (reviewsResult.success && reviewsResult.reviews.length > 0) {
            const reviewsWithLocation = reviewsResult.reviews.map((review: any) => ({
              ...review,
              locationId: location.locationId,
              locationName: location.locationName,
              accountId: location.accountId
            }))
            allReviews.push(...reviewsWithLocation)
          }
        } catch (error) {
          console.error(`Error fetching reviews for ${location.locationName}:`, error)
        }
      }

      return {
        success: true,
        reviews: allReviews,
        totalCount: allReviews.length
      }
    } catch (error) {
      console.error('Error fetching all reviews:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch reviews'
      }
    }
  }

  async getReviewsForLocation(accountId: string, locationId: string) {
    try {
      const url = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/reviews`
      const response = await this.makeApiRequest(url)
      
      return {
        success: true,
        reviews: response.reviews || []
      }
    } catch (error) {
      console.error(`Error fetching reviews for location ${locationId}:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch reviews',
        reviews: []
      }
    }
  }

  async replyToReview(accountId: string, locationId: string, reviewName: string, replyText: string) {
    try {
      const url = `https://mybusiness.googleapis.com/v4/${reviewName}/reply`
      
      const response = await this.makeApiRequest(url, {
        method: 'PUT',
        body: JSON.stringify({
          comment: replyText
        })
      })

      return {
        success: true,
        reply: response
      }
    } catch (error) {
      console.error('Error replying to review:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reply to review'
      }
    }
  }

  async createPost(accountId: string, locationId: string, postData: any) {
    try {
      const url = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/localPosts`
      
      const response = await this.makeApiRequest(url, {
        method: 'POST',
        body: JSON.stringify(postData)
      })

      return {
        success: true,
        post: response
      }
    } catch (error) {
      console.error('Error creating post:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create post'
      }
    }
  }

  private async makeApiRequest(url: string, options: any = {}) {
    const accessToken = this.oauth2Client.credentials.access_token

    if (!accessToken) {
      throw new Error('No access token available')
    }

    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: options.body
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API request failed: ${response.status} ${errorText}`)
    }

    return await response.json()
  }

  private formatLocationForUI(location: any) {
    const locationId = location.name ? location.name.split('/').pop() : 'unknown'
    const accountId = location.accountName ? location.accountName.split('/')[1] : '102262219515631457064'
    
    return {
      locationId,
      accountId,
      locationName: location.title || location.locationName || 'Unnamed Location',
      address: this.formatAddress(location.storefrontAddress || location.address),
      phoneNumber: location.primaryPhone || location.phoneNumbers?.primaryPhone,
      websiteUrl: location.websiteUri || location.websiteUrl,
      accountName: location.accountName || location.accountDisplayName || 'Unknown Account',
      fullLocationName: location.name
    }
  }

  private formatAddress(address: any) {
    if (!address) return null
    
    const parts = []
    if (address.addressLines) parts.push(...address.addressLines)
    if (address.locality) parts.push(address.locality)
    if (address.administrativeArea) parts.push(address.administrativeArea)
    if (address.regionCode) parts.push(address.regionCode)
    
    return parts.join(', ')
  }
}

export function formatPostForGBP(content: string, postType: string) {
  const postData: any = {
    languageCode: 'en-US',
    summary: content,
    topicType: 'STANDARD'
  }
  
  switch (postType) {
    case 'event':
      postData.topicType = 'EVENT'
      break
    case 'offer':
      postData.topicType = 'OFFER'
      break
    case 'call-to-action':
      postData.callToAction = {
        actionType: 'LEARN_MORE',
        url: 'https://www.google.com'
      }
      break
  }
  
  return postData
}