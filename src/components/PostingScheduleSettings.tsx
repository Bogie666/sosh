// src/components/PostingScheduleSettings.tsx
'use client'

import React, { useState, useEffect } from 'react'

interface PlatformSchedule {
  enabled: boolean
  daysOfWeek: string[]
  postsPerDay: number
  timeDistribution: 'auto' | 'custom'
  customTimes: string[]
  autoTimes: string[]
}

interface PostingScheduleData {
  platforms: {
    facebook: PlatformSchedule
    instagram: PlatformSchedule
    twitter: PlatformSchedule
    google: PlatformSchedule
  }
}

interface PostingScheduleSettingsProps {
  businessId: string
  initialData?: PostingScheduleData
  onSave: (data: PostingScheduleData) => Promise<void>
}

const PLATFORMS = [
  { id: 'facebook', name: 'Facebook', icon: '📘', color: 'text-blue-400' },
  { id: 'instagram', name: 'Instagram', icon: '📷', color: 'text-pink-400' },
  { id: 'twitter', name: 'Twitter/X', icon: '🐦', color: 'text-sky-400' },
  { id: 'google', name: 'Google Business', icon: '🏢', color: 'text-red-400' }
]

const DAYS_OF_WEEK = [
  { id: 'monday', label: 'Mon', full: 'Monday' },
  { id: 'tuesday', label: 'Tue', full: 'Tuesday' },
  { id: 'wednesday', label: 'Wed', full: 'Wednesday' },
  { id: 'thursday', label: 'Thu', full: 'Thursday' },
  { id: 'friday', label: 'Fri', full: 'Friday' },
  { id: 'saturday', label: 'Sat', full: 'Saturday' },
  { id: 'sunday', label: 'Sun', full: 'Sunday' }
]

const OPTIMAL_TIMES = {
  facebook: { morning: '09:00', afternoon: '15:00', evening: '19:00' },
  instagram: { morning: '11:00', afternoon: '14:00', evening: '17:00' },
  twitter: { morning: '08:00', afternoon: '12:00', evening: '18:00' },
  google: { morning: '09:00', afternoon: '13:00', evening: '17:00' }
}

const DEFAULT_SCHEDULE: PostingScheduleData = {
  platforms: {
    facebook: {
      enabled: true,
      daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      postsPerDay: 1,
      timeDistribution: 'auto',
      customTimes: [],
      autoTimes: ['morning']
    },
    instagram: {
      enabled: true,
      daysOfWeek: ['monday', 'wednesday', 'friday'],
      postsPerDay: 1,
      timeDistribution: 'auto',
      customTimes: [],
      autoTimes: ['afternoon']
    },
    twitter: {
      enabled: false,
      daysOfWeek: [],
      postsPerDay: 1,
      timeDistribution: 'auto',
      customTimes: [],
      autoTimes: []
    },
    google: {
      enabled: false,
      daysOfWeek: [],
      postsPerDay: 1,
      timeDistribution: 'auto',
      customTimes: [],
      autoTimes: []
    }
  }
}

export default function PostingScheduleSettings({ 
  businessId, 
  initialData, 
  onSave 
}: PostingScheduleSettingsProps) {
  const [scheduleData, setScheduleData] = useState<PostingScheduleData>(
    initialData || DEFAULT_SCHEDULE
  )
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Generate auto times based on posts per day
  const generateAutoTimes = (platformId: string, postsPerDay: number): string[] => {
    const times = OPTIMAL_TIMES[platformId as keyof typeof OPTIMAL_TIMES]
    const timeSlots = [times.morning, times.afternoon, times.evening]
    
    return timeSlots.slice(0, postsPerDay)
  }

  // Update platform schedule
  const updatePlatformSchedule = (
    platformId: string, 
    updates: Partial<PlatformSchedule>
  ) => {
    setScheduleData(prev => {
      const newData = {
        ...prev,
        platforms: {
          ...prev.platforms,
          [platformId]: {
            ...prev.platforms[platformId as keyof typeof prev.platforms],
            ...updates
          }
        }
      }

      // Auto-generate times if using auto distribution
      if (updates.postsPerDay !== undefined || updates.timeDistribution === 'auto') {
        const platform = newData.platforms[platformId as keyof typeof newData.platforms]
        if (platform.timeDistribution === 'auto') {
          platform.autoTimes = generateAutoTimes(platformId, platform.postsPerDay)
          platform.customTimes = []
        }
      }

      return newData
    })
    setHasChanges(true)
  }

  // Toggle day selection
  const toggleDay = (platformId: string, dayId: string) => {
    const platform = scheduleData.platforms[platformId as keyof typeof scheduleData.platforms]
    const currentDays = platform.daysOfWeek
    const newDays = currentDays.includes(dayId)
      ? currentDays.filter(d => d !== dayId)
      : [...currentDays, dayId]

    updatePlatformSchedule(platformId, { daysOfWeek: newDays })
  }

  // Add/remove custom time
  const updateCustomTimes = (platformId: string, times: string[]) => {
    updatePlatformSchedule(platformId, { customTimes: times })
  }

  // Calculate total posts per week for a platform
  const calculateWeeklyPosts = (platform: PlatformSchedule): number => {
    return platform.daysOfWeek.length * platform.postsPerDay
  }

  // Save settings
  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave(scheduleData)
      setHasChanges(false)
      alert('Posting schedule saved successfully!')
    } catch (error) {
      console.error('Failed to save posting schedule:', error)
      alert('Failed to save settings. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="bg-slate-800/30 rounded-lg p-6 border border-gray-600">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold text-white">📅 Posting Schedule Settings</h3>
          <p className="text-gray-400 text-sm mt-1">
            Configure when and how often to post to each platform
          </p>
        </div>
        
        {hasChanges && (
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? '💾 Saving...' : '💾 Save Changes'}
          </button>
        )}
      </div>

      <div className="space-y-8">
        {PLATFORMS.map(platform => {
          const platformData = scheduleData.platforms[platform.id as keyof typeof scheduleData.platforms]
          const weeklyPosts = calculateWeeklyPosts(platformData)

          return (
            <div key={platform.id} className="border border-gray-600 rounded-lg p-6">
              {/* Platform Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{platform.icon}</span>
                  <div>
                    <h4 className={`text-lg font-semibold ${platform.color}`}>
                      {platform.name}
                    </h4>
                    {platformData.enabled && (
                      <p className="text-sm text-gray-400">
                        {weeklyPosts} posts per week
                      </p>
                    )}
                  </div>
                </div>
                
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={platformData.enabled}
                    onChange={(e) => updatePlatformSchedule(platform.id, { 
                      enabled: e.target.checked 
                    })}
                    className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-gray-300">Enable Posting</span>
                </label>
              </div>

              {platformData.enabled && (
                <>
                  {/* Days of Week Selection */}
                  <div className="mb-6">
                    <label className="block text-gray-400 text-sm mb-2">
                      Days of Week
                    </label>
                    <div className="flex gap-2">
                      {DAYS_OF_WEEK.map(day => (
                        <button
                          key={day.id}
                          onClick={() => toggleDay(platform.id, day.id)}
                          className={`px-3 py-2 text-sm rounded border transition-colors ${
                            platformData.daysOfWeek.includes(day.id)
                              ? 'bg-blue-600 border-blue-500 text-white'
                              : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Posts Per Day */}
                  <div className="mb-6">
                    <label className="block text-gray-400 text-sm mb-2">
                      Posts Per Day
                    </label>
                    <select
                      value={platformData.postsPerDay}
                      onChange={(e) => updatePlatformSchedule(platform.id, { 
                        postsPerDay: parseInt(e.target.value) 
                      })}
                      className="w-32 p-2 bg-gray-800 border border-gray-600 rounded text-white focus:border-blue-400 focus:outline-none"
                    >
                      {[1, 2, 3, 4, 5].map(num => (
                        <option key={num} value={num}>{num}</option>
                      ))}
                    </select>
                  </div>

                  {/* Time Distribution */}
                  <div className="mb-6">
                    <label className="block text-gray-400 text-sm mb-2">
                      Time Distribution
                    </label>
                    <div className="space-y-3">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`${platform.id}-time-distribution`}
                          value="auto"
                          checked={platformData.timeDistribution === 'auto'}
                          onChange={() => updatePlatformSchedule(platform.id, { 
                            timeDistribution: 'auto' 
                          })}
                          className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 focus:ring-blue-500"
                        />
                        <span className="text-white">Auto-distribute (optimal times)</span>
                      </label>
                      
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`${platform.id}-time-distribution`}
                          value="custom"
                          checked={platformData.timeDistribution === 'custom'}
                          onChange={() => updatePlatformSchedule(platform.id, { 
                            timeDistribution: 'custom' 
                          })}
                          className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 focus:ring-blue-500"
                        />
                        <span className="text-white">Custom times</span>
                      </label>
                    </div>
                  </div>

                  {/* Time Display */}
                  <div className="bg-gray-700/30 rounded p-4">
                    <h5 className="text-sm font-medium text-white mb-2">
                      {platformData.timeDistribution === 'auto' ? 'Optimal Times' : 'Custom Times'}
                    </h5>
                    
                    {platformData.timeDistribution === 'auto' ? (
                      <div className="flex gap-2">
                        {platformData.autoTimes.map((time, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-blue-600 text-white text-xs rounded"
                          >
                            {time}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {Array.from({ length: platformData.postsPerDay }, (_, index) => (
                          <input
                            key={index}
                            type="time"
                            value={platformData.customTimes[index] || ''}
                            onChange={(e) => {
                              const newTimes = [...platformData.customTimes]
                              newTimes[index] = e.target.value
                              updateCustomTimes(platform.id, newTimes)
                            }}
                            className="w-32 p-2 bg-gray-800 border border-gray-600 rounded text-white focus:border-blue-400 focus:outline-none"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* Summary */}
      <div className="mt-8 bg-gray-700/30 rounded-lg p-4">
        <h4 className="text-lg font-semibold text-white mb-3">📊 Weekly Summary</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {PLATFORMS.map(platform => {
            const platformData = scheduleData.platforms[platform.id as keyof typeof scheduleData.platforms]
            const weeklyPosts = calculateWeeklyPosts(platformData)
            
            return (
              <div key={platform.id} className="text-center">
                <div className={`text-sm ${platform.color}`}>{platform.name}</div>
                <div className="text-lg font-bold text-white">
                  {platformData.enabled ? weeklyPosts : 0}
                </div>
                <div className="text-xs text-gray-400">posts/week</div>
              </div>
            )
          })}
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-600 text-center">
          <div className="text-sm text-gray-400">Total Weekly Posts</div>
          <div className="text-2xl font-bold text-blue-400">
            {Object.values(scheduleData.platforms).reduce((total, platform) => 
              total + (platform.enabled ? calculateWeeklyPosts(platform) : 0), 0
            )}
          </div>
        </div>
      </div>
    </div>
  )
}