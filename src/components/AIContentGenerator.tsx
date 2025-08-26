// src/components/AIContentGenerator.tsx - COMPLETE UPDATED VERSION
'use client'

import { useState, useEffect } from 'react'
import CollapsibleSection from './CollapsibleSection'
import Image from 'next/image'

// Business and Platform options
const BUSINESSES = [
  { id: 'lex-dallas', name: 'Lex Dallas', color: 'text-blue-400' },
  { id: 'lex-etx', name: 'Lex ETX', color: 'text-green-400' },
  { id: 'lyons', name: 'Lyons', color: 'text-purple-400' }
]

const PLATFORMS = [
  { id: 'google', name: 'Google Business Profile', icon: '🏢', color: 'text-blue-400', charLimit: 1500, sweet: '200-400' },
  { id: 'facebook', name: 'Facebook', icon: '📘', color: 'text-blue-500', charLimit: 63206, sweet: '200-400' },
  { id: 'instagram', name: 'Instagram', icon: '📷', color: 'text-pink-400', charLimit: 2200, sweet: '100-200' },
  { id: 'twitter', name: 'X/Twitter', icon: '🦅', color: 'text-sky-400', charLimit: 280, sweet: '240-280' }
]

// Templates available
const AVAILABLE_TEMPLATES = [
  { id: 'seasonal_tip', name: 'Seasonal Tips', description: 'Weather-appropriate HVAC tips and advice', category: 'Educational' },
  { id: 'maintenance_reminder', name: 'Maintenance Reminders', description: 'Regular service and tune-up reminders', category: 'Service' },
  { id: 'weather_alert', name: 'Weather Alerts', description: 'Weather-related HVAC protection tips', category: 'Urgent' },
  { id: 'promotion', name: 'Special Promotions', description: 'Service promotions and special offers', category: 'Marketing' },
  { id: 'customer_story', name: 'Customer Success Stories', description: 'Testimonials and positive reviews', category: 'Social Proof' },
  { id: 'company_update', name: 'Company News', description: 'Business updates and announcements', category: 'Company' },
  { id: 'emergency_service', name: 'Emergency Service', description: '24/7 emergency availability reminders', category: 'Service' }
]

// Daily themes for content structure
const DAILY_THEMES = {
  monday: { theme: 'Monday Motivation', focus: 'Start week strong with service highlights', emoji: '💪' },
  tuesday: { theme: 'Tuesday Tips', focus: 'Educational HVAC/plumbing/electrical tips', emoji: '💡' },
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

export default function AIContentGenerator() {
  const [capabilities, setCapabilities] = useState<AICapabilities | null>(null)
  const [loading, setLoading] = useState(false)
  
  // Settings integration
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [businessSettings, setBusinessSettings] = useState<Record<string, BusinessSettings>>({})
  const [monthlySpecials, setMonthlySpecials] = useState<Record<string, any>>({})
  const [postingSchedules, setPostingSchedules] = useState<Record<string, PostingSchedule>>({})
  
  // Selection state
  const [selectedBusinesses, setSelectedBusinesses] = useState<string[]>(['lex-dallas'])
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
        supportedBusinesses: BUSINESSES
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
        limit: '50', // Load more images
        ...(searchQuery && { search: searchQuery })
      })
      
      const response = await fetch(`/api/businesses/${businessId}/images?${params}`)
      if (response.ok) {
        const data = await response.json()
        setAvailableImages(data.images || [])
      }
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

  // Helper function to get optimal posting times from business settings
  const getOptimalPostingTimes = (businessId: string, platform: string, startDate: Date): Date[] => {
    const schedule = postingSchedules[businessId]
    const platformSchedule = schedule?.platforms?.[platform]
    
    if (!platformSchedule?.enabled || !platformSchedule.daysOfWeek?.length) {
      console.log(`⚠️ No posting schedule found for ${businessId} on ${platform}, using default times`)
      // Fallback to default times if no schedule configured
      return [startDate]
    }

    const times: Date[] = []
    const startDateCopy = new Date(startDate)
    
    // Get the times to post at
    const postingTimes = platformSchedule.timeDistribution === 'custom' 
      ? platformSchedule.customTimes 
      : platformSchedule.autoTimes || ['09:00', '14:00', '18:00'] // Default fallback times

    // Generate posting dates for the next week
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const currentDate = new Date(startDateCopy.getTime() + (dayOffset * 24 * 60 * 60 * 1000))
      const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() // Get day name and convert to lowercase
      
      // Check if this day is enabled for posting
      if (platformSchedule.daysOfWeek.includes(dayName)) {
        // Add posts for this day based on postsPerDay
        const postsToday = Math.min(platformSchedule.postsPerDay || 1, postingTimes.length)
        
        for (let postIndex = 0; postIndex < postsToday; postIndex++) {
          const [hours, minutes] = postingTimes[postIndex].split(':').map(Number)
          const postTime = new Date(currentDate)
          postTime.setHours(hours, minutes, 0, 0)
          
          // Only add future times
          if (postTime > new Date()) {
            times.push(postTime)
          }
        }
      }
    }

    console.log(`📅 Generated ${times.length} optimal posting times for ${businessId} on ${platform}`)
    return times
  }

  // Get expected post count based on selection
  const getExpectedPostCount = () => {
    if (selectedTimeframe === '1-week') {
      return selectedBusinesses.length * selectedPlatforms.length * 5 // M-F
    } else if (selectedTimeframe === '2-week') {
      return selectedBusinesses.length * selectedPlatforms.length * 10
    } else if (selectedTimeframe === '1-month') {
      return selectedBusinesses.length * selectedPlatforms.length * 20
    }
    
    // Custom date range
    if (customStartDate && customEndDate) {
      const start = new Date(customStartDate)
      const end = new Date(customEndDate)
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24))
      return Math.min(daysDiff * selectedBusinesses.length * selectedPlatforms.length, 100)
    }
    
    return 0
  }

  // Generate week of content
  const generateWeekOfContent = async () => {
    if (selectedBusinesses.length === 0 || selectedPlatforms.length === 0) {
      alert('Please select at least one business and one platform')
      return
    }

    setIsGeneratingWeek(true)
    setWeeklyPosts([])
    
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
    const totalPosts = selectedBusinesses.length * selectedPlatforms.length * days.length
    setGenerationProgress({ current: 0, total: totalPosts })

    const allPosts: WeeklyPost[] = []
    let currentProgress = 0

    try {
      for (const businessId of selectedBusinesses) {
        for (const platform of selectedPlatforms) {
          for (const day of days) {
            const postId = `${businessId}-${platform}-${day}-${Date.now()}`
            
            // Add placeholder post
            const placeholderPost: WeeklyPost = {
              id: postId,
              business: businessId,
              day,
              platform,
              content: '',
              characterCount: 0,
              withinLimits: true,
              status: 'generating',
              monthlySpecials: [],
              specialsIncluded: false
            }
            allPosts.push(placeholderPost)
            setWeeklyPosts([...allPosts])

            try {
              // FIX: Generate content with fixes
              const result = await generatePostContent(businessId, day, platform)
              const platformInfo = PLATFORMS.find(p => p.id === platform)
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
                imageDescription: result.imageDescription,
                imageAlternatives: result.imageAlternatives,
                templateUsed: result.templateUsed,
                monthlySpecials: result.monthlySpecials || [],
                specialsIncluded: result.specialsIncluded || false,
                metadata: result.metadata,
                attemptsUsed: result.attemptsUsed,
                regenerated: result.regenerated
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
        }
      }
    } catch (error) {
      console.error('Week generation failed:', error)
      alert('Failed to generate week of content. Please try again.')
    } finally {
      setIsGeneratingWeek(false)
      setGenerationProgress({ current: 0, total: 0 })
    }
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

  // Handle content editing
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

    setPostingInProgress(postId)
    
    try {
      const response = await fetch('/api/social/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: post.content,
          platform: post.platform,
          businessId: post.business,
          imageUrl: post.suggestedImageUrl
        })
      })

      if (response.ok) {
        setWeeklyPosts(prev => prev.map(p =>
          p.id === postId ? { ...p, status: 'posted' as const } : p
        ))
        alert('Post published successfully!')
      } else {
        throw new Error('Failed to publish post')
      }
    } catch (error) {
      console.error('Post failed:', error)
      alert('Failed to publish post. Please try again.')
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
        })
      })

      console.log(`🗓️ Bulk scheduling ${postsToSchedule.length} posts using business posting schedules...`)

      // Call bulk schedule API
      const response = await fetch('/api/social/schedule-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ posts: postsToSchedule })
      })

      const result = await response.json()

      if (result.success) {
        // Update post statuses to scheduled
        setWeeklyPosts(prev => prev.map(post => {
          const scheduledPost = result.results.scheduled.find((s: any) => 
            s.platform === post.platform && 
            s.businessId === post.business &&
            schedulablePosts.some(sp => sp.id === post.id)
          )
          
          if (scheduledPost) {
            return {
              ...post,
              status: 'scheduled' as const,
              scheduledDate: scheduledPost.scheduledFor
            }
          }
          return post
        }))

        alert(`✅ ${result.results.summary.successful} posts scheduled using your business posting schedules!${
          result.results.summary.failed > 0 ? ` ${result.results.summary.failed} failed.` : ''
        }`)
        
        console.log('📊 Bulk scheduling results:', result.results.summary)
      } else {
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

      if (result.success) {
        setWeeklyPosts(prev => prev.map(post => {
          const scheduledPost = result.results.scheduled.find((s: any) => 
            s.platform === post.platform && 
            s.businessId === post.business &&
            schedulablePosts.some(sp => sp.id === post.id)
          )
          
          if (scheduledPost) {
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
        
        alert(`✅ ${result.results.summary.successful} selected posts scheduled!${
          result.results.summary.failed > 0 ? ` ${result.results.summary.failed} failed.` : ''
        }`)
      } else {
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
      setWeeklyPosts(prev => prev.map(post => 
        post.id === postId 
          ? { ...post, suggestedImageUrl: imageUrl }
          : post
      ))
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

  // Render a post card
  const renderPost = (post: WeeklyPost, index: number) => {
    const businessInfo = BUSINESSES.find(b => b.id === post.business)
    const platformInfo = PLATFORMS.find(p => p.id === post.platform)
    const dayTheme = DAILY_THEMES[post.day as keyof typeof DAILY_THEMES]

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

    return (
      <div key={post.id} className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-3">
            {/* Post Selection Checkbox */}
            {post.status === 'completed' && (
              <input
                type="checkbox"
                checked={selectedPosts.includes(post.id)}
                onChange={() => togglePostSelection(post.id)}
                className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500"
              />
            )}
            <div>
              <h4 className="font-medium text-dark-text">
                <span className={businessInfo?.color}>{businessInfo?.name}</span>
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
          <span className={`text-sm font-medium ${getStatusColor(post.status)}`}>
            {post.status === 'generating' && '⏳ Generating...'}
            {post.status === 'completed' && '✅ Ready'}
            {post.status === 'error' && '❌ Error'}
            {post.status === 'editing' && '✏️ Editing'}
            {post.status === 'posted' && '🚀 Posted'}
            {post.status === 'scheduled' && '📅 Scheduled'}
          </span>
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
              
              <textarea
                value={post.content}
                onChange={(e) => editPost(post.id, e.target.value)}
                disabled={post.status === 'error'}
                className="w-full h-32 p-3 bg-gray-800 border border-gray-600 rounded text-dark-text resize-none focus:border-blue-400 focus:outline-none"
                placeholder="Generated content will appear here..."
              />
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
      <CollapsibleSection title="🤖 AI Content Generator" defaultExpanded={true}>
        <div className="flex items-center gap-3 p-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
          <span className="text-dark-text">Loading AI capabilities...</span>
        </div>
      </CollapsibleSection>
    )
  }

  return (
    <CollapsibleSection title="🤖 AI Content Generator" defaultExpanded={true}>
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
                {BUSINESSES.map(business => (
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
                    <span className={`${business.color} font-medium`}>
                      {business.name}
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

          {/* Timeframe Selection */}
          <div className="mt-6">
            <label className="block text-dark-text-secondary text-sm mb-3">
              Content Generation Timeframe
            </label>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {['1-week', '2-week', '1-month', 'custom'].map(timeframe => (
                <label key={timeframe} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="timeframe"
                    value={timeframe}
                    checked={selectedTimeframe === timeframe}
                    onChange={(e) => setSelectedTimeframe(e.target.value)}
                    className="rounded-full"
                  />
                  <span className="text-sm text-dark-text capitalize">
                    {timeframe.replace('-', ' ')}
                  </span>
                </label>
              ))}
            </div>

            {selectedTimeframe === 'custom' && (
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <label className="block text-xs text-dark-text-muted mb-1">Start Date</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="form-control"
                  />
                </div>
                <div>
                  <label className="block text-xs text-dark-text-muted mb-1">End Date</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="form-control"
                  />
                </div>
              </div>
            )}
          </div>

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
              🎯 Generate Content ({getExpectedPostCount()} posts)
            </h3>
            
            <button
              onClick={generateWeekOfContent}
              disabled={isGeneratingWeek || selectedBusinesses.length === 0 || selectedPlatforms.length === 0}
              className="btn btn-primary"
            >
              {isGeneratingWeek 
                ? `⏳ Generating... (${generationProgress.current}/${generationProgress.total})`
                : '🚀 Generate Week of Content'
              }
            </button>
          </div>

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
                  📝 Generated Posts ({weeklyPosts.length})
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
                        ? `⏳ Scheduling...`
                        : `📅 Schedule Selected (${selectedPosts.length})`
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
                      ? `⏳ Scheduling... (${generationProgress.current}/${generationProgress.total})`
                      : `📅 Smart Schedule All (${weeklyPosts.filter(p => p.status === 'completed').length})`
                    }
                  </button>
                </div>
              )}
            </div>
            
            {/* Posts List */}
            <div className="space-y-4">
              {weeklyPosts.map(renderPost)}
            </div>
            
            {/* Smart Schedule Info */}
            {weeklyPosts.filter(p => p.status === 'completed').length > 0 && (
              <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3">
                <div className="text-sm text-green-300">
                  🧠 <strong>Smart Schedule</strong> uses your business posting schedule settings:
                  <br />
                  • Posts will be scheduled on your configured days/times for each platform
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
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-dark-text">🖼️ Select Image</h3>
                <button
                  onClick={() => setShowImageSelector(null)}
                  className="text-slate-400 hover:text-slate-300"
                >
                  ✕
                </button>
              </div>
              
              {/* Search Bar */}
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search images by keywords (HVAC, plumbing, electrical, etc.)"
                  value={imageSearchQuery}
                  onChange={(e) => searchImages(e.target.value)}
                  className="form-control w-full"
                />
              </div>
              
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
                    url: img.url || img.originalUrl,
                    description: img.description || img.fileName || 'Library image',
                    tags: img.tags,
                    isLibrary: true
                  }))
                ]

                return allImages.length > 0 ? (
                  <div className="space-y-4">
                    {/* Current/AI Images Section */}
                    {(post?.suggestedImageUrl || (post?.imageAlternatives && post.imageAlternatives.length > 0)) && (
                      <div>
                        <h4 className="text-sm font-medium text-slate-300 mb-2">AI Suggested Images</h4>
                        <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
                          {allImages.filter(img => img.isCurrent || img.isAlternative).map((image: any, index: number) => (
                            <div 
                              key={`ai-${index}`}
                              className={`cursor-pointer transition-all duration-200 rounded-lg overflow-hidden ${
                                image.isCurrent 
                                  ? 'ring-2 ring-green-500' 
                                  : 'hover:ring-2 hover:ring-blue-400'
                              }`}
                              onClick={() => selectSuggestedImage(post.id, image.url)}
                            >
                              <div className="w-full h-20 relative bg-slate-700">
                                <Image
                                  src={image.url}
                                  alt={image.description || `AI option ${index + 1}`}
                                  fill
                                  className="object-cover"
                                />
                                {image.isCurrent && (
                                  <div className="absolute top-1 right-1 bg-green-500 text-white text-xs px-1 rounded">
                                    Current
                                  </div>
                                )}
                              </div>
                              <p className="text-xs text-slate-300 p-1 text-center truncate">
                                {image.description || `Option ${index + 1}`}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Library Images Section */}
                    {availableImages.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-slate-300 mb-2">
                          Business Library Images ({availableImages.length})
                        </h4>
                        <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
                          {availableImages.map((image: any, index: number) => (
                            <div 
                              key={`lib-${image.id || index}`}
                              className="cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all duration-200 rounded-lg overflow-hidden"
                              onClick={() => selectSuggestedImage(post?.id || '', image.url || image.originalUrl)}
                            >
                              <div className="w-full h-20 relative bg-slate-700">
                                <Image
                                  src={image.url || image.originalUrl}
                                  alt={image.description || image.fileName || `Library image ${index + 1}`}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                              <p className="text-xs text-slate-300 p-1 text-center truncate">
                                {image.description || image.fileName || `Image ${index + 1}`}
                              </p>
                              {image.tags && image.tags.length > 0 && (
                                <p className="text-xs text-slate-400 px-1 pb-1 text-center">
                                  {image.tags.slice(0, 2).join(', ')}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {availableImages.length === 0 && !post?.imageAlternatives?.length && (
                      <div className="text-center py-8">
                        <p className="text-slate-400 mb-2">No images found</p>
                        <p className="text-xs text-slate-500">
                          Try adjusting your search terms or upload images to your business library
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-slate-400 mb-2">Loading images...</p>
                  </div>
                )
              })()}
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowImageSelector(null)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Schedule Modal */}
        {schedulingPost && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-dark-text mb-4">📅 Schedule Post</h3>
              
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
                  📅 Schedule Post
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