// src/components/EnhancedWeeklyAutomation.tsx
'use client'

import { useState, useEffect } from 'react'
import CollapsibleSection from './CollapsibleSection'

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
  { id: 'twitter', name: 'X/Twitter', icon: '🐦', color: 'text-sky-400', charLimit: 280, sweet: '240-280' }
]

// Generation timeframe options
const TIMEFRAME_OPTIONS = [
  { id: 'weekly', name: 'Weekly (5 posts)', description: 'Monday through Friday', postCount: 5 },
  { id: 'monthly', name: 'Monthly (20 posts)', description: 'Full month coverage', postCount: 20 },
  { id: 'quarterly', name: 'Quarterly (60 posts)', description: 'Seasonal campaign', postCount: 60 },
  { id: 'custom', name: 'Custom Range', description: 'Choose your own dates', postCount: 0 }
]

// Daily themes for content structure
const DAILY_THEMES = {
  monday: { theme: 'Monday Motivation', focus: 'Energetic special highlights', emoji: '💪' },
  tuesday: { theme: 'Tuesday Tips', focus: 'Educational HVAC/plumbing/electrical tips', emoji: '💡' },
  wednesday: { theme: 'Wednesday Specials', focus: 'Mid-week featured specials', emoji: '🎯' },
  thursday: { theme: 'Thursday Maintenance', focus: 'Maintenance reminders', emoji: '🔧' },
  friday: { theme: 'Friday Prep', focus: 'Weekend prep content', emoji: '🏠' }
}

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
}

export default function EnhancedWeeklyAutomation() {
  const [selectedBusinesses, setSelectedBusinesses] = useState<string[]>(['lex-dallas'])
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['facebook'])
  const [selectedTimeframe, setSelectedTimeframe] = useState('weekly')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [customPostCount, setCustomPostCount] = useState(10)
  
  // Enhanced generation state
  const [weeklyPosts, setWeeklyPosts] = useState<WeeklyPost[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 })
  const [editingPost, setEditingPost] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  
  // Platform-specific content generation
  const [generatePerPlatform, setGeneratePerPlatform] = useState(true)
  const [showPreview, setShowPreview] = useState(false)

  const getPostCount = () => {
    if (selectedTimeframe === 'custom') {
      return customPostCount
    }
    const timeframe = TIMEFRAME_OPTIONS.find(t => t.id === selectedTimeframe)
    return timeframe?.postCount || 5
  }

  const getTotalGenerations = () => {
    const postCount = getPostCount()
    const businesses = selectedBusinesses.length
    const platforms = generatePerPlatform ? selectedPlatforms.length : 1
    return postCount * businesses * platforms
  }

  const handleBusinessChange = (businessId: string) => {
    setSelectedBusinesses(prev => 
      prev.includes(businessId) 
        ? prev.filter(id => id !== businessId)
        : [...prev, businessId]
    )
  }

  const handlePlatformChange = (platformId: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platformId) 
        ? prev.filter(id => id !== platformId)
        : [...prev, platformId]
    )
  }

  const generatePlatformSpecificPrompt = (basePrompt: string, platform: string, business: string) => {
    const platformInfo = PLATFORMS.find(p => p.id === platform)
    if (!platformInfo) return basePrompt

    const platformPrompts = {
      twitter: `${basePrompt}

TWITTER/X SPECIFIC REQUIREMENTS:
- MUST be under 280 characters total
- Use punchy, action-oriented language
- Include 2-3 relevant hashtags maximum
- Create urgency or curiosity
- End with clear call-to-action
- Use line breaks sparingly
- Make every word count

Style: Energetic, direct, hashtag-friendly

CRITICAL: Return ONLY the tweet text. Do NOT include:
- Character counts
- "Tweet:" labels
- Meta descriptions
- Any formatting notes`,

      facebook: `${basePrompt}

FACEBOOK SPECIFIC REQUIREMENTS:
- Keep under 400 characters for best engagement
- Use conversational, community-focused tone
- Tell a brief story or share experience
- Include 1-2 relevant hashtags
- Encourage comments and engagement
- Use emojis moderately

Style: Conversational, community-building, relatable

CRITICAL: Return ONLY the Facebook post text. Do NOT include:
- Character counts
- "Facebook:" labels
- Meta descriptions
- Formatting notes
- Any parenthetical information`,

      instagram: `${basePrompt}

INSTAGRAM SPECIFIC REQUIREMENTS:
- Keep under 200 characters for optimal engagement
- Use 3-5 relevant emojis throughout
- Include 3-5 hashtags
- Tell a visual story in text
- Create Instagram-worthy moments

Style: Visual storytelling, emoji-rich, inspiring

CRITICAL: Return ONLY the Instagram caption text. Do NOT include:
- "Caption:" labels
- Image descriptions
- Character counts
- Meta information
- Any descriptive text about images`,

      google: `${basePrompt}

GOOGLE BUSINESS PROFILE REQUIREMENTS:
- Professional, informative tone
- Include local SEO keywords naturally
- Mention service area when relevant
- Focus on expertise and reliability
- Keep under 400 characters
- Include clear value proposition
- Use minimal emojis

Style: Professional, trustworthy, SEO-optimized

CRITICAL: Return ONLY the Google Business post text. Do NOT include:
- Character counts
- "Google Business Profile:" labels
- Meta descriptions
- Any formatting notes
- Parenthetical information`
    }

    return platformPrompts[platform as keyof typeof platformPrompts] || basePrompt
  }

  const generateContentForTimeframe = async () => {
    if (selectedBusinesses.length === 0) {
      alert('Please select at least one business')
      return
    }

    if (selectedPlatforms.length === 0) {
      alert('Please select at least one platform')
      return
    }

    setIsGenerating(true)
    const totalGenerations = getTotalGenerations()
    setGenerationProgress({ current: 0, total: totalGenerations })
    
    const newPosts: WeeklyPost[] = []
    let progressCount = 0

    const postCount = getPostCount()
    const daysToGenerate = selectedTimeframe === 'weekly' 
      ? ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
      : Array.from({ length: postCount }, (_, i) => `day${i + 1}`)

    // Generate for each business
    for (const businessId of selectedBusinesses) {
      const businessName = businessId.replace('-', '')
      
      // Generate for each day/post
      for (let i = 0; i < daysToGenerate.length; i++) {
        const day = daysToGenerate[i]
        const dailyTheme = selectedTimeframe === 'weekly' 
          ? DAILY_THEMES[day as keyof typeof DAILY_THEMES]
          : { theme: `Post ${i + 1}`, focus: 'Engaging content', emoji: '📍' }

        // Generate for each platform (if platform-specific is enabled)
        const platformsToGenerate = generatePerPlatform ? selectedPlatforms : [selectedPlatforms[0]]
        
        for (const platform of platformsToGenerate) {
          const postId = `${businessId}-${day}-${platform}`
          
          // Initialize post
          const newPost: WeeklyPost = {
            id: postId,
            business: businessName,
            day: day,
            platform: platform,
            content: '',
            characterCount: 0,
            withinLimits: true,
            status: 'generating'
          }
          newPosts.push(newPost)

          // Generate content
          try {
            const basePrompt = `Create a ${dailyTheme.theme} social media post.

DAILY FOCUS: ${dailyTheme.focus}

REQUIREMENTS:
- Match the ${dailyTheme.theme} energy and tone
- ${dailyTheme.focus}
- Use engaging, action-oriented language
- Include relevant emojis
- End with a clear call-to-action
- Make it feel authentic and engaging, not salesy`

            const platformPrompt = generatePlatformSpecificPrompt(basePrompt, platform, businessName)
            
            const response = await fetch('/api/ai/generate-content', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                prompt: platformPrompt,
                businessName: businessName,
                platform: platform,
                contentType: 'weekly-automation'
              })
            })

            const data = await response.json()
            
            if (data.success) {
              // Clean the generated content to remove metadata
              const cleanedContent = cleanGeneratedContent(data.content, platform)
              const platformInfo = PLATFORMS.find(p => p.id === platform)
              const withinLimits = cleanedContent.length <= (platformInfo?.charLimit || 1000)
              
              const index = newPosts.findIndex(p => p.id === postId)
              if (index !== -1) {
                newPosts[index] = {
                  ...newPost,
                  content: cleanedContent,
                  characterCount: cleanedContent.length,
                  withinLimits,
                  status: 'completed'
                }
              }
            } else {
              const index = newPosts.findIndex(p => p.id === postId)
              if (index !== -1) {
                newPosts[index] = { ...newPost, status: 'error' }
              }
            }
          } catch (error) {
            console.error('Error generating post:', error)
            const index = newPosts.findIndex(p => p.id === postId)
            if (index !== -1) {
              newPosts[index] = { ...newPost, status: 'error' }
            }
          }

          progressCount++
          setGenerationProgress({ current: progressCount, total: totalGenerations })
          setWeeklyPosts([...newPosts])
          
          // Small delay to prevent rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
    }

    setIsGenerating(false)
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
      p.id === post.id ? { ...p, status: 'generating' } : p
    ))

    try {
      const dailyTheme = selectedTimeframe === 'weekly' 
        ? DAILY_THEMES[post.day as keyof typeof DAILY_THEMES]
        : { theme: `Post`, focus: 'Engaging content', emoji: '📍' }

      const basePrompt = `Create a ${dailyTheme.theme} social media post.

DAILY FOCUS: ${dailyTheme.focus}

REQUIREMENTS:
- Match the ${dailyTheme.theme} energy and tone
- ${dailyTheme.focus}
- Use engaging, action-oriented language
- Include relevant emojis
- End with a clear call-to-action
- Make it feel authentic and engaging, not salesy`

      const platformPrompt = generatePlatformSpecificPrompt(basePrompt, post.platform, post.business)
      
      const response = await fetch('/api/ai/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: platformPrompt,
          businessName: post.business,
          platform: post.platform,
          contentType: 'regeneration'
        })
      })

      const data = await response.json()
      
      if (data.success) {
        // Clean the generated content to remove metadata
        const cleanedContent = cleanGeneratedContent(data.content, post.platform)
        const platformInfo = PLATFORMS.find(p => p.id === post.platform)
        const withinLimits = cleanedContent.length <= (platformInfo?.charLimit || 1000)
        
        setWeeklyPosts(prev => prev.map(p => 
          p.id === post.id 
            ? {
                ...p,
                content: cleanedContent,
                characterCount: cleanedContent.length,
                withinLimits,
                status: 'completed',
                originalContent: p.originalContent || p.content
              }
            : p
        ))
      } else {
        setWeeklyPosts(prev => prev.map(p => 
          p.id === post.id ? { ...p, status: 'error' } : p
        ))
      }
    } catch (error) {
      console.error('Error regenerating post:', error)
      setWeeklyPosts(prev => prev.map(p => 
        p.id === post.id ? { ...p, status: 'error' } : p
      ))
    }
  }

  const cleanGeneratedContent = (content: string, platform: string) => {
    let cleaned = content.trim()
    
    // Remove common unwanted prefixes and suffixes
    const unwantedPrefixes = [
      /^(Facebook|Instagram|Twitter|Google Business Profile?):\s*/i,
      /^Caption:\s*/i,
      /^Tweet:\s*/i,
      /^Post:\s*/i
    ]
    
    const unwantedSuffixes = [
      /\s*\(Characters?:\s*\d+\)$/i,
      /\s*Character Count:\s*\d+$/i,
      /\s*Image Description:.*$/i,
      /\s*\(.*characters?\)$/i
    ]
    
    // Remove unwanted prefixes
    unwantedPrefixes.forEach(pattern => {
      cleaned = cleaned.replace(pattern, '')
    })
    
    // Remove unwanted suffixes
    unwantedSuffixes.forEach(pattern => {
      cleaned = cleaned.replace(pattern, '')
    })
    
    // Remove any text after "Image Description:" or similar
    const imageDescPattern = /Image Description:.*$/i
    cleaned = cleaned.replace(imageDescPattern, '')
    
    // Remove any trailing metadata in parentheses with numbers
    cleaned = cleaned.replace(/\s*\([^)]*\d+[^)]*\)$/g, '')
    
    // Clean up extra whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim()
    
    // Remove quotes if the entire content is wrapped in quotes
    if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || 
        (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
      cleaned = cleaned.slice(1, -1).trim()
    }
    
    return cleaned
  }

  const getPlatformIcon = (platformId: string) => {
    return PLATFORMS.find(p => p.id === platformId)?.icon || '📱'
  }

  const getPlatformColor = (platformId: string) => {
    return PLATFORMS.find(p => p.id === platformId)?.color || 'text-gray-400'
  }

  const getCharacterLimitColor = (post: WeeklyPost) => {
    const platform = PLATFORMS.find(p => p.id === post.platform)
    if (!platform) return 'text-gray-400'
    
    const percentage = (post.characterCount / platform.charLimit) * 100
    if (percentage > 90) return 'text-red-400'
    if (percentage > 75) return 'text-yellow-400'
    return 'text-green-400'
  }

  const renderPost = (post: WeeklyPost) => (
    <div key={post.id} className="bg-slate-800/50 rounded-lg p-4 border border-slate-600">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <span className="capitalize font-medium text-dark-text">
            {post.day}
          </span>
          <span className={`flex items-center gap-1 ${getPlatformColor(post.platform)}`}>
            {getPlatformIcon(post.platform)}
            <span className="text-sm">
              {PLATFORMS.find(p => p.id === post.platform)?.name}
            </span>
          </span>
          {post.isEdited && (
            <span className="text-xs bg-yellow-600 text-white px-2 py-1 rounded">
              Edited
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <span className={`text-xs ${getCharacterLimitColor(post)}`}>
            {post.characterCount}/{PLATFORMS.find(p => p.id === post.platform)?.charLimit} chars
          </span>
          <div className={`w-2 h-2 rounded-full ${
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
              ✖️ Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-gray-900/50 rounded p-3 mb-3 text-sm text-dark-text whitespace-pre-wrap">
            {post.content || 'Generating...'}
          </div>
          
          {post.status === 'completed' && (
            <div className="flex gap-2">
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
              className="btn btn-outline btn-sm text-red-400"
            >
              🔄 Retry Generation
            </button>
          )}
        </>
      )}
    </div>
  )

  return (
    <CollapsibleSection title="🚀 Enhanced Content Automation" defaultExpanded={false}>
      <div className="space-y-8">
        
        {/* Timeframe Selection */}
        <div className="bg-slate-800/30 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-dark-text mb-4">📅 Generation Timeframe</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {TIMEFRAME_OPTIONS.map(option => (
              <button
                key={option.id}
                onClick={() => setSelectedTimeframe(option.id)}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  selectedTimeframe === option.id
                    ? 'border-accent-blue bg-accent-blue/10'
                    : 'border-dark-border hover:border-gray-500'
                }`}
              >
                <div className="font-semibold text-dark-text">{option.name}</div>
                <div className="text-sm text-dark-text-muted">{option.description}</div>
                {option.postCount > 0 && (
                  <div className="text-xs text-accent-blue mt-1">{option.postCount} posts</div>
                )}
              </button>
            ))}
          </div>

          {/* Custom Date Range */}
          {selectedTimeframe === 'custom' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 p-4 bg-slate-700/30 rounded-lg">
              <div>
                <label className="block text-dark-text-muted text-sm mb-1">Start Date</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="form-control"
                />
              </div>
              <div>
                <label className="block text-dark-text-muted text-sm mb-1">End Date</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="form-control"
                />
              </div>
              <div>
                <label className="block text-dark-text-muted text-sm mb-1">Number of Posts</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={customPostCount}
                  onChange={(e) => setCustomPostCount(parseInt(e.target.value) || 1)}
                  className="form-control"
                />
              </div>
            </div>
          )}
        </div>

        {/* Business Selection */}
        <div className="bg-slate-800/30 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-dark-text mb-4">🏢 Select Businesses</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {BUSINESSES.map(business => (
              <label key={business.id} className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700/70 transition-colors">
                <input
                  type="checkbox"
                  checked={selectedBusinesses.includes(business.id)}
                  onChange={() => handleBusinessChange(business.id)}
                  className="w-4 h-4 text-accent-blue bg-gray-800 border-gray-600 rounded focus:ring-accent-blue"
                />
                <span className={`font-medium ${business.color}`}>
                  {business.name}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Platform Selection with Character Limits */}
        <div className="bg-slate-800/30 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-dark-text mb-4">📱 Select Platforms</h3>
          
          {/* Platform-Specific Generation Toggle */}
          <div className="mb-4 p-4 bg-slate-700/30 rounded-lg">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={generatePerPlatform}
                onChange={(e) => setGeneratePerPlatform(e.target.checked)}
                className="w-4 h-4 text-accent-blue bg-gray-800 border-gray-600 rounded focus:ring-accent-blue"
              />
              <div>
                <span className="font-medium text-dark-text">Generate Platform-Specific Content</span>
                <div className="text-sm text-dark-text-muted">
                  {generatePerPlatform 
                    ? 'Create unique content optimized for each platform'
                    : 'Generate one post and adapt for all platforms'
                  }
                </div>
              </div>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PLATFORMS.map(platform => (
              <label key={platform.id} className="flex items-center gap-3 p-4 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700/70 transition-colors">
                <input
                  type="checkbox"
                  checked={selectedPlatforms.includes(platform.id)}
                  onChange={() => handlePlatformChange(platform.id)}
                  className="w-4 h-4 text-accent-blue bg-gray-800 border-gray-600 rounded focus:ring-accent-blue"
                />
                <span className="text-lg">{platform.icon}</span>
                <div className="flex-1">
                  <span className={`text-sm font-medium ${platform.color}`}>
                    {platform.name}
                  </span>
                  <div className="text-xs text-dark-text-muted">
                    Limit: {platform.charLimit} chars • Sweet spot: {platform.sweet}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Generation Summary */}
        <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4">
          <h4 className="text-blue-400 font-medium mb-2">📊 Generation Summary</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-dark-text-muted">Posts per Business:</span>
              <span className="text-dark-text font-semibold ml-2">{getPostCount()}</span>
            </div>
            <div>
              <span className="text-dark-text-muted">Businesses:</span>
              <span className="text-dark-text font-semibold ml-2">{selectedBusinesses.length}</span>
            </div>
            <div>
              <span className="text-dark-text-muted">Platforms:</span>
              <span className="text-dark-text font-semibold ml-2">{generatePerPlatform ? selectedPlatforms.length : '1 (shared)'}</span>
            </div>
            <div>
              <span className="text-dark-text-muted">Total Generations:</span>
              <span className="text-accent-blue font-semibold ml-2">{getTotalGenerations()}</span>
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <div className="text-center">
          <button
            onClick={generateContentForTimeframe}
            disabled={isGenerating || selectedBusinesses.length === 0 || selectedPlatforms.length === 0}
            className="btn btn-success btn-lg"
          >
            {isGenerating 
              ? `🤖 Generating... (${generationProgress.current}/${generationProgress.total})` 
              : `🚀 Generate ${getTotalGenerations()} Posts`
            }
          </button>
        </div>

        {/* Progress Bar */}
        {isGenerating && (
          <div className="bg-slate-800/50 rounded-lg p-4">
            <div className="flex justify-between text-sm text-dark-text-muted mb-2">
              <span>Generating content...</span>
              <span>{generationProgress.current}/{generationProgress.total}</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div 
                className="bg-accent-blue h-2 rounded-full transition-all duration-300"
                style={{ width: `${(generationProgress.current / generationProgress.total) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Generated Content Display */}
        {weeklyPosts.length > 0 && (
          <div className="bg-slate-800/30 rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-dark-text">📋 Generated Content</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="btn btn-outline btn-sm"
                >
                  {showPreview ? '📝 Edit View' : '👁️ Preview Mode'}
                </button>
                <button
                  onClick={() => setWeeklyPosts([])}
                  className="btn btn-outline btn-sm text-red-400"
                >
                  🗑️ Clear All
                </button>
              </div>
            </div>
            
            <div className="space-y-6">
              {selectedBusinesses.map(businessId => {
                const businessName = businessId.replace('-', '')
                const businessPosts = weeklyPosts.filter(p => p.business === businessName)
                const hasMoreThanThree = businessPosts.length > 3
                const visiblePosts = businessPosts.slice(0, 3)
                const hiddenPosts = businessPosts.slice(3)
                
                return (
                  <div key={businessId} className="bg-slate-700/30 rounded-lg p-4">
                    <h4 className="text-accent-blue font-semibold mb-3 capitalize flex items-center justify-between">
                      <span>{businessName.replace('-', ' ')} ({businessPosts.length} posts)</span>
                      {hasMoreThanThree && (
                        <span className="text-xs text-dark-text-muted font-normal">
                          Showing 3 of {businessPosts.length} • Scroll for more ↓
                        </span>
                      )}
                    </h4>
                    
                    {/* Always visible posts (first 3) */}
                    <div className="grid grid-cols-1 gap-4">
                      {visiblePosts.map(renderPost)}
                    </div>
                    
                    {/* Scrollable container for additional posts */}
                    {hasMoreThanThree && (
                      <div className="mt-4 max-h-[600px] overflow-y-auto pr-2 border-t border-slate-600 pt-4">
                        <div className="grid grid-cols-1 gap-4">
                          {hiddenPosts.map(renderPost)}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Bulk Actions */}
            <div className="mt-6 p-4 bg-slate-700/30 rounded-lg">
              <h4 className="text-dark-text font-medium mb-3">🔧 Bulk Actions</h4>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => {
                    const allContent = weeklyPosts
                      .filter(p => p.content)
                      .map(p => `${p.business.toUpperCase()} - ${p.day.toUpperCase()} (${p.platform}):\n${p.content}`)
                      .join('\n\n---\n\n')
                    navigator.clipboard.writeText(allContent)
                  }}
                  className="btn btn-outline btn-sm"
                >
                  📋 Copy All Content
                </button>
                
                <button
                  onClick={() => {
                    const failedPosts = weeklyPosts.filter(p => p.status === 'error')
                    failedPosts.forEach(post => regeneratePost(post))
                  }}
                  disabled={!weeklyPosts.some(p => p.status === 'error')}
                  className="btn btn-outline btn-sm"
                >
                  🔄 Regenerate Failed Posts
                </button>
                
                <button className="btn btn-outline btn-sm">
                  📤 Export to Scheduler
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </CollapsibleSection>
  )
}