#!/bin/bash

# Social Media Manager - Create All Missing Components Script
# This script creates all the missing React/Next.js components based on the original Electron app

echo "🚀 Creating all missing components for Social Media Manager..."

# Create main components directory structure
mkdir -p src/components/{auth,posts,reviews,ui}
mkdir -p src/lib

echo "📁 Directory structure created"

# 1. Create Header.tsx
cat > src/components/Header.tsx << 'EOF'
'use client'

import { useSession, signOut } from 'next-auth/react'
import { useState } from 'react'

export default function Header() {
  const { data: session } = useSession()
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)

  return (
    <header className="flex justify-between items-center bg-dark-card border border-dark-border p-6 rounded-2xl shadow-dark backdrop-blur-lg mb-8">
      <div>
        <h1 className="text-3xl font-bold text-accent-blue">
          🚀 Social Media Manager
        </h1>
        <p className="text-dark-text-muted mt-1">
          AI-powered social media automation
        </p>
      </div>

      <div className="flex items-center gap-4">
        {/* Connection Status */}
        <div className="flex items-center gap-2 text-dark-text-muted">
          <div className="w-3 h-3 rounded-full bg-accent-green animate-pulse"></div>
          <span className="text-sm font-medium">Connected</span>
        </div>

        {/* User Menu */}
        {session && (
          <div className="relative">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 p-2 rounded-lg border border-dark-border hover:bg-slate-700/50 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-blue flex items-center justify-center text-white font-semibold text-sm">
                {session.user?.name?.charAt(0) || 'U'}
              </div>
              <span className="text-dark-text text-sm hidden md:block">
                {session.user?.name || 'User'}
              </span>
            </button>

            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-dark-card border border-dark-border rounded-lg shadow-lg py-1 z-50">
                <div className="px-3 py-2 border-b border-dark-border">
                  <p className="text-sm font-medium text-dark-text truncate">
                    {session.user?.name}
                  </p>
                  <p className="text-xs text-dark-text-muted truncate">
                    {session.user?.email}
                  </p>
                </div>
                
                <button
                  onClick={() => signOut()}
                  className="w-full text-left px-3 py-2 text-sm text-dark-text hover:bg-slate-700/50 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
EOF

# 2. Create ConnectionSection.tsx
cat > src/components/ConnectionSection.tsx << 'EOF'
'use client'

import { useState, useEffect } from 'react'

interface ConnectionSectionProps {
  session: any
}

export default function ConnectionSection({ session }: ConnectionSectionProps) {
  const [connectionStatus, setConnectionStatus] = useState('checking')
  const [businesses, setBusinesses] = useState([])

  useEffect(() => {
    checkConnection()
  }, [])

  const checkConnection = async () => {
    try {
      const response = await fetch('/api/google/locations')
      const data = await response.json()
      
      if (data.success && data.locations?.length > 0) {
        setConnectionStatus('connected')
        setBusinesses(data.locations)
      } else {
        setConnectionStatus('disconnected')
      }
    } catch (error) {
      console.error('Connection check failed:', error)
      setConnectionStatus('disconnected')
    }
  }

  if (connectionStatus === 'connected') {
    return (
      <section className="card">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-accent-green">✅ Connected to Google Business Profile</h2>
            <p className="text-dark-text-muted mt-2">
              Managing {businesses.length} business location{businesses.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button 
            onClick={checkConnection}
            className="btn btn-outline btn-sm"
          >
            🔄 Refresh
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {businesses.map((business: any, index: number) => (
            <div key={index} className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-accent-green"></div>
              <span className="text-dark-text">{business.name}</span>
              <span className="text-dark-text-secondary text-sm">({business.address})</span>
            </div>
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className="card">
      <h2 className="text-xl font-semibold mb-4">Connect Your Google Business Profile</h2>
      <p className="text-dark-text-muted mb-6">
        Connect your Google account to manage your business locations and reviews
      </p>
      
      <div className="flex items-center gap-4">
        <button 
          onClick={checkConnection}
          className="btn btn-primary"
          disabled={connectionStatus === 'checking'}
        >
          {connectionStatus === 'checking' ? '🔄 Checking...' : '🔗 Connect Google Account'}
        </button>
        
        {connectionStatus === 'checking' && (
          <div className="flex items-center gap-2 text-dark-text-muted">
            <div className="w-4 h-4 border-2 border-accent-blue border-t-transparent rounded-full animate-spin"></div>
            <span>Checking connection...</span>
          </div>
        )}
      </div>
    </section>
  )
}
EOF

# 3. Create ReviewManagement.tsx
cat > src/components/ReviewManagement.tsx << 'EOF'
'use client'

import { useState, useEffect } from 'react'
import CollapsibleSection from './ui/CollapsibleSection'
import ReviewItem from './reviews/ReviewItem'
import ReviewFilters from './reviews/ReviewFilters'
import BulkActions from './reviews/BulkActions'

export default function ReviewManagement() {
  const [reviews, setReviews] = useState([])
  const [filteredReviews, setFilteredReviews] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedReviews, setSelectedReviews] = useState(new Set())
  const [filters, setFilters] = useState({
    location: 'all',
    status: 'all'
  })

  useEffect(() => {
    loadReviews()
  }, [])

  useEffect(() => {
    filterReviews()
  }, [reviews, filters])

  const loadReviews = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/google/reviews')
      const data = await response.json()
      
      if (data.success) {
        setReviews(data.reviews || [])
      }
    } catch (error) {
      console.error('Failed to load reviews:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterReviews = () => {
    let filtered = [...reviews]
    
    if (filters.location !== 'all') {
      filtered = filtered.filter(review => review.locationId === filters.location)
    }
    
    if (filters.status !== 'all') {
      filtered = filtered.filter(review => {
        switch (filters.status) {
          case 'unresponded':
            return !review.reply
          case 'negative':
            return review.rating <= 3
          case 'positive':
            return review.rating >= 4
          case 'urgent':
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

  return (
    <CollapsibleSection title="📝 Review Management" defaultExpanded={true}>
      <div className="space-y-6">
        {/* Controls */}
        <div className="flex flex-wrap gap-4 items-center">
          <button 
            onClick={loadReviews}
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? '🔄 Loading...' : '🔄 Refresh Reviews'}
          </button>
          
          <ReviewFilters 
            filters={filters}
            onFiltersChange={setFilters}
            reviews={reviews}
          />
        </div>

        {/* Bulk Actions */}
        {selectedReviews.size > 0 && (
          <BulkActions 
            selectedCount={selectedReviews.size}
            selectedReviews={selectedReviews}
            onComplete={() => {
              setSelectedReviews(new Set())
              loadReviews()
            }}
          />
        )}

        {/* Reviews List */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-accent-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-dark-text-muted">Loading reviews...</p>
            </div>
          ) : filteredReviews.length > 0 ? (
            <>
              {/* Select All */}
              <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
                <input
                  type="checkbox"
                  checked={selectedReviews.size === filteredReviews.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="w-4 h-4 text-accent-blue bg-gray-800 border-gray-600 rounded focus:ring-accent-blue"
                />
                <span className="text-dark-text-muted">
                  Select all ({filteredReviews.length} reviews)
                </span>
              </div>
              
              {/* Reviews */}
              {filteredReviews.map((review) => (
                <ReviewItem
                  key={review.id}
                  review={review}
                  selected={selectedReviews.has(review.id)}
                  onSelect={handleSelectReview}
                />
              ))}
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-dark-text-muted">No reviews found matching your filters</p>
            </div>
          )}
        </div>
      </div>
    </CollapsibleSection>
  )
}
EOF

# 4. Create ContentCalendar.tsx
cat > src/components/ContentCalendar.tsx << 'EOF'
'use client'

import { useState, useEffect } from 'react'
import CollapsibleSection from './ui/CollapsibleSection'

export default function ContentCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [monthlySpecials, setMonthlySpecials] = useState({})
  const [loading, setLoading] = useState(false)

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const departments = ['service', 'parts', 'sales']

  useEffect(() => {
    loadMonthData(currentMonth)
  }, [currentMonth])

  const loadMonthData = async (monthIndex: number) => {
    // Load monthly specials data (this would come from your API)
    const defaultData = {
      service: [
        'Oil Change Special - $29.99',
        'Brake Inspection - FREE with service',
        'Tire Rotation - $19.99'
      ],
      parts: [
        'Genuine Parts - 10% off',
        'Battery Special - $99 installed',
        'Filter Replacement - 20% off'
      ],
      sales: [
        'New Vehicle Incentives',
        'Certified Pre-Owned Special',
        'Trade-in Bonus - Extra $500'
      ]
    }
    
    setMonthlySpecials(prev => ({
      ...prev,
      [monthIndex]: defaultData
    }))
  }

  const generateContent = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/ai/generate-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: months[currentMonth],
          specials: monthlySpecials[currentMonth] || {}
        })
      })
      
      const data = await response.json()
      if (data.success) {
        // Handle generated content
        console.log('Content generated:', data.content)
      }
    } catch (error) {
      console.error('Content generation failed:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <CollapsibleSection title="📅 Content Calendar" defaultExpanded={false}>
      <div className="space-y-6">
        {/* Month Selector */}
        <div className="flex items-center gap-4">
          <label className="text-dark-text font-medium">Month:</label>
          <select 
            value={currentMonth}
            onChange={(e) => setCurrentMonth(parseInt(e.target.value))}
            className="form-control max-w-xs"
          >
            {months.map((month, index) => (
              <option key={index} value={index}>{month}</option>
            ))}
          </select>
        </div>

        {/* Monthly Specials */}
        <div className="grid gap-6 lg:grid-cols-3">
          {departments.map(dept => (
            <div key={dept} className="bg-slate-800/50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-accent-blue capitalize mb-4">
                {dept} Specials
              </h3>
              
              <div className="space-y-3">
                {monthlySpecials[currentMonth]?.[dept]?.map((special: string, index: number) => (
                  <div key={index} className="p-3 bg-gray-700/50 rounded-lg">
                    <textarea
                      value={special}
                      onChange={(e) => {
                        const newSpecials = { ...monthlySpecials }
                        if (!newSpecials[currentMonth]) newSpecials[currentMonth] = {}
                        if (!newSpecials[currentMonth][dept]) newSpecials[currentMonth][dept] = []
                        newSpecials[currentMonth][dept][index] = e.target.value
                        setMonthlySpecials(newSpecials)
                      }}
                      className="w-full bg-transparent border-none text-dark-text text-sm resize-none focus:outline-none"
                      rows={2}
                    />
                  </div>
                )) || []}
                
                <button 
                  onClick={() => {
                    const newSpecials = { ...monthlySpecials }
                    if (!newSpecials[currentMonth]) newSpecials[currentMonth] = {}
                    if (!newSpecials[currentMonth][dept]) newSpecials[currentMonth][dept] = []
                    newSpecials[currentMonth][dept].push('New special...')
                    setMonthlySpecials(newSpecials)
                  }}
                  className="w-full p-2 border-2 border-dashed border-gray-600 rounded-lg text-dark-text-muted hover:border-accent-blue hover:text-accent-blue transition-colors"
                >
                  + Add Special
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Generate Content Button */}
        <div className="flex justify-center">
          <button 
            onClick={generateContent}
            disabled={loading}
            className="btn btn-success"
          >
            {loading ? '🤖 Generating...' : '🤖 Generate This Month\'s Content'}
          </button>
        </div>
      </div>
    </CollapsibleSection>
  )
}
EOF

# 5. Create PlatformManagement.tsx
cat > src/components/PlatformManagement.tsx << 'EOF'
'use client'

import { useState, useEffect } from 'react'
import CollapsibleSection from './ui/CollapsibleSection'

export default function PlatformManagement() {
  const [platforms, setPlatforms] = useState({
    meta: { connected: false, pages: [] },
    twitter: { connected: false, accounts: [] }
  })

  const [loading, setLoading] = useState({
    meta: false,
    twitter: false
  })

  const testMetaConnection = async () => {
    setLoading(prev => ({ ...prev, meta: true }))
    try {
      const response = await fetch('/api/meta/test-connection')
      const data = await response.json()
      
      setPlatforms(prev => ({
        ...prev,
        meta: { connected: data.success, pages: data.pages || [] }
      }))
    } catch (error) {
      console.error('Meta connection test failed:', error)
    } finally {
      setLoading(prev => ({ ...prev, meta: false }))
    }
  }

  const testTwitterConnection = async () => {
    setLoading(prev => ({ ...prev, twitter: true }))
    try {
      const response = await fetch('/api/twitter/test-connection')
      const data = await response.json()
      
      setPlatforms(prev => ({
        ...prev,
        twitter: { connected: data.success, accounts: data.accounts || [] }
      }))
    } catch (error) {
      console.error('Twitter connection test failed:', error)
    } finally {
      setLoading(prev => ({ ...prev, twitter: false }))
    }
  }

  return (
    <CollapsibleSection title="🔗 Platform Management" defaultExpanded={false}>
      <div className="space-y-8">
        {/* Meta (Facebook/Instagram) */}
        <div className="border-l-4 border-blue-500 pl-6">
          <h3 className="text-lg font-semibold text-accent-blue mb-4">📘 Meta (Facebook/Instagram)</h3>
          
          <div className="flex flex-wrap gap-4 mb-4">
            <button 
              onClick={testMetaConnection}
              disabled={loading.meta}
              className="btn btn-outline"
            >
              {loading.meta ? '🔄 Testing...' : '🧪 Test Connection'}
            </button>
            
            <button className="btn btn-primary">
              📄 Load Pages
            </button>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-4">
            <h4 className="font-medium text-dark-text mb-2">Status:</h4>
            <p className="text-dark-text-muted">
              {platforms.meta.connected ? 
                `✅ Connected - ${platforms.meta.pages.length} pages found` : 
                '❌ Not connected'
              }
            </p>
          </div>
        </div>

        {/* X/Twitter */}
        <div className="border-l-4 border-sky-500 pl-6">
          <h3 className="text-lg font-semibold text-sky-400 mb-4">🐦 X/Twitter</h3>
          
          <div className="flex flex-wrap gap-4 mb-4">
            <button 
              onClick={testTwitterConnection}
              disabled={loading.twitter}
              className="btn btn-outline"
            >
              {loading.twitter ? '🔄 Testing...' : '🧪 Test Connection'}
            </button>
            
            <button className="btn btn-primary">
              🔐 Authenticate
            </button>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-4">
            <h4 className="font-medium text-dark-text mb-2">Status:</h4>
            <p className="text-dark-text-muted">
              {platforms.twitter.connected ? 
                '✅ Connected and ready for posting' : 
                '❌ Not connected'
              }
            </p>
          </div>
        </div>
      </div>
    </CollapsibleSection>
  )
}
EOF

# 6. Create ActivityLog.tsx
cat > src/components/ActivityLog.tsx << 'EOF'
'use client'

import { useState, useEffect } from 'react'

interface ActivityItem {
  id: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  timestamp: Date
}

export default function ActivityLog() {
  const [activities, setActivities] = useState<ActivityItem[]>([])

  const addActivity = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const newActivity: ActivityItem = {
      id: Date.now().toString(),
      message,
      type,
      timestamp: new Date()
    }
    
    setActivities(prev => [newActivity, ...prev.slice(0, 9)]) // Keep only last 10
  }

  // Expose addActivity function globally for other components to use
  useEffect(() => {
    (window as any).addActivityLog = addActivity
    
    // Add initial activity
    addActivity('🚀 Social Media Manager initialized', 'success')
    
    return () => {
      delete (window as any).addActivityLog
    }
  }, [])

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'success': return '✅'
      case 'warning': return '⚠️'
      case 'error': return '❌'
      default: return 'ℹ️'
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'success': return 'text-accent-green'
      case 'warning': return 'text-accent-yellow'
      case 'error': return 'text-accent-red'
      default: return 'text-accent-blue'
    }
  }

  return (
    <section className="card">
      <h2 className="text-xl font-semibold mb-6">Recent Activity</h2>
      
      <div className="space-y-3 max-h-80 overflow-y-auto">
        {activities.length > 0 ? (
          activities.map((activity) => (
            <div 
              key={activity.id}
              className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg"
            >
              <span className="text-lg">{getActivityIcon(activity.type)}</span>
              <div className="flex-1">
                <p className={`text-sm ${getActivityColor(activity.type)}`}>
                  {activity.message}
                </p>
                <p className="text-xs text-dark-text-secondary mt-1">
                  {activity.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <p className="text-dark-text-muted">No recent activity</p>
          </div>
        )}
      </div>
    </section>
  )
}
EOF

# 7. Create auth/SignInForm.tsx
cat > src/components/auth/SignInForm.tsx << 'EOF'
'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'

export default function SignInForm() {
  const [loading, setLoading] = useState(false)

  const handleSignIn = async () => {
    setLoading(true)
    try {
      await signIn('google', { callbackUrl: '/' })
    } catch (error) {
      console.error('Sign in failed:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-dark">
      <div className="bg-dark-card border border-dark-border rounded-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-accent-blue mb-2">
            🚀 Social Media Manager
          </h1>
          <p className="text-dark-text-muted">
            AI-powered social media automation
          </p>
        </div>

        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-dark-text mb-2">
              Welcome Back
            </h2>
            <p className="text-dark-text-muted">
              Sign in with your Google Workspace account to continue
            </p>
          </div>

          <button
            onClick={handleSignIn}
            disabled={loading}
            className="w-full btn btn-primary flex items-center justify-center gap-3 py-4"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Signing in...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </>
            )}
          </button>

          <div className="text-center text-xs text-dark-text-secondary">
            <p>
              By signing in, you agree to connect your Google Business Profile
              for managing reviews and social media automation.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
EOF

# 8. Create reviews/ReviewItem.tsx
cat > src/components/reviews/ReviewItem.tsx << 'EOF'
'use client'

import { useState } from 'react'

interface Review {
  id: string
  name: string
  rating: number
  text: string
  reply?: string
  locationName: string
  date: string
}

interface ReviewItemProps {
  review: Review
  selected: boolean
  onSelect: (id: string, selected: boolean) => void
}

export default function ReviewItem({ review, selected, onSelect }: ReviewItemProps) {
  const [replyText, setReplyText] = useState(review.reply || '')
  const [replying, setReplying] = useState(false)

  const handleReply = async () => {
    if (!replyText.trim()) return
    
    setReplying(true)
    try {
      const response = await fetch('/api/google/reply-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewId: review.id,
          reply: replyText
        })
      })
      
      const data = await response.json()
      if (data.success) {
        // Update review with reply
        console.log('Reply sent successfully')
      }
    } catch (error) {
      console.error('Failed to send reply:', error)
    } finally {
      setReplying(false)
    }
  }

  const generateAIReply = async () => {
    setReplying(true)
    try {
      const response = await fetch('/api/ai/generate-review-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewText: review.text,
          rating: review.rating,
          businessName: review.locationName
        })
      })
      
      const data = await response.json()
      if (data.success) {
        setReplyText(data.reply)
      }
    } catch (error) {
      console.error('Failed to generate AI reply:', error)
    } finally {
      setReplying(false)
    }
  }

  const getRatingStars = (rating: number) => {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating)
  }

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return 'text-accent-green'
    if (rating >= 3) return 'text-accent-yellow'
    return 'text-accent-red'
  }

  return (
    <div className={`border rounded-lg p-4 transition-all ${
      selected ? 'border-accent-blue bg-slate-800/50' : 'border-dark-border bg-slate-800/20'
    }`}>
      {/* Review Header */}
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
            <div className="flex items-center gap-2">
              <span className={`${getRatingColor(review.rating)}`}>
                {getRatingStars(review.rating)}
              </span>
              <span className="text-dark-text-secondary text-sm">
                {review.locationName}
              </span>
            </div>
          </div>
        </div>
        
        <span className="text-xs text-dark-text-secondary">
          {new Date(review.date).toLocaleDateString()}
        </span>
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
              disabled={replying}
              className="btn btn-outline btn-sm"
            >
              {replying ? '🤖 Generating...' : '🤖 Generate AI Reply'}
            </button>
            
            <button
              onClick={handleReply}
              disabled={replying || !replyText.trim()}
              className="btn btn-primary btn-sm"
            >
              📤 Send Reply
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
EOF

# 9. Create reviews/ReviewFilters.tsx
cat > src/components/reviews/ReviewFilters.tsx << 'EOF'
'use client'

interface ReviewFiltersProps {
  filters: {
    location: string
    status: string
  }
  onFiltersChange: (filters: any) => void
  reviews: any[]
}

export default function ReviewFilters({ filters, onFiltersChange, reviews }: ReviewFiltersProps) {
  const locations = Array.from(new Set(reviews.map(r => r.locationName)))

  return (
    <div className="flex flex-wrap gap-3">
      <select
        value={filters.location}
        onChange={(e) => onFiltersChange({ ...filters, location: e.target.value })}
        className="form-control max-w-xs"
      >
        <option value="all">All Locations</option>
        {locations.map(location => (
          <option key={location} value={location}>{location}</option>
        ))}
      </select>

      <select
        value={filters.status}
        onChange={(e) => onFiltersChange({ ...filters, status: e.target.value })}
        className="form-control max-w-xs"
      >
        <option value="all">All Reviews</option>
        <option value="unresponded">Needs Response</option>
        <option value="negative">Negative Reviews</option>
        <option value="positive">Positive Reviews</option>
        <option value="urgent">Urgent Priority</option>
      </select>
    </div>
  )
}
EOF

# 10. Create reviews/BulkActions.tsx
cat > src/components/reviews/BulkActions.tsx << 'EOF'
'use client'

import { useState } from 'react'

interface BulkActionsProps {
  selectedCount: number
  selectedReviews: Set<string>
  onComplete: () => void
}

export default function BulkActions({ selectedCount, selectedReviews, onComplete }: BulkActionsProps) {
  const [loading, setLoading] = useState(false)

  const handleBulkAIResponse = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/ai/bulk-review-responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewIds: Array.from(selectedReviews)
        })
      })
      
      const data = await response.json()
      if (data.success) {
        onComplete()
      }
    } catch (error) {
      console.error('Bulk AI response failed:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-accent-blue/10 border border-accent-blue/30 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <span className="text-dark-text font-medium">
          {selectedCount} review{selectedCount !== 1 ? 's' : ''} selected
        </span>
        
        <div className="flex gap-2">
          <button
            onClick={handleBulkAIResponse}
            disabled={loading}
            className="btn btn-primary btn-sm"
          >
            {loading ? '🤖 Generating...' : '🤖 Generate AI Responses'}
          </button>
        </div>
      </div>
    </div>
  )
}
EOF

echo "✅ All main components created!"

# 11. Create missing posts components
echo "📝 Creating posts components..."

# ContentGenerator.tsx
cat > src/components/posts/ContentGenerator.tsx << 'EOF'
'use client'

import { useState } from 'react'

export default function ContentGenerator() {
  const [prompt, setPrompt] = useState('')
  const [generatedContent, setGeneratedContent] = useState('')
  const [loading, setLoading] = useState(false)

  const generateContent = async () => {
    if (!prompt.trim()) return
    
    setLoading(true)
    try {
      const response = await fetch('/api/ai/generate-custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      })
      
      const data = await response.json()
      if (data.success) {
        setGeneratedContent(data.content)
      }
    } catch (error) {
      console.error('Content generation failed:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-dark-text font-medium mb-2">
          Content Prompt
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the content you want to generate..."
          className="form-control"
          rows={3}
        />
      </div>

      <button
        onClick={generateContent}
        disabled={loading || !prompt.trim()}
        className="btn btn-primary"
      >
        {loading ? '🤖 Generating...' : '🤖 Generate Content'}
      </button>

      {generatedContent && (
        <div className="bg-slate-800/50 rounded-lg p-4">
          <h3 className="text-dark-text font-medium mb-2">Generated Content:</h3>
          <p className="text-dark-text-muted whitespace-pre-wrap">{generatedContent}</p>
        </div>
      )}
    </div>
  )
}
EOF

# PlatformSelector.tsx
cat > src/components/posts/PlatformSelector.tsx << 'EOF'
'use client'

import { useState } from 'react'

interface PlatformSelectorProps {
  selectedPlatforms: string[]
  onPlatformsChange: (platforms: string[]) => void
}

export default function PlatformSelector({ selectedPlatforms, onPlatformsChange }: PlatformSelectorProps) {
  const platforms = [
    { id: 'google', name: 'Google Business Profile', icon: '🏢', color: 'text-blue-400' },
    { id: 'facebook', name: 'Facebook', icon: '📘', color: 'text-blue-600' },
    { id: 'instagram', name: 'Instagram', icon: '📷', color: 'text-pink-500' },
    { id: 'twitter', name: 'X/Twitter', icon: '🐦', color: 'text-sky-400' }
  ]

  const togglePlatform = (platformId: string) => {
    if (selectedPlatforms.includes(platformId)) {
      onPlatformsChange(selectedPlatforms.filter(p => p !== platformId))
    } else {
      onPlatformsChange([...selectedPlatforms, platformId])
    }
  }

  return (
    <div>
      <label className="block text-dark-text font-medium mb-3">
        Select Platforms
      </label>
      
      <div className="grid grid-cols-2 gap-3">
        {platforms.map(platform => (
          <button
            key={platform.id}
            onClick={() => togglePlatform(platform.id)}
            className={`p-3 rounded-lg border-2 transition-all text-left ${
              selectedPlatforms.includes(platform.id)
                ? 'border-accent-blue bg-accent-blue/10'
                : 'border-dark-border hover:border-gray-500'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{platform.icon}</span>
              <span className={`text-sm font-medium ${
                selectedPlatforms.includes(platform.id) ? 'text-dark-text' : 'text-dark-text-muted'
              }`}>
                {platform.name}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
EOF

# BusinessSelector.tsx
cat > src/components/posts/BusinessSelector.tsx << 'EOF'
'use client'

interface BusinessSelectorProps {
  selectedBusiness: string
  onBusinessChange: (business: string) => void
  businesses: string[]
}

export default function BusinessSelector({ selectedBusiness, onBusinessChange, businesses }: BusinessSelectorProps) {
  return (
    <div>
      <label className="block text-dark-text font-medium mb-2">
        Business Location
      </label>
      <select
        value={selectedBusiness}
        onChange={(e) => onBusinessChange(e.target.value)}
        className="form-control"
      >
        <option value="">Select a business...</option>
        {businesses.map(business => (
          <option key={business} value={business}>{business}</option>
        ))}
      </select>
    </div>
  )
}
EOF

# PostScheduler.tsx
cat > src/components/posts/PostScheduler.tsx << 'EOF'
'use client'

import { useState } from 'react'

interface PostSchedulerProps {
  onSchedule: (date: Date) => void
}

export default function PostScheduler({ onSchedule }: PostSchedulerProps) {
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('')

  const handleSchedule = () => {
    if (scheduleDate && scheduleTime) {
      const date = new Date(`${scheduleDate}T${scheduleTime}`)
      onSchedule(date)
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-dark-text font-medium">Schedule Post</h3>
      
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-dark-text-muted text-sm mb-1">Date</label>
          <input
            type="date"
            value={scheduleDate}
            onChange={(e) => setScheduleDate(e.target.value)}
            className="form-control"
            min={new Date().toISOString().split('T')[0]}
          />
        </div>
        
        <div>
          <label className="block text-dark-text-muted text-sm mb-1">Time</label>
          <input
            type="time"
            value={scheduleTime}
            onChange={(e) => setScheduleTime(e.target.value)}
            className="form-control"
          />
        </div>
      </div>

      <button
        onClick={handleSchedule}
        disabled={!scheduleDate || !scheduleTime}
        className="btn btn-secondary btn-sm"
      >
        📅 Schedule Post
      </button>
    </div>
  )
}
EOF

# PostPreview.tsx
cat > src/components/posts/PostPreview.tsx << 'EOF'
'use client'

interface PostPreviewProps {
  content: string
  platforms: string[]
  business: string
}

export default function PostPreview({ content, platforms, business }: PostPreviewProps) {
  if (!content) return null

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'google': return '🏢'
      case 'facebook': return '📘'
      case 'instagram': return '��'
      case 'twitter': return '🐦'
      default: return '📱'
    }
  }

  return (
    <div className="bg-slate-800/50 rounded-lg p-4">
      <h3 className="text-dark-text font-medium mb-3">📋 Post Preview</h3>
      
      {/* Business and Platforms */}
      <div className="mb-4">
        <p className="text-dark-text-muted text-sm mb-2">
          <strong>Business:</strong> {business || 'Not selected'}
        </p>
        <div className="flex gap-2">
          {platforms.map(platform => (
            <span 
              key={platform}
              className="inline-flex items-center gap-1 px-2 py-1 bg-accent-blue/20 text-accent-blue rounded text-xs"
            >
              {getPlatformIcon(platform)}
              {platform}
            </span>
          ))}
        </div>
      </div>

      {/* Content Preview */}
      <div className="bg-gray-900/50 rounded-lg p-3 border-l-4 border-accent-blue">
        <p className="text-dark-text text-sm whitespace-pre-wrap">{content}</p>
      </div>
      
      <div className="mt-3 text-xs text-dark-text-secondary">
        Character count: {content.length}
      </div>
    </div>
  )
}
EOF

echo "✅ All post components created!"

# 12. Create lib files
echo "📚 Creating library files..."

# ai-service.ts (based on the original ai-service.js)
cat > src/lib/ai-service.ts << 'EOF'
interface GenerateContentOptions {
  type: 'template' | 'custom' | 'review-response'
  prompt?: string
  reviewText?: string
  rating?: number
  businessName?: string
  month?: string
  specials?: any
}

export class AIService {
  private apiKey: string

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || ''
  }

  async generateContent(options: GenerateContentOptions): Promise<string> {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: this.buildMessages(options),
          max_tokens: 500,
          temperature: 0.7
        })
      })

      const data = await response.json()
      return data.choices[0]?.message?.content || ''
    } catch (error) {
      console.error('AI generation failed:', error)
      throw error
    }
  }

  private buildMessages(options: GenerateContentOptions) {
    switch (options.type) {
      case 'review-response':
        return [
          {
            role: 'system',
            content: 'You are a professional customer service representative. Generate appropriate, helpful responses to customer reviews.'
          },
          {
            role: 'user',
            content: `Generate a professional response to this ${options.rating}-star review for ${options.businessName}: "${options.reviewText}"`
          }
        ]
      
      case 'template':
        return [
          {
            role: 'system',
            content: 'You are a social media content creator for automotive businesses. Create engaging, professional social media posts.'
          },
          {
            role: 'user',
            content: `Create social media content for ${options.month} featuring these specials: ${JSON.stringify(options.specials)}`
          }
        ]
      
      default:
        return [
          {
            role: 'system',
            content: 'You are a social media content creator. Generate engaging social media posts.'
          },
          {
            role: 'user',
            content: options.prompt || 'Create a social media post'
          }
        ]
    }
  }
}

export const aiService = new AIService()
EOF

echo "✅ Library files created!"

# 13. Make the script executable and run permission fixes
chmod +x "$0"

echo ""
echo "🎉 All missing components have been created!"
echo ""
echo "📁 Created components:"
echo "   ├── Header.tsx"
echo "   ├── ConnectionSection.tsx" 
echo "   ├── ReviewManagement.tsx"
echo "   ├── ContentCalendar.tsx"
echo "   ├── PlatformManagement.tsx"
echo "   ├── ActivityLog.tsx"
echo "   ├── auth/SignInForm.tsx"
echo "   ├── reviews/ReviewItem.tsx"
echo "   ├── reviews/ReviewFilters.tsx"
echo "   ├── reviews/BulkActions.tsx"
echo "   └── posts/"
echo "       ├── ContentGenerator.tsx"
echo "       ├── PlatformSelector.tsx"
echo "       ├── BusinessSelector.tsx"
echo "       ├── PostScheduler.tsx"
echo "       └── PostPreview.tsx"
echo "   └── lib/ai-service.ts"
echo ""
echo "🚀 Next steps:"
echo "   1. Run: npm run dev"
echo "   2. Check for any remaining import errors"
echo "   3. Set up your .env.local file with API keys"
echo "   4. Test the application at http://localhost:3000"
echo ""
echo "✨ Your Social Media Manager should now have all required components!"
EOF
