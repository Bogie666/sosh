// src/components/AIContentGenerator.tsx - COMPLETE FIXED VERSION
'use client'

import { useState, useEffect } from 'react'
import CollapsibleSection from './CollapsibleSection'
import Image from 'next/image'

// Platform specs (client-side copy of platform-specs.ts)
const PLATFORMS = [
  { id: 'google', name: 'Google Business Profile', icon: '🏢', color: 'text-blue-400', charLimit: 1500, sweet: '200-400' },
  { id: 'facebook', name: 'Facebook', icon: '📘', color: 'text-blue-500', charLimit: 63206, sweet: '200-400' },
  { id: 'instagram', name: 'Instagram', icon: '📷', color: 'text-pink-400', charLimit: 2200, sweet: '100-200' },
  { id: 'twitter', name: 'X/Twitter', icon: '🐦', color: 'text-sky-400', charLimit: 280, sweet: '240-270' }
]

// Templates available
const AVAILABLE_TEMPLATES = [
  { id: 'seasonal_tip', name: 'Seasonal Tips', description: 'Weather-appropriate tips and advice', category: 'Educational' },
  { id: 'maintenance_reminder', name: 'Maintenance Reminders', description: 'Regular service and tune-up reminders', category: 'Service' },
  { id: 'weather_alert', name: 'Weather Alerts', description: 'Weather-related protection tips', category: 'Urgent' },
  { id: 'promotion', name: 'Special Promotions', description: 'Service promotions and special offers', category: 'Marketing' },
  { id: 'customer_story', name: 'Customer Success Stories', description: 'Testimonials and positive reviews', category: 'Social Proof' },
  { id: 'company_update', name: 'Company News', description: 'Business updates and announcements', category: 'Company' },
  { id: 'emergency_service', name: 'Emergency Service', description: '24/7 emergency availability reminders', category: 'Service' }
]

// Daily themes
const DAILY_THEMES: Record<string, { theme: string; focus: string; emoji: string }> = {
  monday: { theme: 'Monday Motivation', focus: 'Start week strong with energy and highlights', emoji: '💪' },
  tuesday: { theme: 'Tuesday Tips', focus: 'Educational tips and advice', emoji: '💡' },
  wednesday: { theme: 'Wednesday Specials', focus: 'Mid-week promotional offers', emoji: '🎯' },
  thursday: { theme: 'Thursday Maintenance', focus: 'Maintenance reminders and safety tips', emoji: '🔧' },
  friday: { theme: 'Friday Prep', focus: 'Weekend preparation and emergency service', emoji: '🏠' },
  saturday: { theme: 'Saturday Solutions', focus: 'Weekend project help and emergency availability', emoji: '🛠️' },
  sunday: { theme: 'Sunday Planning', focus: 'Week ahead preparation and maintenance planning', emoji: '📋' }
}

interface WeeklyPost {
  id: string
  business: string
  day: string
  platform: string
  content: string
  characterCount: number
  withinLimits: boolean
  status: 'generating' | 'completed' | 'error' | 'editing' | 'posted' | 'scheduled'
  originalContent?: string
  isEdited?: boolean
  suggestedImage?: string
  suggestedImageUrl?: string
  selectedImageId?: string // NEW: Track selected image ID for batch exclusion
  imageDescription?: string
  imageAlternatives?: any[] | undefined
  templateUsed?: string
  monthlySpecials?: string[]
  specialsIncluded?: boolean
  metadata?: any
  attemptsUsed?: number
  regenerated?: boolean
  scheduledDate?: string
}

type PostStatus = 'generating' | 'completed' | 'error' | 'editing' | 'posted' | 'scheduled'

interface AICapabilities {
  isConfigured: boolean
  availableTemplates: any[]
  supportedPlatforms: any[]
  supportedBusinesses: any[]
}

interface BusinessSettings {
  isConfigured: boolean
  warnings: string[]
  errors: string[]
  monthlySpecials?: string[]
  brandVoice?: string
  serviceTypes?: string[]
  contentThemes?: string[]
}

interface PostingSchedule {
  platforms: {
    [key: string]: {
      enabled: boolean
      daysOfWeek: string[]
      postsPerDay: number
      timeDistribution: 'auto' | 'custom'
      customTimes: string[]
      autoTimes: string[]
    }
  }
}

interface SmartDateConfig {
  mode: 'immediate' | 'next-period' | 'specific-date' | 'custom-range'
  timeframe: '1-week' | '2-week' | '1-month' | '3-month' | 'custom'
  startDate?: Date
  endDate?: Date
  alignToWeek?: boolean
  includePreviousDays?: boolean
}

interface PostScheduleItem {
  business: string
  platform: string
  date: Date
  dayName: string
  theme: string
}

export default function AIContentGenerator() {
  const [capabilities, setCapabilities] = useState<AICapabilities | null>(null)
  const [loading, setLoading] = useState(false)

  // Dynamic business loading from database
  const [dynamicBusinesses, setDynamicBusinesses] = useState<Array<{ id: string; name: string; displayName: string; tagline?: string }>>([])
  const [businessesLoaded, setBusinessesLoaded] = useState(false)

  // Settings integration
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [businessSettings, setBusinessSettings] = useState<Record<string, BusinessSettings>>({})
  const [monthlySpecials, setMonthlySpecials] = useState<Record<string, any>>({})
  const [postingSchedules, setPostingSchedules] = useState<Record<string, PostingSchedule>>({})

  // Selection state
  const [selectedBusinesses, setSelectedBusinesses] = useState<string[]>([])
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['facebook'])
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>(['seasonal_tip', 'maintenance_reminder', 'promotion'])
  
  // UPDATED: Strategic timeframe selection
  const [selectedTimeframe, setSelectedTimeframe] = useState('1-week')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [editingSpecials, setEditingSpecials] = useState(false)
  
  // Content generation
  const [weeklyPosts, setWeeklyPosts] = useState<WeeklyPost[]>([])
  const [isGeneratingWeek, setIsGeneratingWeek] = useState(false)
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 })
  
  // Image handling
  const [showImageSelector, setShowImageSelector] = useState<string | null>(null)
  const [imageLoading, setImageLoading] = useState<string | null>(null)
  const [availableImages, setAvailableImages] = useState<any[]>([])
  const [imageSearchQuery, setImageSearchQuery] = useState('')
  
  // Post selection for bulk actions
  const [selectedPosts, setSelectedPosts] = useState<string[]>([])
  
  // Post/Schedule functionality 
  const [schedulingPost, setSchedulingPost] = useState<string | null>(null)
  const [scheduleDate, setScheduleDate] = useState(new Date().toISOString().split('T')[0])
  const [scheduleTime, setScheduleTime] = useState('09:00')
  const [postingInProgress, setPostingInProgress] = useState<string | null>(null)

  // FIXED: Post editing state moved to component level
  const [editingPost, setEditingPost] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')

  // Expanded posts for compact view
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set())

  const [smartDateConfig, setSmartDateConfig] = useState<SmartDateConfig>({
    mode: 'immediate',
    timeframe: '1-week',
    alignToWeek: false,
    includePreviousDays: false
  })

  const [datePreview, setDatePreview] = useState<{
    start: Date
    end: Date
    relevantMonths: number[]
    postCount: number
  } | null>(null)

  // Load businesses from database on mount
  useEffect(() => {
    async function loadBusinesses() {
      try {
        const res = await fetch('/api/businesses')
        const data = await res.json()
        if (data.success && data.businesses) {
          setDynamicBusinesses(data.businesses.map((b: any) => ({
            id: b.id, name: b.name, displayName: b.displayName, tagline: b.tagline
          })))
          if (data.businesses.length > 0 && selectedBusinesses.length === 0) {
            setSelectedBusinesses([data.businesses[0].id])
          }
        }
      } catch (err) {
        console.error('Failed to load businesses:', err)
      } finally {
        setBusinessesLoaded(true)
      }
    }
    loadBusinesses()
  }, [])

  // Initialize capabilities and settings
  useEffect(() => {
    loadCapabilities()
    loadBusinessSettings()
  }, [])

  // Reload settings when selection changes
  useEffect(() => {
    if (selectedBusinesses.length > 0) {
      loadBusinessSettings()
      loadPostingSchedules()
    }
  }, [selectedBusinesses])
  
  // Initialize date preview
  useEffect(() => {
    updateSmartDateConfig({})
  }, [selectedBusinesses, selectedPlatforms])

  // Load AI capabilities
  const loadCapabilities = async () => {
    setLoading(true)
    try {
      // Check OpenAI configuration
      const response = await fetch('/api/ai/capabilities')
      const data = await response.json()
      
      setCapabilities({
        isConfigured: data.success,
        availableTemplates: AVAILABLE_TEMPLATES,
        supportedPlatforms: PLATFORMS,
        supportedBusinesses: dynamicBusinesses
      })
    } catch (error) {
      console.error('Failed to load AI capabilities:', error)
      setCapabilities({
        isConfigured: false,
        availableTemplates: [],
        supportedPlatforms: [],
        supportedBusinesses: []
      })
    } finally {
      setLoading(false)
    }
  }

  const SmartDateCalculator = {
    calculateStartDate(config: SmartDateConfig) {
      const today = new Date()
      const currentDay = today.getDay() // 0 = Sunday, 1 = Monday, etc.
      
      switch (config.mode) {
        case 'immediate':
          return today
          
        case 'next-period':
          if (config.timeframe.includes('week')) {
            // Start from next Monday (unless today is Monday)
            const daysUntilMonday = currentDay === 1 ? 0 : (8 - currentDay) % 7
            const nextMonday = new Date(today)
            nextMonday.setDate(today.getDate() + daysUntilMonday)
            return nextMonday
          } else if (config.timeframe.includes('month')) {
            // Start from first day of next month
            const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1)
            return nextMonth
          }
          return today
          
        case 'specific-date':
          return config.startDate || today
          
        case 'custom-range':
          return config.startDate || today
          
        default:
          return today
      }
    },
    
    calculateEndDate(startDate: Date, timeframe: string) {
      const endDate = new Date(startDate)
      
      switch (timeframe) {
        case '1-week':
          endDate.setDate(startDate.getDate() + 6)
          break
        case '2-week':
          endDate.setDate(startDate.getDate() + 13)
          break
        case '1-month':
          endDate.setMonth(startDate.getMonth() + 1)
          endDate.setDate(endDate.getDate() - 1)
          break
        case '3-month':
          endDate.setMonth(startDate.getMonth() + 3)
          endDate.setDate(endDate.getDate() - 1)
          break
      }
      
      return endDate
    },
    
    getRelevantMonths(startDate: Date, endDate: Date) {
      const months: Set<number> = new Set()
      const current = new Date(startDate)
      
      while (current <= endDate) {
        months.add(current.getMonth())
        current.setDate(current.getDate() + 1)
      }
      
      return Array.from(months)
    }
  }

  // FIXED: Enhanced business settings loading with comprehensive debugging
  const loadBusinessSettings = async () => {
    setSettingsLoading(true)
    const newSettings: Record<string, BusinessSettings> = {}
    const newMonthlySpecials: Record<string, any> = {}

    for (const businessId of selectedBusinesses) {
      try {
        console.log(`📄 Loading settings for business: ${businessId}`)
        
        // Load business settings
        const settingsResponse = await fetch(`/api/businesses/${businessId}/settings-status`)
        if (settingsResponse.ok) {
          const settingsData = await settingsResponse.json()
          console.log(`📋 Settings status for ${businessId}:`, settingsData)
          
          newSettings[businessId] = {
            isConfigured: settingsData.isConfigured,
            warnings: settingsData.warnings || [],
            errors: settingsData.errors || []
          }
        }
        
        // FIX: Load monthly specials explicitly and with better debugging
        const currentYear = new Date().getFullYear()
        const currentMonth = new Date().getMonth()
        console.log(`📅 Loading specials for ${businessId}, year: ${currentYear}, month: ${currentMonth}`)
        
        const specialsResponse = await fetch(`/api/businesses/${businessId}/monthly-specials?year=${currentYear}`)
        if (specialsResponse.ok) {
          const specialsData = await specialsResponse.json()
          console.log(`📊 Raw monthly specials data for ${businessId}:`, specialsData)
          
          if (specialsData.success && specialsData.specials) {
            // Get current month's specials
            const currentMonthSpecials = specialsData.specials.find((s: any) => s.month === currentMonth)
            if (currentMonthSpecials) {
              newMonthlySpecials[businessId] = currentMonthSpecials
              console.log(`✅ Found specials for ${businessId} month ${currentMonth}:`, currentMonthSpecials)
            } else {
              console.log(`⚠️ No specials found for ${businessId} month ${currentMonth}`)
              console.log(`Available months:`, specialsData.specials.map((s: any) => s.month))
            }
          }
        }
        
      } catch (error) {
        console.error(`❌ Failed to load settings for ${businessId}:`, error)
        newSettings[businessId] = {
          isConfigured: false,
          warnings: [],
          errors: [`Failed to load settings: ${error}`]
        }
      }
    }

    setBusinessSettings(newSettings)
    setMonthlySpecials(newMonthlySpecials)
    setSettingsLoading(false)
    
    // FIX: Add comprehensive debug output
    console.log('🔍 Final loaded settings:', {
      businessSettings: newSettings,
      monthlySpecials: newMonthlySpecials,
      selectedBusinesses,
      selectedPlatforms,
      debugInfo: {
        currentMonth: new Date().getMonth(),
        currentYear: new Date().getFullYear(),
        includeSpecialsForced: true
      }
    })
  }

  // Load available images for business
  const loadAvailableImages = async (businessId: string, searchQuery: string = '') => {
    try {
      const params = new URLSearchParams({
        businessId,
        limit: '100', // Increase limit to show more images
        offset: '0',
        ...(searchQuery && { search: searchQuery })
      })
      
      console.log(`📸 Loading images for business: ${businessId}, search: "${searchQuery}"`)
      
      const response = await fetch(`/api/businesses/${businessId}/images?${params}`)
      
      if (!response.ok) {
        console.error('Failed to load images:', response.status, response.statusText)
        setAvailableImages([])
        return
      }
      
      const data = await response.json()
      console.log(`📸 Loaded ${data.images?.length || 0} images for ${businessId}`)
      console.log('📸 First few images:', data.images?.slice(0, 3))
      
      setAvailableImages(data.images || [])
    } catch (error) {
      console.error('Failed to load available images:', error)
      setAvailableImages([])
    }
  }

  // Handle post selection
  const togglePostSelection = (postId: string) => {
    setSelectedPosts(prev =>
      prev.includes(postId)
        ? prev.filter(id => id !== postId)
        : [...prev, postId]
    )
  }

  // Toggle post expansion
  const togglePostExpansion = (postId: string) => {
    setExpandedPosts(prev => {
      const newSet = new Set(prev)
      if (newSet.has(postId)) {
        newSet.delete(postId)
      } else {
        newSet.add(postId)
      }
      return newSet
    })
  }

  // Expand/collapse all posts
  const expandAllPosts = () => {
    setExpandedPosts(new Set(weeklyPosts.map(p => p.id)))
  }

  const collapseAllPosts = () => {
    setExpandedPosts(new Set())
  }

  const selectAllPosts = () => {
    const completedPosts = weeklyPosts.filter(p => p.status === 'completed').map(p => p.id)
    setSelectedPosts(completedPosts)
  }

  const clearPostSelection = () => {
    setSelectedPosts([])
  }
  
  const loadPostingSchedules = async () => {
    const schedules: Record<string, PostingSchedule> = {}
    
    for (const businessId of selectedBusinesses) {
      try {
        const response = await fetch(`/api/business/posting-schedule?businessId=${businessId}`)
        const data = await response.json()
        
        if (data.success) {
          schedules[businessId] = data.data.postingSchedule
        }
      } catch (error) {
        console.error(`Failed to load posting schedule for ${businessId}:`, error)
      }
    }
    
    setPostingSchedules(schedules)
  }

  const updateSmartDateConfig = (updates: Partial<SmartDateConfig>) => {
    const newConfig = { ...smartDateConfig, ...updates }
    setSmartDateConfig(newConfig)
    
    // Update preview
    const startDate = SmartDateCalculator.calculateStartDate(newConfig)
    const endDate = SmartDateCalculator.calculateEndDate(startDate, newConfig.timeframe)
    const relevantMonths = SmartDateCalculator.getRelevantMonths(startDate, endDate)
    const postCount = calculateSmartPostCount(startDate, endDate)
    
    setDatePreview({ start: startDate, end: endDate, relevantMonths, postCount })
  }

  const calculateSmartPostCount = (startDate: Date, endDate: Date) => {
    let businessDays = 0
    const current = new Date(startDate)
    
    while (current <= endDate) {
      // Count business days (Monday = 1, Friday = 5)
      if (current.getDay() >= 1 && current.getDay() <= 5) {
        businessDays++
      }
      current.setDate(current.getDate() + 1)
    }
    
    return businessDays * selectedBusinesses.length * selectedPlatforms.length
  }

  const generatePostSchedule = (startDate: Date, endDate: Date) => {
    const schedule: PostScheduleItem[] = []
    const current = new Date(startDate)

    while (current <= endDate) {
      const dayName = current.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
      
      // Skip weekends for business posts
      if (current.getDay() >= 1 && current.getDay() <= 5) {
        for (const business of selectedBusinesses) {
          for (const platform of selectedPlatforms) {
            schedule.push({
              business,
              platform,
              date: new Date(current),
              dayName,
              theme: getDailyTheme(dayName)
            })
          }
        }
      }
      
      current.setDate(current.getDate() + 1)
    }

    return schedule
  }

  const getDailyTheme = (dayName: string) => {
    const themes = {
      monday: 'Monday Motivation',
      tuesday: 'Tuesday Tips', 
      wednesday: 'Wednesday Specials',
      thursday: 'Thursday Maintenance',
      friday: 'Friday Prep'
    }
    return themes[dayName as keyof typeof themes] || 'Daily Content'
  }

  const getMonthName = (monthIndex: number) => {
    return new Date(2024, monthIndex, 1).toLocaleString('en-US', { month: 'long' })
  }

  // Helper function to get optimal posting times from business settings
  const getOptimalPostingTimes = (businessId: string, platform: string, startDate: Date) => {
    const schedule = postingSchedules[businessId]
    const platformSchedule = schedule?.platforms?.[platform]
    
    if (!platformSchedule?.enabled || !platformSchedule.daysOfWeek?.length) {
      console.log(`⚠️ No posting schedule found for ${businessId} on ${platform}, using default times`)
      // Fallback to default times if no schedule configured
      return [new Date(startDate.getTime() + (2 * 60 * 60 * 1000))] // 2 hours from start date
    }

    const times: Date[] = []
    const startDateCopy = new Date(startDate)
    
    // Get the times to post at
    const postingTimes = platformSchedule.timeDistribution === 'custom' 
      ? platformSchedule.customTimes || []
      : platformSchedule.autoTimes || ['09:00', '13:00', '17:00']

    // If no times specified, use defaults
    if (postingTimes.length === 0) {
      console.log(`⚠️ No posting times configured for ${businessId} on ${platform}, using defaults`)
      return [new Date(startDate.getTime() + (2 * 60 * 60 * 1000))]
    }

    // Generate scheduled times for the next week
    let currentDate = new Date(startDateCopy)
    let daysGenerated = 0
    
    while (times.length < 10 && daysGenerated < 14) { // Generate up to 10 times, max 2 weeks out
      const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
      
      if (platformSchedule.daysOfWeek.includes(dayName)) {
        // Add posts for this day
        const postsForDay = Math.min(platformSchedule.postsPerDay, postingTimes.length)
        
        for (let i = 0; i < postsForDay; i++) {
          const timeStr = postingTimes[i % postingTimes.length]
          const [hours, minutes] = timeStr.split(':').map(Number)
          
          const scheduledTime = new Date(currentDate)
          scheduledTime.setHours(hours, minutes, 0, 0)
          
          // Ensure it's in the future
          if (scheduledTime > new Date()) {
            times.push(new Date(scheduledTime))
          }
        }
      }
      
      currentDate.setDate(currentDate.getDate() + 1)
      daysGenerated++
    }

    // If we still don't have times, generate some defaults
    if (times.length === 0) {
      console.log(`⚠️ Could not generate posting times for ${businessId} on ${platform}, using fallback`)
      const fallbackTime = new Date(startDate.getTime() + (2 * 60 * 60 * 1000))
      times.push(fallbackTime)
    }

    console.log(`📅 Generated ${times.length} optimal posting times for ${businessId} on ${platform}`)
    return times.sort((a, b) => a.getTime() - b.getTime())
  }

  // Get expected post count based on selection
  const getExpectedPostCount = () => {
    return datePreview?.postCount || 0
  }

  // Generate week of content
  const generateContentWithSmartDates = async () => {
    if (selectedBusinesses.length === 0 || selectedPlatforms.length === 0) {
      alert('Please select at least one business and one platform')
      return
    }

    setIsGeneratingWeek(true)
    setWeeklyPosts([])

    try {
      // Calculate date range using smart logic
      const startDate = SmartDateCalculator.calculateStartDate(smartDateConfig)
      const endDate = SmartDateCalculator.calculateEndDate(startDate, smartDateConfig.timeframe)
      const relevantMonths = SmartDateCalculator.getRelevantMonths(startDate, endDate)
      
      console.log('📅 Smart date calculation:', {
        startDate: startDate.toLocaleDateString(),
        endDate: endDate.toLocaleDateString(),
        relevantMonths: relevantMonths.map(m => getMonthName(m)),
        config: smartDateConfig
      })

      // Generate post schedule
      const postSchedule = generatePostSchedule(startDate, endDate)
      const totalPosts = postSchedule.length
      setGenerationProgress({ current: 0, total: totalPosts })

      const allPosts: WeeklyPost[] = []
      let currentProgress = 0

      // NEW: Track selected image IDs for batch variety
      const selectedImageIds: string[] = []

      // Generate content for each scheduled post
      for (const scheduleItem of postSchedule) {
        const postId = `${scheduleItem.business}-${scheduleItem.platform}-${scheduleItem.date.toISOString()}-${Date.now()}`

        // Add placeholder post
        const placeholderPost: WeeklyPost = {
          id: postId,
          business: scheduleItem.business,
          day: scheduleItem.dayName,
          platform: scheduleItem.platform,
          content: '',
          characterCount: 0,
          withinLimits: true,
          status: 'generating',
          monthlySpecials: [],
          specialsIncluded: false,
          scheduledDate: scheduleItem.date.toISOString()
        }
        allPosts.push(placeholderPost)
        setWeeklyPosts([...allPosts])

        try {
          // Generate content with enhanced context
          // Pass already-selected image IDs to ensure variety in batch
          const result = await generatePostContentWithContext(
            scheduleItem.business,
            scheduleItem.dayName,
            scheduleItem.platform,
            scheduleItem.date,
            relevantMonths,
            selectedImageIds // NEW: Pass excluded image IDs for variety
          )
          
          const platformInfo = PLATFORMS.find(p => p.id === scheduleItem.platform)
          const characterCount = result.content.length
          const withinLimits = characterCount <= (platformInfo?.charLimit || 1000)

          // Update the post with results
          const updatedPost: WeeklyPost = {
            ...placeholderPost,
            content: result.content,
            characterCount,
            withinLimits,
            status: 'completed',
            suggestedImage: result.suggestedImage,
            suggestedImageUrl: result.suggestedImageUrl,
            selectedImageId: result.selectedImageId, // NEW: Track for batch exclusion
            imageDescription: result.imageDescription,
            imageAlternatives: result.imageAlternatives,
            templateUsed: result.templateUsed,
            monthlySpecials: result.monthlySpecials || [],
            specialsIncluded: result.specialsIncluded || false,
            metadata: result.metadata,
            attemptsUsed: result.attemptsUsed,
            regenerated: result.regenerated
          }

          // NEW: Track selected image ID for subsequent calls to ensure variety
          if (result.selectedImageId) {
            selectedImageIds.push(result.selectedImageId)
            console.log(`🖼️ Added image ${result.selectedImageId} to exclusion list (${selectedImageIds.length} total)`)
          }

          // Update allPosts array
          const postIndex = allPosts.findIndex(p => p.id === postId)
          if (postIndex !== -1) {
            allPosts[postIndex] = updatedPost
          }

        } catch (error) {
          const errorPost: WeeklyPost = {
            ...placeholderPost,
            status: 'error',
            content: `Error: ${error instanceof Error ? error.message : 'Generation failed'}`
          }
          
          const postIndex = allPosts.findIndex(p => p.id === postId)
          if (postIndex !== -1) {
            allPosts[postIndex] = errorPost
          }
        }

        currentProgress++
        setGenerationProgress({ current: currentProgress, total: totalPosts })
        setWeeklyPosts([...allPosts])
        
        // Small delay to prevent rate limiting
        await new Promise(resolve => setTimeout(resolve, 500))
      }

    } catch (error) {
      console.error('Content generation failed:', error)
      alert('Failed to generate content. Please try again.')
    } finally {
      setIsGeneratingWeek(false)
      setGenerationProgress({ current: 0, total: 0 })
    }
  }

  // Enhanced content generation with date context
  const generatePostContentWithContext = async (
    businessId: string,
    dayName: string,
    platform: string,
    postDate: Date,
    relevantMonths: number[],
    excludeImageIds: string[] = [] // NEW: Exclude already-selected images in batch
  ) => {
    const response = await fetch('/api/ai/generate-enhanced-content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: `Generate ${getDailyTheme(dayName)} content for ${businessId}`,
        businessId,
        platform,
        contentType: 'smart-scheduled',
        includeSpecials: true,
        includeImages: true,
        includeContentBlocks: true,
        day: dayName,
        postDate: postDate.toISOString(),
        relevantMonths, // Pass all relevant months for specials
        seasonalContext: getSeasonalContext(postDate),
        excludeImageIds // NEW: Pass excluded image IDs for batch variety
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Content generation failed')
    }

    return (await response.json()).data
  }

  const getSeasonalContext = (date: Date) => {
    const month = date.getMonth()
    const seasons = {
      winter: [11, 0, 1], // Dec, Jan, Feb
      spring: [2, 3, 4],  // Mar, Apr, May  
      summer: [5, 6, 7],  // Jun, Jul, Aug
      fall: [8, 9, 10]    // Sep, Oct, Nov
    }
    
    for (const [season, months] of Object.entries(seasons)) {
      if (months.includes(month)) {
        return season
      }
    }
    return 'general'
  }

  // FIX: Generate content for a specific post with all the fixes
  const generatePostContent = async (businessId: string, day: string, platform: string) => {
    console.log(`🎯 Generating content for ${businessId} - ${day} - ${platform}`)
    
    const response = await fetch('/api/ai/generate-enhanced-content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: `Generate ${DAILY_THEMES[day as keyof typeof DAILY_THEMES]?.theme || day} content for ${businessId}`,
        businessId,
        platform,
        contentType: 'weekly-automation',
        // FIX 1: Force includeSpecials to TRUE as debug shows it should be
        includeSpecials: true, // Was: selectedTemplates.includes('promotion')
        includeImages: true,
        includeContentBlocks: true,
        day,
        // FIX 2: Add explicit month parameter to ensure current month specials are used
        month: new Date().getMonth() // Add current month (0-11)
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Content generation failed')
    }

    const result = await response.json()
    console.log(`✅ Generated content result:`, result.data)
    console.log(`📊 Monthly specials included:`, result.data.monthlySpecials)
    console.log(`🖼️ Image selected:`, result.data.suggestedImageUrl)
    
    return result.data
  }

  // FIXED: Post editing functions
  const editPost = (postId: string, newContent: string) => {
    setWeeklyPosts(prev => prev.map(post => {
      if (post.id === postId) {
        const platformInfo = PLATFORMS.find(p => p.id === post.platform)
        const characterCount = newContent.length
        const withinLimits = characterCount <= (platformInfo?.charLimit || 1000)
        
        return {
          ...post,
          content: newContent,
          characterCount,
          withinLimits,
          status: 'editing' as const,
          originalContent: post.originalContent || post.content,
          isEdited: true
        }
      }
      return post
    }))
  }

  const savePostEdit = (postId: string) => {
    setWeeklyPosts(prev => prev.map(post => {
      if (post.id === postId && post.status === 'editing') {
        const platformInfo = PLATFORMS.find(p => p.id === post.platform)
        const characterCount = post.content.length
        const withinLimits = characterCount <= (platformInfo?.charLimit || 1000)
        
        return {
          ...post,
          characterCount,
          withinLimits,
          status: 'completed' as const, // Change from 'editing' back to 'completed'
          isEdited: true
        }
      }
      return post
    }))
    
    console.log(`✅ Post ${postId} edits saved`)
  }

  // Cancel editing
  const cancelPostEdit = (postId: string) => {
    setWeeklyPosts(prev => prev.map(post => {
      if (post.id === postId && post.status === 'editing') {
        return {
          ...post,
          content: post.originalContent || post.content,
          status: 'completed' as const,
          isEdited: false
        }
      }
      return post
    }))
  }
  
  // Regenerate a specific post
  const regeneratePost = async (postId: string) => {
    const post = weeklyPosts.find(p => p.id === postId)
    if (!post) return

    setWeeklyPosts(prev => prev.map(p => 
      p.id === postId ? { ...p, status: 'generating' as const } : p
    ))

    try {
      const result = await generatePostContent(post.business, post.day, post.platform)
      const platformInfo = PLATFORMS.find(p => p.id === post.platform)
      const characterCount = result.content.length
      const withinLimits = characterCount <= (platformInfo?.charLimit || 1000)

      setWeeklyPosts(prev => prev.map(p =>
        p.id === postId
          ? { ...p, ...result, characterCount, withinLimits, status: 'completed' as const, regenerated: true }
          : p
      ))
    } catch (error) {
      setWeeklyPosts(prev => prev.map(p =>
        p.id === postId
          ? { ...p, status: 'error' as const, content: `Error: ${error instanceof Error ? error.message : 'Regeneration failed'}` }
          : p
      ))
    }
  }

  // Post now
const postNow = async (postId: string) => {
  const post = weeklyPosts.find(p => p.id === postId)
  if (!post) return

  console.log('🚀 POST NOW DEBUG:', {
    postId,
    platform: post.platform,
    businessId: post.business,
    hasImage: !!post.suggestedImageUrl,
    imageUrl: post.suggestedImageUrl
  })

  setPostingInProgress(postId)
  
  try {
    // Use the SAME route and format as PostCreation.tsx
    const formData = new FormData()
    
    // Required fields
    formData.append('content', post.content)
    formData.append('contentType', 'ai-generated')
    formData.append('platforms', JSON.stringify([post.platform])) // Array format
    formData.append('businesses', JSON.stringify([post.business])) // Array format
    formData.append('scheduling', JSON.stringify({ type: 'now' })) // Immediate posting
    
    // Handle image if present - FIXED: Send URL to server instead of fetching in browser
    if (post.suggestedImageUrl) {
      console.log('🖼️ Adding image URL to FormData:', post.suggestedImageUrl)
      
      // Send the URL to the server - let the server fetch it (no CORS issues)
      formData.append('aiImageUrl', post.suggestedImageUrl)
      formData.append('imageCount', '1')
      
      console.log('✅ Image URL added to FormData')
    } else {
      formData.append('imageCount', '0')
    }
    
    // Add empty library images (AIContentGenerator doesn't use library)
    formData.append('libraryImageIds', JSON.stringify([]))

    console.log('📤 Making request to /api/social/create-posts with FormData')
    
    // Use the SAME route as PostCreation.tsx
    const response = await fetch('/api/social/create-posts', {
      method: 'POST',
      body: formData // No Content-Type header - FormData sets it automatically
    })

    console.log('📡 Response status:', response.status, response.ok)
    
    const responseText = await response.text()
    console.log('📡 Raw response:', responseText)

    let result
    try {
      result = JSON.parse(responseText)
    } catch (parseError) {
      console.error('❌ Failed to parse response as JSON:', parseError)
      throw new Error(`Invalid response: ${responseText}`)
    }

    console.log('📡 Parsed response:', result)

    if (response.ok && result.success) {
      setWeeklyPosts(prev => prev.map(p =>
        p.id === postId ? { ...p, status: 'posted' as const } : p
      ))
      alert('Post published successfully!')
    } else {
      const errorMessage = result.error || result.errors?.[0] || `HTTP ${response.status}: ${responseText}`
      console.error('❌ Post failed:', errorMessage)
      throw new Error(errorMessage)
    }
    
  } catch (error) {
    console.error('❌ Post Now Error Details:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    alert(`Post failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  } finally {
    setPostingInProgress(null)
  }
}

  // Schedule post
  const schedulePost = async (postId: string) => {
    const post = weeklyPosts.find(p => p.id === postId)
    if (!post || !scheduleDate || !scheduleTime) return

    try {
      const scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime}`)

      const response = await fetch('/api/social/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: post.content,
          platform: post.platform,
          businessId: post.business,
          imageUrl: post.suggestedImageUrl,
          scheduledFor: scheduledDateTime.toISOString()
        })
      })

      if (response.ok) {
        setWeeklyPosts(prev => prev.map(p =>
          p.id === postId 
            ? { ...p, status: 'scheduled' as const, scheduledDate: scheduledDateTime.toISOString() }
            : p
        ))
        setSchedulingPost(null)
        alert('Post scheduled successfully!')
      } else {
        throw new Error('Failed to schedule post')
      }
    } catch (error) {
      console.error('Scheduling failed:', error)
      alert('Failed to schedule post. Please try again.')
    }
  }

  // Bulk schedule all posts using business settings
  const scheduleAllPosts = async () => {
    const schedulablePosts = weeklyPosts.filter(p => p.status === 'completed')
    
    if (schedulablePosts.length === 0) {
      alert('No posts available to schedule')
      return
    }

    try {
      setIsGeneratingWeek(true)
      setGenerationProgress({ current: 0, total: schedulablePosts.length })

      const postsToSchedule: any[] = []
      const startDate = scheduleDate ? new Date(scheduleDate) : new Date()

      // Group posts by business and platform to use their optimal times
      const postGroups: Record<string, Record<string, typeof schedulablePosts>> = {}
      
      schedulablePosts.forEach(post => {
        if (!postGroups[post.business]) postGroups[post.business] = {}
        if (!postGroups[post.business][post.platform]) postGroups[post.business][post.platform] = []
        postGroups[post.business][post.platform].push(post)
      })

      // Schedule each group using their business settings
      Object.entries(postGroups).forEach(([businessId, platforms]) => {
        Object.entries(platforms).forEach(([platform, posts]) => {
          try {
            const optimalTimes = getOptimalPostingTimes(businessId, platform, startDate)
            
            posts.forEach((post, index) => {
              // Use optimal times, or fallback to hourly spacing if we run out
              let scheduledDateTime: Date
              
              if (index < optimalTimes.length) {
                scheduledDateTime = optimalTimes[index]
              } else {
                // Fallback: space remaining posts 2 hours apart from the last optimal time
                const lastOptimalTime = optimalTimes[optimalTimes.length - 1] || startDate
                scheduledDateTime = new Date(lastOptimalTime.getTime() + ((index - optimalTimes.length + 1) * 2 * 60 * 60 * 1000))
              }

              postsToSchedule.push({
                content: post.content,
                platform: post.platform,
                businessId: post.business,
                imageUrl: post.suggestedImageUrl,
                scheduledFor: scheduledDateTime.toISOString()
              })
            })
          } catch (error) {
            console.error(`Error processing ${businessId} ${platform}:`, error)
            // Fallback: schedule posts with simple time spacing
            posts.forEach((post, index) => {
              const scheduledDateTime = new Date(startDate.getTime() + ((index + 1) * 2 * 60 * 60 * 1000))
              postsToSchedule.push({
                content: post.content,
                platform: post.platform,
                businessId: post.business,
                imageUrl: post.suggestedImageUrl,
                scheduledFor: scheduledDateTime.toISOString()
              })
            })
          }
        })
      })

      console.log(`🗓️ Bulk scheduling ${postsToSchedule.length} posts using business posting schedules...`)

      // ADD DEBUG INFO
      console.log('📊 Debug: postsToSchedule data:', postsToSchedule)
      console.log('📊 Debug: first post data:', postsToSchedule[0])

      // Call bulk schedule API
      const response = await fetch('/api/social/schedule-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ posts: postsToSchedule })
      })

      console.log('📊 Debug: API response status:', response.status)
      console.log('📊 Debug: API response ok:', response.ok)

      let result
      try {
        const responseText = await response.text()
        console.log('📊 Debug: Raw API response:', responseText)
        result = JSON.parse(responseText)
        console.log('📊 Debug: Parsed API result:', result)
      } catch (parseError) {
        console.error('📊 Debug: Failed to parse API response:', parseError)
        throw new Error('Invalid API response')
      }

      console.log('📊 Debug: About to check result.success:', result.success)
      if (result.success) {
        console.log('📊 Debug: Inside success block')
        console.log('📊 Debug: result.results structure:', result.results)
        console.log('📊 Debug: result.results.scheduled:', result.results?.scheduled)
        console.log('📊 Debug: schedulablePosts count:', schedulablePosts.length)
        
        // Update post statuses to scheduled
        setWeeklyPosts(prev => prev.map(post => {
          const scheduledPost = result.results?.scheduled?.find((s: any) => 
            s.platform === post.platform && 
            s.businessId === post.business &&
            schedulablePosts.some(sp => sp.id === post.id)
          )
          
          console.log(`📊 Debug: Checking post ${post.id} (${post.business}-${post.platform}), found scheduled:`, !!scheduledPost)
          
          if (scheduledPost) {
            console.log(`📊 Debug: Updating post ${post.id} to scheduled status`)
            return {
              ...post,
              status: 'scheduled' as const,
              scheduledDate: scheduledPost.scheduledFor
            }
          }
          return post
        }))

        alert(`✅ ${result.results?.summary?.successful || 0} posts scheduled using your business posting schedules!${
          (result.results?.summary?.failed || 0) > 0 ? 
            ` ${result.results.summary.failed} failed.` : ''
        }`)
        
        console.log('📊 Bulk scheduling results:', result.results?.summary)
      } else {
        console.log('📊 Debug: Inside failure block, error:', result.error)
        console.log('📊 Debug: Full result object in failure:', result)
        throw new Error(result.error || 'Bulk scheduling failed')
      }

    } catch (error) {
      console.error('❌ Bulk scheduling failed:', error)
      alert(`Failed to schedule posts: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsGeneratingWeek(false)
      setGenerationProgress({ current: 0, total: 0 })
    }
  }

  // Schedule selected posts only
  const scheduleSelectedPosts = async () => {
    if (selectedPosts.length === 0) {
      alert('Please select posts to schedule')
      return
    }

    const schedulablePosts = weeklyPosts.filter(p => selectedPosts.includes(p.id) && p.status === 'completed')
    
    if (schedulablePosts.length === 0) {
      alert('No completed posts selected')
      return
    }

    try {
      setIsGeneratingWeek(true)
      setGenerationProgress({ current: 0, total: schedulablePosts.length })

      const postsToSchedule: any[] = []
      const startDate = scheduleDate ? new Date(scheduleDate) : new Date()

      // Group posts by business and platform to use their optimal times
      const postGroups: Record<string, Record<string, typeof schedulablePosts>> = {}
      
      schedulablePosts.forEach(post => {
        if (!postGroups[post.business]) postGroups[post.business] = {}
        if (!postGroups[post.business][post.platform]) postGroups[post.business][post.platform] = []
        postGroups[post.business][post.platform].push(post)
      })

      // Schedule each group using their business settings
      Object.entries(postGroups).forEach(([businessId, platforms]) => {
        Object.entries(platforms).forEach(([platform, posts]) => {
          const optimalTimes = getOptimalPostingTimes(businessId, platform, startDate)
          
          posts.forEach((post, index) => {
            let scheduledDateTime: Date
            
            if (index < optimalTimes.length) {
              scheduledDateTime = optimalTimes[index]
            } else {
              const lastOptimalTime = optimalTimes[optimalTimes.length - 1] || startDate
              scheduledDateTime = new Date(lastOptimalTime.getTime() + ((index - optimalTimes.length + 1) * 2 * 60 * 60 * 1000))
            }

            postsToSchedule.push({
              content: post.content,
              platform: post.platform,
              businessId: post.business,
              imageUrl: post.suggestedImageUrl,
              scheduledFor: scheduledDateTime.toISOString()
            })
          })
        })
      })

      console.log(`🗓️ Scheduling ${postsToSchedule.length} selected posts...`)

      const response = await fetch('/api/social/schedule-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ posts: postsToSchedule })
      })

      const result = await response.json()
      
      console.log('📊 Debug: About to check result.success:', result.success)
      if (result.success) {
        console.log('📊 Debug: Inside success block')
        console.log('📊 Debug: result.results structure:', result.results)
        console.log('📊 Debug: result.results.scheduled:', result.results?.scheduled)
        console.log('📊 Debug: schedulablePosts count:', schedulablePosts.length)
        
        setWeeklyPosts(prev => prev.map(post => {
          const scheduledPost = result.results?.scheduled?.find((s: any) => 
            s.platform === post.platform && 
            s.businessId === post.business &&
            schedulablePosts.some(sp => sp.id === post.id)
          )
          
          console.log(`📊 Debug: Checking post ${post.id} (${post.business}-${post.platform}), found scheduled:`, !!scheduledPost)
          
          if (scheduledPost) {
            console.log(`📊 Debug: Updating post ${post.id} to scheduled status`)
            return {
              ...post,
              status: 'scheduled' as const,
              scheduledDate: scheduledPost.scheduledFor
            }
          }
          return post
        }))

        // Clear selection after scheduling
        setSelectedPosts([])
        
        alert(`✅ ${result.results?.summary?.successful || 0} selected posts scheduled!${
          (result.results?.summary?.failed || 0) > 0 ? 
            ` ${result.results.summary.failed} failed.` : ''
        }`)
        
        console.log('📊 Bulk scheduling results:', result.results?.summary)
      } else {
        console.log('📊 Debug: Inside failure block, error:', result.error)
        console.log('📊 Debug: Full result object in failure:', result)
        throw new Error(result.error || 'Scheduling failed')
      }

    } catch (error) {
      console.error('❌ Selected posts scheduling failed:', error)
      alert(`Failed to schedule selected posts: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsGeneratingWeek(false)
      setGenerationProgress({ current: 0, total: 0 })
    }
  }

  // Select suggested image for a post
  const selectSuggestedImage = async (postId: string, imageUrl: string) => {
    setImageLoading(postId)
    
    try {
      // Update the post with the selected image
      setWeeklyPosts(prev => prev.map(post => 
        post.id === postId 
          ? { ...post, suggestedImageUrl: imageUrl }
          : post
      ))

      // **NEW: Update image usage in database**
      // Find the image that was selected
      const selectedImage = availableImages.find(img => 
        img.cloudUrl === imageUrl || 
        img.url === imageUrl || 
        img.originalUrl === imageUrl
      )
      
      if (selectedImage) {
        try {
          // Update usage count and last used timestamp
          const response = await fetch(`/api/businesses/${selectedImage.businessId}/images/${selectedImage.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              // Increment usage count (the PATCH endpoint should handle this)
              _updateUsage: true, // Flag to indicate this is a usage update
              lastUsed: new Date().toISOString()
            })
          })

          if (response.ok) {
            console.log(`✅ Updated usage for image: ${selectedImage.originalName}`)
            
            // Update local state to reflect the usage change
            setAvailableImages(prev => prev.map(img => 
              img.id === selectedImage.id 
                ? { 
                    ...img, 
                    usageCount: (img.usageCount || 0) + 1,
                    lastUsed: new Date().toISOString()
                  }
                : img
            ))
          } else {
            console.warn('Failed to update image usage:', response.status)
          }
        } catch (error) {
          console.error('Error updating image usage:', error)
          // Don't fail the image selection if usage tracking fails
        }
      }
      
      alert('Image updated successfully!')
    } catch (error) {
      console.error('Failed to update image:', error)
      alert('Failed to update image')
    } finally {
      setImageLoading(null)
      setShowImageSelector(null)
    }
  }

  // Open image selector with business images
  const openImageSelector = async (postId: string) => {
    const post = weeklyPosts.find(p => p.id === postId)
    if (!post) return
    
    setShowImageSelector(postId)
    setImageSearchQuery('')
    await loadAvailableImages(post.business)
  }

  // Search images
  const searchImages = async (query: string) => {
    setImageSearchQuery(query)
    const post = weeklyPosts.find(p => p.id === showImageSelector)
    if (!post) return
    
    await loadAvailableImages(post.business, query)
  }

  // Handle month change for specials editing
  const changeSpecialsMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = direction === 'next' 
        ? (prev + 1) % 12 
        : prev === 0 ? 11 : prev - 1
      return newMonth
    })
  }

  // FIXED: Render a post card
  const renderPost = (post: WeeklyPost, index: number) => {
    const businessInfo = dynamicBusinesses.find(b => b.id === post.business) || { id: post.business, name: post.business, displayName: post.business }
    const platformInfo = PLATFORMS.find(p => p.id === post.platform)
    const dayTheme = DAILY_THEMES[post.day as keyof typeof DAILY_THEMES]
    const isExpanded = expandedPosts.has(post.id)

    const getStatusColor = (status: string) => {
      switch (status) {
        case 'generating': return 'text-yellow-400'
        case 'completed': return 'text-green-400'
        case 'error': return 'text-red-400'
        case 'editing': return 'text-blue-400'
        case 'posted': return 'text-purple-400'
        case 'scheduled': return 'text-cyan-400'
        default: return 'text-gray-400'
      }
    }

    const getStatusBadge = (status: string) => {
      switch (status) {
        case 'generating': return { text: '⏳', bg: 'bg-yellow-500/20' }
        case 'completed': return { text: '✅', bg: 'bg-green-500/20' }
        case 'error': return { text: '❌', bg: 'bg-red-500/20' }
        case 'editing': return { text: '✏️', bg: 'bg-blue-500/20' }
        case 'posted': return { text: '🚀', bg: 'bg-purple-500/20' }
        case 'scheduled': return { text: '📅', bg: 'bg-cyan-500/20' }
        default: return { text: '•', bg: 'bg-gray-500/20' }
      }
    }

    // Get excerpt (first 80 characters)
    const excerpt = post.content
      ? post.content.length > 80
        ? post.content.substring(0, 80) + '...'
        : post.content
      : 'Generating...'

    const statusBadge = getStatusBadge(post.status)

    // Compact View
    if (!isExpanded) {
      return (
        <div
          key={post.id}
          className="bg-slate-800/50 rounded-lg p-3 border border-slate-700 hover:border-slate-600 cursor-pointer transition-all"
          onClick={() => togglePostExpansion(post.id)}
        >
          <div className="flex items-center gap-3">
            {/* Checkbox - prevent expansion when clicking */}
            {post.status === 'completed' && (
              <input
                type="checkbox"
                checked={selectedPosts.includes(post.id)}
                onChange={() => togglePostSelection(post.id)}
                onClick={(e) => e.stopPropagation()}
                className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500 flex-shrink-0"
              />
            )}

            {/* Thumbnail */}
            {post.suggestedImageUrl ? (
              <div className="w-12 h-12 relative rounded overflow-hidden bg-gray-800 flex-shrink-0">
                <Image
                  src={post.suggestedImageUrl}
                  alt={post.imageDescription || 'Post image'}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-12 h-12 rounded bg-slate-700/50 flex items-center justify-center flex-shrink-0">
                <span className="text-lg">{platformInfo?.icon}</span>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-accent-blue">
                  {businessInfo?.displayName}
                </span>
                <span className="text-slate-600">•</span>
                <span className={`text-xs ${platformInfo?.color}`}>
                  {platformInfo?.name}
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-xs text-slate-400">
                  {dayTheme?.theme}
                </span>
              </div>
              <p className="text-sm text-dark-text-muted truncate">
                {excerpt}
              </p>
            </div>

            {/* Status & Char Count */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs text-slate-400">
                {post.characterCount || 0}
              </span>
              <span className={`text-sm ${statusBadge.bg} rounded px-1.5 py-0.5`}>
                {statusBadge.text}
              </span>
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      )
    }

    // Expanded View
    return (
      <div key={post.id} className="bg-slate-800/50 rounded-lg p-4 border border-slate-600">
        {/* Header - clickable to collapse */}
        <div
          className="flex justify-between items-start mb-3 cursor-pointer"
          onClick={() => togglePostExpansion(post.id)}
        >
          <div className="flex items-center gap-3">
            {/* Post Selection Checkbox */}
            {post.status === 'completed' && (
              <input
                type="checkbox"
                checked={selectedPosts.includes(post.id)}
                onChange={() => togglePostSelection(post.id)}
                onClick={(e) => e.stopPropagation()}
                className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500"
              />
            )}
            <div>
              <h4 className="font-medium text-dark-text">
                <span className="text-accent-blue">{businessInfo?.displayName}</span>
                {' • '}
                <span className={platformInfo?.color}>
                  {platformInfo?.icon} {platformInfo?.name}
                </span>
              </h4>
              <div className="text-sm text-dark-text-muted">
                {dayTheme?.emoji} {dayTheme?.theme} • {dayTheme?.focus}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${getStatusColor(post.status)}`}>
              {post.status === 'generating' && '⏳ Generating...'}
              {post.status === 'completed' && '✅ Ready'}
              {post.status === 'error' && '❌ Error'}
              {post.status === 'editing' && '✏️ Editing'}
              {post.status === 'posted' && '🚀 Posted'}
              {post.status === 'scheduled' && '📅 Scheduled'}
            </span>
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </div>
        </div>

        {post.status === 'generating' ? (
          <div className="flex items-center gap-2 text-dark-text-muted">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-400"></div>
            <span>Generating content...</span>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Content */}
            <div className="mb-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-dark-text">Content</span>
                <div className="text-xs space-x-2">
                  <span className={`${
                    post.characterCount <= 100 ? 'text-green-400' :
                    post.characterCount <= (platformInfo?.charLimit || 1000) ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {post.characterCount}/{platformInfo?.charLimit || 1000}
                  </span>
                  {post.platform === 'twitter' && (
                    <span className={`${
                      post.characterCount <= 280 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      Twitter: {post.characterCount <= 280 ? '✅' : '❌'}
                    </span>
                  )}
                </div>
              </div>

              {/* Editing Interface */}
              {editingPost === post.id ? (
                <div className="space-y-3">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full h-32 p-3 bg-gray-800 border border-gray-600 rounded text-dark-text resize-none focus:border-blue-400 focus:outline-none"
                    placeholder="Edit your post content..."
                  />

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        editPost(post.id, editContent)
                        savePostEdit(post.id)
                        setEditingPost(null)
                        setEditContent('')
                      }}
                      className="btn btn-primary btn-sm"
                    >
                      💾 Save Changes
                    </button>
                    <button
                      onClick={() => {
                        cancelPostEdit(post.id)
                        setEditingPost(null)
                        setEditContent('')
                      }}
                      className="btn btn-outline btn-sm"
                    >
                      ✖️ Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* Display Mode */
                <div className="space-y-3">
                  <textarea
                    value={post.content}
                    readOnly
                    className="w-full h-32 p-3 bg-gray-900/50 border border-gray-600 rounded text-dark-text resize-none cursor-pointer hover:bg-gray-900/70"
                    placeholder="Generated content will appear here..."
                    onClick={() => {
                      if (post.status === 'completed') {
                        setEditingPost(post.id)
                        setEditContent(post.content)
                      }
                    }}
                  />

                  {/* Action Buttons */}
                  {post.status === 'completed' && (
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => {
                          setEditingPost(post.id)
                          setEditContent(post.content)
                        }}
                        className="btn btn-outline btn-sm"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => regeneratePost(post.id)}
                        className="btn btn-outline btn-sm"
                      >
                        🔄 Regenerate
                      </button>
                      <button
                        onClick={() => navigator.clipboard.writeText(post.content)}
                        className="btn btn-outline btn-sm"
                      >
                        📋 Copy
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Monthly Specials */}
            {post.monthlySpecials && post.monthlySpecials.length > 0 && (
              <div className="mb-3">
                <span className="text-sm font-medium text-dark-text mb-2 block">Included Specials</span>
                <div className="space-y-1">
                  {post.monthlySpecials.map((special, idx) => (
                    <div key={idx} className="text-xs text-green-400 bg-green-900/20 rounded px-2 py-1">
                      🎯 {special}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Enhanced metadata display with Twitter-specific feedback */}
            {post.metadata && (
              <div className="text-xs text-dark-text-muted space-y-1">
                <div>Template: {post.templateUsed}</div>
                {post.metadata.selectedImages && (
                  <div>Images: {post.metadata.selectedImages}</div>
                )}
                {post.attemptsUsed && post.attemptsUsed > 1 && (
                  <div className="text-yellow-400">
                    Generated in {post.attemptsUsed} attempts
                    {post.platform === 'twitter' && ' (Twitter character limit enforcement)'}
                  </div>
                )}
                {post.scheduledDate && (
                  <div className="text-blue-400">
                    Scheduled: {new Date(post.scheduledDate).toLocaleString()}
                  </div>
                )}
                {post.metadata.rotationStats && Object.keys(post.metadata.rotationStats).length > 0 && (
                  <div className="text-green-400">
                    Rotation: {JSON.stringify(post.metadata.rotationStats[post.business] || 'N/A')}
                  </div>
                )}
              </div>
            )}

            {/* Image Section */}
            {post.suggestedImageUrl ? (
              <div className="mb-3">
                <span className="text-sm font-medium text-dark-text mb-2 block">Suggested Image</span>
                <div className="flex items-start gap-3">
                  <div className="w-20 h-20 relative rounded overflow-hidden bg-gray-800 flex-shrink-0">
                    <Image
                      src={post.suggestedImageUrl}
                      alt={post.imageDescription || 'Suggested image'}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-dark-text-muted mb-2">
                      {post.imageDescription || 'AI-selected image'}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openImageSelector(post.id)}
                        className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 bg-blue-900/20 rounded"
                      >
                        🖼️ Change Image
                      </button>
                      {post.imageAlternatives && post.imageAlternatives.length > 0 && (
                        <span className="text-xs text-slate-400">
                          +{post.imageAlternatives.length} more options
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : post.status === 'completed' && (
              <div className="mb-3">
                <span className="text-sm font-medium text-dark-text mb-2 block">Image</span>
                <div className="text-xs text-dark-text-muted">
                  No image suggested for this post
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => regeneratePost(post.id)}
            disabled={post.status === 'generating'}
            className="btn btn-secondary btn-sm"
          >
            {post.status === 'generating' ? '⏳ Generating...' : '🔄 Regenerate'}
          </button>

          {post.status === 'completed' && (
            <>
              <button
                onClick={() => postNow(post.id)}
                disabled={postingInProgress === post.id}
                className="btn btn-primary btn-sm"
              >
                {postingInProgress === post.id ? '📤 Posting...' : '📤 Post Now'}
              </button>

              <button
                onClick={() => setSchedulingPost(post.id)}
                className="btn btn-secondary btn-sm"
              >
                📅 Schedule
              </button>
            </>
          )}
        </div>

        <div className="text-xs text-dark-text-muted mt-2">
          Platform: {platformInfo?.name} | Sweet spot: {platformInfo?.sweet} chars
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <CollapsibleSection title="🤖 AI Content Generator" defaultExpanded={false}>
        <div className="flex items-center gap-3 p-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
          <span className="text-dark-text">Loading AI capabilities...</span>
        </div>
      </CollapsibleSection>
    )
  }

  return (
    <CollapsibleSection title="🤖 AI Content Generator" defaultExpanded={false}>
      <div className="space-y-6">
        {/* Strategic Configuration */}
        <div className="bg-slate-900/30 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-dark-text mb-4">📋 Content Strategy</h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Business Selection */}
            <div>
              <label className="block text-dark-text-secondary text-sm mb-3">
                Select Businesses
              </label>
              <div className="space-y-2">
                {dynamicBusinesses.length === 0 && !businessesLoaded ? (
                  <div className="text-dark-text-muted text-sm">Loading businesses...</div>
                ) : dynamicBusinesses.length === 0 ? (
                  <div className="text-dark-text-muted text-sm">No businesses found. Add businesses in Settings.</div>
                ) : dynamicBusinesses.map(business => (
                  <label key={business.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedBusinesses.includes(business.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedBusinesses(prev => [...prev, business.id])
                        } else {
                          setSelectedBusinesses(prev => prev.filter(id => id !== business.id))
                        }
                      }}
                      className="checkbox-dark"
                    />
                    <span className="text-dark-text font-medium">
                      {business.displayName}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Platform Selection */}
            <div>
              <label className="block text-dark-text-secondary text-sm mb-3">
                Select Platforms
              </label>
              <div className="space-y-2">
                {PLATFORMS.map(platform => (
                  <label key={platform.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedPlatforms.includes(platform.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPlatforms(prev => [...prev, platform.id])
                        } else {
                          setSelectedPlatforms(prev => prev.filter(id => id !== platform.id))
                        }
                      }}
                      className="checkbox-dark"
                    />
                    <span className={`${platform.color} font-medium`}>
                      {platform.icon} {platform.name}
                    </span>
                    <span className="text-xs text-dark-text-muted ml-2">
                      ({platform.sweet} chars ideal)
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Template Selection */}
          <div className="mt-6">
            <label className="block text-dark-text-secondary text-sm mb-3">
              Content Templates
            </label>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {AVAILABLE_TEMPLATES.map(template => (
                <label key={template.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedTemplates.includes(template.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedTemplates(prev => [...prev, template.id])
                      } else {
                        setSelectedTemplates(prev => prev.filter(id => id !== template.id))
                      }
                    }}
                    className="checkbox-dark"
                  />
                  <div>
                    <span className="text-sm font-medium text-dark-text">
                      {template.name}
                    </span>
                    <div className="text-xs text-dark-text-muted">
                      {template.description}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Smart Date Configuration */}
          <div className="mt-6">
            <label className="block text-dark-text-secondary text-sm mb-3">
              📅 Content Start Date
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="flex items-start gap-3 p-3 border border-gray-600 rounded cursor-pointer hover:bg-slate-700/30">
                <input
                  type="radio"
                  name="dateMode"
                  value="immediate"
                  checked={smartDateConfig.mode === 'immediate'}
                  onChange={(e) => updateSmartDateConfig({ mode: e.target.value as any })}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-dark-text">Start Today</div>
                  <div className="text-xs text-dark-text-muted">
                    Begin content generation from today ({new Date().toLocaleDateString()})
                  </div>
                </div>
              </label>
              
              <label className="flex items-start gap-3 p-3 border border-gray-600 rounded cursor-pointer hover:bg-slate-700/30">
                <input
                  type="radio"
                  name="dateMode" 
                  value="next-period"
                  checked={smartDateConfig.mode === 'next-period'}
                  onChange={(e) => updateSmartDateConfig({ mode: e.target.value as any })}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-dark-text">Next Period</div>
                  <div className="text-xs text-dark-text-muted">
                    Start from next Monday (weeks) or next month (months)
                  </div>
                </div>
              </label>
              
              <label className="flex items-start gap-3 p-3 border border-gray-600 rounded cursor-pointer hover:bg-slate-700/30">
                <input
                  type="radio"
                  name="dateMode"
                  value="specific-date"
                  checked={smartDateConfig.mode === 'specific-date'}
                  onChange={(e) => updateSmartDateConfig({ mode: e.target.value as any })}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-dark-text">Specific Date</div>
                  <div className="text-xs text-dark-text-muted">
                    Choose exact start date
                  </div>
                </div>
              </label>
              
              <label className="flex items-start gap-3 p-3 border border-gray-600 rounded cursor-pointer hover:bg-slate-700/30">
                <input
                  type="radio"
                  name="dateMode"
                  value="custom-range"
                  checked={smartDateConfig.mode === 'custom-range'}
                  onChange={(e) => updateSmartDateConfig({ mode: e.target.value as any })}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-dark-text">Custom Range</div>
                  <div className="text-xs text-dark-text-muted">
                    Set both start and end dates
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Timeframe Selection */}
          <div className="mt-6">
            <label className="block text-dark-text-secondary text-sm mb-3">
              ⏳ Content Generation Timeframe
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { value: '1-week', label: '1 Week', desc: '5-7 posts' },
                { value: '2-week', label: '2 Weeks', desc: '10-14 posts' },
                { value: '1-month', label: '1 Month', desc: '20-30 posts' },
                { value: '3-month', label: '3 Months', desc: '60-90 posts' },
              ].map(option => (
                <label key={option.value} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="timeframe"
                    value={option.value}
                    checked={smartDateConfig.timeframe === option.value}
                    onChange={(e) => updateSmartDateConfig({ timeframe: e.target.value as any })}
                    className="rounded-full"
                  />
                  <div>
                    <span className="text-sm font-medium text-dark-text">{option.label}</span>
                    <div className="text-xs text-dark-text-muted">{option.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Specific Date Inputs */}
          {(smartDateConfig.mode === 'specific-date' || smartDateConfig.mode === 'custom-range') && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-dark-text-muted mb-1">Start Date</label>
                <input
                  type="date"
                  value={smartDateConfig.startDate?.toISOString().split('T')[0] || ''}
                  onChange={(e) => updateSmartDateConfig({ startDate: new Date(e.target.value) })}
                  className="form-control"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              
              {smartDateConfig.mode === 'custom-range' && (
                <div>
                  <label className="block text-xs text-dark-text-muted mb-1">End Date</label>
                  <input
                    type="date"
                    value={smartDateConfig.endDate?.toISOString().split('T')[0] || ''}
                    onChange={(e) => updateSmartDateConfig({ endDate: new Date(e.target.value) })}
                    className="form-control"
                    min={smartDateConfig.startDate?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0]}
                  />
                </div>
              )}
            </div>
          )}

          {/* Preview Section */}
          {datePreview && (
            <div className="mt-6 bg-slate-700/30 rounded-lg p-4">
              <h4 className="font-medium text-dark-text mb-3">📋 Content Schedule Preview</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-dark-text-muted">Start:</span>
                  <span className="ml-2 font-medium text-white">
                    {datePreview.start.toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </span>
                </div>
                <div>
                  <span className="text-dark-text-muted">End:</span>
                  <span className="ml-2 font-medium text-white">
                    {datePreview.end.toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </span>
                </div>
                <div>
                  <span className="text-dark-text-muted">Duration:</span>
                  <span className="ml-2 font-medium text-white">
                    {Math.ceil((datePreview.end.getTime() - datePreview.start.getTime()) / (1000 * 60 * 60 * 24)) + 1} days
                  </span>
                </div>
                <div>
                  <span className="text-dark-text-muted">Expected Posts:</span>
                  <span className="ml-2 font-medium text-white">{datePreview.postCount} posts</span>
                </div>
                
                {/* Monthly Specials Preview */}
                {datePreview.relevantMonths.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-600">
                    <span className="text-dark-text-muted">Monthly specials will include:</span>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {datePreview.relevantMonths.map(monthIndex => (
                        <span 
                          key={monthIndex}
                          className="px-2 py-1 rounded text-xs bg-green-900/30 text-green-300 border border-green-600"
                        >
                          {getMonthName(monthIndex)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Debug Information */}
          <div className="mt-6 p-4 bg-gray-800/50 rounded border border-gray-600">
            <h4 className="font-semibold text-dark-text mb-2">🔧 Debug Information</h4>
            <div className="text-xs text-dark-text-muted space-y-1">
              <div>Selected Businesses: {selectedBusinesses.join(', ')}</div>
              <div>Selected Platforms: {selectedPlatforms.join(', ')}</div>
              <div>Settings Loading: {settingsLoading ? 'Yes' : 'No'}</div>
              <div>Date Range: {selectedTimeframe}</div>
              <div>Include Specials: TRUE (forced)</div>
              <div>Expected Posts: {getExpectedPostCount()}</div>
            </div>
          </div>
        </div>

        {/* Generate Content */}
        <div className="bg-slate-900/30 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-dark-text">
              🎯 Generate Content ({datePreview?.postCount || 0} posts)
            </h3>
            
            <button
              onClick={generateContentWithSmartDates}
              disabled={isGeneratingWeek || selectedBusinesses.length === 0 || selectedPlatforms.length === 0}
              className="btn btn-primary"
            >
              {isGeneratingWeek 
                ? `🔄 Generating... ${generationProgress.current}/${generationProgress.total}`
                : '🚀 Generate Smart Content'
              }
            </button>
          </div>
          
          {datePreview && (
            <div className="text-sm text-dark-text-muted">
              Content will be generated for {datePreview.start.toLocaleDateString()} to {datePreview.end.toLocaleDateString()}
              {datePreview.relevantMonths.length > 1 && (
                <span className="ml-2 text-blue-400">
                  (spans {datePreview.relevantMonths.length} months)
                </span>
              )}
            </div>
          )}

          {/* Progress Bar */}
          {isGeneratingWeek && (
            <div className="mb-4">
              <div className="bg-slate-800 rounded-full h-2 mb-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${(generationProgress.current / generationProgress.total) * 100}%`
                  }}
                />
              </div>
              <div className="text-xs text-dark-text-muted text-center">
                Generating post {generationProgress.current} of {generationProgress.total}
              </div>
            </div>
          )}
        </div>

        {/* Generated Posts */}
        {weeklyPosts.length > 0 && (
          <div className="space-y-4">
            {/* Header with Schedule Controls */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <h3 className="text-lg font-semibold text-dark-text">
                  Generated Posts ({weeklyPosts.length})
                </h3>
                
                {/* Post Selection Controls */}
                {weeklyPosts.filter(p => p.status === 'completed').length > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <button
                      onClick={selectAllPosts}
                      className="text-blue-400 hover:text-blue-300"
                    >
                      Select All
                    </button>
                    <span className="text-slate-400">|</span>
                    <button
                      onClick={clearPostSelection}
                      className="text-slate-400 hover:text-slate-300"
                    >
                      Clear
                    </button>
                    {selectedPosts.length > 0 && (
                      <span className="text-blue-400 ml-2">
                        ({selectedPosts.length} selected)
                      </span>
                    )}
                  </div>
                )}

                {/* Expand/Collapse Controls */}
                <div className="flex items-center gap-2 text-sm">
                  <button
                    onClick={expandAllPosts}
                    className="text-slate-400 hover:text-slate-300"
                  >
                    Expand All
                  </button>
                  <span className="text-slate-600">|</span>
                  <button
                    onClick={collapseAllPosts}
                    className="text-slate-400 hover:text-slate-300"
                  >
                    Collapse All
                  </button>
                </div>
              </div>
              
              {weeklyPosts.filter(p => p.status === 'completed').length > 0 && (
                <div className="flex items-center gap-3">
                  {/* Smart Schedule Controls */}
                  <div className="flex items-center gap-2 text-sm">
                    <label className="text-dark-text-muted">Start from:</label>
                    <input
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="form-control !text-xs !py-1 !px-2"
                    />
                  </div>
                  
                  {/* Schedule Selected Button */}
                  {selectedPosts.length > 0 && (
                    <button
                      onClick={scheduleSelectedPosts}
                      disabled={isGeneratingWeek || !scheduleDate}
                      className="btn btn-primary btn-sm"
                    >
                      {isGeneratingWeek 
                        ? `Scheduling...`
                        : `Schedule Selected (${selectedPosts.length})`
                      }
                    </button>
                  )}
                  
                  {/* Schedule All Button */}
                  <button
                    onClick={scheduleAllPosts}
                    disabled={isGeneratingWeek || !scheduleDate}
                    className="btn btn-success btn-sm"
                  >
                    {isGeneratingWeek 
                      ? `Scheduling... (${generationProgress.current}/${generationProgress.total})`
                      : `Smart Schedule All (${weeklyPosts.filter(p => p.status === 'completed').length})`
                    }
                  </button>
                </div>
              )}
            </div>
            
            {/* Posts List */}
            <div className="space-y-2">
              {weeklyPosts.map(renderPost)}
            </div>
            
            {/* Smart Schedule Info */}
            {weeklyPosts.filter(p => p.status === 'completed').length > 0 && (
              <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3">
                <div className="text-sm text-green-300">
                  <strong>Smart Schedule</strong> uses your business posting schedule settings:
                  <br />
                  Posts will be scheduled on your configured days/times for each platform
                  • Respects your posts-per-day limits and optimal timing preferences  
                  • Falls back to 2-hour spacing if more posts than scheduled slots
                  <br />
                  Completed posts: {weeklyPosts.filter(p => p.status === 'completed').length} | 
                  Already scheduled: {weeklyPosts.filter(p => p.status === 'scheduled').length}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Enhanced Image Selector Modal */}
        {showImageSelector && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
              {/* Fixed Header */}
              <div className="flex justify-between items-center p-6 border-b border-slate-700 flex-shrink-0">
                <h3 className="text-lg font-semibold text-white">Select Image</h3>
                <button
                  onClick={() => setShowImageSelector(null)}
                  className="text-slate-400 hover:text-slate-300"
                >
                  ✕
                </button>
              </div>
              
              {/* Fixed Search Bar */}
              <div className="p-4 border-b border-slate-700 flex-shrink-0">
                <input
                  type="text"
                  placeholder="Search images by keywords (HVAC, plumbing, electrical, etc.)"
                  value={imageSearchQuery}
                  onChange={(e) => searchImages(e.target.value)}
                  className="w-full p-3 bg-slate-700 text-white rounded border border-slate-600 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Scrollable Content Area */}
              <div className="flex-1 overflow-y-auto p-4">
                {(() => {
                  const post = weeklyPosts.find(p => p.id === showImageSelector)
                  const allImages = [
                    // Current image first if exists
                    ...(post?.suggestedImageUrl ? [{ 
                      url: post.suggestedImageUrl, 
                      description: post.imageDescription || 'Current image',
                      isCurrent: true 
                    }] : []),
                    // AI suggested alternatives
                    ...(post?.imageAlternatives || []).map((img: any) => ({ 
                      ...img, 
                      isAlternative: true 
                    })),
                    // Business library images
                    ...availableImages.map((img: any) => ({
                      url: img.cloudUrl || img.url || img.originalUrl,
                      description: img.aiDescription || img.description || img.fileName || 'Library image',
                      tags: img.aiTags || img.tags,
                      isLibrary: true,
                      usageCount: img.usageCount || 0,
                      category: img.category
                    }))
                  ]

                  return allImages.length > 0 ? (
                    <div className="space-y-6">
                      {/* Current/AI Images Section */}
                      {(post?.suggestedImageUrl || (post?.imageAlternatives && post.imageAlternatives.length > 0)) && (
                        <div>
                          <h4 className="text-md font-medium text-slate-300 mb-3">AI Suggested Images</h4>
                          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                            {allImages.filter(img => img.isCurrent || img.isAlternative).map((image: any, index: number) => (
                              <div 
                                key={`ai-${index}`}
                                className={`cursor-pointer transition-all duration-200 rounded-lg overflow-hidden border-2 ${
                                  image.isCurrent 
                                    ? 'border-green-500 ring-2 ring-green-400' 
                                    : 'border-slate-600 hover:border-blue-400'
                                }`}
                                onClick={() => selectSuggestedImage(post.id, image.url)}
                              >
                                <div className="w-full h-24 relative bg-slate-700">
                                  <Image
                                    src={image.url}
                                    alt={image.description || `AI option ${index + 1}`}
                                    fill
                                    className="object-cover"
                                  />
                                  {image.isCurrent && (
                                    <div className="absolute top-1 right-1 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded">
                                      Current
                                    </div>
                                  )}
                                </div>
                                <div className="p-2">
                                  <p className="text-xs text-slate-300 text-center truncate">
                                    {image.description || `Option ${index + 1}`}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Library Images Section - FIXED */}
                      {availableImages.length > 0 && (
                        <div>
                          <h4 className="text-md font-medium text-slate-300 mb-3">
                            Business Library Images ({availableImages.length})
                          </h4>
                          
                          {/* This is the key fix - proper grid with scrolling */}
                          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 max-h-96 overflow-y-auto pr-2">
                            {availableImages.map((image: any, index: number) => (
                              <div 
                                key={`lib-${image.id || index}`}
                                className="cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all duration-200 rounded-lg overflow-hidden border border-slate-600 bg-slate-700"
                                onClick={() => selectSuggestedImage(post?.id || '', image.cloudUrl || image.url || image.originalUrl)}
                              >
                                <div className="w-full h-20 relative bg-slate-700">
                                  <Image
                                    src={image.cloudUrl || image.url || image.originalUrl}
                                    alt={image.aiDescription || image.description || image.fileName || `Library image ${index + 1}`}
                                    fill
                                    className="object-cover"
                                  />
                                  {/* Usage count indicator */}
                                  {image.usageCount > 0 && (
                                    <div className="absolute top-1 left-1 bg-blue-500/80 text-white text-xs px-1 py-0.5 rounded">
                                      {image.usageCount}×
                                    </div>
                                  )}
                                </div>
                                <div className="p-1">
                                  <p className="text-xs text-slate-300 text-center truncate">
                                    {image.aiDescription || image.description || image.fileName || `Image ${index + 1}`}
                                  </p>
                                  {/* Tags and category */}
                                  {((image.aiTags && image.aiTags.length > 0) || image.category) && (
                                    <div className="text-xs text-slate-400 text-center mt-1">
                                      {image.category && (
                                        <span className="inline-block bg-slate-600 text-xs px-1 rounded mr-1">
                                          {image.category}
                                        </span>
                                      )}
                                      <div className="truncate">
                                        {image.aiTags && image.aiTags.slice(0, 2).join(', ')}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          {/* Load more indicator if there are many images */}
                          {availableImages.length > 24 && (
                            <div className="text-center mt-3">
                              <p className="text-xs text-slate-400">
                                Showing {Math.min(24, availableImages.length)} of {availableImages.length} images
                                {availableImages.length > 24 && ' - scroll to see more'}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* No Images Message */}
                      {allImages.length === 1 && allImages[0].isCurrent && (
                        <div className="text-center py-8">
                          <p className="text-slate-400 mb-2">No additional images available</p>
                          <p className="text-slate-500 text-sm">Upload images to your business library to see more options</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-slate-400 mb-2">No images available</p>
                      <p className="text-slate-500 text-sm">Upload images to your business library first</p>
                    </div>
                  )
                })()}
              </div>

              {/* Fixed Footer */}
              <div className="p-4 border-t border-slate-700 flex justify-end flex-shrink-0">
                <button
                  onClick={() => setShowImageSelector(null)}
                  className="px-4 py-2 bg-slate-600 text-white rounded hover:bg-slate-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Schedule Modal */}
        {schedulingPost && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-dark-text mb-4">Schedule Post</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-dark-text-secondary text-sm mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="form-control"
                  />
                </div>
                
                <div>
                  <label className="block text-dark-text-secondary text-sm mb-2">
                    Time
                  </label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="form-control"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => schedulePost(schedulingPost)}
                  className="btn btn-primary flex-1"
                >
                  Schedule Post
                </button>
                <button
                  onClick={() => setSchedulingPost(null)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </CollapsibleSection>
  )
}