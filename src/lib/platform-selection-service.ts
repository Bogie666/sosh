// src/lib/platform-selection-service.ts
import { BUSINESS_ACCOUNTS, getBusinessAccountConfig, isBusinessPlatformReady, getConfiguredPlatforms } from './business-account-mapping'

export interface PlatformSelectionState {
  selectedBusinesses: string[]
  selectedPlatforms: string[]
  availableCombinations: Array<{
    businessId: string
    platformId: string
    isReady: boolean
    reason?: string
  }>
}

export class PlatformSelectionService {
  
  /**
   * Validates which business-platform combinations are available
   */
  public validateSelections(businessIds: string[], platformIds: string[]): PlatformSelectionState {
    const availableCombinations: Array<{
      businessId: string
      platformId: string
      isReady: boolean
      reason?: string
    }> = []

    for (const businessId of businessIds) {
      for (const platformId of platformIds) {
        const isReady = isBusinessPlatformReady(businessId, platformId)
        const combination = {
          businessId,
          platformId,
          isReady,
          reason: isReady ? undefined : this.getUnavailableReason(businessId, platformId)
        }
        availableCombinations.push(combination)
      }
    }

    return {
      selectedBusinesses: businessIds,
      selectedPlatforms: platformIds,
      availableCombinations
    }
  }

  /**
   * Get reason why a business-platform combination is not available
   */
  private getUnavailableReason(businessId: string, platformId: string): string {
    try {
      const { business, accountConfig } = getBusinessAccountConfig(businessId, platformId)
      
      switch (platformId) {
        case 'google':
          if (!(accountConfig as any).accountId) return 'Google Business Profile account not configured'
          if (!(accountConfig as any).locationIds?.length) return 'No GMB locations found'
          break
        case 'facebook':
          const fbConfig = accountConfig as any
          if (!fbConfig.pageUrl && !fbConfig.pageId) return `Facebook page not configured for ${business.displayName}`
          if (!fbConfig.accessToken) return 'Meta API access token not configured'
          break
        case 'instagram':
          const igConfig = accountConfig as any
          if (!igConfig.pageUrl && !igConfig.pageId) return `Instagram account not configured for ${business.displayName}`
          if (!igConfig.accessToken) return 'Meta API access token not configured'
          break
        case 'twitter':
          const twitterConfig = accountConfig as any
          if (!twitterConfig.clientId) return `X/Twitter API credentials not configured for ${business.displayName}`
          if (!twitterConfig.clientSecret) return `X/Twitter API secret not configured for ${business.displayName}`
          if (businessId === 'lyons' && !twitterConfig.accessToken) {
            return 'Lyons X/Twitter tokens not yet configured (coming soon)'
          }
          break
      }
    } catch (error) {
      return `Configuration error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
    
    return 'Platform not configured'
  }

  /**
   * Get posting targets for selected businesses and platforms
   */
  public getPostingTargets(businessIds: string[], platformIds: string[]) {
    const targets: Array<{
      businessId: string
      businessName: string
      platformId: string
      platformName: string
      accountConfig: any
      isReady: boolean
      targetInfo: any
    }> = []

    for (const businessId of businessIds) {
      const business = BUSINESS_ACCOUNTS[businessId]
      if (!business) continue

      for (const platformId of platformIds) {
        const isReady = isBusinessPlatformReady(businessId, platformId)
        
        if (isReady) {
          const { accountConfig } = getBusinessAccountConfig(businessId, platformId)
          
          let targetInfo = {}
          switch (platformId) {
            case 'google':
              targetInfo = {
                accountId: (accountConfig as any).accountId,
                locationIds: (accountConfig as any).locationIds,
                locationNames: (accountConfig as any).locationNames
              }
              break
            case 'facebook':
              targetInfo = {
                pageId: (accountConfig as any).pageId,
                accessToken: (accountConfig as any).accessToken
              }
              break
            case 'instagram':
              targetInfo = {
                pageId: (accountConfig as any).pageId,
                accessToken: (accountConfig as any).accessToken
              }
              break
            case 'twitter':
              targetInfo = {
                clientId: (accountConfig as any).clientId,
                clientSecret: (accountConfig as any).clientSecret,
                accessToken: (accountConfig as any).accessToken,
                accessTokenSecret: (accountConfig as any).accessTokenSecret,
                bearerToken: (accountConfig as any).bearerToken
              }
              break
          }

          targets.push({
            businessId,
            businessName: business.displayName,
            platformId,
            platformName: this.getPlatformDisplayName(platformId),
            accountConfig,
            isReady,
            targetInfo
          })
        }
      }
    }

    return targets
  }

  /**
   * Get platform display name with icon
   */
  private getPlatformDisplayName(platformId: string): string {
    const platformNames = {
      'google': '🏢 Google Business Profile',
      'facebook': '📘 Facebook',
      'instagram': '📷 Instagram',
      'twitter': '🐦 X/Twitter'
    }
    return platformNames[platformId as keyof typeof platformNames] || platformId
  }

  /**
   * Get available platforms for a specific business
   */
  public getAvailablePlatformsForBusiness(businessId: string): Array<{
    id: string
    name: string
    icon: string
    isReady: boolean
    reason?: string
  }> {
    const platforms = [
      { id: 'google', name: 'Google Business Profile', icon: '🏢' },
      { id: 'facebook', name: 'Facebook', icon: '📘' },
      { id: 'instagram', name: 'Instagram', icon: '📷' },
      { id: 'twitter', name: 'X/Twitter', icon: '🐦' }
    ]

    return platforms.map(platform => ({
      ...platform,
      isReady: isBusinessPlatformReady(businessId, platform.id),
      reason: isBusinessPlatformReady(businessId, platform.id) 
        ? undefined 
        : this.getUnavailableReason(businessId, platform.id)
    }))
  }
}

export const platformSelectionService = new PlatformSelectionService()