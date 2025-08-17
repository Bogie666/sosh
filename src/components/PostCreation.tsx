// src/components/PostCreation.tsx
'use client'

import { useState, useRef } from 'react'
import CollapsibleSection from './CollapsibleSection'
import Image from 'next/image'

interface PostData {
  content: string
  contentType: string
  platforms: string[]
  businesses: string[]
  images: File[]
  scheduling: {
    type: string
    date: string
    time: string
  }
}

export default function PostCreation() {
  const [postData, setPostData] = useState<PostData>({
    content: '',
    contentType: 'custom',
    platforms: [],
    businesses: [],
    images: [],
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
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [uploadingImages, setUploadingImages] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Available platforms
  const platforms = [
    { id: 'google', name: 'Google Business Profile', icon: '🏢', color: 'text-blue-400' },
    { id: 'facebook', name: 'Facebook', icon: '📘', color: 'text-blue-600' },
    { id: 'instagram', name: 'Instagram', icon: '📷', color: 'text-pink-500' },
    { id: 'twitter', name: 'X/Twitter', icon: '🐦', color: 'text-sky-400' }
  ]

  // Available businesses
  const businesses = [
    { id: 'lex-dallas', name: 'Lex Dallas', color: 'text-blue-400' },
    { id: 'lex-etx', name: 'Lex ETX', color: 'text-green-400' },
    { id: 'lyons', name: 'Lyons', color: 'text-purple-400' }
  ]

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

  // Image handling functions
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    
    if (files.length === 0) return

    // Validate file types
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    const invalidFiles = files.filter(file => !validTypes.includes(file.type))
    
    if (invalidFiles.length > 0) {
      alert(`Invalid file types: ${invalidFiles.map(f => f.name).join(', ')}. Please use JPG, PNG, GIF, or WebP.`)
      return
    }

    // Check file sizes (max 5MB per image)
    const maxSize = 5 * 1024 * 1024 // 5MB
    const oversizedFiles = files.filter(file => file.size > maxSize)
    
    if (oversizedFiles.length > 0) {
      alert(`Files too large: ${oversizedFiles.map(f => f.name).join(', ')}. Maximum size is 5MB per image.`)
      return
    }

    // Check total number of images (max 4 for Twitter)
    const totalImages = postData.images.length + files.length
    if (totalImages > 4) {
      alert('Maximum 4 images allowed per post')
      return
    }

    // Add images to state
    const newImages = [...postData.images, ...files]
    updatePostData({ images: newImages })

    // Create preview URLs
    const newPreviews = [...imagePreviews]
    files.forEach(file => {
      const previewUrl = URL.createObjectURL(file)
      newPreviews.push(previewUrl)
    })
    setImagePreviews(newPreviews)

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeImage = (index: number) => {
    const newImages = postData.images.filter((_, i) => i !== index)
    const newPreviews = imagePreviews.filter((_, i) => i !== index)
    
    // Revoke the URL to free memory
    URL.revokeObjectURL(imagePreviews[index])
    
    updatePostData({ images: newImages })
    setImagePreviews(newPreviews)
  }

  const generateAIContent = async () => {
    if (!aiPrompt.trim()) {
      alert('Please enter a prompt for AI content generation')
      return
    }

    setIsGeneratingAI(true)
    try {
      const response = await fetch('/api/ai/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt,
          businessName: postData.businesses[0] || 'lex-dallas',
          platform: postData.platforms[0] || 'facebook',
          contentType: 'custom'
        })
      })

      const data = await response.json()
      
      if (data.success) {
        updatePostData({ content: data.content })
        setAiPrompt('')
        alert('AI content generated successfully!')
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
      setUploadingImages(postData.images.length > 0)

      // Create FormData for file upload
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

      // Add images to FormData
      postData.images.forEach((image, index) => {
        formData.append(`image_${index}`, image)
      })
      formData.append('imageCount', postData.images.length.toString())

      console.log('Sending post request with images:', postData.images.length)
      
      const response = await fetch('/api/social/create-posts', {
        method: 'POST',
        body: formData // Don't set Content-Type header, let browser set it with boundary
      })
      
      console.log('Response status:', response.status)
      
      const result = await response.json()
      console.log('Full response data:', result)
      
      if (result.success) {
        const message = `Successfully posted! ${result.successCount}/${result.totalAttempts || result.results?.length || 1} posts successful`
        alert(message)
        console.log('Success details:', result)
        
        // Reset form on success
        setPostData({
          content: '',
          contentType: 'custom',
          platforms: [],
          businesses: [],
          images: [],
          scheduling: { type: 'now', date: '', time: '' }
        })
        
        // Clean up image previews
        imagePreviews.forEach(url => URL.revokeObjectURL(url))
        setImagePreviews([])
        
      } else {
        const errorMsg = result.error || 'Unknown error occurred'
        console.error('Posting failed with result:', result)
        alert(`Posting failed: ${errorMsg}`)
      }
    } catch (error) {
      console.error('Error creating posts:', error)
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      alert(`Failed to create posts: ${errorMsg}`)
    } finally {
      setIsPosting(false)
      setUploadingImages(false)
      setShowPreview(false)
    }
  }

  const getCharacterCount = () => {
    const twitterLimit = 280
    const isOverTwitterLimit = postData.platforms.includes('twitter') && postData.content.length > twitterLimit
    
    return (
      <div className={`text-sm ${isOverTwitterLimit ? 'text-red-400' : 'text-dark-text-muted'}`}>
        Character count: {postData.content.length}
        {postData.platforms.includes('twitter') && (
          <span className={`ml-2 ${isOverTwitterLimit ? 'text-red-400' : 'text-green-400'}`}>
            (Twitter: {postData.content.length}/{twitterLimit})
          </span>
        )}
      </div>
    )
  }

  return (
    <>
      <CollapsibleSection 
        title="🚀 Create New Post" 
        defaultExpanded={true}
        className="border-l-4 border-l-green-500"
      >
        <div className="space-y-6">
          {/* Platform Selection */}
          <div>
            <label className="block text-dark-text font-medium mb-3">Select Platforms</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {platforms.map(platform => (
                <button
                  key={platform.id}
                  onClick={() => togglePlatform(platform.id)}
                  className={`p-3 rounded-lg border-2 transition-all text-left ${
                    postData.platforms.includes(platform.id)
                      ? 'border-accent-blue bg-accent-blue/10'
                      : 'border-dark-border hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{platform.icon}</span>
                    <span className={`text-sm font-medium ${
                      postData.platforms.includes(platform.id) ? 'text-dark-text' : 'text-dark-text-muted'
                    }`}>
                      {platform.name}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Business Selection */}
          <div>
            <label className="block text-dark-text font-medium mb-3">Select Businesses</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {businesses.map(business => (
                <button
                  key={business.id}
                  onClick={() => toggleBusiness(business.id)}
                  className={`p-3 rounded-lg border-2 transition-all text-left ${
                    postData.businesses.includes(business.id)
                      ? 'border-accent-blue bg-accent-blue/10'
                      : 'border-dark-border hover:border-gray-500'
                  }`}
                >
                  <span className={`font-medium ${
                    postData.businesses.includes(business.id) ? business.color : 'text-dark-text-muted'
                  }`}>
                    {business.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* AI Content Generation */}
          <div className="bg-slate-800/30 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-dark-text mb-4">🤖 AI Content Generation</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-dark-text font-medium mb-2">AI Prompt</label>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Describe the content you want to generate... (e.g., 'Create a post about winter HVAC maintenance tips')"
                  className="form-control min-h-[80px]"
                />
              </div>
              
              <button
                onClick={generateAIContent}
                disabled={isGeneratingAI || !aiPrompt.trim()}
                className="btn btn-primary"
              >
                {isGeneratingAI ? '🤖 Generating...' : '🤖 Generate AI Content'}
              </button>
            </div>
          </div>

          {/* Image Upload Section */}
          <div className="bg-slate-800/30 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-dark-text mb-4">📷 Add Images</h3>
            
            <div className="space-y-4">
              {/* Upload Button */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={postData.images.length >= 4}
                  className="btn btn-outline w-full flex items-center justify-center gap-2"
                >
                  📷 Add Images (Max 4)
                </button>
                <p className="text-xs text-dark-text-muted mt-2">
                  Supported: JPG, PNG, GIF, WebP • Max 5MB per image • {postData.images.length}/4 images
                </p>
              </div>

              {/* Image Previews */}
              {postData.images.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <div className="aspect-square rounded-lg overflow-hidden bg-gray-800">
                        <Image
                          src={preview}
                          alt={`Upload ${index + 1}`}
                          width={200}
                          height={200}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <button
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs font-bold hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        ✕
                      </button>
                      <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                        {postData.images[index].name.length > 15 
                          ? postData.images[index].name.substring(0, 15) + '...'
                          : postData.images[index].name
                        }
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
            {getCharacterCount()}
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
                      min={new Date().toISOString().split('T')[0]}
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
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handlePreview}
              disabled={!postData.content.trim()}
              className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              👁️ Preview Post
            </button>
            
            <button
              onClick={handlePost}
              disabled={!postData.content.trim() || postData.platforms.length === 0 || postData.businesses.length === 0 || isPosting}
              className={`btn btn-success disabled:opacity-50 disabled:cursor-not-allowed ${
                isPosting ? 'animate-pulse' : ''
              }`}
            >
              {uploadingImages ? '📤 Uploading Images...' : isPosting ? 'Posting...' : '🚀 Post Now'}
            </button>
            
            <button className="btn btn-outline">
              💾 Save as Template
            </button>
          </div>
        </div>
      </CollapsibleSection>

      {/* Enhanced Preview Modal */}
      {showPreview && (
        <div className="modal">
          <div className="modal-content">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-dark-text">📋 Post Preview</h3>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-dark-text-muted hover:text-dark-text"
                >
                  ✕
                </button>
              </div>
              
              {/* Business and Platforms */}
              <div className="mb-4">
                <p className="text-dark-text-muted text-sm mb-2">
                  <strong>Businesses:</strong> {postData.businesses.map(b => 
                    businesses.find(bus => bus.id === b)?.name || b
                  ).join(', ')}
                </p>
                <div className="flex gap-2 flex-wrap mb-4">
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

              {/* Image Previews in Modal */}
              {postData.images.length > 0 && (
                <div className="mb-4">
                  <p className="text-dark-text-muted text-sm mb-2">
                    <strong>Images ({postData.images.length}):</strong>
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="aspect-square rounded-lg overflow-hidden bg-gray-800">
                        <Image
                          src={preview}
                          alt={`Preview ${index + 1}`}
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
              
              <div className="text-xs text-dark-text-secondary mb-4">
                Character count: {postData.content.length}
                {postData.images.length > 0 && ` • ${postData.images.length} image${postData.images.length !== 1 ? 's' : ''}`}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handlePost}
                  disabled={isPosting}
                  className="btn btn-success flex-1"
                >
                  {uploadingImages ? '📤 Uploading Images...' : isPosting ? 'Posting...' : '🚀 Confirm & Post'}
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
    </>
  )
}