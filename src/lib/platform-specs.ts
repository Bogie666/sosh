// src/lib/platform-specs.ts
// Single source of truth for all platform specifications

export interface PlatformSpec {
  id: string
  name: string
  icon: string
  color: string
  charLimit: number
  recommendedLength: string
  maxTokens: number
  emojiStyle: 'encouraged' | 'moderate' | 'minimal'
  hashtagCount: number
  ctaStyle: 'required' | 'encouraged' | 'brief'
  imageFormats: string[]
  bestPractices: string[]
}

export const PLATFORM_SPECS: Record<string, PlatformSpec> = {
  google: {
    id: 'google',
    name: 'Google Business Profile',
    icon: '🏢',
    color: 'text-blue-400',
    charLimit: 1500,
    recommendedLength: '200-400',
    maxTokens: 400,
    emojiStyle: 'minimal',
    hashtagCount: 0,
    ctaStyle: 'required',
    imageFormats: ['square'],
    bestPractices: [
      'Focus on local SEO keywords and service areas',
      'Include a clear call-to-action with phone number',
      'Mention specific services and specialties',
      'Keep professional tone - this appears in Google Search/Maps',
      'Avoid hashtags - they do not help on GBP',
      'Include location-relevant details'
    ]
  },
  facebook: {
    id: 'facebook',
    name: 'Facebook',
    icon: '📘',
    color: 'text-blue-500',
    charLimit: 63206,
    recommendedLength: '200-400',
    maxTokens: 500,
    emojiStyle: 'encouraged',
    hashtagCount: 2,
    ctaStyle: 'encouraged',
    imageFormats: ['landscape', 'square'],
    bestPractices: [
      'Lead with a hook or question to drive engagement',
      'Use 2-4 emojis to break up text and catch attention',
      'Include 1-2 relevant hashtags',
      'Ask questions to encourage comments',
      'Keep paragraphs short for mobile readability',
      'Include a clear call-to-action'
    ]
  },
  instagram: {
    id: 'instagram',
    name: 'Instagram',
    icon: '📷',
    color: 'text-pink-400',
    charLimit: 2200,
    recommendedLength: '100-200',
    maxTokens: 300,
    emojiStyle: 'encouraged',
    hashtagCount: 8,
    ctaStyle: 'brief',
    imageFormats: ['square', 'portrait'],
    bestPractices: [
      'First line is critical - it shows in the feed preview',
      'Use line breaks for readability',
      'Include 5-10 relevant hashtags at the end',
      'Use emojis as visual bullet points',
      'Focus on the visual story the image tells',
      'Keep the CTA simple - link in bio or DM us'
    ]
  },
  twitter: {
    id: 'twitter',
    name: 'X/Twitter',
    icon: '🐦',
    color: 'text-sky-400',
    charLimit: 280,
    recommendedLength: '240-270',
    maxTokens: 100,
    emojiStyle: 'moderate',
    hashtagCount: 2,
    ctaStyle: 'brief',
    imageFormats: ['single', 'multi'],
    bestPractices: [
      'MUST be under 280 characters including spaces and hashtags',
      'Be concise and punchy - every character counts',
      'Use 1-2 hashtags maximum',
      'Front-load the key message',
      'Use one emoji for visual interest',
      'Include phone number or short CTA'
    ]
  }
}

export function getPlatformSpec(platform: string): PlatformSpec {
  return PLATFORM_SPECS[platform.toLowerCase()] || PLATFORM_SPECS.facebook
}

export function getAllPlatforms(): PlatformSpec[] {
  return Object.values(PLATFORM_SPECS)
}

export function getPlatformSpecsForPrompt(platform: string): string {
  const spec = getPlatformSpec(platform)
  return `Platform: ${spec.name}
Character limit: ${spec.charLimit} (aim for ${spec.recommendedLength} for best engagement)
Emoji usage: ${spec.emojiStyle}
Hashtags: ${spec.hashtagCount > 0 ? `Include ${spec.hashtagCount} relevant hashtags` : 'No hashtags'}
Call-to-action: ${spec.ctaStyle}

Best practices for ${spec.name}:
${spec.bestPractices.map(bp => `- ${bp}`).join('\n')}`
}
