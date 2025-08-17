// src/components/settings/EvergreenSetup.tsx
'use client'

import { useState, useEffect } from 'react'

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

export default function EvergreenSetup() {
  const [status, setStatus] = useState<EvergreenStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [setting, setSetting] = useState(false)
  const [result, setResult] = useState<any>(null)

  useEffect(() => {
    checkStatus()
  }, [])

  const checkStatus = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/setup/evergreen-blocks')
      const data = await response.json()
      
      if (data.success) {
        setStatus(data.summary)
      }
    } catch (error) {
      console.error('Failed to check evergreen status:', error)
    } finally {
      setLoading(false)
    }
  }

  const setupEvergreenBlocks = async () => {
    setSetting(true)
    setResult(null)
    
    try {
      const response = await fetch('/api/setup/evergreen-blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      const data = await response.json()
      setResult(data)
      
      if (data.success) {
        await checkStatus() // Refresh status
      }
    } catch (error) {
      console.error('Setup failed:', error)
      setResult({
        success: false,
        error: 'Setup request failed'
      })
    } finally {
      setSetting(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-600/50">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-400"></div>
          <span className="text-dark-text">Checking evergreen content blocks...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-600/50">
      <h3 className="text-xl font-semibold text-dark-text mb-4">🌲 Evergreen Content Blocks</h3>
      
      {/* Current Status */}
      {status && (
        <div className="mb-6 p-4 bg-slate-900/50 rounded-lg">
          <h4 className="font-medium text-dark-text mb-3">📊 Current Status</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-dark-text-muted">Total Evergreen Blocks</div>
              <div className="text-lg font-semibold text-green-400">{status.totalEvergreen}</div>
            </div>
            <div>
              <div className="text-dark-text-muted">Businesses Setup</div>
              <div className="text-lg font-semibold text-blue-400">
                {status.businesses.filter(b => b.hasSetup).length}/{status.businesses.length}
              </div>
            </div>
            <div>
              <div className="text-dark-text-muted">Status</div>
              <div className={`text-lg font-semibold ${status.isSetup ? 'text-green-400' : 'text-yellow-400'}`}>
                {status.isSetup ? 'Complete' : 'Needs Setup'}
              </div>
            </div>
          </div>
          
          {status.businesses.length > 0 && (
            <div className="mt-4">
              <h5 className="text-sm font-medium text-dark-text-muted mb-2">By Business:</h5>
              <div className="space-y-1">
                {status.businesses.map(business => (
                  <div key={business.businessId} className="flex justify-between text-sm">
                    <span className="text-dark-text">{business.businessName}</span>
                    <span className={business.hasSetup ? 'text-green-400' : 'text-yellow-400'}>
                      {business.evergreenBlocks} blocks
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Setup Section */}
      <div className="space-y-4">
        {!status?.isSetup ? (
          <div>
            <h4 className="font-medium text-dark-text mb-2">🚀 Setup Evergreen Content Blocks</h4>
            <p className="text-sm text-dark-text-muted mb-4">
              Create powerful evergreen content blocks that work year-round:
            </p>
            <ul className="text-sm text-dark-text-muted mb-4 space-y-1 ml-4">
              <li>• 💳 Financing Options (0% financing, payment plans)</li>
              <li>• 🎯 Evergreen Discounts (filter discount, free estimates)</li>
              <li>• ✅ Service Guarantees (satisfaction, warranty)</li>
              <li>• 🎪 Membership Programs (Cool Club, maintenance plans)</li>
              <li>• ⚡ Service Features (24/7 emergency, same day service)</li>
              <li>• 💻 Digital Convenience (online booking, upfront pricing)</li>
              <li>• ⭐ Trust Indicators (BBB rating, Google reviews)</li>
              <li>• 🏷️ Business-Specific Taglines</li>
            </ul>
            
            <button
              onClick={setupEvergreenBlocks}
              disabled={setting}
              className="btn btn-success"
            >
              {setting ? '🌲 Creating Blocks...' : '🌲 Create Evergreen Blocks'}
            </button>
          </div>
        ) : (
          <div className="p-4 bg-green-400/10 border border-green-400/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-green-400 text-lg">✅</span>
              <h4 className="font-medium text-green-400">Evergreen Blocks Setup Complete</h4>
            </div>
            <p className="text-sm text-dark-text-muted mb-2">
              Your businesses now have powerful evergreen content blocks! These will be automatically included in AI-generated content.
            </p>
            <div className="text-xs text-dark-text-muted">
              Total blocks created: {status.totalEvergreen} • Ready for content generation
            </div>
            
            <button
              onClick={setupEvergreenBlocks}
              disabled={setting}
              className="btn btn-outline btn-sm mt-3"
            >
              {setting ? '🔄 Updating...' : '🔄 Add Missing Blocks'}
            </button>
          </div>
        )}

        {/* Refresh Status */}
        <button
          onClick={checkStatus}
          disabled={loading}
          className="btn btn-outline btn-sm"
        >
          {loading ? '🔄 Checking...' : '🔄 Refresh Status'}
        </button>
      </div>

      {/* Setup Result */}
      {result && (
        <div className={`mt-6 p-4 rounded-lg border ${
          result.success 
            ? 'bg-green-400/10 border-green-400/20' 
            : 'bg-red-400/10 border-red-400/20'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-lg ${result.success ? 'text-green-400' : 'text-red-400'}`}>
              {result.success ? '✅' : '❌'}
            </span>
            <h4 className={`font-medium ${result.success ? 'text-green-400' : 'text-red-400'}`}>
              Setup {result.success ? 'Success' : 'Failed'}
            </h4>
          </div>
          
          <p className="text-sm text-dark-text-muted mb-2">{result.message}</p>
          
          {result.data && result.success && (
            <div className="text-xs text-dark-text-muted mt-2">
              <div>Total Blocks Created: {result.data.totalBlocks}</div>
              <div className="mt-1">Block Types:</div>
              <ul className="ml-2 mt-1">
                {result.data.blockTypes.map((type: string, index: number) => (
                  <li key={index}>• {type}</li>
                ))}
              </ul>
            </div>
          )}
          
          {result.error && (
            <div className="text-xs text-red-400 mt-2 font-mono">
              Error: {result.error}
            </div>
          )}
        </div>
      )}
    </div>
  )
}