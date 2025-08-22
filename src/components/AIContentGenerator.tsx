// src/components/AIContentGenerator.tsx - FIXED VERSION WITH IMAGE IMPROVEMENTS
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

// Timeframe options - FIXED to include weekends
const TIMEFRAME_OPTIONS = [
  { id: 'weekly', name: 'Weekly (5 posts)', description: 'Monday through Friday', postCount: 5 },
  { id: 'full-week', name: 'Full Week (7 posts)', description: 'Monday through Sunday', postCount: 7 },
  { id: 'monthly', name: 'Monthly (20 posts)', description: 'Full month coverage', postCount: 20 },
  { id: 'quarterly', name: 'Quarterly (60 posts)', description: 'Seasonal campaign', postCount: 60 },
  { id: 'custom', name: 'Custom Range', description: 'Choose your own dates', postCount: 0 }
]

// Content templates - no more seasonal themes, just structured templates
const CONTENT_TEMPLATES = [
  { id: 'seasonal_tip', name: 'Seasonal Tips', category: 'Educational' },
  { id: 'maintenance_reminder', name: 'Maintenance Reminders', category: 'Service' },
  { id: 'weather_alert', name: 'Weather Alerts', category: 'Urgent' },
  { id: 'promotion', name: 'Promotions', category: 'Marketing' },
  { id: 'customer_story', name: 'Customer Stories', category: 'Social Proof' },
  { id: 'company_update', name: 'Company Updates', category: 'Company' },
  { id: 'emergency_service', name: 'Emergency Service', category: 'Service' }
]

// ENHANCED: Daily themes for all 7 days
const DAILY_THEMES = {
  monday: { theme: 'Monday Motivation', focus: 'Start week strong with service highlights', emoji: '💪' },
  tuesday: { theme: 'Tuesday Tips', focus: 'Educational HVAC/plumbing/electrical tips', emoji: '💡' },
  wednesday: { theme: 'Wednesday Specials', focus: 'Mid-week promotional offers', emoji: '🎯' },
  thursday: { theme: 'Thursday Maintenance', focus: 'Maintenance reminders and safety tips', emoji: '🔧' },
  friday: { theme: 'Friday Prep', focus: 'Weekend preparation and emergency service', emoji: '🏠' },
  saturday: { theme: 'Saturday Solutions', focus: 'Weekend project help and emergency availability', emoji: '🛠️' },
  sunday: { theme: 'Sunday Planning', focus: 'Week ahead preparation and maintenance planning', emoji: '📋' }
}

// Monthly specials type definition
type MonthlySpecials = {
  [month: number]: {
    hvac?: string[]
    plumbing?: string[]
    electrical?: string[]
    all?: string[]
  }
}

// ENHANCED: WeeklyPost interface with image alternatives - FIXED typing
interface WeeklyPost {
  id: string
  business: string
  day: string
  platform: string
  content: string
  characterCount: number
  withinLimits: boolean
  status: 'generating' | 'completed' | 'error' | 'editing'
  originalContent?: string
  isEdited?: boolean
  suggestedImage?: string
  suggestedImageUrl?: string 
  imageDescription?: string
  imageAlternatives?: any[] | undefined  // ← FIXED: Explicitly allow undefined
  templateUsed?: string
  monthlySpecials?: string[]
  specialsIncluded?: boolean
  metadata?: any
}

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

export default function AIContentGenerator() {
  const [capabilities, setCapabilities] = useState<AICapabilities | null>(null)
  const [loading, setLoading] = useState(false)
  
  // Settings integration
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [businessSettings, setBusinessSettings] = useState<Record<string, BusinessSettings>>({})
  const [monthlySpecials, setMonthlySpecials] = useState<Record<string, any>>({})
  
  // Selection state
  const [selectedBusinesses, setSelectedBusinesses] = useState<string[]>(['lex-dallas'])
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['facebook'])
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>(['seasonal_tip', 'maintenance_reminder', 'promotion'])
  
  // Timeframe selection
  const [selectedTimeframe, setSelectedTimeframe] = useState('weekly')
  const [customPostCount, setCustomPostCount] = useState(10)
  
  // FIXED: Simple month selection (no hardcoded data)
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [editingSpecials, setEditingSpecials] = useState(false)
  
  // Content generation
  const [weeklyPosts, setWeeklyPosts] = useState<WeeklyPost[]>([])
  const [isGeneratingWeek, setIsGeneratingWeek] = useState(false)
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 })
  
  // Individual post editing
  const [editingPost, setEditingPost] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  
  // ENHANCED: Image selection state
  const [showImageSelector, setShowImageSelector] = useState<string | null>(null)
  const [loadingImageChange, setLoadingImageChange] = useState<string | null>(null)
  
  // Options
  const [generatePerPlatform, setGeneratePerPlatform] = useState(false)
  const [useEnhancedSettings, setUseEnhancedSettings] = useState(true)
  const [includeImages, setIncludeImages] = useState(true)
  const [includeSpecials, setIncludeSpecials] = useState(true)

  // Load capabilities on mount
  useEffect(() => {
    loadCapabilities()
  }, [])

  useEffect(() => {
    if (selectedBusinesses.length > 0 && useEnhancedSettings) {
      loadBusinessSettings()
      loadMonthlySpecials()
    }
  }, [selectedBusinesses, useEnhancedSettings])

  const loadCapabilities = async () => {
    try {
      const response = await fetch('/api/ai/capabilities')
      const data = await response.json()
      if (data.success) {
        setCapabilities(data.capabilities)
      }
    } catch (error) {
      console.error('Failed to load AI capabilities:', error)
      setCapabilities({
        isConfigured: true,
        availableTemplates: CONTENT_TEMPLATES,
        supportedPlatforms: PLATFORMS,
        supportedBusinesses: BUSINESSES
      })
    }
  }

  const loadBusinessSettings = async () => {
    setSettingsLoading(true)
    try {
      const promises = selectedBusinesses.map(async (businessId) => {
        try {
          const response = await fetch(`/api/business-settings/${businessId}`)
          if (response.ok) {
            const data = await response.json()
            return { businessId, settings: data.success ? data.settings : null }
          }
        } catch (error) {
          console.log(`Business settings API not available for ${businessId}`)
        }
        return { businessId, settings: null }
      })
      
      const results = await Promise.all(promises)
      const settingsMap: Record<string, BusinessSettings> = {}
      
      results.forEach(({ businessId, settings }) => {
        if (settings) {
          settingsMap[businessId] = settings
        }
      })
      
      setBusinessSettings(settingsMap)
    } catch (error) {
      console.log('Business settings not available, using defaults')
    } finally {
      setSettingsLoading(false)
    }
  }

  const loadMonthlySpecials = async () => {
    try {
      const currentYear = new Date().getFullYear()
      const promises = selectedBusinesses.map(async (businessId) => {
        try {
          // Correct API path: /api/businesses/{businessId}/monthly-specials
          const response = await fetch(`/api/businesses/${businessId}/monthly-specials?year=${currentYear}`)
          if (response.ok) {
            const data = await response.json()
            return { businessId, specials: data.success ? data.specials : null }
          } else {
            console.log(`Monthly specials API returned ${response.status} for ${businessId}`)
          }
        } catch (error) {
          console.log(`Monthly specials API not reachable for ${businessId}`)
        }
        return { businessId, specials: null }
      })
      
      const results = await Promise.all(promises)
      const specialsMap: Record<string, any> = {}
      
      results.forEach(({ businessId, specials }) => {
        if (specials && Array.isArray(specials)) {
          // Convert array of monthly specials to month-indexed object
          const monthlySpecialsMap: Record<number, any> = {}
          specials.forEach((special: any) => {
            monthlySpecialsMap[special.month] = {
              hvac: special.hvac || [],
              plumbing: special.plumbing || [],
              electrical: special.electrical || [],
              all: special.all || []
            }
          })
          specialsMap[businessId] = monthlySpecialsMap
        }
      })
      
      console.log('📊 Loaded monthly specials from database:', specialsMap)
      setMonthlySpecials(specialsMap)
    } catch (error) {
      console.log('Monthly specials API not available, database may not be initialized')
    }
  }

  const getPostCount = () => {
    const option = TIMEFRAME_OPTIONS.find(opt => opt.id === selectedTimeframe)
    return selectedTimeframe === 'custom' ? customPostCount : (option?.postCount || 5)
  }

  const getMonthlySpecials = (businessId: string) => {
    console.log(`🔍 Getting specials for ${businessId}, month: ${currentMonth}`)
    
    // Check loaded specials from database
    if (monthlySpecials[businessId] && monthlySpecials[businessId][currentMonth]) {
      const specials = monthlySpecials[businessId][currentMonth]
      console.log(`✅ Found database specials for ${businessId}:`, specials)
      const allSpecials = [
        ...(specials.hvac || []),
        ...(specials.plumbing || []),
        ...(specials.electrical || []),
        ...(specials.all || [])
      ]
      console.log(`📋 Combined specials for ${businessId}:`, allSpecials)
      return allSpecials
    }
    
    // No specials found in database
    console.log(`❌ No database specials found for ${businessId} month ${currentMonth}`)
    console.log(`💾 Available months in database for ${businessId}:`, Object.keys(monthlySpecials[businessId] || {}))
    return []
  }

  // ENHANCED: Generate content using enhanced AI service with proper prompt and day parameter
  const generatePostContent = async (business: string, day: string, platform: string, templateType?: string) => {
    console.log(`🤖 Enhanced generation for ${business} - ${day} - ${platform}`)
    
    const platformInfo = PLATFORMS.find(p => p.id === platform)
    
    // Build the proper prompt based on daily theme
    const dailyTheme = DAILY_THEMES[day as keyof typeof DAILY_THEMES] || {
      theme: 'engaging business content',
      focus: 'professional service content',
      emoji: '🏢'
    }
    
    console.log(`📅 Using daily theme for ${day}:`, dailyTheme) // Debug log
    
    const prompt = `Generate ${dailyTheme.theme} social media content for ${business} business. 
Daily focus: ${dailyTheme.focus}
Platform: ${platform}
${dailyTheme.emoji} Create engaging, professional content that naturally incorporates relevant monthly specials and showcases expertise.`

    console.log(`🔤 Generated prompt for ${day}:`, prompt.substring(0, 100) + '...')
    console.log(`🎯 FULL PROMPT being sent:`, prompt)
    try {
      console.log(`🚀 Sending to API - Day: "${day}", Business: "${business}", Platform: "${platform}"`) // Debug log
      
      const response = await fetch('/api/ai/generate-enhanced-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt,
          businessId: business,
          platform: platform,
          contentType: 'weekly-automation',
          includeSpecials: includeSpecials,
          includeImages: includeImages,
          includeContentBlocks: true,
          day: day // ← Added day parameter for variety
        })
      })

      const data = await response.json()
      
      if (data.success) {
        console.log(`✅ Enhanced generation successful:`, {
          contentLength: data.content?.length || 0,
          hasImage: !!data.metadata?.suggestedImage,
          specialsIncluded: data.metadata?.usedSpecials?.length || 0,
          templateUsed: data.metadata?.templateUsed,
          withinLimits: data.metadata?.withinLimits,
          imageAlternatives: data.metadata?.imageAlternatives?.length || 0
        })
        
        return {
          content: data.content,
          suggestedImageUrl: data.metadata?.suggestedImage?.startsWith('/uploads') ? data.metadata.suggestedImage : undefined,
          imageDescription: data.metadata?.imageDescription || data.metadata?.suggestedImage,
          suggestedImage: data.metadata?.suggestedImage,
          imageAlternatives: data.metadata?.imageAlternatives || [], // ← Added for selection
          monthlySpecials: data.metadata?.usedSpecials,
          specialsIncluded: data.metadata?.usedSpecials?.length > 0,
          templateUsed: data.metadata?.templateUsed || dailyTheme.theme
        }
      } else {
        throw new Error(data.error || 'Enhanced generation failed')
      }
    } catch (error) {
      console.error('Enhanced content generation failed:', error)
      throw error
    }
  }

  // ENHANCED: Function to change image for a post
  const changePostImage = async (postId: string, newImageUrl: string, newImageId: string, newDescription: string) => {
    setLoadingImageChange(postId)
    
    try {
      // Update the post with new image
      setWeeklyPosts(prev => prev.map(post => 
        post.id === postId 
          ? { 
              ...post, 
              suggestedImageUrl: newImageUrl,
              imageDescription: newDescription,
              // Keep the same alternatives for future changes
            }
          : post
      ))
      
      // Update usage count for new image (optional API call)
      try {
        await fetch('/api/images/update-usage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageId: newImageId })
        })
      } catch (error) {
        console.warn('Failed to update image usage:', error)
      }
      
      setShowImageSelector(null)
    } catch (error) {
      console.error('Failed to change image:', error)
    } finally {
      setLoadingImageChange(null)
    }
  }

  // FIXED: Generate weekly content with proper templates
  const generateWeeklyContent = async () => {
    if (!capabilities?.isConfigured) {
      alert('AI service not configured')
      return
    }

    if (selectedBusinesses.length === 0) {
      alert('Please select at least one business')
      return
    }

    if (selectedPlatforms.length === 0) {
      alert('Please select at least one platform')
      return
    }

    setIsGeneratingWeek(true)
    setWeeklyPosts([])
    
    const postCount = getPostCount()
    const totalPosts = selectedBusinesses.length * postCount * (generatePerPlatform ? selectedPlatforms.length : 1)
    setGenerationProgress({ current: 0, total: totalPosts })
    
    const newPosts: WeeklyPost[] = []
    let progressCount = 0

    const daysToGenerate = selectedTimeframe === 'weekly' 
      ? ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
      : selectedTimeframe === 'full-week'
      ? ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      : Array.from({ length: postCount }, (_, i) => 
          ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][i % 7]
        )

    try {
      for (const business of selectedBusinesses) {
        for (let i = 0; i < daysToGenerate.length; i++) {
          const day = daysToGenerate[i]
          const platforms = generatePerPlatform ? selectedPlatforms : [selectedPlatforms[0]]
          
          for (const platform of platforms) {
            const postId = `${business}-${day}-${platform}-${i}`
            
            // Create initial post entry
            const newPost: WeeklyPost = {
              id: postId,
              business,
              day,
              platform,
              content: '',
              characterCount: 0,
              withinLimits: true,
              status: 'generating',
              templateUsed: 'generating...'
            }
            
            newPosts.push(newPost)
            setWeeklyPosts([...newPosts])
            
            try {
              // Generate content for this post
              const result = await generatePostContent(business, day, platform)
              const platformInfo = PLATFORMS.find(p => p.id === platform)
              const characterCount = result.content.length
              const withinLimits = characterCount <= (platformInfo?.charLimit || 1000)
              
              // Update post with generated content
              const updatedPost: WeeklyPost = {
                ...newPost,
                content: result.content,
                characterCount,
                withinLimits,
                status: 'completed',
                suggestedImage: result.suggestedImage,
                suggestedImageUrl: result.suggestedImageUrl, // ← Enhanced
                imageDescription: result.imageDescription,   // ← Enhanced
                imageAlternatives: result.imageAlternatives, // ← Enhanced
                templateUsed: result.templateUsed,
                monthlySpecials: result.monthlySpecials,
                specialsIncluded: result.specialsIncluded
              }
              
              // Update the post in the array
              newPosts[newPosts.length - 1] = updatedPost
              setWeeklyPosts([...newPosts])
              
            } catch (error) {
              console.error(`Failed to generate content for ${postId}:`, error)
              
              // Update post with error status
              const errorPost: WeeklyPost = {
                ...newPost,
                content: `Error generating content: ${error instanceof Error ? error.message : 'Unknown error'}`,
                status: 'error'
              }
              
              newPosts[newPosts.length - 1] = errorPost
              setWeeklyPosts([...newPosts])
            }
            
            progressCount++
            setGenerationProgress({ current: progressCount, total: totalPosts })
            
            // Small delay to prevent overwhelming the API
            await new Promise(resolve => setTimeout(resolve, 500))
          }
        }
      }
    } catch (error) {
      console.error('Batch generation failed:', error)
      alert('Generation failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setIsGeneratingWeek(false)
    }
  }

  const startEditing = (post: WeeklyPost) => {
    setEditingPost(post.id)
    setEditContent(post.content)
  }

  const saveEdit = (postId: string) => {
    setWeeklyPosts(prev => prev.map(post => 
      post.id === postId 
        ? { 
            ...post, 
            content: editContent,
            characterCount: editContent.length,
            withinLimits: editContent.length <= (PLATFORMS.find(p => p.id === post.platform)?.charLimit || 1000),
            isEdited: true,
            originalContent: post.originalContent || post.content
          }
        : post
    ))
    setEditingPost(null)
    setEditContent('')
  }

  const cancelEdit = () => {
    setEditingPost(null)
    setEditContent('')
  }

  const regeneratePost = async (post: WeeklyPost) => {
    setWeeklyPosts(prev => prev.map(p => 
      p.id === post.id ? { ...p, status: 'generating' as const } : p
    ))

    try {
      const result = await generatePostContent(post.business, post.day, post.platform)
      const platformInfo = PLATFORMS.find(p => p.id === post.platform)
      const characterCount = result.content.length
      const withinLimits = characterCount <= (platformInfo?.charLimit || 1000)

      setWeeklyPosts(prev => prev.map(p => 
        p.id === post.id 
          ? { 
              ...p, 
              content: result.content,
              characterCount,
              withinLimits,
              status: 'completed' as const,
              suggestedImage: result.suggestedImage,
              suggestedImageUrl: result.suggestedImageUrl,
              imageDescription: result.imageDescription,
              imageAlternatives: result.imageAlternatives,
              templateUsed: result.templateUsed,
              monthlySpecials: result.monthlySpecials,
              isEdited: false,
              originalContent: undefined
            } 
          : p
      ))
    } catch (error) {
      setWeeklyPosts(prev => prev.map(p => 
        p.id === post.id 
          ? { 
              ...p, 
              content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
              status: 'error' as const 
            } 
          : p
      ))
    }
  }

  // ENHANCED: Render individual post component with improved image display and selection - FIXED
  const renderPost = (post: WeeklyPost) => {
    // FIXED: Helper to check if image alternatives exist
    const hasImageAlternatives = post.imageAlternatives && Array.isArray(post.imageAlternatives) && post.imageAlternatives.length > 0

    return (
      <div key={post.id} className="bg-slate-800/30 rounded-lg p-4 border border-gray-600">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className={BUSINESSES.find(b => b.id === post.business)?.color}>
                {BUSINESSES.find(b => b.id === post.business)?.name}
              </span>
              <span className="text-dark-text-muted">•</span>
              <span className="capitalize text-dark-text-secondary">{post.day}</span>
              <span className="text-dark-text-muted">•</span>
              <span className={PLATFORMS.find(p => p.id === post.platform)?.color}>
                {PLATFORMS.find(p => p.id === post.platform)?.icon} {PLATFORMS.find(p => p.id === post.platform)?.name}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {post.templateUsed && (
              <span className="text-xs bg-blue-900/30 text-blue-300 px-2 py-1 rounded">
                {post.templateUsed}
              </span>
            )}
            <div className={`w-3 h-3 rounded-full ${
              post.status === 'completed' ? 'bg-green-400' :
              post.status === 'generating' ? 'bg-blue-400 animate-pulse' :
              post.status === 'error' ? 'bg-red-400' :
              'bg-gray-400'
            }`}></div>
          </div>
        </div>

        {/* Content Display/Editing */}
        {editingPost === post.id ? (
          <div className="space-y-3">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full p-3 bg-gray-900/50 border border-gray-600 rounded text-dark-text text-sm"
              rows={4}
            />
            <div className="flex gap-2">
              <button
                onClick={() => saveEdit(post.id)}
                className="btn btn-primary btn-sm"
              >
                💾 Save
              </button>
              <button
                onClick={cancelEdit}
                className="btn btn-outline btn-sm"
              >
                ❌ Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-gray-900/50 rounded p-3 mb-3 text-sm text-dark-text whitespace-pre-wrap">
              {post.content || 'Generating...'}
            </div>
            
            {/* ENHANCED: Image Display with Thumbnail and Selection - FIXED */}
            {post.suggestedImageUrl && (
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs text-green-400">📷 Suggested Image:</div>
                  {hasImageAlternatives && (
                    <button
                      onClick={() => setShowImageSelector(showImageSelector === post.id ? null : post.id)}
                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      {showImageSelector === post.id ? '✖ Close' : '🔄 Change Image'}
                    </button>
                  )}
                </div>
                
                <div className="relative">
                  {/* Main Image Thumbnail */}
                  <div className="relative w-full max-w-sm mx-auto">
                    <Image
                      src={post.suggestedImageUrl}
                      alt={post.imageDescription || 'Suggested content image'}
                      width={300}
                      height={200}
                      className="rounded-lg object-cover border border-gray-600"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                    {post.imageDescription && (
                      <div className="text-xs text-gray-400 mt-1 text-center">
                        {post.imageDescription}
                      </div>
                    )}
                  </div>
                  
                  {/* Image Selection Dropdown - FIXED */}
                  {showImageSelector === post.id && hasImageAlternatives && (
                    <div className="absolute top-0 left-0 right-0 bg-slate-900/95 backdrop-blur border border-gray-600 rounded-lg p-3 z-10">
                      <div className="text-xs text-gray-300 mb-2">Select alternative image:</div>
                      <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                        {/* Current Image */}
                        <div className="relative border-2 border-blue-500 rounded p-1">
                          <Image
                            src={post.suggestedImageUrl}
                            alt="Current"
                            width={80}
                            height={60}
                            className="rounded object-cover"
                          />
                          <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs px-1 rounded-bl">
                            Current
                          </div>
                          <div className="text-xs text-gray-300 mt-1 truncate">
                            {post.imageDescription?.substring(0, 20)}...
                          </div>
                        </div>
                        
                        {/* Alternative Images - FIXED */}
                        {post.imageAlternatives && post.imageAlternatives.map((image, index) => (
                          <button
                            key={image.id || index}
                            onClick={() => changePostImage(
                              post.id, 
                              image.cloudUrl, 
                              image.id, 
                              image.aiDescription || image.originalName
                            )}
                            disabled={loadingImageChange === post.id}
                            className="relative border border-gray-600 hover:border-blue-400 rounded p-1 transition-colors"
                          >
                            <Image
                              src={image.thumbnailUrl || image.cloudUrl}
                              alt={image.originalName || `Alternative ${index + 1}`}
                              width={80}
                              height={60}
                              className="rounded object-cover"
                            />
                            {loadingImageChange === post.id && (
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                <div className="text-white text-xs">...</div>
                              </div>
                            )}
                            <div className="text-xs text-gray-300 mt-1 truncate">
                              {(image.aiDescription || image.originalName)?.substring(0, 20)}...
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Fallback for when image URL isn't available but description exists */}
            {!post.suggestedImageUrl && post.suggestedImage && (
              <div className="mb-3 p-2 bg-yellow-900/20 border border-yellow-600/30 rounded text-xs">
                <span className="text-yellow-400">📷 Image suggested:</span>
                <span className="text-gray-300 ml-2">{post.suggestedImage}</span>
                <div className="text-yellow-300 mt-1">
                  ⚠️ Upload matching images to business settings to display actual images
                </div>
              </div>
            )}
            
            {/* Enhanced metadata display */}
            <div className="text-xs text-dark-text-muted space-y-1">
              <div className="flex items-center justify-between">
                <span>{post.characterCount} chars</span>
                <span className={post.withinLimits ? 'text-green-400' : 'text-red-400'}>
                  {post.withinLimits ? '✓ Within limits' : '⚠️ Over limit'}
                </span>
              </div>
              
              {post.monthlySpecials?.length && (
                <div className={`text-sm ${post.specialsIncluded ? 'text-blue-400' : 'text-yellow-400'}`}>
                  🎯 Specials: {post.monthlySpecials.length} {post.specialsIncluded ? 'included' : 'available'}
                </div>
              )}
              
              {hasImageAlternatives && (
                <div className="text-xs text-gray-400">
                  🖼️ {post.imageAlternatives!.length + 1} images available
                </div>
              )}
              
              {post.isEdited && (
                <div className="text-yellow-400">✏️ Manually edited</div>
              )}
            </div>
            
            {post.status === 'completed' && (
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => startEditing(post)}
                  className="btn btn-outline btn-sm"
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={() => regeneratePost(post)}
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
            
            {post.status === 'error' && (
              <button
                onClick={() => regeneratePost(post)}
                className="btn btn-outline btn-sm text-red-400 mt-3"
              >
                🔄 Retry Generation
              </button>
            )}
          </>
        )}
      </div>
    )
  }

  // Loading state
  if (!capabilities) {
    return (
      <CollapsibleSection title="🤖 AI Content Generator" defaultExpanded={false}>
        <div className="text-center py-8">
          <p className="text-dark-text-muted">Loading AI capabilities...</p>
        </div>
      </CollapsibleSection>
    )
  }

  // Not configured state
  if (!capabilities.isConfigured) {
    return (
      <CollapsibleSection title="🤖 AI Content Generator" defaultExpanded={false}>
        <div className="bg-red-900/20 border border-red-600 rounded-lg p-4">
          <h3 className="text-red-400 font-semibold mb-2">⚠️ AI Service Not Configured</h3>
          <p className="text-red-300 text-sm">
            Please add your API key to enable AI content generation.
          </p>
        </div>
      </CollapsibleSection>
    )
  }

  return (
    <CollapsibleSection title="🤖 AI Content Generator" defaultExpanded={false}>
      <div className="space-y-6">
        
        {/* Business Selection */}
        <div className="bg-slate-800/30 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-dark-text mb-4">🏢 Select Businesses</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {BUSINESSES.map(business => (
              <label key={business.id} className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg cursor-pointer hover:bg-slate-700/50 transition-colors">
                <input
                  type="checkbox"
                  checked={selectedBusinesses.includes(business.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedBusinesses([...selectedBusinesses, business.id])
                    } else {
                      setSelectedBusinesses(selectedBusinesses.filter(id => id !== business.id))
                    }
                  }}
                  className="w-4 h-4 text-accent-blue bg-gray-800 border-gray-600 rounded focus:ring-accent-blue"
                />
                <span className={`font-medium ${business.color}`}>{business.name}</span>
                {settingsLoading && selectedBusinesses.includes(business.id) && (
                  <span className="text-xs text-blue-400">Loading settings...</span>
                )}
                {businessSettings[business.id]?.isConfigured && (
                  <span className="text-xs text-green-400">✓ Enhanced</span>
                )}
              </label>
            ))}
          </div>
        </div>

        {/* Platform Selection */}
        <div className="bg-slate-800/30 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-dark-text mb-4">📱 Select Platforms</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {PLATFORMS.map(platform => (
              <label key={platform.id} className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg cursor-pointer hover:bg-slate-700/50 transition-colors">
                <input
                  type="checkbox"
                  checked={selectedPlatforms.includes(platform.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedPlatforms([...selectedPlatforms, platform.id])
                    } else {
                      setSelectedPlatforms(selectedPlatforms.filter(id => id !== platform.id))
                    }
                  }}
                  className="w-4 h-4 text-accent-blue bg-gray-800 border-gray-600 rounded focus:ring-accent-blue"
                />
                <span className="text-xl">{platform.icon}</span>
                <div className="flex-1">
                  <div className={`font-medium ${platform.color}`}>{platform.name}</div>
                  <div className="text-xs text-dark-text-muted">
                    {platform.charLimit} chars max • Sweet spot: {platform.sweet}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Generation Options */}
        <div className="bg-slate-800/30 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-dark-text mb-4">⚙️ Generation Options</h3>
          
          <div className="space-y-4">
            {/* Timeframe Selection */}
            <div>
              <label className="block text-dark-text font-medium mb-3">Timeframe</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {TIMEFRAME_OPTIONS.map(option => (
                  <label key={option.id} className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg cursor-pointer hover:bg-slate-700/50 transition-colors">
                    <input
                      type="radio"
                      name="timeframe"
                      value={option.id}
                      checked={selectedTimeframe === option.id}
                      onChange={(e) => setSelectedTimeframe(e.target.value)}
                      className="w-4 h-4 text-accent-blue bg-gray-800 border-gray-600 focus:ring-accent-blue"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-dark-text">{option.name}</div>
                      <div className="text-xs text-dark-text-muted">{option.description}</div>
                    </div>
                  </label>
                ))}
              </div>
              
              {selectedTimeframe === 'custom' && (
                <div className="mt-3">
                  <label className="block text-dark-text-secondary text-sm mb-2">
                    Number of Posts
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={customPostCount}
                    onChange={(e) => setCustomPostCount(parseInt(e.target.value))}
                    className="form-control w-32"
                  />
                </div>
              )}
            </div>

            {/* Month Selection */}
            <div>
              <label className="block text-dark-text font-medium mb-2">Month</label>
              <select
                value={currentMonth}
                onChange={(e) => setCurrentMonth(parseInt(e.target.value))}
                className="form-control w-48"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i} value={i}>
                    {new Date(2025, i).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>

            {/* Additional Options */}
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={generatePerPlatform}
                  onChange={(e) => setGeneratePerPlatform(e.target.checked)}
                  className="w-4 h-4 text-accent-blue bg-gray-800 border-gray-600 rounded focus:ring-accent-blue"
                />
                <span className="text-dark-text-secondary">Generate separate content per platform</span>
              </label>
              
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={includeImages}
                  onChange={(e) => setIncludeImages(e.target.checked)}
                  className="w-4 h-4 text-accent-blue bg-gray-800 border-gray-600 rounded focus:ring-accent-blue"
                />
                <span className="text-dark-text-secondary">Include image suggestions</span>
              </label>
              
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={includeSpecials}
                  onChange={(e) => setIncludeSpecials(e.target.checked)}
                  className="w-4 h-4 text-accent-blue bg-gray-800 border-gray-600 rounded focus:ring-accent-blue"
                />
                <span className="text-dark-text-secondary">Include monthly specials</span>
              </label>
            </div>
          </div>
        </div>

        {/* Generation Controls */}
        <div className="bg-slate-800/30 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-dark-text">🚀 Generate Content</h3>
            {isGeneratingWeek && (
              <div className="text-dark-text-secondary text-sm">
                {generationProgress.current} / {generationProgress.total} posts
              </div>
            )}
          </div>
          
          <div className="flex gap-4">
            <button
              onClick={generateWeeklyContent}
              disabled={isGeneratingWeek || selectedBusinesses.length === 0 || selectedPlatforms.length === 0}
              className="btn btn-primary"
            >
              {isGeneratingWeek ? '🤖 Generating...' : `🤖 Generate ${getPostCount()} Posts`}
            </button>
            
            {weeklyPosts.length > 0 && (
              <button
                onClick={() => setWeeklyPosts([])}
                disabled={isGeneratingWeek}
                className="btn btn-outline"
              >
                🗑️ Clear All
              </button>
            )}
          </div>
          
          {isGeneratingWeek && generationProgress.total > 0 && (
            <div className="mt-4">
              <div className="bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-accent-blue h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(generationProgress.current / generationProgress.total) * 100}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* Debug Information (development mode) */}
        {weeklyPosts.length > 0 && (
          <div className="bg-slate-800/30 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-dark-text mb-4">
              🔍 Debug Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="bg-slate-700/30 rounded p-3">
                <h4 className="font-medium text-dark-text mb-2">Monthly Specials Status</h4>
                {selectedBusinesses.map(business => {
                  const specials = getMonthlySpecials(business)
                  const hasAnySpecials = monthlySpecials[business] && Object.keys(monthlySpecials[business]).length > 0
                  return (
                    <div key={business} className="mb-2">
                      <div className="text-blue-400">{BUSINESSES.find(b => b.id === business)?.name}:</div>
                      <div className="text-dark-text-muted pl-2">
                        {!hasAnySpecials ? (
                          <div className="text-yellow-400 text-xs">
                            ⚠️ No specials in database. Visit Settings → Monthly Specials to add them.
                          </div>
                        ) : specials.length > 0 ? (
                          <ul className="list-disc list-inside">
                            {specials.slice(0, 2).map((special, i) => (
                              <li key={i} className="text-xs">{special}</li>
                            ))}
                          </ul>
                        ) : (
                          <div className="text-red-400 text-xs">
                            No specials for {new Date(2025, currentMonth).toLocaleString('default', { month: 'long' })}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
              
              <div className="bg-slate-700/30 rounded p-3">
                <h4 className="font-medium text-dark-text mb-2">Generation Settings</h4>
                <div className="text-dark-text-muted text-xs space-y-1">
                  <div>Month: {new Date(2025, currentMonth).toLocaleString('default', { month: 'long' })}</div>
                  <div>Templates: {selectedTemplates.join(', ')}</div>
                  <div>Include Specials: {includeSpecials ? '✅' : '❌'}</div>
                  <div>Include Images: {includeImages ? '✅' : '❌'}</div>
                  <div>Per Platform: {generatePerPlatform ? '✅' : '❌'}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Generated Posts */}
        {weeklyPosts.length > 0 && (
          <div className="bg-slate-800/30 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-dark-text mb-4">
              📝 Generated Posts ({weeklyPosts.length})
            </h3>
            
            <div className="space-y-4">
              {weeklyPosts.map(renderPost)}
            </div>
          </div>
        )}
      </div>
    </CollapsibleSection>
  )
}