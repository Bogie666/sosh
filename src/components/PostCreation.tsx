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

  const categories = [
    { value: '', label: 'All Categories' },
    { value: 'work', label: '🔧 Work Photos' },
    { value: 'team', label: '👥 Team Photos' },
    { value: 'equipment', label: '⚙️ Equipment' },
    { value: 'results', label: '✅ Results' },
    { value: 'vehicles', label: '🚐 Vehicles' },
    { value: 'facility', label: '🏢 Facility' }
  ]

  // Load image library when business selection changes
  useEffect(() => {
    if (postData.businesses.length > 0) {
      loadImageLibrary()
    }
  }, [postData.businesses])

  // Auto-suggest images when content changes
  useEffect(() => {
    if (postData.content && libraryImages.length > 0) {
      suggestRelevantImages()
    }
  }, [postData.content, libraryImages])

  const updatePostData = (updates: Partial<PostData>) => {
    setPostData(prev => ({ ...prev, ...updates }))
  }

  const togglePlatform = (platformId: string) => {
    const newPlatforms = postData.platforms.includes(platformId)
      ? postData.platforms.filter(p => p !== platformId)
      : [...postData.platforms, platformId]
    updatePostData({ platforms: newPlatforms })
  }

  const toggleBusiness = (businessId: string) => {
    const newBusinesses = postData.businesses.includes(businessId)
      ? postData.businesses.filter(b => b !== businessId)
      : [...postData.businesses, businessId]
    updatePostData({ businesses: newBusinesses })
  }

  // Load image library for selected businesses
  const loadImageLibrary = async () => {
    if (postData.businesses.length === 0) return
    
    setLoadingLibrary(true)
    try {
      // Load images from all selected businesses
      const allImages: ImageLibraryItem[] = []
      
      for (const businessId of postData.businesses) {
        const response = await fetch(`/api/businesses/${businessId}/images`)
        const data = await response.json()
        
        if (data.success && data.images) {
          allImages.push(...data.images)
        }
      }
      
      setLibraryImages(allImages)
    } catch (error) {
      console.error('Failed to load image library:', error)
    } finally {
      setLoadingLibrary(false)
    }
  }

  // Suggest relevant images based on content
  const suggestRelevantImages = async () => {
    if (!postData.content.trim() || libraryImages.length === 0) {
      setSuggestedImages([])
      return
    }

    try {
      // Use a simple keyword-based suggestion for now
      // This could be enhanced with the enhanced-image-matcher later
      const contentLower = postData.content.toLowerCase()
      const keywords: string[] = []
      
      // Extract keywords from content
      if (contentLower.includes('hvac') || contentLower.includes('heating') || contentLower.includes('cooling')) {
        keywords.push('hvac', 'hvac_work')
      }
      if (contentLower.includes('plumbing') || contentLower.includes('water') || contentLower.includes('pipe')) {
        keywords.push('plumbing', 'plumbing_work')
      }
      if (contentLower.includes('electrical') || contentLower.includes('electric')) {
        keywords.push('electrical', 'electrical_work')
      }
      if (contentLower.includes('team') || contentLower.includes('staff')) {
        keywords.push('team', 'professional')
      }
      if (contentLower.includes('emergency') || contentLower.includes('urgent')) {
        keywords.push('emergency', 'truck', 'service_vehicle')
      }

      // Filter images based on keywords
      const relevant = libraryImages.filter(image => {
        const allTags = [...(image.aiTags || []), ...(image.manualTags || [])].map(tag => tag.toLowerCase())
        const description = (image.aiDescription || '').toLowerCase()
        
        return keywords.some(keyword => 
          allTags.some(tag => tag.includes(keyword)) ||
          description.includes(keyword)
        )
      }).slice(0, 6) // Top 6 suggestions
      
      setSuggestedImages(relevant)
    } catch (error) {
      console.error('Failed to suggest images:', error)
    }
  }

  // Enhanced AI content generation with business context
  const generateAIContent = async () => {
    if (!aiPrompt.trim()) {
      alert('Please enter a prompt for AI content generation')
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
      const response = await fetch('/api/ai/generate-enhanced-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Create custom social media content: ${aiPrompt}`,
          businessId: postData.businesses[0],
          platform: postData.platforms[0],
          contentType: 'custom-user-prompt',
          includeSpecials: enhancedMode, // Only if enhanced mode is on
          includeImages: false, // We'll handle images separately
          includeContentBlocks: enhancedMode, // Only if enhanced mode is on
          day: new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() // current day for context
        })
      })

      const data = await response.json()
      
      if (data.success) {
        updatePostData({ content: data.content })
        setAiPrompt('')
        
        // Show success with platform info
        const platform = platforms.find(p => p.id === postData.platforms[0])
        const charCount = data.content.length
        const withinLimits = charCount <= (platform?.charLimit || 1000)
        
        alert(`AI content generated successfully!\nCharacters: ${charCount}${platform ? `/${platform.charLimit}` : ''} ${withinLimits ? '✓' : '⚠️ Over limit'}`)
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
      
      const count = postData.content.length
      const isOverLimit = count > platform.charLimit
      const isInSweetSpot = count >= parseInt(platform.sweet.split('-')[0]) && 
                           count <= parseInt(platform.sweet.split('-')[1])
      
      return (
        <div key={platformId} className={`text-xs p-2 rounded ${
          isOverLimit ? 'bg-red-900/20 text-red-300' :
          isInSweetSpot ? 'bg-green-900/20 text-green-300' :
          'bg-gray-800/30 text-gray-400'
        }`}>
          <span className={platform.color}>{platform.icon} {platform.name}:</span>
          <span className="ml-2">
            {count}/{platform.charLimit} chars
            {isOverLimit && ' ⚠️ Over limit'}
            {isInSweetSpot && ' ✓ Sweet spot'}
          </span>
        </div>
      )
    }).filter(Boolean)
  }

  // Filter library images
  const getFilteredLibraryImages = () => {
    return libraryImages.filter(image => {
      const matchesSearch = !imageSearch || 
        image.originalName.toLowerCase().includes(imageSearch.toLowerCase()) ||
        image.aiDescription?.toLowerCase().includes(imageSearch.toLowerCase()) ||
        image.aiTags.some(tag => tag.toLowerCase().includes(imageSearch.toLowerCase())) ||
        image.manualTags.some(tag => tag.toLowerCase().includes(imageSearch.toLowerCase()))

      const matchesCategory = !selectedCategory || image.category === selectedCategory

      return matchesSearch && matchesCategory
    })
  }

  const handlePreview = () => {
    if (!postData.content.trim()) {
      alert('Please enter post content before previewing')
      return
    }
    setShowPreview(true)
  }

  const handlePost = async () => {
    try {
      if (!postData.content.trim()) {
        alert('Please enter post content')
        return
      }

      if (postData.platforms.length === 0) {
        alert('Please select at least one platform')
        return
      }

      if (postData.businesses.length === 0) {
        alert('Please select at least one business')
        return
      }

      setIsPosting(true)

      // Prepare form data
      const formData = new FormData()
      formData.append('content', postData.content)
      formData.append('contentType', postData.contentType)
      formData.append('platforms', JSON.stringify(postData.platforms))
      formData.append('businesses', JSON.stringify(postData.businesses))
      formData.append('scheduling', JSON.stringify(
        postData.scheduling.type === 'now' ? null : {
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
        
        // Reset form
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
      } else {
        alert('Posting failed: ' + (result.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error posting:', error)
      alert('Failed to post: ' + (error instanceof Error ? error.message : 'Network error'))
    } finally {
      setIsPosting(false)
    }
  }

  return (
    <CollapsibleSection title="✍️ Create Custom Post" defaultExpanded={true}>
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
                  <span className={`${platform.color}`}>
                    {platform.icon} {platform.name}
                  </span>
                  <span className="text-xs text-gray-400">
                    ({platform.sweet} chars optimal)
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* AI Content Generation Options */}
        <div className="bg-slate-800/30 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-dark-text">🤖 AI Content Generation</h3>
            <div className="flex items-center gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={enhancedMode}
                  onChange={(e) => setEnhancedMode(e.target.checked)}
                  className="form-checkbox"
                />
                <span className="text-dark-text-muted">Enhanced Business Context</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={platformOptimization}
                  onChange={(e) => setPlatformOptimization(e.target.checked)}
                  className="form-checkbox"
                />
                <span className="text-dark-text-muted">Platform Optimization</span>
              </label>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-dark-text font-medium mb-2">Your Custom Prompt</label>
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
              onClick={generateAIContent}
              disabled={isGeneratingAI || !aiPrompt.trim() || postData.businesses.length === 0 || postData.platforms.length === 0}
              className="btn btn-primary"
            >
              {isGeneratingAI ? '🤖 Generating...' : '🤖 Generate AI Content'}
            </button>
          </div>
        </div>

        {/* Enhanced Image Selection */}
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
            <div className="space-y-4">
              {/* Image Search & Filter */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-text mb-1">Search Images</label>
                  <input
                    type="text"
                    placeholder="Search by name, description, or tags..."
                    value={imageSearch}
                    onChange={(e) => setImageSearch(e.target.value)}
                    className="form-control text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-text mb-1">Category</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="form-control text-sm"
                  >
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Suggested Images */}
              {suggestedImages.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-green-400 mb-2">💡 Suggested for your content:</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                    {suggestedImages.map(image => (
                      <div
                        key={`suggested-${image.id}`}
                        className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                          postData.selectedLibraryImages.some(img => img.id === image.id)
                            ? 'border-green-400 shadow-glow-green'
                            : 'border-gray-600 hover:border-blue-400'
                        }`}
                        onClick={() => toggleLibraryImage(image)}
                      >
                        <Image
                          src={image.thumbnailUrl || image.cloudUrl}
                          alt={image.originalName}
                          width={100}
                          height={100}
                          className="w-full h-20 object-cover"
                        />
                        {postData.selectedLibraryImages.some(img => img.id === image.id) && (
                          <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                            <span className="text-green-300 text-xl">✓</span>
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-1">
                          {image.originalName.length > 15 ? image.originalName.substring(0, 15) + '...' : image.originalName}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* All Library Images */}
              {loadingLibrary ? (
                <div className="text-center py-8 text-gray-400">Loading image library...</div>
              ) : getFilteredLibraryImages().length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  {postData.businesses.length === 0 ? 'Select a business to view images' : 'No images found'}
                </div>
              ) : (
                <div>
                  <h4 className="text-sm font-medium text-dark-text mb-2">
                    All Images ({getFilteredLibraryImages().length})
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-64 overflow-y-auto">
                    {getFilteredLibraryImages().map(image => (
                      <div
                        key={image.id}
                        className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                          postData.selectedLibraryImages.some(img => img.id === image.id)
                            ? 'border-blue-400 shadow-glow-blue'
                            : 'border-gray-600 hover:border-blue-400'
                        }`}
                        onClick={() => toggleLibraryImage(image)}
                      >
                        <Image
                          src={image.thumbnailUrl || image.cloudUrl}
                          alt={image.originalName}
                          width={120}
                          height={120}
                          className="w-full h-24 object-cover"
                        />
                        {postData.selectedLibraryImages.some(img => img.id === image.id) && (
                          <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                            <span className="text-blue-300 text-xl">✓</span>
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-1">
                          <div className="truncate">{image.originalName}</div>
                          {image.usageCount > 0 && (
                            <div className="text-gray-300">Used {image.usageCount}x</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || postData.businesses.length === 0}
                  className="btn btn-outline"
                >
                  {uploading ? '⏳ Uploading to Library...' : '📤 Upload to Library & Add to Post'}
                </button>
                <p className="text-xs text-dark-text-muted mt-2">
                  Images will be uploaded to your library and automatically added to this post.<br/>
                  Supported: JPG, PNG, GIF, WebP • Max 10MB per image
                </p>
              </div>
            </div>
          )}

          {/* Selected Images Preview */}
          {postData.selectedLibraryImages.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-dark-text mb-2">
                Selected Images ({postData.selectedLibraryImages.length})
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {postData.selectedLibraryImages.map(image => (
                  <div key={`selected-${image.id}`} className="relative group">
                    <Image
                      src={image.thumbnailUrl || image.cloudUrl}
                      alt={image.originalName}
                      width={150}
                      height={150}
                      className="w-full h-24 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => toggleLibraryImage(image)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs font-bold hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      ×
                    </button>
                    <div className="text-xs text-gray-300 mt-1 truncate">
                      {image.originalName}
                    </div>
                  </div>
                ))}
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

        {/* Scheduling */}
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

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handlePreview}
            disabled={!postData.content.trim()}
            className="btn btn-outline flex-1"
          >
            👁️ Preview
          </button>
          <button
            onClick={handlePost}
            disabled={isPosting || !postData.content.trim() || postData.platforms.length === 0 || postData.businesses.length === 0}
            className="btn btn-success flex-1"
          >
            {isPosting ? '📤 Posting...' : '🚀 Post Now'}
          </button>
        </div>
      </div>

      {/* Preview Modal */}
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
                      <span 
                        key={platformId}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-accent-blue/20 text-accent-blue rounded text-xs"
                      >
                        {platform.icon} {platform.name}
                      </span>
                    ) : null
                  })}
                </div>
              </div>

              {/* Selected Images */}
              {postData.selectedLibraryImages.length > 0 && (
                <div className="mb-4">
                  <p className="text-dark-text-muted text-sm mb-2">
                    <strong>Images ({postData.selectedLibraryImages.length}):</strong>
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {postData.selectedLibraryImages.map(image => (
                      <div key={image.id} className="aspect-square rounded-lg overflow-hidden bg-gray-800">
                        <Image
                          src={image.thumbnailUrl || image.cloudUrl}
                          alt={image.originalName}
                          width={100}
                          height={100}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Content Preview */}
              <div className="bg-gray-900/50 rounded-lg p-3 border-l-4 border-accent-blue mb-4">
                <p className="text-dark-text text-sm whitespace-pre-wrap">{postData.content}</p>
              </div>
              
              {/* Character Counts */}
              <div className="space-y-1 mb-4">
                {getCharacterCounts()}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handlePost}
                  disabled={isPosting}
                  className="btn btn-success flex-1"
                >
                  {isPosting ? '📤 Posting...' : '🚀 Confirm & Post'}
                </button>
                <button
                  onClick={() => setShowPreview(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </CollapsibleSection>
  )
}