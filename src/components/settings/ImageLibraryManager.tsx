// src/components/settings/ImageLibraryManager.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import CollapsibleSection from '../CollapsibleSection'

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
  aiDescription?: string
  manualTags: string[]
  category?: string
  subcategory?: string
  isActive: boolean
  usageCount: number
  lastUsed?: string
  uploadedAt: string
}

interface ConfirmationDialog {
  isOpen: boolean
  title: string
  message: string
  confirmText: string
  confirmColor: string
  onConfirm: () => void
  onCancel: () => void
}

const BUSINESSES = [
  { id: 'lex-dallas', name: 'Lex Dallas', color: 'text-blue-400' },
  { id: 'lex-etx', name: 'Lex ETX', color: 'text-green-400' },
  { id: 'lyons', name: 'Lyons', color: 'text-purple-400' }
]

export default function ImageLibraryManager() {
  const [images, setImages] = useState<ImageLibraryItem[]>([])
  const [filteredImages, setFilteredImages] = useState<ImageLibraryItem[]>([])
  const [selectedBusiness, setSelectedBusiness] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTag, setFilterTag] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 })
  
  // Selection state for bulk operations
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set())
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  
  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<ConfirmationDialog | null>(null)
  
  // Edit mode state
  const [editingImage, setEditingImage] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<{
    manualTags: string[]
    category: string
    subcategory: string
    aiTags: string[]
  }>({ manualTags: [], category: '', subcategory: '', aiTags: [] })
  const [newTag, setNewTag] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (selectedBusiness) {
      loadImages()
    }
  }, [selectedBusiness])

  // Helper functions
  const getAllTags = () => {
    const tagSet = new Set<string>()
    images.forEach(img => {
      img.aiTags.forEach(tag => tagSet.add(tag))
      img.manualTags.forEach(tag => tagSet.add(tag))
    })
    return Array.from(tagSet).sort()
  }

  const getCommonTags = () => {
    const tagCounts = new Map<string, number>()
    images.forEach(img => {
      [...img.aiTags, ...img.manualTags].forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
      })
    })
    
    return Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag]) => tag)
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

  useEffect(() => {
    let filtered = images

    if (searchTerm) {
      filtered = filtered.filter(img => 
        img.originalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        img.aiDescription?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        img.aiTags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
        img.manualTags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    if (filterTag) {
      filtered = filtered.filter(img => 
        img.aiTags.includes(filterTag) || img.manualTags.includes(filterTag)
      )
    }

    setFilteredImages(filtered)
  }, [images, searchTerm, filterTag])

  const loadImages = async () => {
    if (!selectedBusiness) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/businesses/${selectedBusiness}/images`)
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

  // Selection management
  const toggleImageSelection = (imageId: string) => {
    const newSelection = new Set(selectedImages)
    if (newSelection.has(imageId)) {
      newSelection.delete(imageId)
    } else {
      newSelection.add(imageId)
    }
    setSelectedImages(newSelection)
  }

  const selectAllImages = () => {
    if (selectedImages.size === filteredImages.length) {
      setSelectedImages(new Set()) // Deselect all
    } else {
      setSelectedImages(new Set(filteredImages.map(img => img.id))) // Select all
    }
  }

  const exitSelectionMode = () => {
    setIsSelectionMode(false)
    setSelectedImages(new Set())
  }

  // Delete functionality
  const deleteImage = async (imageId: string) => {
    const image = images.find(img => img.id === imageId)
    if (!image) return

    setConfirmDialog({
      isOpen: true,
      title: 'Delete Image',
      message: `Are you sure you want to delete "${image.originalName}"? This action cannot be undone.`,
      confirmText: 'Delete',
      confirmColor: 'bg-red-600 hover:bg-red-700',
      onConfirm: async () => {
        setConfirmDialog(null)
        await performSingleDelete(imageId)
      },
      onCancel: () => setConfirmDialog(null)
    })
  }

  const performSingleDelete = async (imageId: string) => {
    try {
      const response = await fetch(`/api/businesses/${selectedBusiness}/images/${imageId}`, {
        method: 'DELETE'
      })

      const data = await response.json()
      
      if (data.success) {
        await loadImages() // Reload images
        showMessage('success', 'Image deleted successfully')
      } else {
        showMessage('error', data.error || 'Failed to delete image')
      }
    } catch (error) {
      console.error('Failed to delete image:', error)
      showMessage('error', 'Failed to delete image')
    }
  }

  const deleteSelectedImages = () => {
    if (selectedImages.size === 0) {
      showMessage('error', 'No images selected')
      return
    }

    setConfirmDialog({
      isOpen: true,
      title: 'Delete Multiple Images',
      message: `Are you sure you want to delete ${selectedImages.size} selected image(s)? This action cannot be undone.`,
      confirmText: `Delete ${selectedImages.size} Images`,
      confirmColor: 'bg-red-600 hover:bg-red-700',
      onConfirm: async () => {
        setConfirmDialog(null)
        await performBulkDelete()
      },
      onCancel: () => setConfirmDialog(null)
    })
  }

  const performBulkDelete = async () => {
    try {
      const response = await fetch(`/api/businesses/${selectedBusiness}/images/bulk-delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          imageIds: Array.from(selectedImages)
        })
      })

      const data = await response.json()
      
      if (data.success) {
        await loadImages() // Reload images
        setSelectedImages(new Set()) // Clear selection
        setIsSelectionMode(false)
        showMessage('success', data.message || 'Images deleted successfully')
      } else {
        showMessage('error', data.error || 'Failed to delete images')
      }
    } catch (error) {
      console.error('Failed to delete images:', error)
      showMessage('error', 'Failed to delete images')
    }
  }

  // File upload handling
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return
    if (!selectedBusiness) {
      showMessage('error', 'Please select a business first')
      return
    }

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
    
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const uploadFiles = async (files: File[]) => {
    setUploading(true)
    setUploadProgress({ current: 0, total: files.length })

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      setUploadProgress({ current: i + 1, total: files.length })

      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('businessId', selectedBusiness)

        const response = await fetch(`/api/businesses/${selectedBusiness}/images/upload`, {
          method: 'POST',
          body: formData
        })

        const data = await response.json()
        
        if (!data.success) {
          showMessage('error', `Failed to upload ${file.name}: ${data.error}`)
        }
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error)
        showMessage('error', `Failed to upload ${file.name}`)
      }
    }

    setUploading(false)
    setUploadProgress({ current: 0, total: 0 })
    await loadImages() // Reload images after upload
    showMessage('success', `Successfully uploaded ${files.length} image(s)`)
  }

  // Tag editing functionality
  const startEditingImage = (image: ImageLibraryItem) => {
    setEditingImage(image.id)
    setEditValues({
      manualTags: [...image.manualTags],
      category: image.category || '',
      subcategory: image.subcategory || '',
      aiTags: [...image.aiTags]
    })
    setNewTag('')
  }

  const cancelEditingImage = () => {
    setEditingImage(null)
    setEditValues({ manualTags: [], category: '', subcategory: '', aiTags: [] })
    setNewTag('')
  }

  const addNewTag = (tagType: 'manual' | 'ai') => {
    if (!newTag.trim()) return
    
    const trimmedTag = newTag.trim()
    if (tagType === 'manual' && !editValues.manualTags.includes(trimmedTag)) {
      setEditValues(prev => ({
        ...prev,
        manualTags: [...prev.manualTags, trimmedTag]
      }))
    } else if (tagType === 'ai' && !editValues.aiTags.includes(trimmedTag)) {
      setEditValues(prev => ({
        ...prev,
        aiTags: [...prev.aiTags, trimmedTag]
      }))
    }
    setNewTag('')
  }

  const removeTag = (tag: string, tagType: 'manual' | 'ai') => {
    if (tagType === 'manual') {
      setEditValues(prev => ({
        ...prev,
        manualTags: prev.manualTags.filter(t => t !== tag)
      }))
    } else {
      setEditValues(prev => ({
        ...prev,
        aiTags: prev.aiTags.filter(t => t !== tag)
      }))
    }
  }

  const saveImageChanges = async () => {
    if (!editingImage || !selectedBusiness) return

    try {
      const response = await fetch(`/api/businesses/${selectedBusiness}/images/${editingImage}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          manualTags: editValues.manualTags,
          category: editValues.category,
          subcategory: editValues.subcategory,
          aiTags: editValues.aiTags
        })
      })

      const data = await response.json()
      
      if (data.success) {
        await loadImages() // Reload images
        cancelEditingImage()
        showMessage('success', 'Image tags updated successfully')
      } else {
        showMessage('error', data.error || 'Failed to update image')
      }
    } catch (error) {
      console.error('Failed to update image:', error)
      showMessage('error', 'Failed to update image')
    }
  }

  return (
    <CollapsibleSection 
      title="📸 Image Library Manager" 
      defaultExpanded={false}
    >
      <div className="space-y-6">
        {/* Business Selection */}
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-dark-text">Select Business:</label>
          <select
            value={selectedBusiness}
            onChange={(e) => setSelectedBusiness(e.target.value)}
            className="form-control w-64"
          >
            <option value="">Choose a business...</option>
            {BUSINESSES.map(business => (
              <option key={business.id} value={business.id}>
                {business.name}
              </option>
            ))}
          </select>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`p-3 rounded-lg border text-sm ${
            message.type === 'success' 
              ? 'bg-green-900/20 border-green-500/30 text-green-300' 
              : 'bg-red-900/20 border-red-500/30 text-red-300'
          }`}>
            {message.text}
          </div>
        )}

        {/* Tag Editing Modal */}
        {editingImage && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-slate-800 border border-slate-600 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-dark-text">
                  ✏️ Edit Image Tags
                </h3>
                <button
                  onClick={cancelEditingImage}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {(() => {
                const currentImage = images.find(img => img.id === editingImage)
                if (!currentImage) return null

                return (
                  <div className="space-y-6">
                    {/* Image Preview */}
                    <div className="flex items-center gap-4">
                      <Image
                        src={currentImage.thumbnailUrl || currentImage.cloudUrl}
                        alt={currentImage.originalName}
                        width={80}
                        height={80}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                      <div>
                        <h4 className="font-medium text-dark-text">{currentImage.originalName}</h4>
                        <p className="text-sm text-dark-text-muted">
                          {formatFileSize(currentImage.fileSize)} • {currentImage.dimensions.width}×{currentImage.dimensions.height}
                        </p>
                      </div>
                    </div>

                    {/* AI Tags Section */}
                    <div>
                      <label className="block text-sm font-medium text-dark-text mb-2">
                        🤖 AI Generated Tags
                      </label>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {editValues.aiTags.map((tag, index) => (
                          <span 
                            key={index}
                            className="inline-flex items-center gap-1 text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded"
                          >
                            {tag}
                            <button
                              onClick={() => removeTag(tag, 'ai')}
                              className="text-blue-300 hover:text-white ml-1"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Add AI tag..."
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && addNewTag('ai')}
                          className="form-control flex-1"
                        />
                        <button
                          onClick={() => addNewTag('ai')}
                          className="btn btn-outline btn-sm"
                          disabled={!newTag.trim()}
                        >
                          Add
                        </button>
                      </div>
                    </div>

                    {/* Manual Tags Section */}
                    <div>
                      <label className="block text-sm font-medium text-dark-text mb-2">
                        🏷️ Manual Tags
                      </label>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {editValues.manualTags.map((tag, index) => (
                          <span 
                            key={index}
                            className="inline-flex items-center gap-1 text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded"
                          >
                            {tag}
                            <button
                              onClick={() => removeTag(tag, 'manual')}
                              className="text-green-300 hover:text-white ml-1"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Add manual tag..."
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && addNewTag('manual')}
                          className="form-control flex-1"
                        />
                        <button
                          onClick={() => addNewTag('manual')}
                          className="btn btn-outline btn-sm"
                          disabled={!newTag.trim()}
                        >
                          Add
                        </button>
                      </div>
                      
                      {/* Common Tags Quick Add */}
                      {getCommonTags().length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs text-dark-text-muted mb-2">Common tags:</p>
                          <div className="flex flex-wrap gap-1">
                            {getCommonTags()
                              .filter(tag => !editValues.manualTags.includes(tag) && !editValues.aiTags.includes(tag))
                              .slice(0, 6)
                              .map(tag => (
                                <button
                                  key={tag}
                                  onClick={() => {
                                    setEditValues(prev => ({
                                      ...prev,
                                      manualTags: [...prev.manualTags, tag]
                                    }))
                                  }}
                                  className="text-xs bg-gray-600 hover:bg-gray-500 text-gray-300 px-2 py-1 rounded"
                                >
                                  + {tag}
                                </button>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Category and Subcategory */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-dark-text mb-2">
                          📁 Category
                        </label>
                        <select
                          value={editValues.category}
                          onChange={(e) => setEditValues(prev => ({ ...prev, category: e.target.value }))}
                          className="form-control w-full"
                        >
                          <option value="">Select category...</option>
                          <option value="equipment">Equipment</option>
                          <option value="technician">Technician</option>
                          <option value="installation">Installation</option>
                          <option value="maintenance">Maintenance</option>
                          <option value="before-after">Before/After</option>
                          <option value="office">Office</option>
                          <option value="promotional">Promotional</option>
                          <option value="seasonal">Seasonal</option>
                          <option value="team">Team</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-dark-text mb-2">
                          📂 Subcategory
                        </label>
                        <input
                          type="text"
                          placeholder="e.g., HVAC unit, truck, headshot"
                          value={editValues.subcategory}
                          onChange={(e) => setEditValues(prev => ({ ...prev, subcategory: e.target.value }))}
                          className="form-control w-full"
                        />
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 justify-end pt-4 border-t border-slate-600">
                      <button
                        onClick={cancelEditingImage}
                        className="btn btn-outline"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveImageChanges}
                        className="btn btn-primary"
                      >
                        💾 Save Changes
                      </button>
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        )}

        {/* Confirmation Dialog */}
        {confirmDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-slate-800 border border-slate-600 rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-dark-text mb-3">
                {confirmDialog.title}
              </h3>
              <p className="text-dark-text-muted mb-6">
                {confirmDialog.message}
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={confirmDialog.onCancel}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDialog.onConfirm}
                  className={`btn text-white ${confirmDialog.confirmColor}`}
                >
                  {confirmDialog.confirmText}
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedBusiness && (
          <>
            {/* Upload Section */}
            <div className="bg-slate-800/30 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-dark-text mb-4">📤 Upload Images</h3>
              
              <div className="flex flex-col gap-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="form-control"
                  disabled={uploading}
                />
                
                {uploading && (
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                    ></div>
                    <div className="text-sm text-gray-400 mt-1">
                      Uploading {uploadProgress.current} of {uploadProgress.total}...
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Filter and Search */}
            <div className="bg-slate-800/30 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-dark-text">
                  🔍 Image Library ({filteredImages.length} images)
                </h3>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                    className="btn btn-outline btn-sm"
                  >
                    {viewMode === 'grid' ? '📋 List' : '🔲 Grid'}
                  </button>
                  
                  {!isSelectionMode ? (
                    <button
                      onClick={() => setIsSelectionMode(true)}
                      className="btn btn-outline btn-sm"
                      disabled={filteredImages.length === 0}
                    >
                      ✅ Select
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={selectAllImages}
                        className="btn btn-outline btn-sm"
                      >
                        {selectedImages.size === filteredImages.length ? 'Deselect All' : 'Select All'}
                      </button>
                      <button
                        onClick={deleteSelectedImages}
                        className="btn bg-red-600 hover:bg-red-700 text-white btn-sm"
                        disabled={selectedImages.size === 0}
                      >
                        🗑️ Delete ({selectedImages.size})
                      </button>
                      <button
                        onClick={exitSelectionMode}
                        className="btn btn-outline btn-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Search and Filter Controls */}
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <input
                  type="text"
                  placeholder="Search images by name, description, or tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="form-control flex-1"
                />
                
                <select
                  value={filterTag}
                  onChange={(e) => setFilterTag(e.target.value)}
                  className="form-control w-48"
                >
                  <option value="">All tags</option>
                  {getAllTags().map(tag => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
              </div>

              {/* Images Display */}
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
                  <p className="text-dark-text-muted">Loading images...</p>
                </div>
              ) : filteredImages.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-dark-text-muted">
                    {images.length === 0 ? 'No images uploaded yet' : 'No images match your search'}
                  </p>
                </div>
              ) : (
                <div className={viewMode === 'grid' 
                  ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'
                  : 'space-y-4'
                }>
                  {filteredImages.map(image => (
                    <div 
                      key={image.id}
                      className={`relative group ${
                        viewMode === 'grid' 
                          ? 'border border-slate-600 rounded-lg overflow-hidden'
                          : 'flex items-center gap-4 p-4 border border-slate-600 rounded-lg'
                      } ${
                        isSelectionMode && selectedImages.has(image.id) 
                          ? 'ring-2 ring-blue-500' 
                          : ''
                      }`}
                    >
                      {/* Selection checkbox */}
                      {isSelectionMode && (
                        <div className="absolute top-2 left-2 z-10">
                          <input
                            type="checkbox"
                            checked={selectedImages.has(image.id)}
                            onChange={() => toggleImageSelection(image.id)}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                          />
                        </div>
                      )}

                      {/* Image */}
                      <div className={viewMode === 'grid' ? 'aspect-square' : 'w-20 h-20 flex-shrink-0'}>
                        <Image
                          src={image.thumbnailUrl || image.cloudUrl}
                          alt={image.originalName}
                          width={viewMode === 'grid' ? 300 : 80}
                          height={viewMode === 'grid' ? 300 : 80}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Image Info */}
                      <div className={viewMode === 'grid' ? 'p-3' : 'flex-1 min-w-0'}>
                        <h4 className="font-medium text-dark-text text-sm truncate">
                          {image.originalName}
                        </h4>
                        <div className="text-xs text-dark-text-muted mt-1">
                          {formatFileSize(image.fileSize)} • {image.dimensions.width}×{image.dimensions.height}
                        </div>
                        
                        {/* Tags */}
                        {(image.aiTags.length > 0 || image.manualTags.length > 0) && (
                          <div className="mt-2">
                            <div className="flex flex-wrap gap-1">
                              {image.aiTags.slice(0, 2).map((tag, index) => (
                                <span 
                                  key={`ai-${index}`}
                                  className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded"
                                  title="AI Generated"
                                >
                                  🤖 {tag}
                                </span>
                              ))}
                              {image.manualTags.slice(0, 2).map((tag, index) => (
                                <span 
                                  key={`manual-${index}`}
                                  className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded"
                                  title="Manual Tag"
                                >
                                  🏷️ {tag}
                                </span>
                              ))}
                              {(image.aiTags.length + image.manualTags.length) > 4 && (
                                <span className="text-xs text-gray-400">
                                  +{(image.aiTags.length + image.manualTags.length) - 4} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Usage Stats */}
                        <div className="text-xs text-dark-text-muted mt-2">
                          Used {image.usageCount} times
                        </div>
                      </div>

                      {/* Action Buttons */}
                      {!isSelectionMode && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="flex gap-1">
                            <button
                              onClick={() => startEditingImage(image)}
                              className="w-8 h-8 bg-green-600 hover:bg-green-700 text-white rounded-full flex items-center justify-center text-sm"
                              title="Edit tags"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => deleteImage(image.id)}
                              className="w-8 h-8 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center text-sm"
                              title="Delete image"
                            >
                              🗑️
                            </button>
                            <button
                              onClick={() => window.open(image.cloudUrl, '_blank')}
                              className="w-8 h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center text-sm"
                              title="View full size"
                            >
                              👁️
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </CollapsibleSection>
  )
}