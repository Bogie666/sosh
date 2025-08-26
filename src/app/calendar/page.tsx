// src/app/calendar/page.tsx - Content Calendar Page
'use client'

import React, { useState } from 'react'
import Header from '@/components/Header'
import ContentCalendar from '@/components/ContentCalendar/ContentCalendar'

const BUSINESSES = [
  { id: 'lex-dallas', name: 'Lex Dallas', displayName: 'Lex Dallas' },
  { id: 'lex-etx', name: 'Lex ETX', displayName: 'Lex ETX' },
  { id: 'lyons', name: 'Lyons', displayName: 'Lyons' }
]

const PLATFORMS = [
  { id: 'facebook', name: 'Facebook', icon: '📘' },
  { id: 'instagram', name: 'Instagram', icon: '📷' },
  { id: 'twitter', name: 'Twitter/X', icon: '🐦' },
  { id: 'google', name: 'Google Business', icon: '🏢' }
]

export default function CalendarPage() {
  const [selectedBusinesses, setSelectedBusinesses] = useState<string[]>(['lex-dallas'])
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['facebook', 'instagram', 'twitter', 'google'])

  const handleBusinessChange = (businessId: string) => {
    setSelectedBusinesses(prev => 
      prev.includes(businessId) 
        ? prev.filter(id => id !== businessId)
        : [...prev, businessId]
    )
  }

  const handlePlatformChange = (platformId: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platformId) 
        ? prev.filter(id => id !== platformId)
        : [...prev, platformId]
    )
  }

  const selectAllBusinesses = () => {
    setSelectedBusinesses(BUSINESSES.map(b => b.id))
  }

  const selectAllPlatforms = () => {
    setSelectedPlatforms(PLATFORMS.map(p => p.id))
  }

  return (
    <div className="min-h-screen p-5">
      <div className="max-w-7xl mx-auto">
        <Header />
        
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-dark-text mb-2">📅 Content Calendar</h1>
              <p className="text-dark-text-muted">
                View and manage all your social media content across platforms and businesses
              </p>
            </div>
            <a 
              href="/"
              className="btn btn-outline"
            >
              🏠 Back to Dashboard
            </a>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-8">
          <div className="bg-slate-800/30 rounded-lg border border-gray-600 p-6">
            <h3 className="text-lg font-semibold text-dark-text mb-4">📊 Filters</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Business Selection */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-dark-text">Businesses</label>
                  <button
                    onClick={selectAllBusinesses}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    Select All
                  </button>
                </div>
                <div className="space-y-2">
                  {BUSINESSES.map(business => (
                    <label key={business.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedBusinesses.includes(business.id)}
                        onChange={() => handleBusinessChange(business.id)}
                        className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-dark-text-secondary">{business.displayName}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Platform Selection */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-dark-text">Platforms</label>
                  <button
                    onClick={selectAllPlatforms}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    Select All
                  </button>
                </div>
                <div className="space-y-2">
                  {PLATFORMS.map(platform => (
                    <label key={platform.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedPlatforms.includes(platform.id)}
                        onChange={() => handlePlatformChange(platform.id)}
                        className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-dark-text-secondary">
                        {platform.icon} {platform.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Active Filters Summary */}
            <div className="mt-4 pt-4 border-t border-gray-600">
              <div className="flex items-center gap-4 text-sm text-dark-text-muted">
                <span>
                  <strong>Businesses:</strong> {selectedBusinesses.length} selected
                </span>
                <span>•</span>
                <span>
                  <strong>Platforms:</strong> {selectedPlatforms.length} selected
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Content Calendar */}
        <main>
          {selectedBusinesses.length === 0 || selectedPlatforms.length === 0 ? (
            <div className="bg-slate-800/30 rounded-lg border border-gray-600 p-12 text-center">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-lg font-semibold text-dark-text mb-2">
                Select Filters to View Calendar
              </h3>
              <p className="text-dark-text-muted">
                Please select at least one business and one platform to display the content calendar.
              </p>
            </div>
          ) : (
            <ContentCalendar
              selectedBusinesses={selectedBusinesses}
              selectedPlatforms={selectedPlatforms}
            />
          )}
        </main>

        {/* Quick Actions */}
        <div className="mt-8 flex items-center justify-center gap-4">
          <a href="/ai-content" className="btn btn-primary">
            🤖 Generate Content
          </a>
          <a href="/post-creation" className="btn btn-outline">
            📝 Create Post
          </a>
          <a href="/settings" className="btn btn-outline">
            ⚙️ Settings
          </a>
        </div>
      </div>
    </div>
  )
}