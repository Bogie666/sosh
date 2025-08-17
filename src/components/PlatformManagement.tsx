// src/components/PlatformManagement.tsx
'use client'

import { useState, useEffect } from 'react'
import CollapsibleSection from './CollapsibleSection'

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
