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
  platformUrls: {
    facebook?: { landscape?: string; square?: string }
    instagram?: { square?: string; portrait?: string }
    twitter?: { single?: string; multi?: string }
    google?: { square?: string }
  }
  aiTags: string[]
  aiConfidence: any
  aiDescription?: string
  manualTags: string[]
  category?: string
  subcategory?: string
  isActive: boolean
  usageCount: number
  lastUsed?: string
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
  const [searchFilter, setSearchFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [uploadProgress, setUploadProgress] = useState<{current: number, total: number}>({current: 0, total: 0})
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)
  const [showImageModal, setShowImageModal] = useState<ImageLibraryItem | null>(null)
  const [bulkTagInput, setBulkTagInput] = useState('')
  const [showBulkTagModal, setShowBulkTagModal] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const categories = [
    { value: '', label: 'All Categories' },
    { value: 'work', label: '🔧 Work Photos' },
    { value: 'team', label: '👥 Team Photos' },
    { value: 'equipment', label: '⚙️ Equipment' },
    { value: 'results', label: '✨ Results/Before-After' },
    { value: 'facility', label: '🏢 Facility' },
    { value: 'promotional', label: '🎉 Promotional' }
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
        setImages(data.images || [])
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

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    const validFiles = Array.from(files).filter(file => {
      const isValid = file.type.startsWith('image/')
      const isUnder10MB = file.size <= 10 * 1024 * 1024
      
      if (!isValid) {
        showMessage('error', `${file.name} is not a valid image file`)
        return false
      }
      if (!isUnder10MB) {
        showMessage('error', `${file.name} exceeds 10MB limit`)
        return false
      }
      return true
    })

    if (validFiles.length === 0) return

    await uploadFiles(validFiles)
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const uploadFiles = async (files: File[]) => {
    setUploading(true)
    setUploadProgress({ current: 0, total: files.length })

    const successfulUploads: ImageLibraryItem[] = []
    const errors: string[] = []

    // Process files in small batches to avoid overwhelming the server
    const batchSize = 3 // Process 3 files at a time
    
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize)
      
      // Process batch in parallel
      const batchPromises = batch.map(async (file, batchIndex) => {
        const globalIndex = i + batchIndex
        setUploadProgress({ current: globalIndex + 1, total: files.length })

        try {
          const formData = new FormData()
          formData.append('file', file)
          formData.append('businessId', selectedBusiness)

          const response = await fetch(`/api/businesses/${selectedBusiness}/images/upload`, {
            method: 'POST',
            body: formData
          })

          const data = await response.json()

          if (data.success) {
            return { success: true, image: data.image }
          } else {
            return { success: false, error: `${file.name}: ${data.error}` }
          }
        } catch (error) {
          return { success: false, error: `${file.name}: Upload failed` }
        }
      })

      // Wait for batch to complete
      const batchResults = await Promise.all(batchPromises)
      
      // Process results
      batchResults.forEach(result => {
        if (result.success) {
          successfulUploads.push(result.image)
        } else {
          errors.push(result.error)
        }
      })

      // Small delay between batches to prevent overwhelming the server
      if (i + batchSize < files.length) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    // Update images list with new uploads
    if (successfulUploads.length > 0) {
      setImages(prev => [...successfulUploads, ...prev])
      showMessage('success', `Successfully uploaded ${successfulUploads.length} image(s)`)
    }

    if (errors.length > 0) {
      showMessage('error', `Failed to upload: ${errors.slice(0, 3).join(', ')}${errors.length > 3 ? ` and ${errors.length - 3} more` : ''}`)
    }

    setUploading(false)
    setUploadProgress({ current: 0, total: 0 })
  }

  const toggleImageSelection = (imageId: string) => {
    setSelectedImages(prev => {
      const newSelection = new Set(prev)
      if (newSelection.has(imageId)) {
        newSelection.delete(imageId)
      } else {
        newSelection.add(imageId)
      }
      return newSelection
    })
  }

  const selectAllImages = () => {
    if (selectedImages.size === filteredImages.length) {
      setSelectedImages(new Set())
    } else {
      setSelectedImages(new Set(filteredImages.map(img => img.id)))
    }
  }

  const deleteSelectedImages = async () => {
    if (selectedImages.size === 0) return

    if (!confirm(`Are you sure you want to delete ${selectedImages.size} image(s)? This cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/businesses/${selectedBusiness}/images/bulk-delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageIds: Array.from(selectedImages) })
      })

      const data = await response.json()

      if (data.success) {
        setImages(prev => prev.filter(img => !selectedImages.has(img.id)))
        setSelectedImages(new Set())
        showMessage('success', `Deleted ${data.deletedCount} image(s)`)
      } else {
        showMessage('error', data.error || 'Failed to delete images')
      }
    } catch (error) {
      console.error('Failed to delete images:', error)
      showMessage('error', 'Failed to delete images')
    }
  }

  const bulkAddTags = async () => {
    if (selectedImages.size === 0 || !bulkTagInput.trim()) return

    const tags = bulkTagInput.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)

    try {
      const response = await fetch(`/api/businesses/${selectedBusiness}/images/bulk-tag`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          imageIds: Array.from(selectedImages),
          tags: tags
        })
      })

      const data = await response.json()

      if (data.success) {
        // Update local state
        setImages(prev => prev.map(img => {
          if (selectedImages.has(img.id)) {
            return {
              ...img,
              manualTags: [...new Set([...img.manualTags, ...tags])]
            }
          }
          return img
        }))
        
        setShowBulkTagModal(false)
        setBulkTagInput('')
        setSelectedImages(new Set())
        showMessage('success', `Added tags to ${data.updatedCount} image(s)`)
      } else {
        showMessage('error', data.error || 'Failed to add tags')
      }
    } catch (error) {
      console.error('Failed to add tags:', error)
      showMessage('error', 'Failed to add tags')
    }
  }

  const updateImageCategory = async (imageId: string, category: string) => {
    try {
      const response = await fetch(`/api/businesses/${selectedBusiness}/images/${imageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category })
      })

      const data = await response.json()

      if (data.success) {
        setImages(prev => prev.map(img => 
          img.id === imageId ? { ...img, category } : img
        ))
        showMessage('success', 'Category updated')
      } else {
        showMessage('error', data.error || 'Failed to update category')
      }
    } catch (error) {
      console.error('Failed to update category:', error)
      showMessage('error', 'Failed to update category')
    }
  }

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 5000)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getAllTags = () => {
    const tagSet = new Set<string>()
    images.forEach(img => {
      img.aiTags.forEach(tag => tagSet.add(tag))
      img.manualTags.forEach(tag => tagSet.add(tag))
    })
    return Array.from(tagSet).sort()
  }

  const filteredImages = images.filter(image => {
    const matchesSearch = !searchFilter || 
      image.originalName.toLowerCase().includes(searchFilter.toLowerCase()) ||
      image.aiDescription?.toLowerCase().includes(searchFilter.toLowerCase()) ||
      image.aiTags.some(tag => tag.toLowerCase().includes(searchFilter.toLowerCase())) ||
      image.manualTags.some(tag => tag.toLowerCase().includes(searchFilter.toLowerCase()))

    const matchesCategory = !categoryFilter || image.category === categoryFilter

    const matchesTag = !tagFilter || 
      image.aiTags.includes(tagFilter) || 
      image.manualTags.includes(tagFilter)

    return matchesSearch && matchesCategory && matchesTag
  })

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
          <>
            {/* Upload Section */}
            <div className="bg-slate-800/30 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-dark-text mb-4">📤 Upload Images</h3>
              
              <div className="flex items-center gap-4 mb-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="btn btn-primary"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Uploading...
                    </>
                  ) : (
                    '📤 Upload Images'
                  )}
                </button>
                
                <div className="text-sm text-dark-text-muted">
                  Supports JPG, PNG, WebP • Max 10MB per file
                </div>
              </div>

              {uploading && (
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm text-dark-text-muted mb-2">
                    <span>Uploading {uploadProgress.current} of {uploadProgress.total}</span>
                    <span>{Math.round((uploadProgress.current / uploadProgress.total) * 100)}%</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div 
                      className="bg-blue-400 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            {/* Filters and Controls */}
            <div className="bg-slate-800/30 rounded-lg p-6">
              <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
                <h3 className="text-lg font-semibold text-dark-text">🔍 Search & Filter</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                    className="btn btn-outline btn-sm"
                  >
                    {viewMode === 'grid' ? '📋 List' : '🎛️ Grid'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-dark-text font-medium mb-2 text-sm">Search</label>
                  <input
                    type="text"
                    placeholder="Search by name, description, or tags..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="form-control"
                  />
                </div>

                <div>
                  <label className="block text-dark-text font-medium mb-2 text-sm">Category</label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="form-control"
                  >
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-dark-text font-medium mb-2 text-sm">Tag</label>
                  <select
                    value={tagFilter}
                    onChange={(e) => setTagFilter(e.target.value)}
                    className="form-control"
                  >
                    <option value="">All Tags</option>
                    {getAllTags().map(tag => (
                      <option key={tag} value={tag}>
                        {tag}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedImages.size > 0 && (
                <div className="flex items-center gap-4 mt-4 p-4 bg-blue-400/10 border border-blue-400/20 rounded-lg">
                  <span className="text-sm text-blue-400 font-medium">
                    {selectedImages.size} image(s) selected
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowBulkTagModal(true)}
                      className="btn btn-outline btn-sm"
                    >
                      🏷️ Add Tags
                    </button>
                    <button
                      onClick={deleteSelectedImages}
                      className="btn btn-outline btn-sm text-red-400"
                    >
                      🗑️ Delete
                    </button>
                    <button
                      onClick={() => setSelectedImages(new Set())}
                      className="btn btn-outline btn-sm"
                    >
                      ✖️ Clear Selection
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Images Display */}
            {loading ? (
              <div className="flex items-center gap-3 p-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
                <span className="text-dark-text">Loading images...</span>
              </div>
            ) : (
              <div className="bg-slate-800/30 rounded-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-dark-text">
                    📚 Image Library ({filteredImages.length} images)
                  </h3>
                  {filteredImages.length > 0 && (
                    <button
                      onClick={selectAllImages}
                      className="btn btn-outline btn-sm"
                    >
                      {selectedImages.size === filteredImages.length ? '❌ Deselect All' : '✅ Select All'}
                    </button>
                  )}
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
                        className={`group relative rounded-lg border transition-all ${
                          selectedImages.has(image.id) ? 
                            'border-blue-400 bg-blue-400/10' : 
                            'border-slate-600/30 bg-slate-900/30 hover:border-slate-500/50'
                        } overflow-hidden ${viewMode === 'grid' ? 'aspect-square' : 'flex p-4'}`}
                      >
                        {viewMode === 'grid' ? (
                          // Grid View
                          <>
                            <div className="absolute top-2 left-2 z-10">
                              <input
                                type="checkbox"
                                checked={selectedImages.has(image.id)}
                                onChange={() => toggleImageSelection(image.id)}
                                className="w-4 h-4 rounded bg-slate-800 border-slate-600"
                              />
                            </div>
                            
                            <div 
                              className="relative w-full h-full cursor-pointer"
                              onClick={() => setShowImageModal(image)}
                            >
                              <Image
                                src={image.thumbnailUrl || image.cloudUrl}
                                alt={image.originalName}
                                fill
                                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 16vw"
                                className="object-cover"
                              />
                              
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <div className="text-white text-center p-2">
                                  <div className="text-sm font-medium truncate">
                                    {image.originalName}
                                  </div>
                                  <div className="text-xs text-gray-300">
                                    {formatFileSize(image.fileSize)}
                                  </div>
                                  {image.aiTags.length > 0 && (
                                    <div className="text-xs text-gray-300 mt-1">
                                      {image.aiTags.slice(0, 2).join(', ')}
                                      {image.aiTags.length > 2 && '...'}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </>
                        ) : (
                          // List View
                          <div className="flex items-center gap-4 flex-1">
                            <input
                              type="checkbox"
                              checked={selectedImages.has(image.id)}
                              onChange={() => toggleImageSelection(image.id)}
                              className="w-4 h-4 rounded bg-slate-800 border-slate-600"
                            />
                            
                            <div className="w-16 h-16 relative rounded overflow-hidden flex-shrink-0">
                              <Image
                                src={image.thumbnailUrl || image.cloudUrl}
                                alt={image.originalName}
                                fill
                                sizes="64px"
                                className="object-cover"
                              />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-dark-text truncate">
                                {image.originalName}
                              </h4>
                              <div className="text-sm text-dark-text-muted">
                                {formatFileSize(image.fileSize)} • {image.dimensions.width}×{image.dimensions.height}
                                {image.category && (
                                  <span className="ml-2 px-2 py-0.5 bg-slate-600 text-xs rounded">
                                    {categories.find(c => c.value === image.category)?.label || image.category}
                                  </span>
                                )}
                              </div>
                              {(image.aiTags.length > 0 || image.manualTags.length > 0) && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {[...image.aiTags, ...image.manualTags].slice(0, 5).map(tag => (
                                    <span key={tag} className="px-2 py-0.5 bg-blue-400/20 text-blue-400 text-xs rounded">
                                      {tag}
                                    </span>
                                  ))}
                                  {(image.aiTags.length + image.manualTags.length) > 5 && (
                                    <span className="px-2 py-0.5 bg-gray-600/20 text-gray-400 text-xs rounded">
                                      +{(image.aiTags.length + image.manualTags.length) - 5} more
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <select
                                value={image.category || ''}
                                onChange={(e) => updateImageCategory(image.id, e.target.value)}
                                className="form-control text-sm w-32"
                              >
                                <option value="">No Category</option>
                                {categories.slice(1).map(cat => (
                                  <option key={cat.value} value={cat.value}>
                                    {cat.label}
                                  </option>
                                ))}
                              </select>
                              
                              <button
                                onClick={() => setShowImageModal(image)}
                                className="btn btn-outline btn-sm"
                              >
                                👁️ View
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Bulk Tag Modal */}
        {showBulkTagModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-dark-text mb-4">Add Tags to Selected Images</h3>
              
              <div className="mb-4">
                <label className="block text-dark-text font-medium mb-2">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={bulkTagInput}
                  onChange={(e) => setBulkTagInput(e.target.value)}
                  placeholder="work, installation, team photo, before-after"
                  className="form-control"
                />
                <div className="text-xs text-dark-text-muted mt-1">
                  Will add to {selectedImages.size} selected image(s)
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={bulkAddTags}
                  disabled={!bulkTagInput.trim()}
                  className="btn btn-primary flex-1"
                >
                  Add Tags
                </button>
                <button
                  onClick={() => {
                    setShowBulkTagModal(false)
                    setBulkTagInput('')
                  }}
                  className="btn btn-outline flex-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Image Detail Modal */}
        {showImageModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-dark-text">Image Details</h3>
                <button
                  onClick={() => setShowImageModal(null)}
                  className="text-dark-text-muted hover:text-dark-text"
                >
                  ✖️
                </button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <div className="relative aspect-square rounded-lg overflow-hidden bg-slate-900">
                    <Image
                      src={showImageModal.cloudUrl}
                      alt={showImageModal.originalName}
                      fill
                      className="object-contain"
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-dark-text mb-2">File Information</h4>
                    <div className="text-sm text-dark-text-muted space-y-1">
                      <div>Name: {showImageModal.originalName}</div>
                      <div>Size: {formatFileSize(showImageModal.fileSize)}</div>
                      <div>Dimensions: {showImageModal.dimensions.width}×{showImageModal.dimensions.height}</div>
                      <div>Type: {showImageModal.mimeType}</div>
                      <div>Uploaded: {new Date(showImageModal.uploadedAt).toLocaleDateString()}</div>
                      <div>Usage Count: {showImageModal.usageCount}</div>
                    </div>
                  </div>
                  
                  {showImageModal.aiDescription && (
                    <div>
                      <h4 className="font-medium text-dark-text mb-2">AI Description</h4>
                      <p className="text-sm text-dark-text-muted">
                        {showImageModal.aiDescription}
                      </p>
                    </div>
                  )}
                  
                  {showImageModal.aiTags.length > 0 && (
                    <div>
                      <h4 className="font-medium text-dark-text mb-2">AI Tags</h4>
                      <div className="flex flex-wrap gap-2">
                        {showImageModal.aiTags.map(tag => (
                          <span key={tag} className="px-2 py-1 bg-blue-400/20 text-blue-400 text-sm rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {showImageModal.manualTags.length > 0 && (
                    <div>
                      <h4 className="font-medium text-dark-text mb-2">Manual Tags</h4>
                      <div className="flex flex-wrap gap-2">
                        {showImageModal.manualTags.map(tag => (
                          <span key={tag} className="px-2 py-1 bg-green-400/20 text-green-400 text-sm rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <h4 className="font-medium text-dark-text mb-2">Platform URLs</h4>
                    <div className="text-sm text-dark-text-muted space-y-1">
                      {Object.entries(showImageModal.platformUrls || {}).map(([platform, urls]: [string, any]) => (
                        <div key={platform}>
                          <strong className="capitalize">{platform}:</strong>
                          {Object.entries(urls || {}).map(([size, url]: [string, any]) => (
                            <div key={size} className="ml-4">
                              {size}: <a href={url} target="_blank" className="text-blue-400 hover:underline">View</a>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </CollapsibleSection>
  )
}