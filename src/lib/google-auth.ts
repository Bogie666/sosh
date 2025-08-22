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
        locations: allLocations.map((location) => this.formatLocationForUI(location)),
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

  /**
   * Clean up temporary file from cloud storage
   */
  private async cleanupTempFile(fileName?: string): Promise<void> {
    if (!fileName) return
    
    try {
      console.log(`🗑️ Cleaning up temp file: ${fileName}`)
      
      const response = await fetch('/api/cleanup-temp-image', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fileName })
      })
      
      if (response.ok) {
        console.log(`✅ Temp file cleaned up: ${fileName}`)
      } else {
        console.warn(`⚠️ Failed to cleanup temp file: ${fileName}`)
      }
    } catch (error) {
      // Don't throw - cleanup failure shouldn't break the main flow
      console.warn('Cleanup error:', error)
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

  /**
   * Upload media to Google Business Profile using source URL approach
   */
  async uploadMedia(accountId: string, locationId: string, imageFile: File): Promise<any> {
    try {
      console.log(`🖼️ Uploading media to GBP for location: ${locationId}`)
      
      // First, upload image to cloud storage to get a public URL
      const cloudUploadResult = await this.uploadToCloudStorage(imageFile)
      
      if (!cloudUploadResult.success) {
        throw new Error(`Cloud storage upload failed: ${cloudUploadResult.error}`)
      }
      
      console.log(`📁 Image uploaded to cloud storage: ${cloudUploadResult.publicUrl}`)
      
      // Now create the media using the public URL
      const mediaData = {
        locationAssociation: {
          category: 'ADDITIONAL'  // Perfect for promotional posts
        },
        sourceUrl: cloudUploadResult.publicUrl,
        mediaFormat: 'PHOTO'
      }
      
      console.log(`📤 Sending media data to GBP:`, mediaData)
      
      const uploadUrl = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/media`
      
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.oauth2Client.credentials.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(mediaData)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Media upload failed: ${response.status} - ${errorText}`)
      }

      const result = await response.json()
      console.log(`✅ Media uploaded successfully to GBP:`, result)
      
      // Clean up temp file after successful upload
      await this.cleanupTempFile(cloudUploadResult.fileName)
      
      return {
        success: true,
        mediaName: result.name,
        googleUrl: result.googleUrl || cloudUploadResult.publicUrl,
        data: result
      }
    } catch (error) {
      console.error('Media upload error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload media'
      }
    }
  }

  /**
   * Helper method to upload image to cloud storage first
   */
  private async uploadToCloudStorage(imageFile: File): Promise<{success: boolean, publicUrl?: string, fileName?: string, error?: string}> {
    try {
      console.log(`☁️ Uploading ${imageFile.name} to cloud storage...`)
      
      // Import cloud storage directly instead of internal API call
      const { Storage } = await import('@google-cloud/storage')
      const { v4: uuidv4 } = await import('uuid')
      
      const storage = new Storage({
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
        credentials: process.env.GOOGLE_CLOUD_CREDENTIALS ? JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS) : undefined
      })
      
      const bucketName = process.env.GOOGLE_CLOUD_STORAGE_BUCKET || 'sosh-images'
      const bucket = storage.bucket(bucketName)
      
      // Generate unique filename
      const fileId = uuidv4()
      const extension = imageFile.name.split('.').pop() || 'jpg'
      const fileName = `temp/gbp/gbp-temp_${fileId}.${extension}`
      
      // Convert File to buffer
      const fileBuffer = Buffer.from(await imageFile.arrayBuffer())
      
      // Upload to cloud storage
      const cloudFile = bucket.file(fileName)
      await cloudFile.save(fileBuffer, {
        metadata: {
          contentType: imageFile.type || 'image/jpeg'
        },
        public: true // Critical: Make sure it's publicly accessible for GBP
      })
      
      // Generate public URL
      const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`
      
      console.log(`✅ Temp image uploaded directly: ${publicUrl}`)
      
      return {
        success: true,
        publicUrl: publicUrl,
        fileName: fileName
      }
      
    } catch (error) {
      console.error('Direct cloud upload error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Cloud upload failed'
      }
    }
  }

  /**
   * Create a post with optional media support
   */
  async createPost(accountId: string, locationId: string, postData: any, images?: File[]): Promise<any> {
    try {
      console.log(`📝 Creating GBP post for location: ${locationId}`)
      
      let mediaItems: any[] = []
      
      // Upload images if provided
      if (images && images.length > 0) {
        console.log(`📸 Uploading ${images.length} images to Google Business Profile...`)
        
        for (const image of images) {
          const mediaResult = await this.uploadMedia(accountId, locationId, image)
          
          if (mediaResult.success) {
            mediaItems.push({
              mediaFormat: 'PHOTO',
              sourceUrl: mediaResult.googleUrl
            })
            console.log(`✅ Added media to post: ${image.name}`)
          } else {
            console.error(`❌ Failed to upload media: ${image.name}`, mediaResult.error)
            // Continue with other images rather than failing completely
          }
        }
      }
      
      // Enhanced post data with media
      const enhancedPostData = {
        ...postData,
        media: mediaItems.length > 0 ? mediaItems : undefined
      }
      
      console.log('Creating post with data:', {
        ...enhancedPostData,
        media: enhancedPostData.media ? `${enhancedPostData.media.length} media items` : 'none'
      })
      
      // Create the post
      const url = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/localPosts`
      
      const response = await this.makeApiRequest(url, {
        method: 'POST',
        body: JSON.stringify(enhancedPostData)
      })

      return {
        success: true,
        post: response,
        hasImages: mediaItems.length > 0,
        mediaCount: mediaItems.length
      }
    } catch (error) {
      console.error('Error creating GBP post:', error)
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

// Enhanced formatPostForGBP function with media support
export function formatPostForGBP(content: string, postType: string, mediaItems?: any[]) {
  const postData: any = {
    languageCode: 'en-US',
    summary: content,
    topicType: 'STANDARD'
  }
  
  // Add media if provided
  if (mediaItems && mediaItems.length > 0) {
    postData.media = mediaItems
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