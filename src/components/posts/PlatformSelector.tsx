// src/components/posts/PlatformSelector.tsx
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
