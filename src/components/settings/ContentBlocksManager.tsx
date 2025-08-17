// src/components/settings/ContentBlocksManager.tsx
'use client'

import { useState, useEffect } from 'react'
import CollapsibleSection from '../CollapsibleSection'

interface ContentBlock {
  id: string
  businessId: string
  name: string
  type: string
  category: string
  content: string
  shortCode?: string
  isActive: boolean
  sortOrder: number
  usageCount: number
}

interface Business {
  id: string
  displayName: string
}

interface EvergreenStatus {
  totalEvergreen: number
  businesses: Array<{
    businessId: string
    businessName: string
    evergreenBlocks: number
    hasSetup: boolean
  }>
  isSetup: boolean
}

export default function ContentBlocksManager() {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [selectedBusiness, setSelectedBusiness] = useState<string>('')
  const [contentBlocks, setContentBlocks] = useState<ContentBlock[]>([])
  const [editingBlock, setEditingBlock] = useState<ContentBlock | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)
  const [evergreenStatus, setEvergreenStatus] = useState<EvergreenStatus | null>(null)
  const [showInactive, setShowInactive] = useState(false)
  const [settingUpEvergreen, setSettingUpEvergreen] = useState(false)

  const blockTypes = [
    { value: 'phone', label: '📞 Phone Number' },
    { value: 'cta', label: '🎯 Call-to-Action' },
    { value: 'hours', label: '🕐 Business Hours' },
    { value: 'address', label: '📍 Address' },
    { value: 'licensing', label: '📋 Licensing Info' },
    { value: 'evergreen', label: '🌲 Evergreen Offers' },
    { value: 'financing', label: '💳 Financing Options' },
    { value: 'custom', label: '✨ Custom' }
  ]

  const blockCategories = [
    { value: 'contact', label: '📞 Contact Info' },
    { value: 'informational', label: 'ℹ️ Informational' },
    { value: 'promotional', label: '🎉 Promotional' },
    { value: 'legal', label: '⚖️ Legal' },
    { value: 'custom', label: '✨ Custom' }
  ]

  useEffect(() => {
    loadBusinesses()
    checkEvergreenStatus()
  }, [])

  useEffect(() => {
    if (selectedBusiness) {
      loadContentBlocks(selectedBusiness)
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

  const checkEvergreenStatus = async () => {
    try {
      const response = await fetch('/api/setup/evergreen-blocks')
      const data = await response.json()
      
      if (data.success) {
        setEvergreenStatus(data.summary)
      }
    } catch (error) {
      console.error('Failed to check evergreen status:', error)
    }
  }

  const setupEvergreenBlocks = async () => {
    setSettingUpEvergreen(true)
    
    try {
      const response = await fetch('/api/setup/evergreen-blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      const data = await response.json()
      
      if (data.success) {
        showMessage('success', `Created ${data.data.totalBlocks} evergreen content blocks!`)
        await checkEvergreenStatus()
        if (selectedBusiness) {
          await loadContentBlocks(selectedBusiness)
        }
      } else {
        showMessage('error', data.error || 'Failed to setup evergreen blocks')
      }
    } catch (error) {
      console.error('Setup failed:', error)
      showMessage('error', 'Failed to setup evergreen blocks')
    } finally {
      setSettingUpEvergreen(false)
    }
  }

  const loadContentBlocks = async (businessId: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/businesses/${businessId}/content-blocks`)
      const data = await response.json()
      
      if (data.success) {
        setContentBlocks(data.contentBlocks)
      } else {
        showMessage('error', data.error || 'Failed to load content blocks')
      }
    } catch (error) {
      console.error('Failed to load content blocks:', error)
      showMessage('error', 'Failed to load content blocks')
    } finally {
      setLoading(false)
    }
  }

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 5000)
  }

  const startCreating = () => {
    setEditingBlock({
      id: '',
      businessId: selectedBusiness,
      name: '',
      type: 'custom',
      category: 'custom',
      content: '',
      shortCode: '',
      isActive: true,
      sortOrder: contentBlocks.length,
      usageCount: 0
    })
    setIsCreating(true)
  }

  const startEditing = (block: ContentBlock) => {
    setEditingBlock({ ...block })
    setIsCreating(false)
  }

  const cancelEditing = () => {
    setEditingBlock(null)
    setIsCreating(false)
  }

  const saveBlock = async () => {
    if (!editingBlock) return

    setSaving(true)
    try {
      const url = isCreating 
        ? `/api/businesses/${selectedBusiness}/content-blocks`
        : `/api/businesses/${selectedBusiness}/content-blocks/${editingBlock.id}`
      
      const method = isCreating ? 'POST' : 'PUT'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingBlock.name,
          type: editingBlock.type,
          category: editingBlock.category,
          content: editingBlock.content,
          shortCode: editingBlock.shortCode,
          isActive: editingBlock.isActive,
          sortOrder: editingBlock.sortOrder
        })
      })

      const data = await response.json()
      
      if (data.success) {
        showMessage('success', isCreating ? 'Content block created!' : 'Content block updated!')
        await loadContentBlocks(selectedBusiness)
        cancelEditing()
      } else {
        showMessage('error', data.error || 'Failed to save content block')
      }
    } catch (error) {
      console.error('Failed to save content block:', error)
      showMessage('error', 'Failed to save content block')
    } finally {
      setSaving(false)
    }
  }

  const deleteBlock = async (blockId: string) => {
    if (!confirm('Are you sure you want to delete this content block?')) return

    try {
      const response = await fetch(`/api/businesses/${selectedBusiness}/content-blocks/${blockId}`, {
        method: 'DELETE'
      })

      const data = await response.json()
      
      if (data.success) {
        showMessage('success', 'Content block deleted!')
        await loadContentBlocks(selectedBusiness)
      } else {
        showMessage('error', data.error || 'Failed to delete content block')
      }
    } catch (error) {
      console.error('Failed to delete content block:', error)
      showMessage('error', 'Failed to delete content block')
    }
  }

  const toggleBlockStatus = async (blockId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/businesses/${selectedBusiness}/content-blocks/${blockId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive })
      })

      const data = await response.json()
      
      if (data.success) {
        await loadContentBlocks(selectedBusiness)
        showMessage('success', `Content block ${isActive ? 'activated' : 'deactivated'}`)
      } else {
        showMessage('error', data.error || 'Failed to update content block')
      }
    } catch (error) {
      console.error('Failed to update content block:', error)
      showMessage('error', 'Failed to update content block')
    }
  }

  const generateShortCode = (name: string) => {
    return `{${name.toUpperCase().replace(/\s+/g, '_')}}`
  }

  const currentBusinessEvergreenStatus = evergreenStatus?.businesses.find(b => b.businessId === selectedBusiness)

  return (
    <CollapsibleSection title="🧩 Content Blocks Library" defaultExpanded={true}>
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

        {/* Evergreen Setup Integration */}
        {selectedBusiness && currentBusinessEvergreenStatus && !currentBusinessEvergreenStatus.hasSetup && (
          <div className="bg-green-400/10 border border-green-400/20 rounded-lg p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h4 className="font-medium text-green-400 mb-2">🌲 Setup Evergreen Content Blocks</h4>
                <p className="text-sm text-dark-text-muted">
                  Add powerful evergreen blocks like financing options, guarantees, and membership programs.
                </p>
              </div>
              <button
                onClick={setupEvergreenBlocks}
                disabled={settingUpEvergreen}
                className="btn btn-success"
              >
                {settingUpEvergreen ? '🌲 Creating...' : '🌲 Add Evergreen Blocks'}
              </button>
            </div>
          </div>
        )}

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
            
            {/* Header with Create Button and Show Inactive Checkbox */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-dark-text">
                Content Blocks for {businesses.find(b => b.id === selectedBusiness)?.displayName}
                {currentBusinessEvergreenStatus && (
                  <span className="ml-2 text-sm text-dark-text-muted">
                    ({currentBusinessEvergreenStatus.evergreenBlocks} blocks)
                  </span>
                )}
              </h3>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-dark-text">
                  <input
                    type="checkbox"
                    checked={showInactive}
                    onChange={(e) => setShowInactive(e.target.checked)}
                    className="rounded"
                  />
                  Show inactive blocks
                </label>
                <button
                  onClick={startCreating}
                  className="btn btn-primary"
                >
                  ➕ Create Content Block
                </button>
              </div>
            </div>

            {/* Content Blocks List - NOW SCROLLABLE */}
            {loading ? (
              <div className="flex items-center gap-3 p-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
                <span className="text-dark-text">Loading content blocks...</span>
              </div>
            ) : (
              <div className="bg-slate-800/30 rounded-lg p-6">
                {contentBlocks.length === 0 ? (
                  <div className="text-center py-8 text-dark-text-muted">
                    No content blocks found. Create your first one!
                  </div>
                ) : (
                  <div 
                    className="space-y-4 max-h-96 overflow-y-auto pr-2"
                    style={{ 
                      scrollbarWidth: 'thin',
                      scrollbarColor: 'rgba(156, 163, 175, 0.5) transparent'
                    }}
                  >
                    {contentBlocks
                      .filter(block => showInactive || block.isActive)
                      .map((block, index) => (
                      <div 
                        key={block.id} 
                        className={`p-4 rounded-lg border border-slate-600/30 transition-all hover:border-slate-500/50 ${
                          index >= 5 ? 'animate-in slide-in-from-bottom-2 duration-300' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-medium text-dark-text">{block.name}</h4>
                              <span className={`px-2 py-1 rounded text-xs ${
                                block.isActive ? 'bg-green-400/20 text-green-400' : 'bg-red-400/20 text-red-400'
                              }`}>
                                {block.isActive ? 'Active' : 'Inactive'}
                              </span>
                              <span className="px-2 py-1 rounded text-xs bg-blue-400/20 text-blue-400">
                                {blockTypes.find(t => t.value === block.type)?.label || block.type}
                              </span>
                              {block.shortCode && (
                                <span className="px-2 py-1 rounded text-xs bg-purple-400/20 text-purple-400 font-mono">
                                  {block.shortCode}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-dark-text-muted mb-2 line-clamp-2">{block.content}</p>
                            <div className="text-xs text-dark-text-secondary">
                              Category: {blockCategories.find(c => c.value === block.category)?.label || block.category}
                              {block.usageCount > 0 && ` • Used ${block.usageCount} times`}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 ml-4">
                            <button
                              onClick={() => toggleBlockStatus(block.id, !block.isActive)}
                              className={`btn btn-sm ${block.isActive ? 'btn-outline' : 'btn-success'}`}
                            >
                              {block.isActive ? '⏸️' : '▶️'}
                            </button>
                            <button
                              onClick={() => startEditing(block)}
                              className="btn btn-outline btn-sm"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => deleteBlock(block.id)}
                              className="btn btn-outline btn-sm text-red-400 hover:bg-red-400/10"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Scroll indicator */}
                {contentBlocks.filter(block => showInactive || block.isActive).length > 5 && (
                  <div className="text-center mt-4 text-xs text-dark-text-muted">
                    Showing {contentBlocks.filter(block => showInactive || block.isActive).length} content blocks • Scroll to see all
                  </div>
                )}
              </div>
            )}

            {/* Edit/Create Form */}
            {editingBlock && (
              <div className="bg-slate-800/50 rounded-lg p-6 border border-blue-400/30">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-dark-text">
                    {isCreating ? 'Create New Content Block' : 'Edit Content Block'}
                  </h4>
                  <div className="flex gap-2">
                    <button
                      onClick={saveBlock}
                      disabled={saving}
                      className="btn btn-success"
                    >
                      {saving ? '💾 Saving...' : '💾 Save'}
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="btn btn-outline"
                    >
                      Cancel
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-dark-text mb-2">
                      Block Name *
                    </label>
                    <input
                      type="text"
                      value={editingBlock.name}
                      onChange={(e) => {
                        const name = e.target.value
                        setEditingBlock({
                          ...editingBlock,
                          name,
                          shortCode: editingBlock.shortCode || generateShortCode(name)
                        })
                      }}
                      placeholder="e.g., Emergency Phone Number"
                      className="form-control"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-dark-text mb-2">
                      Short Code
                    </label>
                    <input
                      type="text"
                      value={editingBlock.shortCode || ''}
                      onChange={(e) => setEditingBlock({...editingBlock, shortCode: e.target.value})}
                      placeholder="e.g., {EMERGENCY_PHONE}"
                      className="form-control font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-dark-text mb-2">
                      Block Type
                    </label>
                    <select
                      value={editingBlock.type}
                      onChange={(e) => setEditingBlock({...editingBlock, type: e.target.value})}
                      className="form-control"
                    >
                      {blockTypes.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-dark-text mb-2">
                      Category
                    </label>
                    <select
                      value={editingBlock.category}
                      onChange={(e) => setEditingBlock({...editingBlock, category: e.target.value})}
                      className="form-control"
                    >
                      {blockCategories.map(category => (
                        <option key={category.value} value={category.value}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-dark-text mb-2">
                    Content *
                  </label>
                  <textarea
                    value={editingBlock.content}
                    onChange={(e) => setEditingBlock({...editingBlock, content: e.target.value})}
                    placeholder="Enter the text content for this block..."
                    className="form-control min-h-[100px]"
                    required
                  />
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={editingBlock.isActive}
                    onChange={(e) => setEditingBlock({...editingBlock, isActive: e.target.checked})}
                    className="rounded"
                  />
                  <label htmlFor="isActive" className="text-sm text-dark-text">
                    Active (available for use in content generation)
                  </label>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </CollapsibleSection>
  )
}