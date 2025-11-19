// src/components/PostCreation.tsx

'use client'

import { useState, useRef, useEffect } from 'react'
import CollapsibleSection from './CollapsibleSection'
import Image from 'next/image'

interface PostData {
  content: string
  contentType: string
  platforms: string[]
  businesses: string[]
  selectedLibraryImages: ImageLibraryItem[]
  uploadedImages: File[]
  scheduling: {
    type: string
    date: string
    time: string
  }
}

interface ImageLibraryItem {
  id: string
  businessId: string
  fileName: string
  originalName: string
  fileSize: number
  cloudUrl: string
  thumbnailUrl?: string
  aiTags: string[]
  manualTags: string[]
  aiDescription?: string
  category?: string
  usageCount: number
}

export default function EnhancedPostCreation() {
  const [postData, setPostData] = useState<PostData>({
    content: '',
    contentType: 'custom',
    platforms: [],
    businesses: [],
    selectedLibraryImages: [],
    uploadedImages: [],
    scheduling: {
      type: 'now',
      date: '',
      time: ''
    }
  })

  const [showPreview, setShowPreview] = useState(false)
  const [isPosting, setIsPosting] = useState(false)
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [uploadPreviews, setUploadPreviews] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  
  // Image management states
  const [imageMode, setImageMode] = useState<'library' | 'upload'>('library')
  const [libraryImages, setLibraryImages] = useState<ImageLibraryItem[]>([])
  const [loadingLibrary, setLoadingLibrary] = useState(false)
  const [imageSearch, setImageSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [suggestedImages, setSuggestedImages] = useState<ImageLibraryItem[]>([])
  
  // Business context options
  const [enhancedMode, setEnhancedMode] = useState(true)
  const [platformOptimization, setPlatformOptimization] = useState(true)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Available platforms with character limits
  const platforms = [
    { id: 'google', name: 'Google Business Profile', icon: '🏢', color: 'text-blue-400', charLimit: 1500, sweet: '200-400' },
    { id: 'facebook', name: 'Facebook', icon: '📘', color: 'text-blue-600', charLimit: 63206, sweet: '200-400' },
    { id: 'instagram', name: 'Instagram', icon: '📷', color: 'text-pink-500', charLimit: 2200, sweet: '100-200' },
    { id: 'twitter', name: 'X/Twitter', icon: '🦆', color: 'text-sky-400', charLimit: 280, sweet: '240-280' }
  ]

  // Available businesses
  const businesses = [
    { id: 'lex-dallas', name: 'Lex Dallas', color: 'text-blue-400' },
    { id: 'lex-etx', name: 'Lex ETX', color: 'text-green-400' },
    { id: 'lyons', name: 'Lyons', color: 'text-purple-400' }
  ]

  // Update post data helper
  const updatePostData = (updates: Partial<PostData>) => {
    setPostData(prev => ({ ...prev, ...updates }))
  }

  // Business selection
  const toggleBusiness = (businessId: string) => {
    const newBusinesses = postData.businesses.includes(businessId)
      ? postData.businesses.filter(id => id !== businessId)
      : [...postData.businesses, businessId]
    
    updatePostData({ businesses: newBusinesses })
    
    // Load images for selected businesses
    if (newBusinesses.length > 0 && libraryImages.length === 0) {
      loadImageLibrary()
    }
  }

  // Platform selection
  const togglePlatform = (platformId: string) => {
    const newPlatforms = postData.platforms.includes(platformId)
      ? postData.platforms.filter(id => id !== platformId)
      : [...postData.platforms, platformId]
    
    updatePostData({ platforms: newPlatforms })
  }

  // Load images from library
  const loadImageLibrary = async () => {
    if (postData.businesses.length === 0) return
    
    setLoadingLibrary(true)
    try {
      const response = await fetch(`/api/businesses/${postData.businesses[0]}/images`)
      const result = await response.json()
      
      if (result.success) {
        setLibraryImages(result.images)
        suggestRelevantImages()
      }
    } catch (error) {
      console.error('Failed to load image library:', error)
    } finally {
      setLoadingLibrary(false)
    }
  }

  // Load images when businesses change
  useEffect(() => {
    if (postData.businesses.length > 0) {
      loadImageLibrary()
    }
  }, [postData.businesses])

  // Suggest relevant images based on content
  const suggestRelevantImages = () => {
    try {
      if (!postData.content || libraryImages.length === 0) {
        setSuggestedImages([])
        return
      }

      const contentLower = postData.content.toLowerCase()
      const keywords: string[] = []

      // Extract keywords from content
      if (contentLower.includes('hvac') || contentLower.includes('heating') || contentLower.includes('cooling')) {
        keywords.push('hvac', 'heating', 'cooling', 'air_conditioning')
      }
      if (contentLower.includes('plumbing') || contentLower.includes('water') || contentLower.includes('pipe')) {
        keywords.push('plumbing', 'water', 'pipes')
      }
      if (contentLower.includes('electrical') || contentLower.includes('electric') || contentLower.includes('wiring')) {
        keywords.push('electrical', 'electric', 'wiring')
      }
      
      // Simple matching - find images with matching tags or descriptions
      const relevant = libraryImages.filter(image => {
        const imageTags = [...image.aiTags, ...image.manualTags].map(tag => tag.toLowerCase())
        const description = image.aiDescription?.toLowerCase() || ''
        
        return keywords.some(keyword => 
          imageTags.some(tag => tag.includes(keyword.toLowerCase())) ||
          description.includes(keyword.toLowerCase())
        )
      }).slice(0, 6) // Limit to 6 suggestions
      
      setSuggestedImages(relevant)
    } catch (error) {
      console.error('Failed to suggest images:', error)
      setSuggestedImages([])
    }
  }

  // Enhanced AI content generation with business context - ORIGINAL FUNCTION PRESERVED
  const generateAI = async () => {
    if (!aiPrompt.trim()) {
      alert('Please enter a prompt for AI generation')
      return
    }

    if (postData.businesses.length === 0) {
      alert('Please select at least one business for context')
      return
    }

    if (postData.platforms.length === 0) {
      alert('Please select at least one platform for optimization')
      return
    }

    setIsGeneratingAI(true)
    try {
      //  FIXED: Use the new custom post generation route
      const response = await fetch('/api/ai/generate-custom-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt, // Direct user prompt - no modification needed
          businessId: postData.businesses[0],
          platform: postData.platforms[0],
          includeBusinessContext: enhancedMode,
          platformOptimization: platformOptimization,
          includeImages: true // Enable image suggestions
        })
      })

      const data = await response.json()
      
      if (data.success) {
        // Use the response from the new custom route
        const generatedContent = data.data.content
        
        updatePostData({ content: generatedContent })
        setAiPrompt('')
        
        // Show success with platform info
        const platform = platforms.find(p => p.id === postData.platforms[0])
        const charCount = generatedContent.length
        const withinLimits = charCount <= (platform?.charLimit || 1000)
        
        alert(`AI content generated successfully!\nCharacters: ${charCount}${platform ? `/${platform.charLimit}` : ''} ${withinLimits ? '✅' : '⚠️ Over limit'}`)
        
        // Auto-suggest images based on generated content
        if (libraryImages.length > 0) {
          suggestRelevantImages()
        }
      } else {
        alert('Failed to generate AI content: ' + (data.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('AI generation failed:', error)
      alert('Failed to generate AI content: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setIsGeneratingAI(false)
    }
  }

  // Handle image library selection
  const toggleLibraryImage = (image: ImageLibraryItem) => {
    const isSelected = postData.selectedLibraryImages.some(img => img.id === image.id)
    const totalImages = postData.selectedLibraryImages.length + postData.uploadedImages.length
    
    if (!isSelected && totalImages >= 4) {
      alert('Maximum 4 images allowed per post')
      return
    }
    
    const newSelection = isSelected
      ? postData.selectedLibraryImages.filter(img => img.id !== image.id)
      : [...postData.selectedLibraryImages, image]
    
    updatePostData({ selectedLibraryImages: newSelection })
  }

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    
    if (files.length === 0) return

    if (postData.businesses.length === 0) {
      alert('Please select a business before uploading images')
      return
    }

    // Validate files
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    const invalidFiles = files.filter(file => !validTypes.includes(file.type))
    
    if (invalidFiles.length > 0) {
      alert(`Invalid file types: ${invalidFiles.map(f => f.name).join(', ')}. Please use JPG, PNG, GIF, or WebP.`)
      return
    }

    const maxSize = 10 * 1024 * 1024 // 10MB
    const oversizedFiles = files.filter(file => file.size > maxSize)
    
    if (oversizedFiles.length > 0) {
      alert(`Files too large: ${oversizedFiles.map(f => f.name).join(', ')}. Maximum size is 10MB per image.`)
      return
    }

    const totalImages = postData.selectedLibraryImages.length + postData.uploadedImages.length + files.length
    if (totalImages > 4) {
      alert('Maximum 4 images allowed per post')
      return
    }

    setUploading(true)
    
    try {
      // Upload files to library and get them back
      const uploadedLibraryImages: ImageLibraryItem[] = []
      
      for (const file of files) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('businessId', postData.businesses[0])

        const response = await fetch(`/api/businesses/${postData.businesses[0]}/images/upload`, {
          method: 'POST',
          body: formData
        })

        const result = await response.json()
        
        if (result.success && result.image) {
          uploadedLibraryImages.push(result.image)
        } else {
          console.error(`Failed to upload ${file.name}:`, result.error)
        }
      }
      
      if (uploadedLibraryImages.length > 0) {
        // Add uploaded images to selection and refresh library
        updatePostData({ 
          selectedLibraryImages: [...postData.selectedLibraryImages, ...uploadedLibraryImages]
        })
        
        // Refresh the library to show new images
        await loadImageLibrary()
        
        alert(`Successfully uploaded ${uploadedLibraryImages.length} image(s) to library and added to post`)
      }
      
    } catch (error) {
      console.error('Upload failed:', error)
      alert('Failed to upload images: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // Get character count with platform-specific warnings
  const getCharacterCounts = () => {
    if (postData.platforms.length === 0) return null
    
    return postData.platforms.map(platformId => {
      const platform = platforms.find(p => p.id === platformId)
      if (!platform) return null
      
      // Fixed: Add null check for postData.content
      const count = postData.content?.length || 0
      const isOverLimit = count > platform.charLimit
      const isInSweetSpot = count >= parseInt(platform.sweet.split('-')[0]) && 
                           count <= parseInt(platform.sweet.split('-')[1])
      
      return (
        <div key={platformId} className={`text-xs p-2 rounded ${
          isOverLimit ? 'bg-red-900/20 text-red-300' :
          isInSweetSpot ? 'bg-green-900/20 text-green-300' : 
          'bg-slate-800 text-slate-300'
        }`}>
          <span className={platform.color}>{platform.icon} {platform.name}</span>: {count}/{platform.charLimit} 
          {isOverLimit && ' ⚠️ Over limit'}
          {isInSweetSpot && ' ✅ Sweet spot'}
        </div>
      )
    })
  }

  // Handle preview
  const handlePreview = () => {
    setShowPreview(true)
  }

  // ONLY FIXED THE SCHEDULING LOGIC - handlePost function
  const handlePost = async () => {
    if (!postData.content.trim() || postData.platforms.length === 0 || postData.businesses.length === 0) {
      alert('Please fill in all required fields')
      return
    }

    setIsPosting(true)

    try {
      // Check if this is a scheduled post
      if (postData.scheduling.type === 'scheduled') {
        // Validate scheduling data
        if (!postData.scheduling.date || !postData.scheduling.time) {
          alert('⚠️ Please select both date and time for scheduling')
          return
        }

        const scheduledDateTime = new Date(`${postData.scheduling.date}T${postData.scheduling.time}`)
        const now = new Date()
        
        if (isNaN(scheduledDateTime.getTime())) {
          alert('⚠️ Invalid date or time selected')
          return
        }
        
        if (scheduledDateTime <= now) {
          alert('⚠️ Scheduled time must be in the future')
          return
        }

        console.log(`📅 Scheduling post for ${scheduledDateTime.toLocaleString()}`)

        // Create scheduled posts for each platform/business combination
        const schedulingPromises = []
        
        for (const platform of postData.platforms) {
          for (const businessId of postData.businesses) {
            const scheduleData = {
              content: postData.content,
              platform: platform,
              businessId: businessId,
              imageUrl: postData.selectedLibraryImages.length > 0 ? postData.selectedLibraryImages[0].cloudUrl : undefined,
              scheduledFor: scheduledDateTime.toISOString()
            }
            
            schedulingPromises.push(
              fetch('/api/social/schedule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(scheduleData)
              })
            )
          }
        }

        const responses = await Promise.all(schedulingPromises)
        const results = await Promise.all(responses.map(r => r.json()))
        
        const failures = results.filter(r => !r.success)
        
        if (failures.length === 0) {
          const scheduledCount = results.length
          const platformNames = postData.platforms.map(p => platforms.find(pl => pl.id === p)?.name || p).join(', ')
          const businessNames = postData.businesses.map(b => businesses.find(bus => bus.id === b)?.name || b).join(', ')
          const scheduledTime = scheduledDateTime.toLocaleString()
          
          alert(`🎉 Successfully scheduled ${scheduledCount} post${scheduledCount > 1 ? 's' : ''}!\n\nPlatforms: ${platformNames}\nBusinesses: ${businessNames}\nScheduled for: ${scheduledTime}\n\nYour posts will appear on the Content Calendar.`)
        } else if (failures.length < results.length) {
          alert(`⚠️ ${results.length - failures.length} posts scheduled successfully, ${failures.length} failed.\n\nPlease check the Content Calendar for scheduled posts.`)
        } else {
          const errorMessage = failures[0]?.error || 'Unknown error'
          alert(`❌ All posts failed to schedule: ${errorMessage}\n\nPlease try again.`)
          return
        }

      } else {
        // Handle immediate posting (ORIGINAL LOGIC PRESERVED)
        const formData = new FormData()
        
        postData.uploadedImages.forEach((file, index) => {
          formData.append(`image${index}`, file)
        })
        
        formData.append('content', postData.content)
        formData.append('platforms', JSON.stringify(postData.platforms))
        formData.append('businesses', JSON.stringify(postData.businesses))
        formData.append('contentType', postData.contentType)
        formData.append('enhancedMode', enhancedMode.toString())
        formData.append('platformOptimization', platformOptimization.toString())
        formData.append('scheduling', JSON.stringify(
          postData.scheduling.type === 'now' ? 
          null : {
            scheduleDate: postData.scheduling.date,
            scheduleTime: postData.scheduling.time
          }
        ))

        // Add library image URLs
        formData.append('libraryImageIds', JSON.stringify(postData.selectedLibraryImages.map(img => img.id)))
        formData.append('imageCount', postData.selectedLibraryImages.length.toString())

        console.log('Posting with library images:', postData.selectedLibraryImages.length)
        console.log('🚀 About to POST to /api/social/create-posts with FormData:')
        console.log('Content:', postData.content.substring(0, 50))
        console.log('Platforms:', postData.platforms)
        console.log('Library images:', postData.selectedLibraryImages.length)
        
        const response = await fetch('/api/social/create-posts', {
          method: 'POST',
          body: formData
        })
        
        const result = await response.json()
        
        if (result.success) {
          alert('Successfully posted to selected platforms!')
        } else {
          alert('Posting failed: ' + (result.error || 'Unknown error'))
          return
        }
      }

      // Reset form on success
      setPostData({
        content: '',
        contentType: 'custom',
        platforms: [],
        businesses: [],
        selectedLibraryImages: [],
        uploadedImages: [],
        scheduling: { type: 'now', date: '', time: '' }
      })
      setShowPreview(false)
      
    } catch (error) {
      console.error('Error posting:', error)
      alert('Failed to post: ' + (error instanceof Error ? error.message : 'Network error'))
    } finally {
      setIsPosting(false)
    }
  }

  return (
    <CollapsibleSection title="✏️ Create Custom Post" defaultExpanded={false}>
      <div className="space-y-6">
        
        {/* Business & Platform Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Business Selection */}
          <div>
            <label className="block text-dark-text font-medium mb-3">Select Business(es)</label>
            <div className="space-y-2">
              {businesses.map(business => (
                <label key={business.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={postData.businesses.includes(business.id)}
                    onChange={() => toggleBusiness(business.id)}
                    className="form-checkbox"
                  />
                  <span className={`${business.color} font-medium`}>{business.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Platform Selection */}
          <div>
            <label className="block text-dark-text font-medium mb-3">Select Platform(s)</label>
            <div className="space-y-2">
              {platforms.map(platform => (
                <label key={platform.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={postData.platforms.includes(platform.id)}
                    onChange={() => togglePlatform(platform.id)}
                    className="form-checkbox"
                  />
                  <span className={platform.color}>{platform.icon}</span>
                  <span className="text-dark-text">{platform.name}</span>
                  <span className="text-xs text-dark-text-muted">
                    ({platform.charLimit} chars, sweet spot: {platform.sweet})
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* AI Content Generation - ORIGINAL SECTION PRESERVED */}
        <div className="bg-slate-800/30 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-dark-text mb-4">🤖 AI Content Generator</h4>
          
          <div className="space-y-4">
            {/* Business Context Options */}
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enhancedMode}
                  onChange={(e) => setEnhancedMode(e.target.checked)}
                  className="form-checkbox"
                />
                <span className="text-dark-text text-sm">Enhanced Business Context</span>
              </label>
              
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={platformOptimization}
                  onChange={(e) => setPlatformOptimization(e.target.checked)}
                  className="form-checkbox"
                />
                <span className="text-dark-text text-sm">Platform Optimization</span>
              </label>
            </div>

            <div>
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Describe what you want to post about... (e.g., 'Create a post about our emergency HVAC services being available 24/7' or 'Write something funny about plumbing problems')"
                className="form-control min-h-[80px]"
              />
              <div className="text-xs text-dark-text-muted mt-1">
                {enhancedMode ? 
                  '✓ Will include business context (contact info, service areas, brand voice)' : 
                  '○ Raw content based only on your prompt'
                }
              </div>
            </div>
            
            <button
              onClick={generateAI}
              disabled={isGeneratingAI || !aiPrompt.trim() || postData.businesses.length === 0 || postData.platforms.length === 0}
              className="btn btn-primary"
            >
              {isGeneratingAI ? '🤖 Generating...' : '🤖 Generate AI Content'}
            </button>
          </div>
        </div>

        {/* Enhanced Image Selection - ORIGINAL SECTION PRESERVED */}
        <div className="bg-slate-800/30 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-dark-text">🖼️ Add Images</h3>
            <div className="text-sm text-dark-text-muted">
              {postData.selectedLibraryImages.length + postData.uploadedImages.length}/4 images selected
            </div>
          </div>

          {/* Image Mode Tabs */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setImageMode('library')}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                imageMode === 'library' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              📚 Image Library
            </button>
            <button
              onClick={() => setImageMode('upload')}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                imageMode === 'upload' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              📤 Upload New
            </button>
          </div>

          {imageMode === 'library' ? (
            /* Image Library Interface */
            <div className="space-y-4">
              {/* Selected Images Preview */}
              {postData.selectedLibraryImages.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-dark-text-muted">Selected Images:</p>
                  <div className="flex flex-wrap gap-2">
                    {postData.selectedLibraryImages.map(img => (
                      <div key={img.id} className="relative">
                        <img
                          src={img.thumbnailUrl || img.cloudUrl}
                          alt={img.originalName}
                          className="w-16 h-16 object-cover rounded border-2 border-blue-500"
                        />
                        <button
                          onClick={() => toggleLibraryImage(img)}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {loadingLibrary ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="text-dark-text-muted mt-2">Loading image library...</p>
                </div>
              ) : (
                <>
                  {/* Search and Filter */}
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={imageSearch}
                      onChange={(e) => setImageSearch(e.target.value)}
                      placeholder="Search images..."
                      className="form-control flex-1"
                    />
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="form-control"
                    >
                      <option value="">All Categories</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="installation">Installation</option>
                      <option value="team">Team</option>
                      <option value="equipment">Equipment</option>
                    </select>
                  </div>

                  {/* Suggested Images */}
                  {suggestedImages.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-green-400">🎯 Suggested for your content:</p>
                      <div className="grid grid-cols-6 gap-2">
                        {suggestedImages.map(img => (
                          <div key={`suggested-${img.id}`} className="relative group cursor-pointer">
                            <img
                              src={img.thumbnailUrl || img.cloudUrl}
                              alt={img.originalName}
                              className={`w-full h-16 object-cover rounded border-2 ${
                                postData.selectedLibraryImages.some(selected => selected.id === img.id)
                                  ? 'border-blue-500' : 'border-slate-600 hover:border-blue-400'
                              }`}
                              onClick={() => toggleLibraryImage(img)}
                            />
                            <div className="absolute top-1 right-1 bg-green-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs">
                              🎯
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* All Images Grid */}
                  {libraryImages.length > 0 ? (
                    <div className="grid grid-cols-6 gap-2 max-h-64 overflow-y-auto">
                      {libraryImages
                        .filter(img => {
                          const matchesSearch = !imageSearch || 
                            img.originalName.toLowerCase().includes(imageSearch.toLowerCase()) ||
                            img.aiTags.some(tag => tag.toLowerCase().includes(imageSearch.toLowerCase())) ||
                            img.manualTags.some(tag => tag.toLowerCase().includes(imageSearch.toLowerCase()))
                          
                          const matchesCategory = !selectedCategory || img.category === selectedCategory
                          
                          return matchesSearch && matchesCategory
                        })
                        .map(img => (
                          <div key={img.id} className="relative group cursor-pointer">
                            <img
                              src={img.thumbnailUrl || img.cloudUrl}
                              alt={img.originalName}
                              className={`w-full h-16 object-cover rounded border-2 ${
                                postData.selectedLibraryImages.some(selected => selected.id === img.id)
                                  ? 'border-blue-500' : 'border-slate-600 hover:border-blue-400'
                              }`}
                              onClick={() => toggleLibraryImage(img)}
                            />
                            {postData.selectedLibraryImages.some(selected => selected.id === img.id) && (
                              <div className="absolute top-1 right-1 bg-blue-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs">
                                ✓
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-dark-text-muted">
                      <p>No images found in library</p>
                      <p className="text-sm">Upload some images to get started</p>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            /* Upload Interface */
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={uploading || postData.businesses.length === 0}
                  className="hidden"
                />
                
                {postData.businesses.length === 0 ? (
                  <p className="text-dark-text-muted">Please select a business first</p>
                ) : (
                  <>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="btn btn-outline"
                    >
                      {uploading ? '📤 Uploading...' : '📤 Choose Images'}
                    </button>
                    <p className="text-sm text-dark-text-muted mt-2">
                      JPG, PNG, GIF, WebP up to 10MB each. Max 4 images per post.
                    </p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Content Input */}
        <div>
          <label className="block text-dark-text font-medium mb-2">Post Content</label>
          <textarea
            value={postData.content}
            onChange={(e) => updatePostData({ content: e.target.value })}
            placeholder="Write your post content or use AI generation above..."
            className="form-control min-h-[120px]"
          />
          
          {/* Platform-specific character counts */}
          {postData.platforms.length > 0 && (
            <div className="mt-2 space-y-1">
              {getCharacterCounts()}
            </div>
          )}
        </div>

        {/* Scheduling - ONLY ENHANCED, NOT REPLACED */}
        <div className="bg-slate-800/30 rounded-lg p-4">
          <h4 className="text-dark-text font-medium mb-3">📅 Scheduling</h4>
          
          <div className="space-y-3">
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="scheduling"
                  value="now"
                  checked={postData.scheduling.type === 'now'}
                  onChange={(e) => updatePostData({ 
                    scheduling: { ...postData.scheduling, type: e.target.value }
                  })}
                  className="form-radio"
                />
                <span className="text-dark-text">Post Now</span>
              </label>
              
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="scheduling"
                  value="scheduled"
                  checked={postData.scheduling.type === 'scheduled'}
                  onChange={(e) => updatePostData({ 
                    scheduling: { ...postData.scheduling, type: e.target.value }
                  })}
                  className="form-radio"
                />
                <span className="text-dark-text">Schedule for Later</span>
              </label>
            </div>
            
            {postData.scheduling.type === 'scheduled' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-dark-text-muted text-sm mb-1">Date</label>
                  <input
                    type="date"
                    value={postData.scheduling.date}
                    onChange={(e) => updatePostData({ 
                      scheduling: { ...postData.scheduling, date: e.target.value }
                    })}
                    className="form-control"
                  />
                </div>
                <div>
                  <label className="block text-dark-text-muted text-sm mb-1">Time</label>
                  <input
                    type="time"
                    value={postData.scheduling.time}
                    onChange={(e) => updatePostData({ 
                      scheduling: { ...postData.scheduling, time: e.target.value }
                    })}
                    className="form-control"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons - ONLY ADDED CONDITIONAL SCHEDULE BUTTON */}
        <div className="flex gap-3">
          <button
            onClick={handlePreview}
            disabled={!postData.content.trim()}
            className="btn btn-outline flex-1"
          >
            👁️ Preview
          </button>
          
          {postData.scheduling.type === 'scheduled' ? (
            <button
              onClick={handlePost}
              disabled={
                isPosting || 
                !postData.content.trim() || 
                postData.platforms.length === 0 || 
                postData.businesses.length === 0 ||
                !postData.scheduling.date ||
                !postData.scheduling.time
              }
              className="btn btn-warning flex-1"
            >
              {isPosting ? '📅 Scheduling...' : '📅 Schedule Post'}
            </button>
          ) : (
            <button
              onClick={handlePost}
              disabled={isPosting || !postData.content.trim() || postData.platforms.length === 0 || postData.businesses.length === 0}
              className="btn btn-success flex-1"
            >
              {isPosting ? '📤 Posting...' : '🚀 Post Now'}
            </button>
          )}
        </div>
      </div>

      {/* Preview Modal - ORIGINAL PRESERVED */}
      {showPreview && (
        <div className="modal">
          <div className="modal-content">
            <div className="p-6">
              <h3 className="text-xl font-bold text-dark-text mb-4">📱 Post Preview</h3>
              
              {/* Selected Platforms */}
              <div className="mb-4">
                <p className="text-dark-text-muted text-sm mb-2">
                  <strong>Posting to:</strong>
                </p>
                <div className="flex flex-wrap gap-2">
                  {postData.platforms.map(platformId => {
                    const platform = platforms.find(p => p.id === platformId)
                    return platform ? (
                      <span key={platformId} className={`px-2 py-1 rounded text-sm ${platform.color} bg-slate-800`}>
                        {platform.icon} {platform.name}
                      </span>
                    ) : null
                  })}
                </div>
              </div>

              {/* Selected Businesses */}
              <div className="mb-4">
                <p className="text-dark-text-muted text-sm mb-2">
                  <strong>Businesses:</strong>
                </p>
                <div className="flex flex-wrap gap-2">
                  {postData.businesses.map(businessId => {
                    const business = businesses.find(b => b.id === businessId)
                    return business ? (
                      <span key={businessId} className={`px-2 py-1 rounded text-sm ${business.color} bg-slate-800`}>
                        {business.name}
                      </span>
                    ) : null
                  })}
                </div>
              </div>

              {/* Content Preview */}
              <div className="mb-4">
                <p className="text-dark-text-muted text-sm mb-2">
                  <strong>Content:</strong>
                </p>
                <div className="bg-slate-800 rounded p-4 text-dark-text">
                  {postData.content || 'No content yet...'}
                </div>
              </div>

              {/* Images Preview */}
              {postData.selectedLibraryImages.length > 0 && (
                <div className="mb-4">
                  <p className="text-dark-text-muted text-sm mb-2">
                    <strong>Images ({postData.selectedLibraryImages.length}):</strong>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {postData.selectedLibraryImages.map(img => (
                      <img
                        key={img.id}
                        src={img.thumbnailUrl || img.cloudUrl}
                        alt={img.originalName}
                        className="w-20 h-20 object-cover rounded"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Character Counts */}
              {getCharacterCounts() && (
                <div className="mb-4">
                  <p className="text-dark-text-muted text-sm mb-2">
                    <strong>Character Counts:</strong>
                  </p>
                  <div className="space-y-1">
                    {getCharacterCounts()}
                  </div>
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowPreview(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowPreview(false)
                    handlePost()
                  }}
                  disabled={isPosting}
                  className={`btn ${postData.scheduling.type === 'scheduled' ? 'btn-warning' : 'btn-success'}`}
                >
                  {isPosting ? 
                    (postData.scheduling.type === 'scheduled' ? '📅 Scheduling...' : '📤 Posting...') : 
                    (postData.scheduling.type === 'scheduled' ? '📅 Schedule Post' : '🚀 Post Now')
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </CollapsibleSection>
  )
}