// src/components/EnhancedWeeklyAutomation.tsx
'use client'

import { useState, useEffect } from 'react'
import CollapsibleSection from './CollapsibleSection'

// Platform specs - sourced from platform-specs.ts (duplicated here for client component)
const PLATFORMS = [
  { id: 'google', name: 'Google Business Profile', icon: '🏢', color: 'text-blue-400', charLimit: 1500, sweet: '200-400' },
  { id: 'facebook', name: 'Facebook', icon: '📘', color: 'text-blue-500', charLimit: 63206, sweet: '200-400' },
  { id: 'instagram', name: 'Instagram', icon: '📷', color: 'text-pink-400', charLimit: 2200, sweet: '100-200' },
  { id: 'twitter', name: 'X/Twitter', icon: '🐦', color: 'text-sky-400', charLimit: 280, sweet: '240-270' }
]

const TIMEFRAME_OPTIONS = [
  { id: 'weekly', name: 'Weekly (5 posts)', description: 'Monday through Friday', postCount: 5 },
  { id: 'monthly', name: 'Monthly (20 posts)', description: 'Full month coverage', postCount: 20 },
  { id: 'quarterly', name: 'Quarterly (60 posts)', description: 'Seasonal campaign', postCount: 60 },
  { id: 'custom', name: 'Custom Range', description: 'Choose your own dates', postCount: 0 }
]

const DAILY_THEMES: Record<string, { theme: string; focus: string; emoji: string }> = {
  monday: { theme: 'Monday Motivation', focus: 'Start the week strong with energy and special highlights', emoji: '💪' },
  tuesday: { theme: 'Tuesday Tips', focus: 'Educational tips and advice', emoji: '💡' },
  wednesday: { theme: 'Wednesday Specials', focus: 'Mid-week promotional offers', emoji: '🎯' },
  thursday: { theme: 'Thursday Maintenance', focus: 'Maintenance reminders and safety tips', emoji: '🔧' },
  friday: { theme: 'Friday Prep', focus: 'Weekend preparation and service availability', emoji: '🏠' }
}

interface BusinessOption {
  id: string
  name: string
  displayName: string
  brandVoice?: string
  tagline?: string
}

interface WeeklyPost {
  id: string
  businessId: string
  businessName: string
  day: string
  platform: string
  content: string
  characterCount: number
  withinLimits: boolean
  status: 'generating' | 'completed' | 'error' | 'editing'
  imageUrl?: string
  imageDescription?: string
  suggestedTime?: string
  originalContent?: string
  isEdited?: boolean
}

export default function EnhancedWeeklyAutomation() {
  // Dynamic business loading
  const [businesses, setBusinesses] = useState<BusinessOption[]>([])
  const [loadingBusinesses, setLoadingBusinesses] = useState(true)

  const [selectedBusinesses, setSelectedBusinesses] = useState<string[]>([])
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['facebook'])
  const [selectedTimeframe, setSelectedTimeframe] = useState('weekly')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [customPostCount, setCustomPostCount] = useState(10)

  // Generation options
  const [includeSpecials, setIncludeSpecials] = useState(true)
  const [includeImages, setIncludeImages] = useState(true)
  const [includeContentBlocks, setIncludeContentBlocks] = useState(true)
  const [generatePerPlatform, setGeneratePerPlatform] = useState(true)

  // Generation state
  const [weeklyPosts, setWeeklyPosts] = useState<WeeklyPost[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 })
  const [editingPost, setEditingPost] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [showPreview, setShowPreview] = useState(false)

  // Load businesses from database on mount
  useEffect(() => {
    async function loadBusinesses() {
      try {
        const response = await fetch('/api/businesses')
        const data = await response.json()
        if (data.success && data.businesses) {
          setBusinesses(data.businesses.map((b: any) => ({
            id: b.id,
            name: b.name,
            displayName: b.displayName,
            brandVoice: b.brandVoice,
            tagline: b.tagline
          })))
          // Auto-select first business
          if (data.businesses.length > 0) {
            setSelectedBusinesses([data.businesses[0].id])
          }
        }
      } catch (error) {
        console.error('Failed to load businesses:', error)
      } finally {
        setLoadingBusinesses(false)
      }
    }
    loadBusinesses()
  }, [])

  const getPostCount = () => {
    if (selectedTimeframe === 'custom') return customPostCount
    return TIMEFRAME_OPTIONS.find(t => t.id === selectedTimeframe)?.postCount || 5
  }

  const getTotalGenerations = () => {
    const postCount = getPostCount()
    const platformCount = generatePerPlatform ? selectedPlatforms.length : 1
    return postCount * selectedBusinesses.length * platformCount
  }

  const handleBusinessChange = (businessId: string) => {
    setSelectedBusinesses(prev =>
      prev.includes(businessId) ? prev.filter(id => id !== businessId) : [...prev, businessId]
    )
  }

  const handlePlatformChange = (platformId: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platformId) ? prev.filter(id => id !== platformId) : [...prev, platformId]
    )
  }

  const generateContentForTimeframe = async () => {
    if (selectedBusinesses.length === 0 || selectedPlatforms.length === 0) {
      alert('Please select at least one business and one platform')
      return
    }

    setIsGenerating(true)
    const totalGenerations = getTotalGenerations()
    setGenerationProgress({ current: 0, total: totalGenerations })

    const newPosts: WeeklyPost[] = []
    let progressCount = 0
    const postCount = getPostCount()

    const days = selectedTimeframe === 'weekly'
      ? ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
      : Array.from({ length: postCount }, (_, i) => {
          const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
          return dayNames[(i % 7)]
        })

    // Track used image IDs per business for batch variety
    const usedImageIds: Record<string, string[]> = {}

    for (const businessId of selectedBusinesses) {
      const business = businesses.find(b => b.id === businessId)
      if (!business) continue
      usedImageIds[businessId] = []

      for (let i = 0; i < days.length; i++) {
        const day = days[i]
        const platformsToGenerate = generatePerPlatform ? selectedPlatforms : [selectedPlatforms[0]]

        for (const platform of platformsToGenerate) {
          const postId = `${businessId}-${day}-${i}-${platform}`

          const newPost: WeeklyPost = {
            id: postId,
            businessId,
            businessName: business.displayName,
            day,
            platform,
            content: '',
            characterCount: 0,
            withinLimits: true,
            status: 'generating'
          }
          newPosts.push(newPost)

          try {
            // Calculate post date from start date or today
            const startDate = customStartDate ? new Date(customStartDate) : getNextMonday()
            const postDate = new Date(startDate)
            postDate.setDate(postDate.getDate() + i)

            const response = await fetch('/api/ai/generate-enhanced-content', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                businessId,
                platform,
                day,
                month: postDate.getMonth(),
                postDate: postDate.toISOString(),
                includeSpecials,
                includeImages,
                includeContentBlocks,
                contentType: 'weekly-automation',
                excludeImageIds: usedImageIds[businessId]
              })
            })

            const data = await response.json()

            if (data.success) {
              const platformInfo = PLATFORMS.find(p => p.id === platform)
              const withinLimits = (data.content?.length || 0) <= (platformInfo?.charLimit || 1000)

              // Track used image for batch variety
              if (data.image?.id) {
                usedImageIds[businessId].push(data.image.id)
              }

              const idx = newPosts.findIndex(p => p.id === postId)
              if (idx !== -1) {
                newPosts[idx] = {
                  ...newPost,
                  content: data.content || '',
                  characterCount: data.content?.length || 0,
                  withinLimits,
                  status: 'completed',
                  imageUrl: data.image?.url || undefined,
                  imageDescription: data.image?.description || undefined,
                  suggestedTime: data.metadata?.suggestedPostingTime?.label || undefined
                }
              }
            } else {
              const idx = newPosts.findIndex(p => p.id === postId)
              if (idx !== -1) {
                newPosts[idx] = { ...newPost, status: 'error' }
              }
            }
          } catch (error) {
            console.error('Error generating post:', error)
            const idx = newPosts.findIndex(p => p.id === postId)
            if (idx !== -1) {
              newPosts[idx] = { ...newPost, status: 'error' }
            }
          }

          progressCount++
          setGenerationProgress({ current: progressCount, total: totalGenerations })
          setWeeklyPosts([...newPosts])

          // Rate limiting delay
          await new Promise(resolve => setTimeout(resolve, 1200))
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
      const response = await fetch('/api/ai/generate-enhanced-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: post.businessId,
          platform: post.platform,
          day: post.day,
          month: new Date().getMonth(),
          includeSpecials,
          includeImages,
          includeContentBlocks,
          contentType: 'regeneration'
        })
      })

      const data = await response.json()

      if (data.success) {
        const platformInfo = PLATFORMS.find(p => p.id === post.platform)
        setWeeklyPosts(prev => prev.map(p =>
          p.id === post.id
            ? {
                ...p,
                content: data.content || '',
                characterCount: data.content?.length || 0,
                withinLimits: (data.content?.length || 0) <= (platformInfo?.charLimit || 1000),
                status: 'completed',
                imageUrl: data.image?.url || p.imageUrl,
                imageDescription: data.image?.description || p.imageDescription,
                suggestedTime: data.metadata?.suggestedPostingTime?.label || p.suggestedTime,
                originalContent: p.originalContent || p.content
              }
            : p
        ))
      } else {
        setWeeklyPosts(prev => prev.map(p =>
          p.id === post.id ? { ...p, status: 'error' } : p
        ))
      }
    } catch {
      setWeeklyPosts(prev => prev.map(p =>
        p.id === post.id ? { ...p, status: 'error' } : p
      ))
    }
  }

  const getPlatformIcon = (platformId: string) => PLATFORMS.find(p => p.id === platformId)?.icon || '📱'
  const getPlatformColor = (platformId: string) => PLATFORMS.find(p => p.id === platformId)?.color || 'text-gray-400'

  const getCharacterLimitColor = (post: WeeklyPost) => {
    const platform = PLATFORMS.find(p => p.id === post.platform)
    if (!platform) return 'text-gray-400'
    const pct = (post.characterCount / platform.charLimit) * 100
    if (pct > 90) return 'text-red-400'
    if (pct > 75) return 'text-yellow-400'
    return 'text-green-400'
  }

  const renderPost = (post: WeeklyPost) => (
    <div key={post.id} className="bg-slate-800/50 rounded-lg p-4 border border-slate-600">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <span className="capitalize font-medium text-dark-text">{post.day}</span>
          <span className={`flex items-center gap-1 ${getPlatformColor(post.platform)}`}>
            {getPlatformIcon(post.platform)}
            <span className="text-sm">{PLATFORMS.find(p => p.id === post.platform)?.name}</span>
          </span>
          {post.suggestedTime && (
            <span className="text-xs text-dark-text-muted bg-slate-700/50 px-2 py-1 rounded">
              Best time: {post.suggestedTime}
            </span>
          )}
          {post.isEdited && (
            <span className="text-xs bg-yellow-600 text-white px-2 py-1 rounded">Edited</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs ${getCharacterLimitColor(post)}`}>
            {post.characterCount}/{PLATFORMS.find(p => p.id === post.platform)?.charLimit} chars
          </span>
          <div className={`w-2 h-2 rounded-full ${
            post.status === 'completed' ? 'bg-green-400' :
            post.status === 'generating' ? 'bg-blue-400 animate-pulse' :
            post.status === 'error' ? 'bg-red-400' : 'bg-gray-400'
          }`}></div>
        </div>
      </div>

      {/* Image preview */}
      {post.imageUrl && post.status === 'completed' && (
        <div className="mb-3 flex items-center gap-3 bg-slate-900/50 rounded p-2">
          <img src={post.imageUrl} alt={post.imageDescription || 'Post image'} className="w-16 h-16 object-cover rounded" />
          <span className="text-xs text-dark-text-muted">{post.imageDescription || 'Selected image'}</span>
        </div>
      )}

      {editingPost === post.id ? (
        <div className="space-y-3">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full p-3 bg-gray-900/50 border border-gray-600 rounded text-dark-text text-sm"
            rows={4}
          />
          <div className="flex gap-2">
            <button onClick={() => saveEdit(post.id)} className="btn btn-primary btn-sm">Save</button>
            <button onClick={cancelEdit} className="btn btn-outline btn-sm">Cancel</button>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-gray-900/50 rounded p-3 mb-3 text-sm text-dark-text whitespace-pre-wrap">
            {post.content || 'Generating...'}
          </div>
          {post.status === 'completed' && (
            <div className="flex gap-2">
              <button onClick={() => startEditing(post)} className="btn btn-outline btn-sm">Edit</button>
              <button onClick={() => regeneratePost(post)} className="btn btn-outline btn-sm">Regenerate</button>
              <button onClick={() => navigator.clipboard.writeText(post.content)} className="btn btn-outline btn-sm">Copy</button>
            </div>
          )}
          {post.status === 'error' && (
            <button onClick={() => regeneratePost(post)} className="btn btn-outline btn-sm text-red-400">Retry</button>
          )}
        </>
      )}
    </div>
  )

  return (
    <CollapsibleSection title="Content Automation" defaultExpanded={false}>
      <div className="space-y-8">

        {/* Timeframe Selection */}
        <div className="bg-slate-800/30 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-dark-text mb-4">Generation Timeframe</h3>
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
              </button>
            ))}
          </div>

          {selectedTimeframe === 'custom' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 p-4 bg-slate-700/30 rounded-lg">
              <div>
                <label className="block text-dark-text-muted text-sm mb-1">Start Date</label>
                <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="form-control" />
              </div>
              <div>
                <label className="block text-dark-text-muted text-sm mb-1">End Date</label>
                <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="form-control" />
              </div>
              <div>
                <label className="block text-dark-text-muted text-sm mb-1">Number of Posts</label>
                <input type="number" min="1" max="100" value={customPostCount} onChange={(e) => setCustomPostCount(parseInt(e.target.value) || 1)} className="form-control" />
              </div>
            </div>
          )}
        </div>

        {/* Business Selection - Dynamic from Database */}
        <div className="bg-slate-800/30 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-dark-text mb-4">Select Businesses</h3>
          {loadingBusinesses ? (
            <div className="text-dark-text-muted">Loading businesses...</div>
          ) : businesses.length === 0 ? (
            <div className="text-dark-text-muted">No businesses found. Add businesses in Settings.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {businesses.map(business => (
                <label key={business.id} className="flex items-start gap-3 p-3 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700/70 transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedBusinesses.includes(business.id)}
                    onChange={() => handleBusinessChange(business.id)}
                    className="w-4 h-4 mt-1 text-accent-blue bg-gray-800 border-gray-600 rounded focus:ring-accent-blue"
                  />
                  <div>
                    <span className="font-medium text-dark-text">{business.displayName}</span>
                    {business.tagline && (
                      <div className="text-xs text-dark-text-muted mt-0.5">{business.tagline}</div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Platform Selection */}
        <div className="bg-slate-800/30 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-dark-text mb-4">Select Platforms</h3>

          <div className="mb-4 p-4 bg-slate-700/30 rounded-lg">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={generatePerPlatform}
                onChange={(e) => setGeneratePerPlatform(e.target.checked)}
                className="w-4 h-4 text-accent-blue bg-gray-800 border-gray-600 rounded focus:ring-accent-blue"
              />
              <div>
                <span className="font-medium text-dark-text">Platform-Specific Content</span>
                <div className="text-sm text-dark-text-muted">
                  {generatePerPlatform ? 'Unique content optimized for each platform' : 'One post adapted for all platforms'}
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
                  <span className={`text-sm font-medium ${platform.color}`}>{platform.name}</span>
                  <div className="text-xs text-dark-text-muted">Limit: {platform.charLimit} chars | Best: {platform.sweet}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Content Options */}
        <div className="bg-slate-800/30 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-dark-text mb-4">Content Options</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg cursor-pointer">
              <input type="checkbox" checked={includeSpecials} onChange={(e) => setIncludeSpecials(e.target.checked)}
                className="w-4 h-4 text-accent-blue bg-gray-800 border-gray-600 rounded" />
              <div>
                <span className="font-medium text-dark-text text-sm">Include Monthly Specials</span>
                <div className="text-xs text-dark-text-muted">Weave current promotions into posts</div>
              </div>
            </label>
            <label className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg cursor-pointer">
              <input type="checkbox" checked={includeImages} onChange={(e) => setIncludeImages(e.target.checked)}
                className="w-4 h-4 text-accent-blue bg-gray-800 border-gray-600 rounded" />
              <div>
                <span className="font-medium text-dark-text text-sm">Auto-Select Images</span>
                <div className="text-xs text-dark-text-muted">Match images from library to each post</div>
              </div>
            </label>
            <label className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg cursor-pointer">
              <input type="checkbox" checked={includeContentBlocks} onChange={(e) => setIncludeContentBlocks(e.target.checked)}
                className="w-4 h-4 text-accent-blue bg-gray-800 border-gray-600 rounded" />
              <div>
                <span className="font-medium text-dark-text text-sm">Use Content Blocks</span>
                <div className="text-xs text-dark-text-muted">Include saved CTAs, phone, hours</div>
              </div>
            </label>
          </div>
        </div>

        {/* Generation Summary */}
        <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4">
          <h4 className="text-blue-400 font-medium mb-2">Generation Summary</h4>
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
              ? `Generating... (${generationProgress.current}/${generationProgress.total})`
              : `Generate ${getTotalGenerations()} Posts`
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

        {/* Generated Content */}
        {weeklyPosts.length > 0 && (
          <div className="bg-slate-800/30 rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-dark-text">Generated Content</h3>
              <div className="flex gap-2">
                <button onClick={() => setShowPreview(!showPreview)} className="btn btn-outline btn-sm">
                  {showPreview ? 'Edit View' : 'Preview Mode'}
                </button>
                <button onClick={() => setWeeklyPosts([])} className="btn btn-outline btn-sm text-red-400">
                  Clear All
                </button>
              </div>
            </div>

            <div className="space-y-6">
              {selectedBusinesses.map(businessId => {
                const business = businesses.find(b => b.id === businessId)
                const businessPosts = weeklyPosts.filter(p => p.businessId === businessId)
                const visiblePosts = businessPosts.slice(0, 3)
                const hiddenPosts = businessPosts.slice(3)

                return (
                  <div key={businessId} className="bg-slate-700/30 rounded-lg p-4">
                    <h4 className="text-accent-blue font-semibold mb-3 flex items-center justify-between">
                      <span>{business?.displayName || businessId} ({businessPosts.length} posts)</span>
                      {hiddenPosts.length > 0 && (
                        <span className="text-xs text-dark-text-muted font-normal">
                          Showing 3 of {businessPosts.length}
                        </span>
                      )}
                    </h4>
                    <div className="grid grid-cols-1 gap-4">
                      {visiblePosts.map(renderPost)}
                    </div>
                    {hiddenPosts.length > 0 && (
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
              <h4 className="text-dark-text font-medium mb-3">Bulk Actions</h4>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => {
                    const allContent = weeklyPosts
                      .filter(p => p.content)
                      .map(p => `${p.businessName} - ${p.day.toUpperCase()} (${p.platform}):\n${p.content}`)
                      .join('\n\n---\n\n')
                    navigator.clipboard.writeText(allContent)
                  }}
                  className="btn btn-outline btn-sm"
                >
                  Copy All Content
                </button>
                <button
                  onClick={() => {
                    weeklyPosts.filter(p => p.status === 'error').forEach(post => regeneratePost(post))
                  }}
                  disabled={!weeklyPosts.some(p => p.status === 'error')}
                  className="btn btn-outline btn-sm"
                >
                  Regenerate Failed Posts
                </button>
                <button className="btn btn-outline btn-sm">
                  Export to Scheduler
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </CollapsibleSection>
  )
}

function getNextMonday(): Date {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? 1 : 8 - day // days until next Monday
  const nextMon = new Date(now)
  nextMon.setDate(now.getDate() + diff)
  return nextMon
}
