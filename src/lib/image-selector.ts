// src/lib/image-selector.ts
// Smart image selection with strong diversity enforcement.
// Images used recently get heavy penalties. Platform-specific URLs are used.

import { ImageAsset, getImageUrlForPlatform } from './business-context'

export interface ImageSelectionResult {
  image: ImageAsset
  url: string
  score: number
  reasons: string[]
  alternatives: Array<{ image: ImageAsset; url: string; score: number }>
}

interface ScoredImage {
  image: ImageAsset
  score: number
  reasons: string[]
}

/**
 * Select the best image for a post from the business's image library.
 * Heavily penalizes recently used and overused images.
 * Returns platform-specific URL.
 */
export function selectBestImage(
  images: ImageAsset[],
  content: string,
  day: string,
  platform: string,
  excludeIds: string[] = []
): ImageSelectionResult | null {
  if (images.length === 0) return null

  // Filter out excluded images (for batch generation)
  const available = excludeIds.length > 0
    ? images.filter(img => !excludeIds.includes(img.id))
    : images

  if (available.length === 0) return null

  // Score all images
  const scored = available.map(img => scoreImage(img, content, day))

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score)

  // Add controlled randomization among top candidates to prevent staleness
  const topScore = scored[0].score
  const topCandidates = scored.filter(s => s.score >= topScore - 15 && s.score > 0)

  // Pick from top candidates using content hash for deterministic but varied selection
  const hash = simpleHash(content + day + platform)
  const selectedIndex = topCandidates.length > 1 ? hash % topCandidates.length : 0
  const selected = topCandidates[selectedIndex] || scored[0]

  // Build alternatives (next best, excluding selected)
  const alternatives = scored
    .filter(s => s.image.id !== selected.image.id && s.score > 0)
    .slice(0, 3)
    .map(s => ({
      image: s.image,
      url: getImageUrlForPlatform(s.image, platform),
      score: s.score
    }))

  return {
    image: selected.image,
    url: getImageUrlForPlatform(selected.image, platform),
    score: selected.score,
    reasons: selected.reasons,
    alternatives
  }
}

/**
 * Select multiple unique images for batch generation.
 * Each selection excludes previously selected images.
 */
export function selectImagesForBatch(
  images: ImageAsset[],
  posts: Array<{ content: string; day: string; platform: string }>,
): ImageSelectionResult[] {
  const results: ImageSelectionResult[] = []
  const usedIds: string[] = []

  for (const post of posts) {
    const result = selectBestImage(images, post.content, post.day, post.platform, usedIds)
    if (result) {
      results.push(result)
      usedIds.push(result.image.id)
    }
  }

  return results
}

// --- Scoring logic ---

function scoreImage(image: ImageAsset, content: string, day: string): ScoredImage {
  let score = 0
  const reasons: string[] = []
  const contentLower = content.toLowerCase()
  const allTags = [...(image.aiTags || []), ...(image.manualTags || [])].map(t => t.toLowerCase())
  const description = (image.aiDescription || '').toLowerCase()

  // 1. Content keyword matching (up to +50)
  const contentKeywords = extractKeywords(contentLower)
  let keywordMatches = 0
  for (const keyword of contentKeywords) {
    if (allTags.some(tag => tag.includes(keyword) || keyword.includes(tag))) {
      keywordMatches++
    }
    if (description.includes(keyword)) {
      keywordMatches++
    }
  }
  const keywordScore = Math.min(50, keywordMatches * 8)
  if (keywordScore > 0) {
    score += keywordScore
    reasons.push(`Content match: +${keywordScore}`)
  }

  // 2. Category match (up to +20)
  const contentCategory = inferCategory(contentLower)
  if (image.category && image.category === contentCategory) {
    score += 20
    reasons.push(`Category match: ${image.category}`)
  }

  // 3. Day-appropriate imagery (+10)
  const dayPrefs = getDayPreferences(day)
  const dayMatches = dayPrefs.filter(pref => allTags.some(tag => tag.includes(pref))).length
  if (dayMatches > 0) {
    const dayScore = Math.min(10, dayMatches * 5)
    score += dayScore
    reasons.push(`Day relevance: +${dayScore}`)
  }

  // 4. Quality bonus for images with good descriptions (+5)
  if (image.aiDescription && image.aiDescription.length > 30) {
    score += 5
    reasons.push('Quality description')
  }

  // 5. HEAVY recency penalty - this is the key to preventing image reuse
  if (image.lastUsed) {
    const daysSinceUsed = (Date.now() - new Date(image.lastUsed).getTime()) / (1000 * 60 * 60 * 24)
    if (daysSinceUsed < 1) {
      score -= 200 // Practically eliminates same-day reuse
      reasons.push('Same-day penalty: -200')
    } else if (daysSinceUsed < 3) {
      score -= 100
      reasons.push('Used within 3 days: -100')
    } else if (daysSinceUsed < 7) {
      score -= 50
      reasons.push('Used within 7 days: -50')
    } else if (daysSinceUsed < 14) {
      score -= 25
      reasons.push('Used within 14 days: -25')
    }
  }

  // 6. Usage count penalty - progressive and significant
  if (image.usageCount > 0) {
    const usagePenalty = Math.min(60, image.usageCount * 5)
    score -= usagePenalty
    reasons.push(`Usage count (${image.usageCount}): -${usagePenalty}`)
  }

  // 7. Fresh image bonus
  if (image.usageCount === 0) {
    score += 30
    reasons.push('Never used: +30')
  } else if (image.usageCount <= 2) {
    score += 15
    reasons.push('Rarely used: +15')
  }

  return { image, score: Math.max(0, score), reasons }
}

function extractKeywords(content: string): string[] {
  // Remove common words, keep meaningful ones
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
    'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'up',
    'about', 'into', 'through', 'during', 'before', 'after', 'above',
    'below', 'between', 'out', 'off', 'over', 'under', 'again', 'then',
    'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all',
    'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some',
    'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than',
    'too', 'very', 'just', 'because', 'but', 'and', 'or', 'if', 'this',
    'that', 'these', 'those', 'your', 'our', 'we', 'you', 'it', 'its',
    'us', 'them', 'their', 'my', 'me', 'him', 'her', 'his', 'she', 'he'
  ])

  const words = content
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopWords.has(w))

  return [...new Set(words)].slice(0, 15)
}

function inferCategory(content: string): string {
  if (/team|staff|technician|crew|family/.test(content)) return 'team'
  if (/result|completed|finished|installed|before.*after/.test(content)) return 'results'
  if (/equipment|system|unit|tool/.test(content)) return 'equipment'
  if (/emergency|urgent|24.7/.test(content)) return 'work'
  if (/maintenance|repair|service|install/.test(content)) return 'work'
  return 'work'
}

function getDayPreferences(day: string): string[] {
  const prefs: Record<string, string[]> = {
    monday: ['team', 'professional', 'motivation', 'group'],
    tuesday: ['work', 'education', 'maintenance', 'tips'],
    wednesday: ['promotion', 'special', 'professional', 'clean'],
    thursday: ['maintenance', 'service', 'tools', 'repair'],
    friday: ['results', 'completed', 'quality', 'finished'],
    saturday: ['solutions', 'help', 'available', 'service'],
    sunday: ['planning', 'professional', 'preparation', 'comfort']
  }
  return prefs[day.toLowerCase()] || prefs.monday
}

function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash)
}
