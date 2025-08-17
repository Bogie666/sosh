// src/lib/social-media-utils.ts

/**
 * Utility functions for working with social media URLs and IDs
 */

export interface SocialMediaAccount {
  platform: string
  handle: string
  url: string
  pageId?: string
}

/**
 * Extract handle/username from social media URLs
 */
export function extractHandleFromUrl(url: string): string {
  // Remove protocol and www
  const cleanUrl = url.replace(/^https?:\/\/(www\.)?/, '')
  
  if (cleanUrl.includes('facebook.com/')) {
    return cleanUrl.split('facebook.com/')[1]?.split('/')[0] || ''
  }
  
  if (cleanUrl.includes('instagram.com/')) {
    return cleanUrl.split('instagram.com/')[1]?.split('/')[0] || ''
  }
  
  if (cleanUrl.includes('x.com/') || cleanUrl.includes('twitter.com/')) {
    const handle = cleanUrl.split('.com/')[1]?.split('/')[0] || ''
    return handle.replace('@', '') // Remove @ if present
  }
  
  return ''
}

/**
 * Get the business accounts mapping with extracted handles
 */
export function getBusinessSocialAccounts() {
  return {
    'lex-dallas': {
      facebook: {
        url: 'www.facebook.com/LexAirConditioning',
        handle: 'LexAirConditioning',
        platform: 'facebook'
      },
      instagram: {
        url: 'www.instagram.com/lex_air_conditioning',
        handle: 'lex_air_conditioning',
        platform: 'instagram'
      },
      twitter: {
        url: 'x.com/lexairandheat',
        handle: 'lexairandheat',
        platform: 'twitter'
      }
    },
    'lex-etx': {
      facebook: {
        url: 'www.facebook.com/lexetxtyler',
        handle: 'lexetxtyler',
        platform: 'facebook'
      },
      instagram: {
        // Shares Lex Dallas Instagram
        url: 'www.instagram.com/lex_air_conditioning',
        handle: 'lex_air_conditioning',
        platform: 'instagram'
      },
      twitter: {
        // Shares Lex Dallas Twitter
        url: 'x.com/lexairandheat',
        handle: 'lexairandheat',
        platform: 'twitter'
      }
    },
    'lyons': {
      facebook: {
        url: 'www.facebook.com/LyonsAir',
        handle: 'LyonsAir',
        platform: 'facebook'
      },
      instagram: {
        url: 'www.instagram.com/lyonsair_',
        handle: 'lyonsair_',
        platform: 'instagram'
      },
      twitter: {
        url: 'x.com/lyonsair',
        handle: 'lyonsair',
        platform: 'twitter'
      }
    }
  }
}

/**
 * Helper to get Meta page ID from handle using Meta API
 * This would be called to populate the actual page IDs
 */
export async function getMetaPageId(pageHandle: string, accessToken: string): Promise<string | null> {
  try {
    // For business pages, you might need to search or use the Graph API
    const response = await fetch(`https://graph.facebook.com/v18.0/${pageHandle}?access_token=${accessToken}`)
    
    if (!response.ok) {
      console.warn(`Could not fetch page ID for ${pageHandle}`)
      return null
    }
    
    const data = await response.json()
    return data.id || null
  } catch (error) {
    console.error(`Error fetching Meta page ID for ${pageHandle}:`, error)
    return null
  }
}

/**
 * Validate social media URLs
 */
export function validateSocialMediaUrl(url: string, platform: string): boolean {
  const cleanUrl = url.toLowerCase().replace(/^https?:\/\/(www\.)?/, '')
  
  switch (platform) {
    case 'facebook':
      return cleanUrl.includes('facebook.com/')
    case 'instagram':
      return cleanUrl.includes('instagram.com/')
    case 'twitter':
      return cleanUrl.includes('x.com/') || cleanUrl.includes('twitter.com/')
    default:
      return false
  }
}

/**
 * Format social media URL for display
 */
export function formatSocialMediaUrl(url: string): string {
  if (!url.startsWith('http')) {
    return `https://${url}`
  }
  return url
}

/**
 * Get platform icon and color
 */
export function getPlatformInfo(platform: string) {
  const platformMap = {
    facebook: { icon: '📘', color: 'text-blue-600', name: 'Facebook' },
    instagram: { icon: '📷', color: 'text-pink-500', name: 'Instagram' },
    twitter: { icon: '🐦', color: 'text-sky-400', name: 'X/Twitter' },
    google: { icon: '🏢', color: 'text-blue-400', name: 'Google Business Profile' }
  }
  
  return platformMap[platform as keyof typeof platformMap] || { 
    icon: '📱', 
    color: 'text-gray-400', 
    name: platform 
  }
}