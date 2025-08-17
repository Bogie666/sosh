// src/components/settings/ImageLibraryManager.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import CollapsibleSection from '../CollapsibleSection'
import Image from 'next/image'

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
  platformUrls: any
  aiTags: string[]
  aiConfidence: any
  aiDescription?: string
  manualTags: string[]
  category?: string
  subcategory?: string
  isActive: boolean
  usageCount: number
  uploadedAt: string
}

interface Business {
  id: string
  displayName: string
}

export default function ImageLibraryManager() {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [selectedBusiness, setSelectedBusiness] = useState<string>('')
  const [images, setImages] = useState<ImageLibraryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [filter, setFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [uploadProgress, setUploadProgress] = useState<{current: number, total: number}>({current: 0, total: 0})
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const categories = [
    { value: '', label: 'All Categories' },
    { value: 'work', label: '🔧 Work Photos' },
    { value: 'team', label: '👥 Team Photos' },
    { value: 'equipment', label: '⚙️ Equipment' },
    { value: 'results', label: '✨ Results/Before-After' },
    { value: 'facility', label: '🏢 Facility' }
  ]

  useEffect(() => {
    loadBusinesses()
  }, [])

  useEffect(() => {
    if (selectedBusiness) {
      loadImages(selectedBusiness)
    }
  }, [selectedBusiness])

  const loadBusinesses = async () => {
    try {
      const response = await fetch('/api/businesses')
      const data = await response.json()
      
      if (data.success) {
        setBusinesses(data.businesses)
        if (data.businesses.length > 0 && !selectedBusiness) {
          setSelectedBusiness(data.businesses[0].id)
        }
      }
    } catch (error) {
      console.error('Failed to load businesses:', error)
      showMessage('error', 'Failed to load businesses')
    }
  }

  const loadImages = async (businessId: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/businesses/${businessId}/images`)
      const data = await response.json()
      
      if (data.success) {
        setImages(data.images)
      } else {
        showMessage('error', data.error || 'Failed to load images')
      }
    } catch (error) {
      console.error('Failed to load images:', error)
      showMessage('error', 'Failed to load images')
    } finally {
      setLoading(false)
    }
  }

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 5000)
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return

    // Validate file types
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    const invalidFiles = files.filter(file => !validTypes.includes(file.type))
    
    if (invalidFiles.length > 0) {
      alert(`Invalid file types: ${invalidFiles.map(f => f.name).join(', ')}. Please use JPG, PNG, GIF, or WebP.`)
      return
    }

    // Check file sizes (max 10MB per image for library)
    const maxSize = 10 * 1024 * 1024 // 10MB
    const oversizedFiles = files.filter(file => file.size > maxSize)
    
    if (oversizedFiles.length > 0) {
      alert(`Files too large: ${oversizedFiles.map(f => f.name).join(', ')}. Maximum size is 10MB per image.`)
      return
    }

    setUploading(true)
    setUploadProgress({ current: 0, total: files.length })

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        setUploadProgress({ current: i + 1, total: files.length })

        const formData = new FormData()
        formData.append('image', file)
        formData.append('businessId', selectedBusiness)

        const response = await fetch('/api/images/upload', {
          method: 'POST',
          body: formData
        })

        const result = await response.json()
        
        if (!result.success) {
          console.error(`Failed to upload ${file.name}:`, result.error)
          showMessage('error', `Failed to upload ${file.name}: ${result.error}`)
        }
      }

      showMessage('success', `Successfully uploaded ${files.length} image(s)!`)
      await loadImages(selectedBusiness) // Refresh the image list
      
    } catch (error) {
      console.error('Upload failed:', error)
      showMessage('error', 'Upload failed')
    } finally {
      setUploading(false)
      setUploadProgress({ current: 0, total: 0 })
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const filteredImages = images.filter(image => {
    const matchesSearch = filter === '' || 
      image.originalName.toLowerCase().includes(filter.toLowerCase()) ||
      image.aiTags.some(tag => tag.toLowerCase().includes(filter.toLowerCase())) ||
      image.manualTags.some(tag => tag.toLowerCase().includes(filter.toLowerCase())) ||
      (image.aiDescription && image.aiDescription.toLowerCase().includes(filter.toLowerCase()))
    
    const matchesCategory = categoryFilter === '' || image.category === categoryFilter

    return matchesSearch && matchesCategory
  })

  const toggleImageSelection = (imageId: string) => {
    const newSelection = new Set(selectedImages)
    if (newSelection.has(imageId)) {
      newSelection.delete(imageId)
    } else {
      newSelection.add(imageId)
    }
    setSelectedImages(newSelection)
  }

  const bulkTag = async () => {
    if (selectedImages.size === 0) return

    const tag = prompt('Enter tag to add to selected images:')
    if (!tag) return

    try {
      const response = await fetch('/api/images/bulk-tag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageIds: Array.from(selectedImages),
          tag: tag.trim()
        })
      })

      const result = await response.json()
      if (result.success) {
        showMessage('success', `Added tag "${tag}" to ${selectedImages.size} images`)
        await loadImages(selectedBusiness)
        setSelectedImages(new Set())
      }
    } catch (error) {
      showMessage('error', 'Failed to add tags')
    }
  }

  const deleteSelectedImages = async () => {
    if (selectedImages.size === 0) return
    
    if (!confirm(`Are you sure you want to delete ${selectedImages.size} selected images?`)) return

    try {
      const response = await fetch('/api/images/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageIds: Array.from(selectedImages)
        })
      })

      const result = await response.json()
      if (result.success) {
        showMessage('success', `Deleted ${selectedImages.size} images`)
        await loadImages(selectedBusiness)
        setSelectedImages(new Set())
      }
    } catch (error) {
      showMessage('error', 'Failed to delete images')
    }
  }

  return (
    <CollapsibleSection title="📸 Image Library Manager" defaultExpanded={false}>
      <div className="space-y-6">
        
        {/* Business Selection */}
        <div className="bg-slate-800/30 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-dark-text mb-4">Select Business</h3>
          <select
            value={selectedBusiness}
            onChange={(e) => setSelectedBusiness(e.target.value)}
            className="form-control w-full max-w-md"
          >
            <option value="">Choose a business...</option>
            {businesses.map(business => (
              <option key={business.id} value={business.id}>
                {business.displayName}
              </option>
            ))}
          </select>
        </div>

        {/* Success/Error Messages */}
        {message && (
          <div className={`p-4 rounded-lg border ${
            message.type === 'success' 
              ? 'bg-green-400/10 border-green-400/20 text-green-400' 
              : 'bg-red-400/10 border-red-400/20 text-red-400'
          }`}>
            {message.text}
          </div>
        )}

        {selectedBusiness && (
          <div className="space-y-6">
            
            {/* Upload Section */}
            <div className="bg-slate-800/30 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-dark-text mb-4">📤 Upload Images</h3>
              
              <div className="space-y-4">
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
                  disabled={uploading}
                  className="btn btn-primary w-full"
                >
                  {uploading ? '📤 Uploading...' : '📤 Select Images to Upload'}
                </button>
                
                <p className="text-xs text-dark-text-muted">
                  Supported: JPG, PNG, GIF, WebP • Max 10MB per image • Bulk upload supported
                </p>
                
                {uploading && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-dark-text-muted">
                      <span>Uploading images...</span>
                      <span>{uploadProgress.current}/{uploadProgress.total}</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-400 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Filters and Controls */}
            <div className="bg-slate-800/30 rounded-lg p-6">
              <div className="flex flex-wrap items-center gap-4 justify-between">
                <div className="flex items-center gap-4 flex-wrap">
                  <div>
                    <input
                      type="text"
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                      placeholder="Search images..."
                      className="form-control w-64"
                    />
                  </div>
                  
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="form-control w-48"
                  >
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                      className="btn btn-outline btn-sm"
                    >
                      {viewMode === 'grid' ? '📋 List' : '🎛️ Grid'}
                    </button>
                  </div>
                </div>

                {selectedImages.size > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-dark-text-muted">
                      {selectedImages.size} selected
                    </span>
                    <button
                      onClick={bulkTag}
                      className="btn btn-outline btn-sm"
                    >
                      🏷️ Tag
                    </button>
                    <button
                      onClick={deleteSelectedImages}
                      className="btn btn-outline btn-sm text-red-400"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Images Display */}
            {loading ? (
              <div className="flex items-center gap-3 p-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
                <span className="text-dark-text">Loading images...</span>
              </div>
            ) : (
              <div className="bg-slate-800/30 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-dark-text">
                    Image Library ({filteredImages.length} images)
                  </h3>
                </div>

                {filteredImages.length === 0 ? (
                  <div className="text-center py-12 text-dark-text-muted">
                    {images.length === 0 ? 
                      'No images uploaded yet. Upload your first images!' :
                      'No images match your search criteria.'
                    }
                  </div>
                ) : (
                  <div className={viewMode === 'grid' ? 
                    'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4' :
                    'space-y-4'
                  }>
                    {filteredImages.map(image => (
                      <div 
                        key={image.id} 
                        className={`group relative rounded-lg border ${
                          selectedImages.has(image.id) ? 
                            'border-blue-400 bg-blue-400/10' : 
                            'border-slate-600/30 bg-slate-900/30'
                        } overflow-hidden ${viewMode === 'grid' ? 'aspect-square' : 'flex p-4'}`}
                      >
                        {viewMode === 'grid' ? (
                          // Grid View
                          <>
                            <div className="aspect-square relative overflow-hidden">
                              <Image
                                src={image.thumbnailUrl || image.cloudUrl}
                                alt={image.originalName}
                                fill
                                className="object-cover"
                              />
                            </div>
                            
                            {/* Overlay */}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-200">
                              <div className="absolute top-2 left-2">
                                <input
                                  type="checkbox"
                                  checked={selectedImages.has(image.id)}
                                  onChange={() => toggleImageSelection(image.id)}
                                  className="rounded"
                                />
                              </div>
                              
                              <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="text-xs text-white truncate">
                                  {image.originalName}
                                </div>
                                {image.aiTags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {image.aiTags.slice(0, 2).map(tag => (
                                      <span key={tag} className="px-1 py-0.5 bg-blue-400/80 text-white text-xs rounded">
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </>
                        ) : (
                          // List View
                          <>
                            <div className="flex items-center gap-4 flex-1">
                              <input
                                type="checkbox"
                                checked={selectedImages.has(image.id)}
                                onChange={() => toggleImageSelection(image.id)}
                                className="rounded"
                              />
                              
                              <div className="w-16 h-16 relative rounded overflow-hidden flex-shrink-0">
                                <Image
                                  src={image.thumbnailUrl || image.cloudUrl}
                                  alt={image.originalName}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-dark-text truncate">
                                  {image.originalName}
                                </h4>
                                <div className="text-sm text-dark-text-muted">
                                  {(image.fileSize / 1024 / 1024).toFixed(1)}MB • 
                                  {image.dimensions.width}×{image.dimensions.height} • 
                                  Used {image.usageCount} times
                                </div>
                                
                                {/* Tags */}
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {image.aiTags.map(tag => (
                                    <span key={tag} className="px-2 py-0.5 bg-blue-400/20 text-blue-400 text-xs rounded">
                                      🤖 {tag}
                                    </span>
                                  ))}
                                  {image.manualTags.map(tag => (
                                    <span key={tag} className="px-2 py-0.5 bg-green-400/20 text-green-400 text-xs rounded">
                                      👤 {tag}
                                    </span>
                                  ))}
                                </div>
                                
                                {image.aiDescription && (
                                  <div className="text-xs text-dark-text-muted mt-1 italic">
                                    "{image.aiDescription}"
                                  </div>
                                )}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </CollapsibleSection>
  )
}