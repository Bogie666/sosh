// src/components/settings/PostingScheduleManager.tsx
'use client'

import { useState, useEffect } from 'react'
import CollapsibleSection from '../CollapsibleSection'

interface Business {
  id: string
  displayName: string
}

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
      autoTimes: ['09:00']
    },
    instagram: {
      enabled: true,
      daysOfWeek: ['monday', 'wednesday', 'friday'],
      postsPerDay: 1,
      timeDistribution: 'auto',
      customTimes: [],
      autoTimes: ['14:00']
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

export default function PostingScheduleManager() {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [selectedBusiness, setSelectedBusiness] = useState<string>('')
  const [scheduleData, setScheduleData] = useState<PostingScheduleData>(DEFAULT_SCHEDULE)
  const [originalData, setOriginalData] = useState<PostingScheduleData | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)

  // Load businesses on mount
  useEffect(() => {
    loadBusinesses()
  }, [])

  // Load posting schedule when business is selected
  useEffect(() => {
    if (selectedBusiness) {
      loadPostingSchedule()
    }
  }, [selectedBusiness])

  // Check for changes
  useEffect(() => {
    if (originalData) {
      setHasChanges(JSON.stringify(originalData) !== JSON.stringify(scheduleData))
    }
  }, [originalData, scheduleData])

  const loadBusinesses = async () => {
    try {
      const response = await fetch('/api/businesses')
      const data = await response.json()
      if (data.success) {
        setBusinesses(data.businesses)
        if (data.businesses.length > 0) {
          setSelectedBusiness(data.businesses[0].id)
        }
      }
    } catch (error) {
      console.error('Failed to load businesses:', error)
      showMessage('error', 'Failed to load businesses')
    }
  }

  const loadPostingSchedule = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/business/posting-schedule?businessId=${selectedBusiness}`)
      const data = await response.json()
      
      if (data.success) {
        const loadedSchedule = data.data.postingSchedule || DEFAULT_SCHEDULE
        setScheduleData(loadedSchedule)
        setOriginalData(JSON.parse(JSON.stringify(loadedSchedule))) // Deep copy
        setHasChanges(false)
      } else {
        setScheduleData(DEFAULT_SCHEDULE)
        setOriginalData(JSON.parse(JSON.stringify(DEFAULT_SCHEDULE)))
      }
    } catch (error) {
      console.error('Failed to load posting schedule:', error)
      showMessage('error', 'Failed to load posting schedule')
      setScheduleData(DEFAULT_SCHEDULE)
      setOriginalData(JSON.parse(JSON.stringify(DEFAULT_SCHEDULE)))
    } finally {
      setLoading(false)
    }
  }

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 5000)
  }

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

  // Update custom times
  const updateCustomTimes = (platformId: string, times: string[]) => {
    updatePlatformSchedule(platformId, { customTimes: times })
  }

  // Calculate total posts per week for a platform
  const calculateWeeklyPosts = (platform: PlatformSchedule): number => {
    return platform.daysOfWeek.length * platform.postsPerDay
  }

  // Save posting schedule
  const savePostingSchedule = async () => {
    if (!hasChanges) return

    setSaving(true)
    try {
      const response = await fetch('/api/business/posting-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          businessId: selectedBusiness, 
          postingSchedule: scheduleData 
        }),
      })

      const result = await response.json()
      if (result.success) {
        setOriginalData(JSON.parse(JSON.stringify(scheduleData)))
        setHasChanges(false)
        showMessage('success', 'Posting schedule saved successfully!')
      } else {
        throw new Error(result.error || 'Failed to save')
      }
    } catch (error) {
      console.error('Failed to save posting schedule:', error)
      showMessage('error', 'Failed to save posting schedule')
    } finally {
      setSaving(false)
    }
  }

  const resetToDefaults = () => {
    setScheduleData(DEFAULT_SCHEDULE)
    showMessage('success', 'Reset to default posting schedule')
  }

  const selectedBusinessName = businesses.find(b => b.id === selectedBusiness)?.displayName || 'Unknown'

  return (
    <CollapsibleSection title="📅 Posting Schedule Settings" defaultExpanded={false}>
      <div className="space-y-6">
        
        {/* Header with Business Selection */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-dark-text">Configure Posting Frequency</h3>
            <p className="text-dark-text-muted text-sm">
              Set when and how often to post to each social media platform
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <select
              value={selectedBusiness}
              onChange={(e) => setSelectedBusiness(e.target.value)}
              disabled={loading}
              className="form-control min-w-[200px]"
            >
              <option value="">Select Business</option>
              {businesses.map(business => (
                <option key={business.id} value={business.id}>
                  {business.displayName}
                </option>
              ))}
            </select>
            
            {hasChanges && (
              <button
                onClick={savePostingSchedule}
                disabled={saving}
                className="btn btn-success"
              >
                {saving ? '💾 Saving...' : '💾 Save Changes'}
              </button>
            )}
          </div>
        </div>

        {/* Status Messages */}
        {message && (
          <div className={`p-3 rounded border ${
            message.type === 'success' 
              ? 'bg-green-900/30 border-green-600 text-green-200'
              : 'bg-red-900/30 border-red-600 text-red-200'
          }`}>
            {message.text}
          </div>
        )}

        {selectedBusiness ? (
          loading ? (
            <div className="text-center py-8">
              <div className="animate-spin inline-block w-6 h-6 border-2 border-current border-t-transparent text-blue-400 rounded-full"></div>
              <span className="ml-2 text-dark-text-secondary">Loading posting schedule...</span>
            </div>
          ) : (
            <>
              {/* Platform Settings */}
              <div className="space-y-6">
                {PLATFORMS.map(platform => {
                  const platformData = scheduleData.platforms[platform.id as keyof typeof scheduleData.platforms]
                  const weeklyPosts = calculateWeeklyPosts(platformData)

                  return (
                    <div key={platform.id} className="bg-slate-800/30 border border-gray-600 rounded-lg p-6">
                      {/* Platform Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{platform.icon}</span>
                          <div>
                            <h4 className={`text-lg font-semibold ${platform.color}`}>
                              {platform.name}
                            </h4>
                            {platformData.enabled && (
                              <p className="text-sm text-dark-text-muted">
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
                          <span className="text-dark-text-secondary">Enable Posting</span>
                        </label>
                      </div>

                      {platformData.enabled && (
                        <>
                          {/* Days of Week Selection */}
                          <div className="mb-6">
                            <label className="block text-dark-text-muted text-sm mb-2">
                              Days of Week
                            </label>
                            <div className="flex gap-2 flex-wrap">
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
                            <label className="block text-dark-text-muted text-sm mb-2">
                              Posts Per Day
                            </label>
                            <select
                              value={platformData.postsPerDay}
                              onChange={(e) => updatePlatformSchedule(platform.id, { 
                                postsPerDay: parseInt(e.target.value) 
                              })}
                              className="form-control w-32"
                            >
                              {[1, 2, 3, 4, 5].map(num => (
                                <option key={num} value={num}>{num}</option>
                              ))}
                            </select>
                          </div>

                          {/* Time Distribution */}
                          <div className="mb-6">
                            <label className="block text-dark-text-muted text-sm mb-2">
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
                                  className="form-radio"
                                />
                                <span className="text-dark-text">Auto-distribute (optimal times)</span>
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
                                  className="form-radio"
                                />
                                <span className="text-dark-text">Custom times</span>
                              </label>
                            </div>
                          </div>

                          {/* Time Display */}
                          <div className="bg-slate-700/30 rounded p-4">
                            <h5 className="text-sm font-medium text-dark-text mb-2">
                              {platformData.timeDistribution === 'auto' ? 'Optimal Times' : 'Custom Times'}
                            </h5>
                            
                            {platformData.timeDistribution === 'auto' ? (
                              <div className="flex gap-2 flex-wrap">
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
                                    className="form-control w-32"
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
              <div className="bg-slate-700/30 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-dark-text mb-3">📊 Weekly Summary</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {PLATFORMS.map(platform => {
                    const platformData = scheduleData.platforms[platform.id as keyof typeof scheduleData.platforms]
                    const weeklyPosts = calculateWeeklyPosts(platformData)
                    
                    return (
                      <div key={platform.id} className="text-center">
                        <div className={`text-sm ${platform.color}`}>{platform.name}</div>
                        <div className="text-lg font-bold text-dark-text">
                          {platformData.enabled ? weeklyPosts : 0}
                        </div>
                        <div className="text-xs text-dark-text-muted">posts/week</div>
                      </div>
                    )
                  })}
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-600 text-center">
                  <div className="text-sm text-dark-text-muted">Total Weekly Posts</div>
                  <div className="text-2xl font-bold text-accent-blue">
                    {Object.values(scheduleData.platforms).reduce((total, platform) => 
                      total + (platform.enabled ? calculateWeeklyPosts(platform) : 0), 0
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end">
                <button
                  onClick={resetToDefaults}
                  className="btn btn-outline"
                  disabled={saving}
                >
                  🔄 Reset to Defaults
                </button>
                
                {hasChanges && (
                  <button
                    onClick={savePostingSchedule}
                    disabled={saving}
                    className="btn btn-success"
                  >
                    {saving ? '💾 Saving...' : '💾 Save Changes'}
                  </button>
                )}
              </div>
            </>
          )
        ) : (
          <div className="text-center py-8 text-dark-text-muted">
            Please select a business to configure posting schedules
          </div>
        )}
      </div>
    </CollapsibleSection>
  )
}