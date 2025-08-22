// src/lib/daily-theme-constants.ts

export interface DailyTheme {
  theme: string
  focus: string
  emoji: string
  templates: string[]
  description: string
  contentStyle: string
  promotionWeight: number // 0-100, how promotional this day typically is
}

export interface ContentStrategy {
  name: string
  description: string
  postFrequency: string
  promotionRatio: string
  characteristics: string[]
  templateWeights: {
    [template: string]: number // 0-100
  }
}

// Enhanced daily themes with AI generation guidance
export const DAILY_THEMES: Record<string, DailyTheme> = {
  monday: { 
    theme: 'Monday Motivation', 
    focus: 'Start the week strong with energy and special highlights',
    emoji: '💪',
    templates: ['promotion', 'company_update', 'customer_story'],
    description: 'Energetic posts to kickstart the week, perfect for announcing specials and company news',
    contentStyle: 'motivational, energetic, forward-looking',
    promotionWeight: 70
  },
  tuesday: { 
    theme: 'Tuesday Tips', 
    focus: 'Educational HVAC/plumbing/electrical tips and advice',
    emoji: '💡',
    templates: ['seasonal_tip', 'maintenance_reminder', 'educational'],
    description: 'Share valuable knowledge and maintenance advice with your customers',
    contentStyle: 'educational, helpful, expert advice',
    promotionWeight: 20
  },
  wednesday: { 
    theme: 'Wednesday Specials', 
    focus: 'Mid-week promotional offers and featured services',
    emoji: '🎯',
    templates: ['promotion', 'seasonal_tip', 'limited_offer'],
    description: 'Perfect day to highlight current promotions and special offers',
    contentStyle: 'promotional, urgent, value-focused',
    promotionWeight: 90
  },
  thursday: { 
    theme: 'Thursday Maintenance', 
    focus: 'Maintenance reminders and preventive care tips',
    emoji: '🔧',
    templates: ['maintenance_reminder', 'safety_tip', 'prevention_advice'],
    description: 'Focus on preventive maintenance and system care advice',
    contentStyle: 'preventive, safety-focused, practical',
    promotionWeight: 30
  },
  friday: { 
    theme: 'Friday Prep', 
    focus: 'Weekend preparation and emergency service availability',
    emoji: '🏠',
    templates: ['weekend_prep', 'emergency_service', 'customer_care'],
    description: 'Prepare customers for weekend comfort and highlight emergency services',
    contentStyle: 'preparatory, reassuring, service-focused',
    promotionWeight: 40
  },
  saturday: {
    theme: 'Saturday Service',
    focus: 'Weekend service availability and quick tips',
    emoji: '⚡',
    templates: ['quick_tip', 'emergency_service', 'weekend_special'],
    description: 'Quick, actionable tips and weekend service reminders',
    contentStyle: 'quick, actionable, weekend-friendly',
    promotionWeight: 50
  },
  sunday: {
    theme: 'Sunday Planning',
    focus: 'Week ahead preparation and family comfort',
    emoji: '🏡',
    templates: ['comfort_focus', 'week_prep', 'family_safety'],
    description: 'Help families prepare for the week ahead with comfort and safety focus',
    contentStyle: 'family-focused, planning, comfort-oriented',
    promotionWeight: 25
  }
}

// Content strategy definitions
export const CONTENT_STRATEGIES: Record<string, ContentStrategy> = {
  conservative: {
    name: 'Conservative',
    description: 'Focus on educational content and gentle service reminders',
    postFrequency: '3-4 days per week',
    promotionRatio: '20%',
    characteristics: ['Educational focus', 'Soft promotions', 'Trust building'],
    templateWeights: {
      educational: 40,
      seasonal_tip: 30,
      maintenance_reminder: 20,
      promotion: 10
    }
  },
  balanced: {
    name: 'Balanced',
    description: 'Mix of educational content, promotions, and company updates',
    postFrequency: '5-6 days per week',
    promotionRatio: '40%',
    characteristics: ['Variety of content', 'Regular promotions', 'Engaging mix'],
    templateWeights: {
      educational: 25,
      seasonal_tip: 20,
      maintenance_reminder: 15,
      promotion: 25,
      company_update: 10,
      customer_story: 5
    }
  },
  aggressive: {
    name: 'Aggressive',
    description: 'Strong promotional focus with frequent special offers',
    postFrequency: '6-7 days per week',
    promotionRatio: '60%',
    characteristics: ['Promotion heavy', 'Frequent specials', 'Sales focused'],
    templateWeights: {
      promotion: 50,
      limited_offer: 20,
      seasonal_tip: 15,
      maintenance_reminder: 10,
      customer_story: 5
    }
  }
}

// Template to database category mapping
export const TEMPLATE_CATEGORY_MAPPING: Record<string, string[]> = {
  // Daily theme templates -> Database template categories
  'promotion': ['promotion', 'marketing'],
  'seasonal_tip': ['seasonal', 'educational'],
  'maintenance_reminder': ['maintenance', 'service'],
  'educational': ['educational', 'tips'],
  'company_update': ['company', 'news'],
  'customer_story': ['testimonial', 'social_proof'],
  'emergency_service': ['emergency', 'service'],
  'weekend_prep': ['preparation', 'tips'],
  'quick_tip': ['tips', 'quick'],
  'comfort_focus': ['comfort', 'family'],
  'week_prep': ['planning', 'preparation'],
  'family_safety': ['safety', 'family'],
  'limited_offer': ['promotion', 'urgent'],
  'safety_tip': ['safety', 'maintenance'],
  'prevention_advice': ['maintenance', 'prevention'],
  'customer_care': ['service', 'care'],
  'weekend_special': ['promotion', 'weekend']
}

// Utility functions for theme-based content generation
export class DailyThemeService {
  
  /**
   * Get daily theme for a specific day
   */
  static getDailyTheme(day: string): DailyTheme | null {
    return DAILY_THEMES[day.toLowerCase()] || null
  }
  
  /**
   * Get content strategy settings
   */
  static getContentStrategy(strategy: string): ContentStrategy | null {
    return CONTENT_STRATEGIES[strategy] || null
  }
  
  /**
   * Get appropriate templates for a day and strategy
   */
  static getTemplatesForDay(day: string, strategy: string = 'balanced'): string[] {
    const dailyTheme = this.getDailyTheme(day)
    const contentStrategy = this.getContentStrategy(strategy)
    
    if (!dailyTheme || !contentStrategy) {
      return ['seasonal_tip'] // fallback
    }
    
    // Weight templates based on strategy and day
    const weightedTemplates = dailyTheme.templates.map(template => ({
      template,
      weight: (contentStrategy.templateWeights[template] || 0) + 
              (dailyTheme.promotionWeight * (template.includes('promotion') ? 0.3 : 0))
    }))
    
    // Sort by weight and return top templates
    return weightedTemplates
      .sort((a, b) => b.weight - a.weight)
      .map(item => item.template)
      .slice(0, 3) // Top 3 templates
  }
  
  /**
   * Get database template categories for a daily theme template
   */
  static getDatabaseCategories(themeTemplate: string): string[] {
    return TEMPLATE_CATEGORY_MAPPING[themeTemplate] || ['general']
  }
  
  /**
   * Check if a day should emphasize promotions
   */
  static shouldEmphasizePromotions(day: string, primaryPromoDay: string, secondaryPromoDay: string): boolean {
    return day === primaryPromoDay || day === secondaryPromoDay
  }
  
  /**
   * Generate content guidance for AI based on daily theme
   */
  static getContentGuidance(day: string, strategy: string = 'balanced'): {
    style: string
    focus: string
    templates: string[]
    promotionEmphasis: boolean
  } {
    const dailyTheme = this.getDailyTheme(day)
    const contentStrategy = this.getContentStrategy(strategy)
    
    if (!dailyTheme || !contentStrategy) {
      return {
        style: 'professional and helpful',
        focus: 'general HVAC/plumbing/electrical content',
        templates: ['seasonal_tip'],
        promotionEmphasis: false
      }
    }
    
    return {
      style: dailyTheme.contentStyle,
      focus: dailyTheme.focus,
      templates: this.getTemplatesForDay(day, strategy),
      promotionEmphasis: dailyTheme.promotionWeight > 50
    }
  }
}

export default DailyThemeService