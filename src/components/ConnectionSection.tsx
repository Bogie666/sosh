// src/components/ConnectionSection.tsx
'use client'

import { useState, useEffect } from 'react'
import { signOut } from 'next-auth/react'

interface ConnectionSectionProps {
  session: any
}

interface PlatformStatus {
  connected: boolean
  count: number
  error?: string
  loading?: boolean
}

export default function ConnectionSection({ session }: ConnectionSectionProps) {
  const [connectionStatus, setConnectionStatus] = useState('checking')
  const [message, setMessage] = useState('')
  const [businesses, setBusinesses] = useState([])
  const [requiresReauth, setRequiresReauth] = useState(false)

  // Platform status tracking
  const [platformStatuses, setPlatformStatuses] = useState<Record<string, PlatformStatus>>({
    google: { connected: false, count: 0, loading: true },
    facebook: { connected: false, count: 0, loading: true },
    instagram: { connected: false, count: 0, loading: true },
    twitter: { connected: false, count: 0, loading: true }
  })

  useEffect(() => {
    if (session) {
      checkAllConnections()
    }
  }, [session])

  const checkAllConnections = async () => {
    setConnectionStatus('checking')
    setMessage('Checking all platform connections...')
    
    // Check all platforms simultaneously
    await Promise.all([
      checkGoogleConnection(),
      checkMetaConnection(),
      checkTwitterConnection()
    ])
    
    // Wait a moment for state to update, then check overall status
    setTimeout(() => {
      const currentStatuses = Object.values(platformStatuses)
      const hasAnyConnection = currentStatuses.some(status => status.connected && !status.loading)
      
      setConnectionStatus(hasAnyConnection ? 'connected-with-platforms' : 'no-connections')
      setMessage(hasAnyConnection 
        ? 'Platform connections established' 
        : 'No platform connections found'
      )
    }, 100)
  }

  const checkGoogleConnection = async () => {
    try {
      setPlatformStatuses(prev => ({ ...prev, google: { ...prev.google, loading: true } }))
      
      const response = await fetch('/api/google/locations')
      const data = await response.json()
      
      console.log('Google API response:', data) // Debug log
      
      if (data.success) {
        if (data.locations && data.locations.length > 0) {
          setBusinesses(data.locations)
          console.log(`Google: ${data.locations.length} locations found`) // Debug log
          setPlatformStatuses(prev => ({
            ...prev,
            google: { connected: true, count: data.locations.length, loading: false }
          }))
        } else {
          console.log('Google: No locations found') // Debug log
          setPlatformStatuses(prev => ({
            ...prev,
            google: { connected: true, count: 0, loading: false, error: 'No locations found' }
          }))
        }
        setRequiresReauth(false)
      } else {
        console.log('Google API error:', data.error) // Debug log
        setPlatformStatuses(prev => ({
          ...prev,
          google: { connected: false, count: 0, loading: false, error: data.error }
        }))
        setRequiresReauth(data.requiresReauth || data.requiresAuth || false)
      }
    } catch (error) {
      console.error('Google connection check failed:', error)
      setPlatformStatuses(prev => ({
        ...prev,
        google: { connected: false, count: 0, loading: false, error: 'Connection failed' }
      }))
    }
  }

  const checkMetaConnection = async () => {
    try {
      setPlatformStatuses(prev => ({ 
        ...prev, 
        facebook: { ...prev.facebook, loading: true },
        instagram: { ...prev.instagram, loading: true }
      }))
      
      const response = await fetch('/api/meta/test-connection')
      const data = await response.json()
      
      if (data.success) {
        const pageCount = data.pages?.length || 0
        
        setPlatformStatuses(prev => ({
          ...prev,
          facebook: { connected: true, count: pageCount, loading: false },
          instagram: { connected: true, count: pageCount, loading: false }
        }))
      } else {
        const error = data.error || 'Connection failed'
        setPlatformStatuses(prev => ({
          ...prev,
          facebook: { connected: false, count: 0, loading: false, error },
          instagram: { connected: false, count: 0, loading: false, error }
        }))
      }
    } catch (error) {
      console.error('Meta connection check failed:', error)
      const errorMsg = 'Connection failed'
      setPlatformStatuses(prev => ({
        ...prev,
        facebook: { connected: false, count: 0, loading: false, error: errorMsg },
        instagram: { connected: false, count: 0, loading: false, error: errorMsg }
      }))
    }
  }

  const checkTwitterConnection = async () => {
    try {
      setPlatformStatuses(prev => ({ ...prev, twitter: { ...prev.twitter, loading: true } }))
      
      const response = await fetch('/api/twitter/test-connection')
      const data = await response.json()
      
      if (data.success) {
        const businessCount = data.totalBusinesses || 0
        setPlatformStatuses(prev => ({
          ...prev,
          twitter: { connected: true, count: businessCount, loading: false }
        }))
      } else {
        setPlatformStatuses(prev => ({
          ...prev,
          twitter: { connected: false, count: 0, loading: false, error: data.error || 'Connection failed' }
        }))
      }
    } catch (error) {
      console.error('Twitter connection check failed:', error)
      setPlatformStatuses(prev => ({
        ...prev,
        twitter: { connected: false, count: 0, loading: false, error: 'Connection failed' }
      }))
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut({ 
        callbackUrl: '/auth/signin',
        redirect: true 
      })
    } catch (error) {
      console.error('Sign out failed:', error)
    }
  }

  const handleReconnect = () => {
    handleSignOut()
  }

  const handleRefresh = () => {
    checkAllConnections()
  }

  const getPlatformStatusComponent = (platformId: string, name: string, icon: string) => {
    const status = platformStatuses[platformId]
    
    console.log(`Platform ${platformId} status:`, status) // Debug log
    
    if (status.loading) {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-700/60 border border-slate-600/40">
          <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></div>
          <span className="text-lg">{icon}</span>
          <span className="text-sm font-medium text-yellow-300">Checking...</span>
        </div>
      )
    }
    
    if (status.connected) {
      const displayName = status.count > 0 ? `${name} (${status.count})` : name
      console.log(`${platformId} display name:`, displayName) // Debug log
      
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-700/60 border border-slate-600/40">
          <div className="w-2 h-2 rounded-full bg-green-400 shadow-green-400/50 shadow-sm animate-pulse"></div>
          <span className="text-lg">{icon}</span>
          <span className="text-sm font-medium text-green-300">
            {displayName}
          </span>
        </div>
      )
    }
    
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-700/60 border border-slate-600/40 group relative">
        <div className="w-2 h-2 rounded-full bg-red-400 shadow-red-400/50 shadow-sm"></div>
        <span className="text-lg">{icon}</span>
        <span className="text-sm font-medium text-red-300">{name}</span>
        
        {/* Tooltip with error message */}
        {status.error && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
            {status.error}
          </div>
        )}
      </div>
    )
  }

  if (!session) {
    return (
      <section className="bg-gradient-to-r from-slate-800/80 via-slate-700/80 to-slate-800/80 border border-slate-600/50 rounded-xl p-4 mb-6 backdrop-blur-lg shadow-lg">
        <div className="text-center py-4">
          <h2 className="text-xl font-semibold mb-4 text-dark-text">Connect Your Accounts</h2>
          <p className="text-dark-text-muted">
            Sign in to connect your Google Business Profile and other social media platforms
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="bg-gradient-to-r from-slate-800/80 via-slate-700/80 to-slate-800/80 border border-slate-600/50 rounded-xl p-4 mb-6 backdrop-blur-lg shadow-lg">
      <div className="flex items-center justify-between flex-wrap gap-4">
        
        {/* Left Side - Platform Status */}
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-1">
            <span className="text-sm font-medium text-slate-300 mr-2">Platforms:</span>
            
            {/* Google Business Profile */}
            {getPlatformStatusComponent('google', 'Google', '🏢')}

            {/* Facebook */}
            {getPlatformStatusComponent('facebook', 'Facebook', '📘')}

            {/* Instagram */}
            {getPlatformStatusComponent('instagram', 'Instagram', '📷')}

            {/* X/Twitter */}
            {getPlatformStatusComponent('twitter', 'Twitter', '🐦')}
          </div>
        </div>

        {/* Right Side - Actions */}
        <div className="flex items-center gap-3">
          {/* Status Message */}
          {connectionStatus === 'checking' && (
            <div className="flex items-center gap-2 text-blue-400">
              <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm">Checking...</span>
            </div>
          )}
          
          {connectionStatus === 'no-connections' && 
           Object.values(platformStatuses).every(s => !s.loading && !s.connected) && (
            <div className="flex items-center gap-2 text-red-400">
              <span className="text-sm">❌ No connections</span>
            </div>
          )}

          {connectionStatus === 'connected-with-platforms' && 
           Object.values(platformStatuses).some(s => s.connected) && (
            <div className="flex items-center gap-2 text-green-400">
              <span className="text-sm">✅ Platforms connected</span>
            </div>
          )}

          {/* Quick Stats */}
          <div className="hidden md:block text-xs text-slate-400">
            {Object.values(platformStatuses).filter(s => s.connected).length}/4 platforms
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {requiresReauth ? (
              <button 
                onClick={handleReconnect}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
              >
                🔄 Reconnect
              </button>
            ) : (
              <button 
                onClick={handleRefresh}
                disabled={connectionStatus === 'checking'}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-slate-200 text-sm font-medium rounded-lg transition-colors border border-slate-500 disabled:opacity-50"
              >
                🔄 Refresh
              </button>
            )}
            
            <button 
              onClick={handleSignOut}
              className="flex items-center gap-2 px-3 py-1.5 bg-red-600/80 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
            >
              🚪 Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Expandable Details on Issues */}
      {(connectionStatus === 'no-connections' || Object.values(platformStatuses).some(s => !s.connected && !s.loading)) && (
        <div className="mt-3 pt-3 border-t border-slate-600/30">
          <details className="group">
            <summary className="cursor-pointer text-sm text-slate-400 hover:text-slate-300 transition-colors list-none">
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                Show connection details
              </span>
            </summary>
            <div className="mt-2 text-sm text-slate-400 bg-slate-800/50 rounded-lg p-3 border border-slate-600/30">
              <div className="space-y-2">
                {Object.entries(platformStatuses).map(([platform, status]) => (
                  <div key={platform} className="flex justify-between items-center">
                    <span className="capitalize font-medium">{platform}:</span>
                    <span className={status.connected ? 'text-green-400' : 'text-red-400'}>
                      {status.connected 
                        ? `✅ Connected ${status.count > 0 ? `(${status.count})` : ''}`
                        : `❌ ${status.error || 'Not connected'}`
                      }
                    </span>
                  </div>
                ))}
              </div>
              
              <div className="mt-3 pt-3 border-t border-slate-600/30 text-xs text-slate-500">
                <p>• Google: Requires Business Profile access</p>
                <p>• Facebook/Instagram: Requires Meta API token</p> 
                <p>• Twitter: Requires OAuth 1.0a credentials</p>
              </div>
            </div>
          </details>
        </div>
      )}
    </section>
  )
}