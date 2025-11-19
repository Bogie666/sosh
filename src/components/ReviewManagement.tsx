// src/components/ReviewManagement.tsx
'use client'

import { useState, useEffect } from 'react'
import CollapsibleSection from './CollapsibleSection'
import ReviewFilters from './reviews/ReviewFilters'
import BulkActions from './reviews/BulkActions'

interface Review {
  id: string
  name: string
  rating: number
  text: string
  reply?: string
  locationName: string
  locationId: string
  accountId: string
  date: string
  dismissed?: boolean
  pendingReply?: string // Generated but not posted reply
  isGeneratingReply?: boolean
  isPostingReply?: boolean
}

interface Location {
  id: string
  locationId: string
  locationName: string
  name: string
}

// ReviewItem Component (embedded)
function ReviewItem({
  review,
  selected,
  onSelect,
  onDismiss,
  onReplyGenerated,
  onReplyPosted
}: {
  review: Review
  selected: boolean
  onSelect: (reviewId: string, selected: boolean) => void
  onDismiss: (reviewId: string) => void
  onReplyGenerated: (reviewId: string, reply: string) => void
  onReplyPosted: (reviewId: string, reply: string) => void
}) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [isPosting, setIsPosting] = useState(false)
  const [editingReply, setEditingReply] = useState(false)
  const [editedReply, setEditedReply] = useState('')

  const getStarRating = (rating: number) => {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating)
  }

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return 'text-green-400'
    if (rating >= 3) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getPriorityColor = (rating: number, hasReply: boolean) => {
    if (rating <= 2 && !hasReply) return 'border-l-red-500' // Urgent
    if (rating <= 3) return 'border-l-yellow-500' // Needs attention
    if (rating >= 4) return 'border-l-green-500' // Positive
    return 'border-l-blue-500' // Default
  }

  const generateAIReply = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch('/api/ai/generate-review-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          review: {
            starRating: review.rating <= 1 ? 'ONE' : review.rating <= 2 ? 'TWO' : review.rating <= 3 ? 'THREE' : review.rating <= 4 ? 'FOUR' : 'FIVE',
            comment: review.text,
            reviewer: { displayName: review.name }
          },
          businessName: review.locationName,
          locationName: review.locationName
        })
      })

      const data = await response.json()
      
      if (data.success) {
        onReplyGenerated(review.id, data.response)
        console.log('✅ AI reply generated successfully')
      } else {
        console.error('❌ Failed to generate AI reply:', data.error)
        alert('Failed to generate AI reply: ' + data.error)
      }
    } catch (error) {
      console.error('💥 Error generating AI reply:', error)
      alert('Error generating AI reply: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setIsGenerating(false)
    }
  }

  const postReply = async (replyText: string) => {
    setIsPosting(true)
    try {
      console.log('Posting reply to Google Business Profile:', {
        reviewId: review.id,
        accountId: review.accountId,
        locationId: review.locationId,
        reply: replyText.substring(0, 50) + '...'
      })
      
      // Actually post to Google Business Profile using the new API
      const response = await fetch('/api/google/reply-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewId: review.id,
          accountId: review.accountId,
          locationId: review.locationId,
          reply: replyText
        })
      })

      const data = await response.json()
      
      if (data.success) {
        onReplyPosted(review.id, replyText)
        console.log('✅ Reply posted successfully to Google Business Profile')
      } else {
        console.error('❌ Failed to post reply to Google Business Profile:', data.error)
        alert(`Failed to post reply: ${data.error}`)
        return // Don't update UI if posting failed
      }
    } catch (error) {
      console.error('💥 Error posting reply to Google Business Profile:', error)
      alert('Error posting reply: ' + (error instanceof Error ? error.message : 'Unknown error'))
      return // Don't update UI if posting failed
    } finally {
      setIsPosting(false)
    }
  }

  const startEditingReply = () => {
    setEditingReply(true)
    setEditedReply(review.pendingReply || review.reply || '')
  }

  const saveEditedReply = () => {
    onReplyGenerated(review.id, editedReply)
    setEditingReply(false)
  }

  const cancelEditingReply = () => {
    setEditingReply(false)
    setEditedReply('')
  }

  return (
    <div className={`review-item ${getPriorityColor(review.rating, !!review.reply)} ${
      selected ? 'selected-for-bulk' : ''
    }`}>
      <div className="flex items-start gap-4">
        {/* Selection Checkbox */}
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onSelect(review.id, e.target.checked)}
          className="w-4 h-4 text-accent-blue bg-gray-800 border-gray-600 rounded focus:ring-accent-blue mt-1"
        />

        {/* Review Content */}
        <div className="flex-1">
          {/* Header */}
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h4 className="font-semibold text-dark-text">{review.name}</h4>
                <span className={`text-lg ${getRatingColor(review.rating)}`}>
                  {getStarRating(review.rating)}
                </span>
                <span className="text-xs text-dark-text-muted">
                  {review.rating}/5 stars
                </span>
              </div>
              <p className="text-sm text-dark-text-muted">
                {review.locationName} • {new Date(review.date).toLocaleDateString()}
              </p>
            </div>
            
            {/* Priority indicator */}
            {review.rating <= 2 && !review.reply && (
              <span className="px-2 py-1 bg-red-900/30 text-red-300 text-xs rounded-full">
                URGENT
              </span>
            )}
          </div>

          {/* Review Text */}
          <div className="bg-gray-900/30 rounded-lg p-3 mb-4">
            <p className="text-dark-text text-sm whitespace-pre-wrap">{review.text}</p>
          </div>

          {/* Existing Reply */}
          {review.reply && (
            <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-3 mb-4">
              <p className="text-blue-300 text-xs font-semibold mb-2">📤 POSTED REPLY</p>
              <p className="text-dark-text text-sm whitespace-pre-wrap">{review.reply}</p>
            </div>
          )}

          {/* Generated Reply (Pending) */}
          {review.pendingReply && !editingReply && (
            <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-3 mb-4">
              <div className="flex justify-between items-center mb-2">
                <p className="text-green-300 text-xs font-semibold">🤖 GENERATED REPLY (Ready to Post)</p>
                <button
                  onClick={startEditingReply}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  ✏️ Edit
                </button>
              </div>
              <p className="text-dark-text text-sm whitespace-pre-wrap">{review.pendingReply}</p>
            </div>
          )}

          {/* Reply Editing */}
          {editingReply && (
            <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-3 mb-4">
              <p className="text-yellow-300 text-xs font-semibold mb-2">✏️ EDITING REPLY</p>
              <textarea
                value={editedReply}
                onChange={(e) => setEditedReply(e.target.value)}
                className="w-full p-2 bg-gray-900/50 border border-gray-600 rounded text-dark-text text-sm"
                rows={3}
                placeholder="Edit the reply..."
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={saveEditedReply}
                  className="btn btn-primary btn-sm"
                >
                  💾 Save Changes
                </button>
                <button
                  onClick={cancelEditingReply}
                  className="btn btn-outline btn-sm"
                >
                  ❌ Cancel
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {!review.reply && !review.pendingReply && (
              <button
                onClick={generateAIReply}
                disabled={isGenerating}
                className="btn btn-primary btn-sm"
              >
                {isGenerating ? '🤖 Generating...' : '🤖 Generate AI Reply'}
              </button>
            )}

            {review.pendingReply && !review.reply && (
              <button
                onClick={() => postReply(review.pendingReply!)}
                disabled={isPosting}
                className="btn btn-success btn-sm"
              >
                {isPosting ? '📤 Posting...' : '📤 Post Reply'}
              </button>
            )}

            {review.pendingReply && (
              <button
                onClick={generateAIReply}
                disabled={isGenerating}
                className="btn btn-secondary btn-sm"
              >
                {isGenerating ? '🔄 Regenerating...' : '🔄 Regenerate'}
              </button>
            )}

            <button
              onClick={() => onDismiss(review.id)}
              className="btn btn-outline btn-sm text-gray-400 hover:text-red-400"
            >
              🗑️ Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Main ReviewManagement Component
export default function ReviewManagement() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [filteredReviews, setFilteredReviews] = useState<Review[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingLocations, setLoadingLocations] = useState(true)
  const [selectedReviews, setSelectedReviews] = useState<Set<string>>(new Set())
  const [dismissedReviews, setDismissedReviews] = useState<Set<string>>(new Set())
  const [filters, setFilters] = useState<{
    location: string
    status: string
  }>({
    location: 'all',
    status: 'all'
  })

  // Load locations when component mounts
  useEffect(() => {
    loadLocations()
  }, [])

  // Filter reviews when reviews, filters, or dismissed reviews change
  useEffect(() => {
    filterReviews()
  }, [reviews, filters, dismissedReviews])

  // Listen for live updates from bulk generation
  useEffect(() => {
    const handleReplyGeneratedEvent = (event: CustomEvent) => {
      const { reviewId, reply } = event.detail
      handleReplyGenerated(reviewId, reply)
    }

    window.addEventListener('reviewReplyGenerated', handleReplyGeneratedEvent as EventListener)
    
    return () => {
      window.removeEventListener('reviewReplyGenerated', handleReplyGeneratedEvent as EventListener)
    }
  }, [])

  const loadLocations = async () => {
  setLoadingLocations(true)
  try {
    // Add cache-busting to prevent stale responses
    const response = await fetch('/api/google/locations', {
      method: 'GET',
      cache: 'no-cache',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
    
    const data = await response.json()
    
    if (data.success && data.locations) {
      setLocations(data.locations)
      console.log('Loaded locations:', data.locations)
    } else {
      console.error('Failed to load locations:', data.error)
    }
  } catch (error) {
    console.error('Failed to load locations:', error)
  } finally {
    setLoadingLocations(false)
  }
}

  const loadReviews = async () => {
    setLoading(true)
    try {
      console.log('Starting to load reviews...')
      const response = await fetch('/api/google/reviews')
      const data = await response.json()
      
      console.log('Reviews API response:', data)
      
      if (data.success) {
        // Mark dismissed reviews
        const reviewsWithDismissed = (data.reviews || []).map((review: Review) => ({
          ...review,
          dismissed: dismissedReviews.has(review.id)
        }))
        
        setReviews(reviewsWithDismissed)
        console.log('Successfully loaded reviews:', reviewsWithDismissed.length)
      } else {
        console.error('Reviews API returned error:', data.error)
        setReviews([])
      }
    } catch (error) {
      console.error('Failed to fetch reviews:', error)
      setReviews([])
    } finally {
      setLoading(false)
    }
  }

  const filterReviews = () => {
    let filtered = reviews.filter(review => !review.dismissed && !dismissedReviews.has(review.id))
    
    if (filters.location !== 'all') {
      filtered = filtered.filter(review => review.locationId === filters.location)
    }
    
    if (filters.status !== 'all') {
      filtered = filtered.filter(review => {
        switch (filters.status) {
          case 'unresponded':
            // FIXED: Only count as "needs response" if NO POSTED reply (ignore pendingReply)
            return !review.reply
          case 'negative':
            return review.rating <= 3
          case 'positive':
            return review.rating >= 4
          case 'urgent':
            // FIXED: Only count as urgent if NO POSTED reply (ignore pendingReply)
            return review.rating <= 2 && !review.reply
          default:
            return true
        }
      })
    }
    
    setFilteredReviews(filtered)
  }

  const handleSelectReview = (reviewId: string, selected: boolean) => {
    const newSelected = new Set(selectedReviews)
    if (selected) {
      newSelected.add(reviewId)
    } else {
      newSelected.delete(reviewId)
    }
    setSelectedReviews(newSelected)
  }

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedReviews(new Set(filteredReviews.map(r => r.id)))
    } else {
      setSelectedReviews(new Set())
    }
  }

  const handleDismissReview = (reviewId: string) => {
    setDismissedReviews(prev => new Set([...prev, reviewId]))
    setSelectedReviews(prev => {
      const newSelected = new Set(prev)
      newSelected.delete(reviewId)
      return newSelected
    })
    
    // Update the review in state
    setReviews(prev => prev.map(review => 
      review.id === reviewId ? { ...review, dismissed: true } : review
    ))
    
    console.log(`Review ${reviewId} dismissed`)
  }

  const handleReplyGenerated = (reviewId: string, reply: string) => {
    setReviews(prev => prev.map(review => 
      review.id === reviewId ? { ...review, pendingReply: reply } : review
    ))
    console.log(`AI reply generated for review ${reviewId}`)
  }

  const handleReplyPosted = (reviewId: string, reply: string) => {
    setReviews(prev => prev.map(review => 
      review.id === reviewId ? { ...review, reply, pendingReply: undefined } : review
    ))
    console.log(`Reply posted for review ${reviewId}`)
  }

  const handleBulkGenerate = (reviewIds: string[]) => {
    console.log(`Bulk generation completed for ${reviewIds.length} reviews`)
    // Don't reload reviews - the BulkActions component should update individual reviews
    // as it processes them. This prevents losing generated replies.
  }

  const handleBulkPost = (reviewIds: string[]) => {
    // Move pending replies to posted replies
    setReviews(prev => prev.map(review => 
      reviewIds.includes(review.id) && review.pendingReply
        ? { ...review, reply: review.pendingReply, pendingReply: undefined }
        : review
    ))
    console.log(`Bulk posting completed for ${reviewIds.length} reviews`)
  }

  const undismissAll = () => {
    setDismissedReviews(new Set())
    setReviews(prev => prev.map(review => ({ ...review, dismissed: false })))
    console.log('All dismissed reviews restored')
  }

  return (
    <CollapsibleSection title="📝 Review Management" defaultExpanded={false}>
      <div className="space-y-6">
        
        {/* Controls */}
        <div className="flex flex-wrap gap-4 items-center">
          <button 
            onClick={loadReviews}
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? '🔄 Loading...' : '🔄 Load Reviews'}
          </button>
          
          {/* Location count info */}
          <div className="text-dark-text-muted text-sm">
            {loadingLocations ? (
              '🏢 Loading locations...'
            ) : (
              `🏢 ${locations.length} business locations found`
            )}
          </div>

          {/* Dismissed reviews info */}
          {dismissedReviews.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-dark-text-secondary text-sm">
                🗑️ {dismissedReviews.size} dismissed
              </span>
              <button
                onClick={undismissAll}
                className="btn btn-outline btn-sm"
              >
                Restore All
              </button>
            </div>
          )}

          {/* Debug info */}
          <div className="text-dark-text-secondary text-xs">
            {reviews.length > 0 && `📊 ${reviews.length} reviews loaded`}
          </div>
        </div>

        {/* Filters - Using separate component */}
        <ReviewFilters 
          filters={filters}
          onFiltersChange={setFilters}
          reviews={reviews}
          locations={locations}
          loadingLocations={loadingLocations}
        />

        {/* Bulk Actions - Using separate component */}
        {selectedReviews.size > 0 && (
          <BulkActions 
            selectedCount={selectedReviews.size}
            selectedReviews={selectedReviews}
            reviews={filteredReviews}
            onComplete={() => setSelectedReviews(new Set())}
            onBulkGenerate={handleBulkGenerate}
            onBulkPost={handleBulkPost}
          />
        )}

        {/* Reviews List */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-accent-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-dark-text-muted">Loading reviews from {locations.length} business locations...</p>
            </div>
          ) : filteredReviews.length > 0 ? (
            <div className="h-96 overflow-y-auto bg-slate-800/20 rounded-lg p-4 border border-dark-border">
              {/* Select All - Sticky at top */}
              <div className="sticky top-0 bg-slate-800/90 backdrop-blur-sm z-10 flex items-center gap-3 p-3 rounded-lg mb-4 border border-dark-border">
                <input
                  type="checkbox"
                  checked={selectedReviews.size === filteredReviews.length && filteredReviews.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="w-4 h-4 text-accent-blue bg-gray-800 border-gray-600 rounded focus:ring-accent-blue"
                />
                <span className="text-dark-text-muted">
                  Select all ({filteredReviews.length} reviews)
                </span>
              </div>
              
              {/* Scrollable Reviews */}
              <div className="space-y-4">
                {filteredReviews.map((review) => (
                  <ReviewItem
                    key={review.id}
                    review={review}
                    selected={selectedReviews.has(review.id)}
                    onSelect={handleSelectReview}
                    onDismiss={handleDismissReview}
                    onReplyGenerated={handleReplyGenerated}
                    onReplyPosted={handleReplyPosted}
                  />
                ))}
              </div>
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-dark-text-muted mb-4">
                {locations.length > 0 ? 
                  'No reviews loaded yet. Click "Load Reviews" to fetch reviews from your business locations.' :
                  'No business locations found. Please ensure your Google Business Profile is set up.'
                }
              </p>
              {locations.length > 0 && !loading && (
                <button 
                  onClick={loadReviews}
                  className="btn btn-primary"
                >
                  🔄 Load Reviews Now
                </button>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-dark-text-muted">No reviews match your current filters</p>
              <p className="text-dark-text-secondary text-sm mt-2">
                {reviews.length} total reviews available
                {dismissedReviews.size > 0 && ` (${dismissedReviews.size} dismissed)`}
              </p>
            </div>
          )}
        </div>
      </div>
    </CollapsibleSection>
  )
}