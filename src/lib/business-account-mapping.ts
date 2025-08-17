// src/lib/business-account-mapping.ts

// First, let's add the AI service here since we need it for the enhanced system
export interface BusinessAccountConfig {
  id: string
  name: string
  displayName: string
  color: string
  accounts: {
    google?: {
      accountId?: string
      locationIds?: string[]
      locationNames?: string[]
    }
    facebook?: {
      pageId?: string
      accessToken?: string
      pageUrl?: string
    }
    instagram?: {
      pageId?: string
      accessToken?: string
      pageUrl?: string
    }
    twitter?: {
      clientId?: string
      clientSecret?: string
      accessToken?: string
      accessTokenSecret?: string
      bearerToken?: string
      handle?: string
      profileUrl?: string
    }
  }
}

export const BUSINESS_ACCOUNTS: Record<string, BusinessAccountConfig> = {
  'lex-dallas': {
    id: 'lex-dallas',
    name: 'lex',
    displayName: 'Lex Dallas',
    color: 'text-blue-400',
    accounts: {
      google: {
        accountId: '102262219515631457064', // From your API data
        locationIds: [
          '2211062401809147654', // Lex Air Conditioning
          '1466833791482001835', // Lex Dallas location
          '7533141434923241855', // Additional Dallas location
          '2476909653678359873'  // Additional Dallas location
        ],
        locationNames: [
          'Lex Air Conditioning',
          'Lex - Air Conditioning, Heating, Plumbing, Electrical (Dallas)',
          'Lex - Air Conditioning, Heating, Plumbing, Electrical (Dallas)',
          'Lex - Air Conditioning, Heating, Plumbing, Electrical (Dallas)'
        ]
      },
      facebook: {
        // Facebook: www.facebook.com/LexAirConditioning
        pageId: 'LexAirConditioning', // Extract from URL or get via API
        accessToken: process.env.META_ACCESS_TOKEN || '',
        pageUrl: 'www.facebook.com/LexAirConditioning'
      },
      instagram: {
        // Instagram: www.instagram.com/lex_air_conditioning
        pageId: 'lex_air_conditioning', // Extract from URL or get via API
        accessToken: process.env.META_ACCESS_TOKEN || '',
        pageUrl: 'www.instagram.com/lex_air_conditioning'
      },
      twitter: {
        // X/Twitter: x.com/lexairandheat (Already configured)
        clientId: process.env.LEX_X_CLIENT_ID || '',
        clientSecret: process.env.LEX_X_CLIENT_SECRET || '',
        accessToken: process.env.LEX_X_ACCESS_TOKEN || '',
        accessTokenSecret: process.env.LEX_X_ACCESS_TOKEN_SECRET || '',
        bearerToken: process.env.LEX_X_BEARER_TOKEN || '',
        handle: 'lexairandheat',
        profileUrl: 'x.com/lexairandheat'
      }
    }
  },
  
  'lex-etx': {
    id: 'lex-etx',
    name: 'lex-etx',
    displayName: 'Lex ETX',
    color: 'text-green-400',
    accounts: {
      google: {
        accountId: '102262219515631457064',
        locationIds: [
          '7913826327010230630' // Lex ETX Tyler location
        ],
        locationNames: ['Lex - Air Conditioning, Heating, Plumbing, Electrical (ETX)']
      },
      facebook: {
        // Facebook: www.facebook.com/lexetxtyler
        pageId: 'lexetxtyler', // Extract from URL or get via API
        accessToken: process.env.META_ACCESS_TOKEN || '',
        pageUrl: 'www.facebook.com/lexetxtyler'
      },
      instagram: {
        // ETX may not have separate Instagram, using Dallas Instagram for now
        pageId: 'lex_air_conditioning', // Shared with Dallas
        accessToken: process.env.META_ACCESS_TOKEN || '',
        pageUrl: 'www.instagram.com/lex_air_conditioning'
      },
      twitter: {
        // ETX may not have separate Twitter, using Dallas Twitter for now
        clientId: process.env.LEX_X_CLIENT_ID || '',
        clientSecret: process.env.LEX_X_CLIENT_SECRET || '',
        accessToken: process.env.LEX_X_ACCESS_TOKEN || '',
        accessTokenSecret: process.env.LEX_X_ACCESS_TOKEN_SECRET || '',
        bearerToken: process.env.LEX_X_BEARER_TOKEN || '',
        handle: 'lexairandheat', // Shared with Dallas
        profileUrl: 'x.com/lexairandheat'
      }
    }
  },
  
  'lyons': {
    id: 'lyons',
    name: 'lyons',
    displayName: 'Lyons',
    color: 'text-purple-400',
    accounts: {
      google: {
        accountId: '104110704176658195109',
        locationIds: ['379116535546276113'],
        locationNames: ['Lyons Air Conditioning and Heating']
      },
      facebook: {
        // Facebook: www.facebook.com/LyonsAir
        pageId: 'LyonsAir', // Extract from URL or get via API
        accessToken: process.env.META_ACCESS_TOKEN || '', // Uses shared Meta API
        pageUrl: 'www.facebook.com/LyonsAir'
      },
      instagram: {
        // Instagram: www.instagram.com/lyonsair_
        pageId: 'lyonsair_', // Extract from URL or get via API
        accessToken: process.env.META_ACCESS_TOKEN || '', // Uses shared Meta API
        pageUrl: 'www.instagram.com/lyonsair_'
      },
      twitter: {
        // X/Twitter: x.com/lyonsair (Will be configured later)
        clientId: process.env.LYONS_X_API_KEY || '',
        clientSecret: process.env.LYONS_X_API_SECRET || '',
        accessToken: process.env.LYONS_X_ACCESS_TOKEN || '',
        accessTokenSecret: process.env.LYONS_X_ACCESS_TOKEN_SECRET || '',
        bearerToken: process.env.LYONS_X_BEARER_TOKEN || '',
        handle: 'lyonsair',
        profileUrl: 'x.com/lyonsair'
      }
    }
  }
}

// Helper function to get account config for a business and platform
export function getBusinessAccountConfig(businessId: string, platform: string) {
  const business = BUSINESS_ACCOUNTS[businessId]
  if (!business) {
    throw new Error(`Business ${businessId} not found`)
  }
  
  const accountConfig = business.accounts[platform as keyof typeof business.accounts]
  if (!accountConfig) {
    throw new Error(`Platform ${platform} not configured for business ${businessId}`)
  }
  
  return {
    business,
    accountConfig
  }
}

// Helper function to validate if a business-platform combination is ready
export function isBusinessPlatformReady(businessId: string, platform: string): boolean {
  try {
    const { accountConfig } = getBusinessAccountConfig(businessId, platform)
    
    switch (platform) {
      case 'google':
        return !!(accountConfig as any).accountId && !!(accountConfig as any).locationIds?.length
      case 'facebook':
        // For Facebook, we need either a pageId or pageUrl, plus access token
        const fbConfig = accountConfig as any
        return (fbConfig.pageId || fbConfig.pageUrl) && fbConfig.accessToken
      case 'instagram':
        // For Instagram, we need either a pageId or pageUrl, plus access token
        const igConfig = accountConfig as any
        return (igConfig.pageId || igConfig.pageUrl) && igConfig.accessToken
      case 'twitter':
        // For Twitter, we need at least clientId and clientSecret (OAuth 2.0 minimum)
        const twitterConfig = accountConfig as any
        return twitterConfig.clientId && twitterConfig.clientSecret
      default:
        return false
    }
  } catch {
    return false
  }
}

// Helper to get all configured platforms for a business
export function getConfiguredPlatforms(businessId: string): string[] {
  const business = BUSINESS_ACCOUNTS[businessId]
  if (!business) return []
  
  return Object.keys(business.accounts).filter(platform => 
    isBusinessPlatformReady(businessId, platform)
  )
}