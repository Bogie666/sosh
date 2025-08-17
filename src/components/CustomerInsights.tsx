// src/components/CustomerInsights.tsx
'use client'

import { useState, useEffect } from 'react'
import CollapsibleSection from './CollapsibleSection'

interface InsightData {
  timeframe: string
  totalReviews: number
  averageRating: number
  ratingDistribution: Record<number, number>
  commonPraise: string[]
  commonComplaints: string[]
  keyThemes: Array<{
    theme: string
    sentiment: 'positive' | 'negative' | 'neutral'
    frequency: number
    examples: string[]
  }>
  recommendations: string[]
  generatedAt: string
}

interface Review {
  id: string
  name: string
  rating: number
  text: string
  reply?: string
  locationName: string
  locationId: string
  date: string
}

interface Location {
  id: string
  locationId: string
  locationName: string
  name: string
}

export default function CustomerInsights() {
  const [insights, setInsights] = useState<InsightData | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingReviews, setLoadingReviews] = useState(false)
  const [loadingLocations, setLoadingLocations] = useState(true)
  const [selectedTimeframe, setSelectedTimeframe] = useState('3months')
  const [selectedLocation, setSelectedLocation] = useState('all')

  const timeframes = [
    { value: '1month', label: 'Last Month' },
    { value: '3months', label: 'Last 3 Months' },
    { value: '6months', label: 'Last 6 Months' },
    { value: 'year', label: 'Last Year' }
  ]

  // Load locations when component mounts
  useEffect(() => {
    loadLocations()
  }, [])

  const loadLocations = async () => {
    setLoadingLocations(true)
    try {
      const response = await fetch('/api/google/locations')
      const data = await response.json()
      
      if (data.success && data.locations) {
        setLocations(data.locations)
        console.log('Customer Insights - Loaded locations:', data.locations.length)
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
    setLoadingReviews(true)
    try {
      console.log('Customer Insights - Loading reviews...')
      const response = await fetch('/api/google/reviews')
      const data = await response.json()
      
      if (data.success) {
        setReviews(data.reviews || [])
        console.log('Customer Insights - Successfully loaded reviews:', data.reviews?.length || 0)
      } else {
        console.error('Failed to load reviews:', data.error)
        setReviews([])
      }
    } catch (error) {
      console.error('Failed to fetch reviews:', error)
      setReviews([])
    } finally {
      setLoadingReviews(false)
    }
  }

  const generateInsights = async () => {
    if (reviews.length === 0) {
      alert('Please load reviews first before generating insights')
      return
    }

    setLoading(true)
    try {
      console.log('Generating customer insights...')
      
      const response = await fetch('/api/ai/generate-customer-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timeframe: selectedTimeframe,
          locationId: selectedLocation,
          reviews: reviews
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setInsights(data.insights)
      } else {
        alert(`Failed to generate insights: ${data.error}`)
      }
    } catch (error) {
      console.error('Error generating insights:', error)
      alert('Failed to generate customer insights')
    } finally {
      setLoading(false)
    }
  }

  const getRatingIcon = (rating: number) => {
    if (rating >= 4.5) return '🌟'
    if (rating >= 4.0) return '⭐'
    if (rating >= 3.5) return '🔸'
    if (rating >= 3.0) return '🔶'
    return '🔻'
  }

  return (
    <CollapsibleSection title="📊 Customer Insights" defaultExpanded={false}>
      <div className="space-y-6">
        
        {/* Load Data Section */}
        <div className="bg-slate-800/30 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-dark-text mb-4">📋 Data Collection</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <div className="text-sm text-dark-text-muted mb-2">Business Locations</div>
              <div className="text-lg font-semibold text-accent-blue">
                {loadingLocations ? 'Loading...' : `${locations.length} locations`}
              </div>
            </div>
            
            <div>
              <div className="text-sm text-dark-text-muted mb-2">Reviews Loaded</div>
              <div className="text-lg font-semibold text-accent-green">
                {reviews.length} reviews
              </div>
            </div>
            
            <div>
              <button
                onClick={loadReviews}
                disabled={loadingReviews || loadingLocations}
                className="btn btn-primary w-full"
              >
                {loadingReviews ? '🔄 Loading Reviews...' : '📥 Load Reviews'}
              </button>
            </div>
          </div>
          
          {reviews.length > 0 && (
            <div className="mt-4 text-sm text-dark-text-muted">
              ✅ Reviews loaded from {new Set(reviews.map(r => r.locationName)).size} locations
            </div>
          )}
        </div>

        {/* Analysis Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-dark-text font-medium mb-2">Timeframe</label>
            <select
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value)}
              className="form-control"
            >
              {timeframes.map(tf => (
                <option key={tf.value} value={tf.value}>{tf.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-dark-text font-medium mb-2">Location</label>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="form-control"
            >
              <option value="all">All Locations</option>
              {locations.map(location => (
                <option key={location.id} value={location.locationId}>
                  {location.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={generateInsights}
              disabled={loading || reviews.length === 0}
              className="btn btn-success w-full"
            >
              {loading ? '🤖 Analyzing...' : '🔍 Generate Insights'}
            </button>
          </div>
        </div>

        {/* Insights Display */}
        {insights && (
          <div className="space-y-6">
            
            {/* Overview Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-accent-blue">
                  {insights.totalReviews}
                </div>
                <div className="text-sm text-dark-text-muted">Total Reviews</div>
              </div>
              
              <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-accent-green flex items-center justify-center gap-1">
                  {getRatingIcon(insights.averageRating || 0)}
                  {(insights.averageRating || 0).toFixed(1)}
                </div>
                <div className="text-sm text-dark-text-muted">Average Rating</div>
              </div>

              <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-accent-yellow">
                  {insights.commonPraise.length}
                </div>
                <div className="text-sm text-dark-text-muted">Praise Themes</div>
              </div>

              <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-accent-red">
                  {insights.commonComplaints.length}
                </div>
                <div className="text-sm text-dark-text-muted">Issue Areas</div>
              </div>
            </div>

            {/* Rating Distribution */}
            <div className="bg-slate-800/30 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-dark-text mb-4">⭐ Rating Distribution</h3>
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map(rating => {
                  const count = insights.ratingDistribution[rating] || 0
                  const percentage = insights.totalReviews > 0 ? (count / insights.totalReviews) * 100 : 0
                  
                  return (
                    <div key={rating} className="flex items-center gap-3">
                      <span className="text-sm font-medium w-8">{rating}★</span>
                      <div className="flex-1 bg-gray-700 rounded-full h-3">
                        <div 
                          className={`h-3 rounded-full ${
                            rating >= 4 ? 'bg-green-500' : 
                            rating >= 3 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-dark-text-muted w-12">
                        {count} ({percentage.toFixed(0)}%)
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Common Praise and Complaints */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Praise */}
              <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-green-400 mb-4">✅ What Customers Love</h3>
                <ul className="space-y-2">
                  {insights.commonPraise.map((praise, index) => (
                    <li key={index} className="text-sm text-dark-text flex items-start gap-2">
                      <span className="text-green-400 mt-1">•</span>
                      {praise}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Complaints */}
              <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-red-400 mb-4">⚠️ Areas for Improvement</h3>
                <ul className="space-y-2">
                  {insights.commonComplaints.map((complaint, index) => (
                    <li key={index} className="text-sm text-dark-text flex items-start gap-2">
                      <span className="text-red-400 mt-1">•</span>
                      {complaint}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Key Themes */}
            <div className="bg-slate-800/30 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-dark-text mb-4">🔍 Key Themes</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {insights.keyThemes.map((theme, index) => (
                  <div key={index} className={`p-4 rounded-lg border ${
                    theme.sentiment === 'positive' ? 'bg-green-900/20 border-green-700/30' :
                    theme.sentiment === 'negative' ? 'bg-red-900/20 border-red-700/30' :
                    'bg-gray-900/20 border-gray-700/30'
                  }`}>
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium text-dark-text">{theme.theme}</h4>
                      <span className={`px-2 py-1 text-xs rounded ${
                        theme.sentiment === 'positive' ? 'bg-green-600 text-white' :
                        theme.sentiment === 'negative' ? 'bg-red-600 text-white' :
                        'bg-gray-600 text-white'
                      }`}>
                        {theme.frequency}x
                      </span>
                    </div>
                    <p className="text-xs text-dark-text-muted">
                      {theme.examples[0]?.substring(0, 80)}...
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Recommendations */}
            <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-400 mb-4">🎯 AI Recommendations</h3>
              <ul className="space-y-3">
                {insights.recommendations.map((rec, index) => (
                  <li key={index} className="text-sm text-dark-text flex items-start gap-2">
                    <span className="text-blue-400 mt-1">💡</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>

            {/* Export & Actions */}
            <div className="bg-slate-800/30 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-dark-text mb-4">📤 Export & Actions</h3>
              <div className="flex flex-wrap gap-3">
                <button 
                  onClick={() => navigator.clipboard.writeText(JSON.stringify(insights, null, 2))}
                  className="btn btn-outline btn-sm"
                >
                  📋 Copy Data
                </button>
                <button 
                  onClick={() => window.print()}
                  className="btn btn-outline btn-sm"
                >
                  🖨️ Print Report
                </button>
                <button 
                  onClick={() => setInsights(null)}
                  className="btn btn-outline btn-sm"
                >
                  🗑️ Clear Results
                </button>
              </div>
            </div>

            {/* Metadata */}
            <div className="text-center text-xs text-dark-text-secondary">
              Generated on {new Date(insights.generatedAt).toLocaleString()} • 
              Timeframe: {timeframes.find(tf => tf.value === selectedTimeframe)?.label} • 
              Location: {selectedLocation === 'all' ? 'All Locations' : locations.find(l => l.locationId === selectedLocation)?.name}
            </div>
          </div>
        )}
      </div>
    </CollapsibleSection>
  )
}