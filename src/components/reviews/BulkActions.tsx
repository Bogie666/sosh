// src/components/reviews/BulkActions.tsx
'use client'

import { useState } from 'react'

interface BulkActionsProps {
  selectedCount: number
  selectedReviews: Set<string>
  reviews: any[] // Reviews array to get full review data
  onComplete: () => void
  onBulkGenerate?: (reviewIds: string[]) => void
  onBulkPost?: (reviewIds: string[]) => void
}

export default function BulkActions({ 
  selectedCount, 
  selectedReviews, 
  reviews,
  onComplete,
  onBulkGenerate,
  onBulkPost
}: BulkActionsProps) {
  const [loading, setLoading] = useState(false)
  const [isPosting, setIsPosting] = useState(false)
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 })

  // Get selected reviews with their details
  const selectedReviewsData = reviews.filter(review => selectedReviews.has(review.id))
  
  // Count reviews that need replies vs those that have generated replies ready to post
  const needsGeneration = selectedReviewsData.filter(review => !review.pendingReply && !review.reply)
  const readyToPost = selectedReviewsData.filter(review => review.pendingReply && !review.reply)

  const handleBulkAIResponse = async () => {
    if (needsGeneration.length === 0) {
      alert('No reviews need AI response generation')
      return
    }

    setLoading(true)
    setGenerationProgress({ current: 0, total: needsGeneration.length })
    
    try {
      console.log(`Starting bulk AI generation for ${needsGeneration.length} reviews`)
      
      const results = []
      const errors = []
      
      // Process reviews one by one using your existing endpoint
      for (let i = 0; i < needsGeneration.length; i++) {
        const review = needsGeneration[i]
        setGenerationProgress({ current: i + 1, total: needsGeneration.length })
        
        try {
          console.log(`Processing review ${i + 1}/${needsGeneration.length} for ${review.locationName}`)
          
          // Use your existing endpoint
          const response = await fetch('/api/ai/generate-review-response', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              review: {
                starRating: review.rating <= 1 ? 'ONE' : 
                           review.rating <= 2 ? 'TWO' : 
                           review.rating <= 3 ? 'THREE' : 
                           review.rating <= 4 ? 'FOUR' : 'FIVE',
                comment: review.text,
                reviewer: { displayName: review.name }
              },
              businessName: review.locationName,
              locationName: review.locationName
            })
          })

          const data = await response.json()
          
          if (data.success) {
            results.push({
              reviewId: review.id,
              response: data.response
            })
            console.log(`✅ Generated response for review ${review.id}`)
            
            // UPDATE: Immediately update the review in the parent state
            // This is a hack but it works for now - we'll dispatch a custom event
            window.dispatchEvent(new CustomEvent('reviewReplyGenerated', {
              detail: { reviewId: review.id, reply: data.response }
            }))
            
          } else {
            errors.push({
              reviewId: review.id,
              error: data.error
            })
            console.error(`❌ Failed to generate response for review ${review.id}:`, data.error)
          }
        } catch (error) {
          console.error(`💥 Error processing review ${review.id}:`, error)
          errors.push({
            reviewId: review.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }

        // Small delay to prevent rate limiting
        if (i < needsGeneration.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
      
      const successCount = results.length
      const errorCount = errors.length
      
      console.log(`✅ Bulk generation completed: ${successCount} successful, ${errorCount} failed`)
      
      // Notify parent component
      if (onBulkGenerate && results.length > 0) {
        const reviewIds = results.map(result => result.reviewId)
        onBulkGenerate(reviewIds)
      }
      
      // Show user feedback
      if (errorCount > 0) {
        console.log(`⚠️ Generated ${successCount} responses. ${errorCount} failed.`)
      } else {
        console.log(`🎉 Successfully generated ${successCount} AI responses!`)
      }
      
      // Don't call onComplete() here - let user decide when to clear selection
      // onComplete()
      
    } catch (error) {
      console.error('Bulk AI response failed:', error)
      alert('Bulk generation failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setLoading(false)
      setGenerationProgress({ current: 0, total: 0 })
    }
  }

  const handleBulkPost = async () => {
    if (readyToPost.length === 0) {
      alert('No generated replies ready to post')
      return
    }

    const confirmPost = confirm(`Are you sure you want to post ${readyToPost.length} AI-generated replies to Google Business Profile? This action cannot be undone.`)
    if (!confirmPost) return

    setIsPosting(true)
    
    try {
      console.log(`Starting bulk posting ${readyToPost.length} replies to Google Business Profile`)
      
      const results = []
      const errors = []
      
      // Post each reply to Google Business Profile
      for (const review of readyToPost) {
        try {
          console.log(`Posting reply for review ${review.id}...`)
          
          const response = await fetch('/api/google/reply-review', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              reviewId: review.id,
              accountId: review.accountId,
              locationId: review.locationId,
              reply: review.pendingReply
            })
          })

          const data = await response.json()
          
          if (data.success) {
            results.push(review.id)
            console.log(`✅ Posted reply for review ${review.id}`)
          } else {
            errors.push({ reviewId: review.id, error: data.error })
            console.error(`❌ Failed to post reply for review ${review.id}:`, data.error)
          }
        } catch (error) {
          errors.push({ reviewId: review.id, error: error instanceof Error ? error.message : 'Unknown error' })
          console.error(`💥 Error posting reply for review ${review.id}:`, error)
        }

        // Small delay between posts to avoid overwhelming Google's API
        await new Promise(resolve => setTimeout(resolve, 1500))
      }
      
      if (onBulkPost && results.length > 0) {
        onBulkPost(results)
      }
      
      // Show results
      if (errors.length > 0) {
        console.error('Bulk posting errors:', errors)
        alert(`Posted ${results.length} replies successfully. ${errors.length} failed. Check console for details.`)
      } else {
        alert(`Successfully posted all ${results.length} replies to Google Business Profile!`)
      }
      
      onComplete()
      
    } catch (error) {
      console.error('💥 Bulk posting failed:', error)
      alert('Bulk posting failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setIsPosting(false)
    }
  }

  return (
    <div className="bg-accent-blue/10 border border-accent-blue/30 rounded-lg p-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <span className="text-dark-text font-medium">
            {selectedCount} review{selectedCount !== 1 ? 's' : ''} selected
          </span>
          <div className="text-sm text-dark-text-muted mt-1">
            {needsGeneration.length > 0 && `${needsGeneration.length} need AI replies`}
            {needsGeneration.length > 0 && readyToPost.length > 0 && ' • '}
            {readyToPost.length > 0 && `${readyToPost.length} ready to post`}
          </div>
        </div>
        
        <div className="flex gap-2 flex-wrap">
          {needsGeneration.length > 0 && (
            <button
              onClick={handleBulkAIResponse}
              disabled={loading}
              className="btn btn-primary btn-sm"
            >
              {loading 
                ? `🤖 Generating... (${generationProgress.current}/${generationProgress.total})` 
                : `🤖 Generate AI Responses (${needsGeneration.length})`
              }
            </button>
          )}

          {readyToPost.length > 0 && (
            <button
              onClick={handleBulkPost}
              disabled={isPosting}
              className="btn btn-success btn-sm"
            >
              {isPosting 
                ? `📤 Posting...` 
                : `📤 Post All Replies (${readyToPost.length})`
              }
            </button>
          )}

          <button
            onClick={onComplete}
            className="btn btn-outline btn-sm"
          >
            ❌ Clear Selection
          </button>
        </div>
      </div>

      {/* Progress indicator */}
      {loading && (
        <div className="mt-3">
          <div className="flex justify-between text-sm text-dark-text-muted mb-1">
            <span>Generating AI responses...</span>
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
    </div>
  )
}