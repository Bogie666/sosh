interface ImageLibraryItem {
  id: string
  businessId: string
  fileName: string
  originalName: string
  fileSize: number
  mimeType: string
  dimensions: { width: number; height: number }
  cloudUrl: string
  thumbnailUrl?: string
  platformUrls: {
    facebook?: { landscape?: string; square?: string }
    instagram?: { square?: string; portrait?: string }
    twitter?: { single?: string; multi?: string }
    google?: { square?: string }
  }
  aiTags: string[]
  aiConfidence: any
  aiDescription?: string
  manualTags: string[]
  category?: string
  subcategory?: string
  isActive: boolean
  usageCount: number
  lastUsed?: string
  uploadedAt: string
}

interface ImageRelevanceScore {
  image: ImageLibraryItem
  relevanceScore: number
  matchingFactors: string[]
  description: string
}

interface ContentImageMatcher {
  analyzeContentForImageNeeds(content: string, contentType: string, day: string): ImageRequirements
  scoreImageRelevance(image: ImageLibraryItem, requirements: ImageRequirements, businessContext: any): ImageRelevanceScore
  selectBestImages(images: ImageLibraryItem[], requirements: ImageRequirements, businessContext: any): ImageRelevanceScore[]
}

interface ImageRequirements {
  primaryKeywords: string[]
  secondaryKeywords: string[]
  visualStyle: 'professional' | 'action' | 'results' | 'team' | 'equipment'
  contentTheme: string
  businessContext: {
    serviceTypes: string[]
    brandVoice: string
    contentFocus: string
  }
  excludeKeywords: string[]
  preferredCategory: string
}

class EnhancedImageMatcher implements ContentImageMatcher {
  
  /**
   * Analyze generated content to understand what type of image would be most relevant
   */
  analyzeContentForImageNeeds(content: string, contentType: string, day: string): ImageRequirements {
    const contentLower = content.toLowerCase()
    
    // Extract service types mentioned in content
    const serviceTypes: string[] = []
    if (contentLower.includes('hvac') || contentLower.includes('heating') || contentLower.includes('cooling') || contentLower.includes('air condition')) {
      serviceTypes.push('hvac')
    }
    if (contentLower.includes('plumbing') || contentLower.includes('water') || contentLower.includes('pipe') || contentLower.includes('drain')) {
      serviceTypes.push('plumbing')
    }
    if (contentLower.includes('electrical') || contentLower.includes('electric') || contentLower.includes('wiring') || contentLower.includes('panel')) {
      serviceTypes.push('electrical')
    }
    
    // Determine visual style based on content tone and day
    let visualStyle: ImageRequirements['visualStyle'] = 'professional'
    if (contentLower.includes('team') || contentLower.includes('staff') || contentLower.includes('technician') || day === 'monday') {
      visualStyle = 'team'
    } else if (contentLower.includes('maintenance') || contentLower.includes('repair') || contentLower.includes('service') || contentLower.includes('install')) {
      visualStyle = 'action'
    } else if (contentLower.includes('completed') || contentLower.includes('finished') || contentLower.includes('result') || day === 'friday') {
      visualStyle = 'results'
    } else if (contentLower.includes('equipment') || contentLower.includes('system') || contentLower.includes('unit')) {
      visualStyle = 'equipment'
    }
    
    // Build primary keywords from content analysis
    const primaryKeywords: string[] = []
    const secondaryKeywords: string[] = []
    
    // Service-specific keywords
    serviceTypes.forEach(service => {
      primaryKeywords.push(service, `${service}_work`)
    })
    
    // Visual style keywords
    switch (visualStyle) {
      case 'team':
        primaryKeywords.push('team', 'technician', 'people', 'professional')
        secondaryKeywords.push('staff', 'worker', 'service_team')
        break
      case 'action':
        primaryKeywords.push('work', 'installation', 'repair', 'maintenance')
        secondaryKeywords.push('service', 'working', 'tools', 'active')
        break
      case 'results':
        primaryKeywords.push('completed', 'finished', 'after', 'result')
        secondaryKeywords.push('clean', 'new', 'installed', 'quality')
        break
      case 'equipment':
        primaryKeywords.push('equipment', 'system', 'unit', 'tools')
        secondaryKeywords.push('technology', 'modern', 'professional_equipment')
        break
      default:
        primaryKeywords.push('professional', 'service', 'quality')
        secondaryKeywords.push('business', 'work', 'clean')
    }
    
    // Content-specific keywords
    if (contentLower.includes('emergency')) {
      primaryKeywords.push('emergency', 'urgent', 'truck')
      secondaryKeywords.push('service_vehicle', 'response')
    }
    
    if (contentLower.includes('special') || contentLower.includes('deal') || contentLower.includes('promotion')) {
      primaryKeywords.push('promotion', 'special')
      visualStyle = 'professional' // Promotions work better with clean professional images
    }
    
    // Day-specific enhancements
    const dayEnhancements = {
      monday: { keywords: ['motivation', 'start', 'team'], style: 'team' as const },
      tuesday: { keywords: ['education', 'tips', 'professional'], style: 'professional' as const },
      wednesday: { keywords: ['special', 'deal', 'promotion'], style: 'professional' as const },
      thursday: { keywords: ['maintenance', 'preparation', 'service'], style: 'action' as const },
      friday: { keywords: ['preparation', 'weekend', 'ready'], style: 'results' as const },
      saturday: { keywords: ['solutions', 'help', 'available'], style: 'action' as const },
      sunday: { keywords: ['planning', 'preparation', 'maintenance'], style: 'professional' as const }
    }
    
    if (dayEnhancements[day as keyof typeof dayEnhancements]) {
      const enhancement = dayEnhancements[day as keyof typeof dayEnhancements]
      secondaryKeywords.push(...enhancement.keywords)
      if (visualStyle === 'professional') {
        visualStyle = enhancement.style
      }
    }
    
    // Determine preferred category
    let preferredCategory = 'work'
    if (visualStyle === 'team') preferredCategory = 'team'
    else if (visualStyle === 'equipment') preferredCategory = 'equipment'
    else if (visualStyle === 'results') preferredCategory = 'results'
    
    return {
      primaryKeywords: [...new Set(primaryKeywords)],
      secondaryKeywords: [...new Set(secondaryKeywords)],
      visualStyle,
      contentTheme: `${day}_${contentType}`,
      businessContext: {
        serviceTypes,
        brandVoice: contentType,
        contentFocus: visualStyle
      },
      excludeKeywords: [], // Could add logic to exclude irrelevant images
      preferredCategory
    }
  }
  
  /**
   * Score an individual image's relevance to the content requirements
   */
  scoreImageRelevance(image: ImageLibraryItem, requirements: ImageRequirements, businessContext: any): ImageRelevanceScore {
    let score = 0
    const matchingFactors: string[] = []
    
    // Category match (high weight)
    if (image.category === requirements.preferredCategory) {
      score += 25
      matchingFactors.push(`Category: ${image.category}`)
    }
    
    // Primary keyword matches (highest weight)
    const allImageTags = [...(image.aiTags || []), ...(image.manualTags || [])].map(tag => tag.toLowerCase())
    const imageDescription = (image.aiDescription || '').toLowerCase()
    const imageName = image.originalName.toLowerCase()
    
    requirements.primaryKeywords.forEach(keyword => {
      const keywordLower = keyword.toLowerCase()
      
      // Tag matches
      if (allImageTags.some(tag => tag.includes(keywordLower) || keywordLower.includes(tag))) {
        score += 15
        matchingFactors.push(`Primary keyword: ${keyword}`)
      }
      
      // Description matches
      if (imageDescription.includes(keywordLower)) {
        score += 10
        matchingFactors.push(`Description: ${keyword}`)
      }
      
      // Filename matches
      if (imageName.includes(keywordLower)) {
        score += 8
        matchingFactors.push(`Filename: ${keyword}`)
      }
    })
    
    // Secondary keyword matches (medium weight)
    requirements.secondaryKeywords.forEach(keyword => {
      const keywordLower = keyword.toLowerCase()
      
      if (allImageTags.some(tag => tag.includes(keywordLower))) {
        score += 7
        matchingFactors.push(`Secondary keyword: ${keyword}`)
      }
      
      if (imageDescription.includes(keywordLower)) {
        score += 5
        matchingFactors.push(`Secondary description: ${keyword}`)
      }
    })
    
    // Business service type alignment
    requirements.businessContext.serviceTypes.forEach(serviceType => {
      if (allImageTags.some(tag => tag.includes(serviceType))) {
        score += 12
        matchingFactors.push(`Service type: ${serviceType}`)
      }
    })
    
    // Penalize overused images to promote variety
    if (image.usageCount > 5) {
      score -= Math.min(10, image.usageCount - 5)
      matchingFactors.push(`Usage penalty: -${Math.min(10, image.usageCount - 5)}`)
    }
    
    // Bonus for high-quality AI descriptions
    if (image.aiDescription && image.aiDescription.length > 20) {
      score += 3
      matchingFactors.push('Quality description bonus')
    }
    
    // Penalize exclude keywords
    requirements.excludeKeywords.forEach(excludeKeyword => {
      if (allImageTags.some(tag => tag.includes(excludeKeyword.toLowerCase()))) {
        score -= 20
        matchingFactors.push(`Excluded: ${excludeKeyword}`)
      }
    })
    
    return {
      image,
      relevanceScore: Math.max(0, score), // Ensure non-negative
      matchingFactors,
      description: image.aiDescription || image.originalName
    }
  }
  
  /**
   * Select best images based on relevance scoring with enhanced variety
   */
  selectBestImages(images: ImageLibraryItem[], requirements: ImageRequirements, businessContext: any): ImageRelevanceScore[] {
    // Score all images
    const scoredImages = images.map(image => 
      this.scoreImageRelevance(image, requirements, businessContext)
    )
    
    // Filter out very low relevance images (score < 5)
    const relevantImages = scoredImages.filter(scored => scored.relevanceScore >= 5)
    
    if (relevantImages.length === 0) {
      console.log('⚠️ No highly relevant images found, returning top 3 by basic score')
      return scoredImages
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, 3)
    }
    
    // Enhanced variety algorithm
    const varietyPromotedImages = this.promoteImageVariety(relevantImages, requirements)
    
    console.log(`✅ Found ${relevantImages.length} relevant images, top score after variety: ${varietyPromotedImages[0]?.relevanceScore}`)
    
    return varietyPromotedImages.slice(0, 6) // Return top 6 for selection
  }

  /**
   * Promote image variety by adjusting scores based on usage patterns and day themes
   */
  private promoteImageVariety(scoredImages: ImageRelevanceScore[], requirements: ImageRequirements): ImageRelevanceScore[] {
    // Group images by similar content (same category + overlapping tags)
    const imageGroups = this.groupSimilarImages(scoredImages)
    
    // Apply variety bonuses/penalties
    const varietyAdjustedImages = scoredImages.map(scored => {
      let adjustedScore = scored.relevanceScore
      const adjustmentFactors: string[] = [...scored.matchingFactors]
      
      // Strong penalty for recently used images (within last 7 days)
      const daysSinceLastUsed = scored.image.lastUsed 
        ? Math.floor((Date.now() - new Date(scored.image.lastUsed).getTime()) / (1000 * 60 * 60 * 24))
        : 999
      
      if (daysSinceLastUsed < 1) {
        adjustedScore -= 50 // Heavy penalty for same-day usage
        adjustmentFactors.push('Same day penalty: -50')
      } else if (daysSinceLastUsed < 3) {
        adjustedScore -= 30 // Medium penalty for recent usage
        adjustmentFactors.push('Recent usage penalty: -30')
      } else if (daysSinceLastUsed < 7) {
        adjustedScore -= 15 // Light penalty for weekly usage
        adjustmentFactors.push('Weekly usage penalty: -15')
      }
      
      // Additional penalty for high usage count (overused images)
      if (scored.image.usageCount > 10) {
        const usagePenalty = Math.min(25, (scored.image.usageCount - 10) * 3)
        adjustedScore -= usagePenalty
        adjustmentFactors.push(`Overuse penalty: -${usagePenalty}`)
      }
      
      // Bonus for unused or rarely used images
      if (scored.image.usageCount === 0) {
        adjustedScore += 15
        adjustmentFactors.push('Fresh image bonus: +15')
      } else if (scored.image.usageCount <= 2) {
        adjustedScore += 8
        adjustmentFactors.push('Low usage bonus: +8')
      }
      
      // Day-specific variety bonuses
      const dayVarietyBonus = this.getDaySpecificVarietyBonus(scored.image, requirements.contentTheme)
      if (dayVarietyBonus > 0) {
        adjustedScore += dayVarietyBonus
        adjustmentFactors.push(`Day variety bonus: +${dayVarietyBonus}`)
      }
      
      // Category diversity bonus (if we haven't used this category recently)
      const categoryBonus = this.getCategoryDiversityBonus(scored.image, scoredImages)
      if (categoryBonus > 0) {
        adjustedScore += categoryBonus
        adjustmentFactors.push(`Category diversity: +${categoryBonus}`)
      }
      
      return {
        ...scored,
        relevanceScore: Math.max(0, adjustedScore),
        matchingFactors: adjustmentFactors
      }
    })
    
    // Sort by adjusted score with controlled randomization
    return varietyAdjustedImages.sort((a, b) => {
      const scoreDiff = b.relevanceScore - a.relevanceScore
      
      // Add controlled randomization only for images with similar scores (within 20 points)
      if (Math.abs(scoreDiff) < 20 && a.relevanceScore > 30 && b.relevanceScore > 30) {
        const randomFactor = (Math.random() - 0.5) * 10 // Small random boost for variety
        return scoreDiff + randomFactor
      }
      
      return scoreDiff
    })
  }

  /**
   * Group similar images together for variety analysis
   */
  private groupSimilarImages(scoredImages: ImageRelevanceScore[]): ImageRelevanceScore[][] {
    const groups: ImageRelevanceScore[][] = []
    const processed = new Set<string>()
    
    scoredImages.forEach(imageScore => {
      if (processed.has(imageScore.image.id)) return
      
      const similarImages = scoredImages.filter(other => {
        if (processed.has(other.image.id) || other.image.id === imageScore.image.id) return false
        
        // Consider images similar if they share category and multiple tags
        const sharedTags = imageScore.image.aiTags.filter(tag => 
          other.image.aiTags.includes(tag) || other.image.manualTags.includes(tag)
        ).length
        
        return (
          imageScore.image.category === other.image.category && 
          sharedTags >= 2
        )
      })
      
      const group = [imageScore, ...similarImages]
      group.forEach(img => processed.add(img.image.id))
      groups.push(group)
    })
    
    return groups
  }

  /**
   * Get day-specific variety bonus to encourage different image types on different days
   */
  private getDaySpecificVarietyBonus(image: ImageLibraryItem, contentTheme: string): number {
    const [day] = contentTheme.split('_')
    const imageTags = [...(image.aiTags || []), ...(image.manualTags || [])].map(tag => tag.toLowerCase())
    
    // Day-specific preferences for variety
    const dayPreferences = {
      monday: ['team', 'motivation', 'professional', 'group'], // Team/motivation images
      tuesday: ['work', 'education', 'tips', 'maintenance'], // Educational/work images
      wednesday: ['promotion', 'special', 'professional', 'clean'], // Clean promotional images
      thursday: ['maintenance', 'service', 'tools', 'preparation'], // Service/maintenance images
      friday: ['results', 'completed', 'finished', 'quality'], // Results/completion images
      saturday: ['solutions', 'help', 'weekend', 'available'], // Solution-oriented images
      sunday: ['planning', 'preparation', 'maintenance', 'professional'] // Planning images
    }
    
    const preferences = dayPreferences[day as keyof typeof dayPreferences] || []
    const matches = preferences.filter(pref => 
      imageTags.some(tag => tag.includes(pref))
    ).length
    
    return matches * 5 // 5 points per day-specific preference match
  }

  /**
   * Get category diversity bonus to encourage using different categories
   */
  private getCategoryDiversityBonus(image: ImageLibraryItem, allScoredImages: ImageRelevanceScore[]): number {
    // Count how many high-scoring images (top 10) are in the same category
    const topImages = allScoredImages
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 10)
    
    const sameCategoryCount = topImages.filter(scored => 
      scored.image.category === image.category
    ).length
    
    // Give bonus for underrepresented categories
    if (sameCategoryCount <= 2) {
      return 10 // Good diversity
    } else if (sameCategoryCount <= 4) {
      return 5 // Some diversity
    }
    
    return 0 // Category is well represented
  }
}

// Export for use in the enhanced content generation API
export const enhancedImageMatcher = new EnhancedImageMatcher()

// Helper function to integrate with existing settings aggregator
export function getEnhancedRelevantImages(
  businessSettings: any,
  content: string,
  contentType: string,
  day: string = 'monday',
  businessContext: any = {}
): ImageRelevanceScore[] {
  if (!businessSettings?.imageLibrary?.length) {
    return []
  }
  
  // Analyze content to understand image requirements
  const requirements = enhancedImageMatcher.analyzeContentForImageNeeds(content, contentType, day)
  
  console.log('🎯 Image Requirements:', {
    primaryKeywords: requirements.primaryKeywords,
    visualStyle: requirements.visualStyle,
    preferredCategory: requirements.preferredCategory
  })
  
  // Score and select best images
  const scoredImages = enhancedImageMatcher.selectBestImages(
    businessSettings.imageLibrary,
    requirements,
    businessContext
  )
  
  console.log('📊 Top 3 Image Scores:', scoredImages.slice(0, 3).map(img => ({
    name: img.image.originalName,
    score: img.relevanceScore,
    factors: img.matchingFactors.slice(0, 3)
  })))
  
  return scoredImages
}