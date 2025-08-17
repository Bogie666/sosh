// src/components/reviews/ReviewItem.tsx
'use client'

import { useState } from 'react'

interface Review {
  id: string
  name: string
  rating: number
  text: string
  reply?: string
  locationName: string
  locationId: string
  date: string
  dismissed?: boolean
}

interface ReviewItemProps {
  review: Review
  selected: boolean
  onSelect: (id: string, selected: boolean) => void
  onDismiss: (id: string) => void
  onReplyGenerated: (id: string, reply: string) => void
}

export default function ReviewItem({ 
  review, 
  selected, 
  onSelect, 
  onDismiss,
  onReplyGenerated 
}: ReviewItemProps) {
  const [replyText, setReplyText] = useState(review.reply || '')
  const [replying, setReplying] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [showDismissConfirm, setShowDismissConfirm] = useState(false)

  const handleReply = async () => {
    if (!replyText.trim()) return
    
    setReplying(true)
    try {
      const response = await fetch('/api/google/reply-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewId: review.id,
          reply: replyText,
          locationId: review.locationId
        })
      })
      
      const data = await response.json()
      if (data.success) {
        console.log('Reply sent successfully')
        // Could add a toast notification here
      } else {
        console.error('Failed to send reply:', data.error)
        alert(`Failed to send reply: ${data.error}`)
      }
    } catch (error) {
      console.error('Failed to send reply:', error)
      alert('Failed to send reply. Please try again.')
    } finally {
      setReplying(false)
    }
  }

  const generateAIReply = async () => {
    setGenerating(true)
    try {
      console.log('Generating AI reply for review:', {
        rating: review.rating,
        text: review.text?.substring(0, 100),
        locationName: review.locationName
      })

      const response = await fetch('/api/ai/generate-review-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          review: {
            starRating: getStarRatingString(review.rating),
            comment: review.text,
            reviewer: {
              displayName: review.name
            }
          },
          businessName: review.locationName,
          locationName: review.locationName
        })
      })
      
      console.log('AI response status:', response.status)
      const data = await response.json()
      console.log('AI response data:', data)
      
      if (data.success && data.response) {
        setReplyText(data.response)
        onReplyGenerated(review.id, data.response)
        console.log('✅ AI reply generated successfully')
      } else {
        console.error('❌ AI reply generation failed:', data.error)
        alert(`Failed to generate AI reply: ${data.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('💥 AI reply generation error:', error)
      alert(`Error generating AI reply: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setGenerating(false)
    }
  }

  const handleDismiss = () => {
    if (showDismissConfirm) {
      onDismiss(review.id)
      setShowDismissConfirm(false)
    } else {
      setShowDismissConfirm(true)
      // Auto-cancel confirmation after 5 seconds
      setTimeout(() => setShowDismissConfirm(false), 5000)
    }
  }

  // Convert numeric rating to Google's string format for AI
  const getStarRatingString = (rating: number): string => {
    const ratingMap: Record<number, string> = {
      1: 'ONE', 2: 'TWO', 3: 'THREE', 4: 'FOUR', 5: 'FIVE'
    }
    return ratingMap[rating] || 'THREE'
  }

  const getRatingStars = (rating: number) => {
    // Ensure rating is a number
    const numRating = typeof rating === 'number' ? rating : 0
    const fullStars = '★'.repeat(Math.max(0, Math.min(5, numRating)))
    const emptyStars = '☆'.repeat(Math.max(0, 5 - numRating))
    return fullStars + emptyStars
  }

  const getRatingColor = (rating: number) => {
    const numRating = typeof rating === 'number' ? rating : 0
    if (numRating >= 4) return 'text-green-400'
    if (numRating >= 3) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getRatingBackground = (rating: number) => {
    const numRating = typeof rating === 'number' ? rating : 0
    if (numRating >= 4) return 'bg-green-900/20 border-green-700/30'
    if (numRating >= 3) return 'bg-yellow-900/20 border-yellow-700/30'
    return 'bg-red-900/20 border-red-700/30'
  }

  if (review.dismissed) {
    return null // Don't render dismissed reviews
  }

  return (
    <div className={`border rounded-lg p-4 transition-all ${
      selected ? 'border-accent-blue bg-slate-800/50' : 'border-dark-border bg-slate-800/20'
    } ${getRatingBackground(review.rating)}`}>
      
      {/* Review Header with Star Rating */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => onSelect(review.id, e.target.checked)}
            className="w-4 h-4 text-accent-blue bg-gray-800 border-gray-600 rounded focus:ring-accent-blue"
          />
          
          <div>
            <h4 className="font-medium text-dark-text">{review.name}</h4>
            <div className="flex items-center gap-3 mt-1">
              {/* Star Rating Display */}
              <div className="flex items-center gap-2">
                <span className={`text-lg ${getRatingColor(review.rating)}`}>
                  {getRatingStars(review.rating)}
                </span>
                <span className={`text-sm font-semibold px-2 py-1 rounded ${
                  review.rating >= 4 ? 'bg-green-900/40 text-green-300' :
                  review.rating >= 3 ? 'bg-yellow-900/40 text-yellow-300' :
                  'bg-red-900/40 text-red-300'
                }`}>
                  {review.rating}/5
                </span>
              </div>
              
              <span className="text-dark-text-secondary text-sm">
                {review.locationName}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-xs text-dark-text-secondary">
            {new Date(review.date).toLocaleDateString()}
          </span>
          
          {/* Dismiss Button */}
          {!review.reply && (
            <button
              onClick={handleDismiss}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                showDismissConfirm 
                  ? 'bg-red-600 text-white hover:bg-red-700' 
                  : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
              }`}
              title={showDismissConfirm ? 'Click again to confirm dismiss' : 'Dismiss this review'}
            >
              {showDismissConfirm ? '✓ Confirm' : '🗑️'}
            </button>
          )}
        </div>
      </div>

      {/* Review Text */}
      <div className="mb-4">
        <p className="text-dark-text text-sm leading-relaxed">
          {review.text}
        </p>
      </div>

      {/* Reply Section */}
      {!review.reply ? (
        <div className="space-y-3">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Write your reply..."
            className="w-full p-3 bg-gray-800/50 border border-gray-600 rounded-lg text-dark-text text-sm"
            rows={3}
          />
          
          <div className="flex gap-2">
            <button
              onClick={generateAIReply}
              disabled={generating}
              className="btn btn-outline btn-sm"
            >
              {generating ? '🤖 Generating...' : '🤖 Generate AI Reply'}
            </button>
            
            <button
              onClick={handleReply}
              disabled={replying || !replyText.trim()}
              className="btn btn-primary btn-sm"
            >
              {replying ? '📤 Sending...' : '📤 Send Reply'}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-green-900/20 border border-green-800 rounded-lg p-3">
          <h5 className="text-accent-green text-sm font-medium mb-2">Your Reply:</h5>
          <p className="text-dark-text text-sm">{review.reply}</p>
        </div>
      )}
    </div>
  )
}