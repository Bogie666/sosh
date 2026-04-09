// src/lib/platform-credentials.ts
// Database-first credential resolver for platform API access.
// Checks PlatformConfig table first, falls back to env vars for legacy businesses.

import { prisma } from './prisma'

export interface PlatformCredentials {
  google?: {
    accountId: string
    locationIds: string[]
    locationNames: string[]
  }
  facebook?: {
    pageId: string
    accessToken: string
  }
  instagram?: {
    pageId: string
    accessToken: string
  }
  twitter?: {
    consumerKey: string
    consumerSecret: string
    accessToken: string
    accessTokenSecret: string
    bearerToken?: string
  }
}

/**
 * Get credentials for a specific business + platform combo.
 * Checks DB first (PlatformConfig table), then falls back to env vars.
 */
export async function getPlatformCredentials(
  businessId: string,
  platform: 'GOOGLE' | 'FACEBOOK' | 'INSTAGRAM' | 'TWITTER'
): Promise<Record<string, any> | null> {
  // 1. Try database first
  try {
    const config = await prisma.platformConfig.findUnique({
      where: { businessId_platform: { businessId, platform } }
    })

    if (config?.isActive && config.credentials) {
      try {
        return JSON.parse(config.credentials)
      } catch {
        console.error(`Invalid JSON in PlatformConfig for ${businessId}/${platform}`)
      }
    }
  } catch {
    // DB might not have the table yet, fall through to env vars
  }

  // 2. Fall back to env vars for legacy businesses
  return getLegacyCredentials(businessId, platform)
}

/**
 * Get all platform credentials for a business
 */
export async function getAllPlatformCredentials(businessId: string): Promise<PlatformCredentials> {
  const result: PlatformCredentials = {}

  const platforms = ['GOOGLE', 'FACEBOOK', 'INSTAGRAM', 'TWITTER'] as const
  for (const platform of platforms) {
    const creds = await getPlatformCredentials(businessId, platform)
    if (creds) {
      result[platform.toLowerCase() as keyof PlatformCredentials] = creds as any
    }
  }

  return result
}

/**
 * Save platform credentials to database
 */
export async function savePlatformCredentials(
  businessId: string,
  platform: 'GOOGLE' | 'FACEBOOK' | 'INSTAGRAM' | 'TWITTER',
  credentials: Record<string, any>
): Promise<boolean> {
  try {
    await prisma.platformConfig.upsert({
      where: { businessId_platform: { businessId, platform } },
      update: {
        credentials: JSON.stringify(credentials),
        isActive: true,
        updatedAt: new Date()
      },
      create: {
        businessId,
        platform,
        credentials: JSON.stringify(credentials),
        isActive: true,
        status: 'PENDING'
      }
    })
    return true
  } catch (error) {
    console.error(`Failed to save credentials for ${businessId}/${platform}:`, error)
    return false
  }
}

/**
 * Get connection status for all platforms of a business
 */
export async function getPlatformStatuses(businessId: string): Promise<Array<{
  platform: string
  isActive: boolean
  status: string
  hasCredentials: boolean
  lastTested: Date | null
}>> {
  try {
    const configs = await prisma.platformConfig.findMany({
      where: { businessId }
    })

    const platforms = ['GOOGLE', 'FACEBOOK', 'INSTAGRAM', 'TWITTER']
    return platforms.map(platform => {
      const config = configs.find(c => c.platform === platform)
      return {
        platform,
        isActive: config?.isActive || false,
        status: config?.status || 'PENDING',
        hasCredentials: !!config?.credentials,
        lastTested: config?.lastTested || null
      }
    })
  } catch {
    return []
  }
}

// --- Legacy env var fallbacks ---

function getLegacyCredentials(
  businessId: string,
  platform: 'GOOGLE' | 'FACEBOOK' | 'INSTAGRAM' | 'TWITTER'
): Record<string, any> | null {
  switch (platform) {
    case 'GOOGLE':
      return getLegacyGoogleCreds(businessId)
    case 'FACEBOOK':
      return getLegacyFacebookCreds(businessId)
    case 'INSTAGRAM':
      return getLegacyInstagramCreds(businessId)
    case 'TWITTER':
      return getLegacyTwitterCreds(businessId)
    default:
      return null
  }
}

function getLegacyGoogleCreds(businessId: string): Record<string, any> | null {
  const mapping: Record<string, any> = {
    'lex-dallas': {
      accountId: '102262219515631457064',
      locationIds: ['2211062401809147654', '1466833791482001835', '7533141434923241855', '2476909653678359873'],
      locationNames: ['Lex Air Conditioning']
    },
    'lex-etx': {
      accountId: '102262219515631457064',
      locationIds: ['7913826327010230630'],
      locationNames: ['Lex ETX']
    },
    'lyons': {
      accountId: '104110704176658195109',
      locationIds: ['379116535546276113'],
      locationNames: ['Lyons Air Conditioning and Heating']
    }
  }
  return mapping[businessId] || null
}

function getLegacyFacebookCreds(businessId: string): Record<string, any> | null {
  const accessToken = process.env.META_ACCESS_TOKEN
  if (!accessToken) return null

  const pageIds: Record<string, string> = {
    'lex-dallas': '117276454970502',
    'lex-etx': '104687012905700',
    'lyons': '172733356071633'
  }
  const pageId = pageIds[businessId]
  if (!pageId) return null

  return { pageId, accessToken }
}

function getLegacyInstagramCreds(businessId: string): Record<string, any> | null {
  // Instagram uses the same Facebook page to discover the IG business account
  return getLegacyFacebookCreds(businessId)
}

function getLegacyTwitterCreds(businessId: string): Record<string, any> | null {
  const prefixMap: Record<string, string> = {
    'lex-dallas': 'LEX_X',
    'lex': 'LEX_X',
    'lex-etx': 'LEX_X',
    'lyons': 'LYONS_X'
  }
  const prefix = prefixMap[businessId]
  if (!prefix) return null

  const consumerKey = process.env[`${prefix}_CONSUMER_KEY`]
  const consumerSecret = process.env[`${prefix}_CONSUMER_SECRET`]
  const accessToken = process.env[`${prefix}_ACCESS_TOKEN`]
  const accessTokenSecret = process.env[`${prefix}_ACCESS_TOKEN_SECRET`]

  if (!consumerKey || !consumerSecret) return null

  return { consumerKey, consumerSecret, accessToken, accessTokenSecret }
}
