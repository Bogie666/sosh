// src/components/settings/DailyThemeStrategy.tsx
'use client'

import { useState, useEffect } from 'react'
import CollapsibleSection from '../CollapsibleSection'

interface Business {
  id: string
  displayName: string
  businessName: string
}

interface DailyThemeSettings {
  id?: string
  businessId: string
  enabledDays: string[]
  contentStrategy: 'conservative' | 'balanced' | 'aggressive'
  seasonalAdjustments: boolean
  promotionFocus: {
    primary: string // day of week
    secondary: string // day of week
  }
  customSettings?: {
    [day: string]: {
      isEnabled: boolean
      templatePreference: string[]
      specialsEmphasis: boolean
    }
  }
}

// Enhanced daily themes with template mapping
const DAILY_THEMES = {
  monday: { 
    theme: 'Monday Motivation', 
    focus: 'Start the week strong with energy and special highlights',
    emoji: '💪',
    templates: ['promotion', 'company_update', 'customer_story'],
    description: 'Energetic posts to kickstart the week, perfect for announcing specials and company news'
  },
  tuesday: { 
    theme: 'Tuesday Tips', 
    focus: 'Educational HVAC/plumbing/electrical tips and advice',
    emoji: '💡',
    templates: ['seasonal_tip', 'maintenance_reminder', 'educational'],
    description: 'Share valuable knowledge and maintenance advice with your customers'
  },
  wednesday: { 
    theme: 'Wednesday Specials', 
    focus: 'Mid-week promotional offers and featured services',
    emoji: '🎯',
    templates: ['promotion', 'seasonal_tip', 'limited_offer'],
    description: 'Perfect day to highlight current promotions and special offers'
  },
  thursday: { 
    theme: 'Thursday Maintenance', 
    focus: 'Maintenance reminders and preventive care tips',
    emoji: '🔧',
    templates: ['maintenance_reminder', 'safety_tip', 'prevention_advice'],
    description: 'Focus on preventive maintenance and system care advice'
  },
  friday: { 
    theme: 'Friday Prep', 
    focus: 'Weekend preparation and emergency service availability',
    emoji: '🏠',
    templates: ['weekend_prep', 'emergency_service', 'customer_care'],
    description: 'Prepare customers for weekend comfort and highlight emergency services'
  },
  saturday: {
    theme: 'Saturday Service',
    focus: 'Weekend service availability and quick tips',
    emoji: '⚡',
    templates: ['quick_tip', 'emergency_service', 'weekend_special'],
    description: 'Quick, actionable tips and weekend service reminders'
  },
  sunday: {
    theme: 'Sunday Planning',
    focus: 'Week ahead preparation and family comfort',
    emoji: '🏡',
    templates: ['comfort_focus', 'week_prep', 'family_safety'],
    description: 'Help families prepare for the week ahead with comfort and safety focus'
  }
}

const CONTENT_STRATEGIES = {
  conservative: {
    name: 'Conservative',
    description: 'Focus on educational content and gentle service reminders',
    postFrequency: '3-4 days per week',
    promotionRatio: '20%',
    characteristics: ['Educational focus', 'Soft promotions', 'Trust building']
  },
  balanced: {
    name: 'Balanced',
    description: 'Mix of educational content, promotions, and company updates',
    postFrequency: '5-6 days per week',
    promotionRatio: '40%',
    characteristics: ['Variety of content', 'Regular promotions', 'Engaging mix']
  },
  aggressive: {
    name: 'Aggressive',
    description: 'Strong promotional focus with frequent special offers',
    postFrequency: '6-7 days per week',
    promotionRatio: '60%',
    characteristics: ['Promotion heavy', 'Frequent specials', 'Sales focused']
  }
}

export default function DailyThemeStrategy() {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [selectedBusiness, setSelectedBusiness] = useState('')
  const [originalSettings, setOriginalSettings] = useState<DailyThemeSettings | null>(null)
  const [settings, setSettings] = useState<DailyThemeSettings | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)

  // Load businesses on mount
  useEffect(() => {
    loadBusinesses()
  }, [])

  // Load settings when business is selected
  useEffect(() => {
    if (selectedBusiness) {
      loadSettings()
    }
  }, [selectedBusiness])

  // Check for changes
  useEffect(() => {
    if (originalSettings && settings) {
      setHasChanges(JSON.stringify(originalSettings) !== JSON.stringify(settings))
    }
  }, [originalSettings, settings])

  const loadBusinesses = async () => {
    try {
      const response = await fetch('/api/businesses')
      const data = await response.json()
      if (data.success) {
        setBusinesses(data.businesses)
      }
    } catch (error) {
      console.error('Failed to load businesses:', error)
      showMessage('error', 'Failed to load businesses')
    }
  }

  const loadSettings = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/businesses/${selectedBusiness}/daily-theme-settings`)
      const data = await response.json()
      
      const settingsData = data.success ? data.settings : null
      const defaultSettings = createDefaultSettings()
      
      // Merge with defaults to ensure all required fields exist
      const mergedSettings = settingsData ? {
        ...defaultSettings,
        ...settingsData,
        enabledDays: settingsData.enabledDays || defaultSettings.enabledDays
      } : defaultSettings

      setSettings(mergedSettings)
      setOriginalSettings(JSON.parse(JSON.stringify(mergedSettings))) // Deep copy
      setHasChanges(false)
    } catch (error) {
      console.error('Failed to load daily theme settings:', error)
      showMessage('error', 'Failed to load settings')
      const defaultSettings = createDefaultSettings()
      setSettings(defaultSettings)
      setOriginalSettings(JSON.parse(JSON.stringify(defaultSettings)))
    } finally {
      setLoading(false)
    }
  }

  const createDefaultSettings = (): DailyThemeSettings => {
    return {
      businessId: selectedBusiness,
      enabledDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'], // Weekdays enabled by default
      contentStrategy: 'balanced',
      seasonalAdjustments: true,
      promotionFocus: {
        primary: 'wednesday',
        secondary: 'monday'
      },
      customSettings: {}
    }
  }

  const toggleDay = (day: string) => {
    if (!settings) return

    const isCurrentlyEnabled = settings.enabledDays.includes(day)
    const updatedDays = isCurrentlyEnabled 
      ? settings.enabledDays.filter(d => d !== day)
      : [...settings.enabledDays, day]

    setSettings({
      ...settings,
      enabledDays: updatedDays
    })
  }

  const updateContentStrategy = (strategy: 'conservative' | 'balanced' | 'aggressive') => {
    if (!settings) return

    setSettings({
      ...settings,
      contentStrategy: strategy
    })
  }

  const updatePromotionFocus = (type: 'primary' | 'secondary', day: string) => {
    if (!settings) return

    setSettings({
      ...settings,
      promotionFocus: {
        ...settings.promotionFocus,
        [type]: day
      }
    })
  }

  const saveChanges = async () => {
    if (!settings || !hasChanges) return

    setSaving(true)
    try {
      const response = await fetch(`/api/businesses/${selectedBusiness}/daily-theme-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      const data = await response.json()
      if (data.success) {
        setOriginalSettings(JSON.parse(JSON.stringify(settings))) // Update original to match current
        setHasChanges(false)
        showMessage('success', 'Daily theme strategy saved successfully!')
      } else {
        showMessage('error', data.error || 'Failed to save settings')
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
      showMessage('error', 'Failed to save daily theme strategy')
    } finally {
      setSaving(false)
    }
  }

  const resetChanges = () => {
    if (originalSettings) {
      setSettings(JSON.parse(JSON.stringify(originalSettings)))
      setHasChanges(false)
    }
  }

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 5000)
  }

  const getEnabledCount = () => settings?.enabledDays.length || 0
  const getSelectedStrategy = () => settings?.contentStrategy || 'balanced'

  return (
    <CollapsibleSection title="📅 Daily Theme Strategy" defaultExpanded={false}>
      <div className="space-y-6">
        
        {/* Business Selection */}
        <div className="bg-slate-800/30 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-dark-text mb-4">Select Business</h3>
          <select
            value={selectedBusiness}
            onChange={(e) => setSelectedBusiness(e.target.value)}
            className="form-control w-full max-w-md"
          >
            <option value="">Choose a business...</option>
            {businesses.map(business => (
              <option key={business.id} value={business.id}>
                {business.displayName}
              </option>
            ))}
          </select>
        </div>

        {/* Success/Error Messages */}
        {message && (
          <div className={`p-4 rounded-lg border ${
            message.type === 'success' 
              ? 'bg-green-400/10 border-green-400/20 text-green-400' 
              : 'bg-red-400/10 border-red-400/20 text-red-400'
          }`}>
            {message.text}
          </div>
        )}

        {selectedBusiness && (
          <>
            {loading ? (
              <div className="text-center py-8">
                <p className="text-dark-text-muted">Loading daily theme settings...</p>
              </div>
            ) : settings ? (
              <>
                {/* Content Strategy Selection */}
                <div className="bg-slate-800/30 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-dark-text mb-4">📊 Content Strategy</h3>
                  <p className="text-dark-text-muted mb-4">
                    Choose your overall content approach and posting frequency
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.entries(CONTENT_STRATEGIES).map(([key, strategy]) => (
                      <label key={key} className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        getSelectedStrategy() === key
                          ? 'bg-accent-blue/20 border-accent-blue/50'
                          : 'bg-slate-700/30 border-slate-600/50 hover:border-slate-500/50'
                      }`}>
                        <input
                          type="radio"
                          name="contentStrategy"
                          value={key}
                          checked={getSelectedStrategy() === key}
                          onChange={() => updateContentStrategy(key as any)}
                          className="sr-only"
                        />
                        <div className="text-center">
                          <h4 className="font-semibold text-dark-text mb-2">{strategy.name}</h4>
                          <p className="text-sm text-dark-text-muted mb-3">{strategy.description}</p>
                          <div className="space-y-1 text-xs text-dark-text-secondary">
                            <div>📅 {strategy.postFrequency}</div>
                            <div>🎯 {strategy.promotionRatio} promotions</div>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-1 justify-center">
                            {strategy.characteristics.map((char, i) => (
                              <span key={i} className="px-2 py-1 bg-slate-600/30 text-xs rounded">
                                {char}
                              </span>
                            ))}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Daily Themes Selection */}
                <div className="bg-slate-800/30 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-dark-text mb-4">📅 Daily Themes</h3>
                  <p className="text-dark-text-muted mb-4">
                    Select which days to post and their content themes ({getEnabledCount()}/7 days enabled)
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {Object.entries(DAILY_THEMES).map(([day, theme]) => {
                      const isEnabled = settings.enabledDays.includes(day)
                      const isPrimaryPromotion = settings.promotionFocus.primary === day
                      const isSecondaryPromotion = settings.promotionFocus.secondary === day
                      
                      return (
                        <div key={day} className={`p-4 rounded-lg border transition-all ${
                          isEnabled 
                            ? 'bg-green-400/10 border-green-400/20' 
                            : 'bg-slate-700/30 border-slate-600/50'
                        }`}>
                          <label className="flex items-start gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isEnabled}
                              onChange={() => toggleDay(day)}
                              className="w-4 h-4 text-accent-blue bg-gray-800 border-gray-600 rounded focus:ring-accent-blue mt-1"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-lg">{theme.emoji}</span>
                                <h4 className="font-medium text-dark-text capitalize">{day}</h4>
                                {isPrimaryPromotion && (
                                  <span className="px-2 py-1 bg-purple-600/20 text-purple-400 text-xs rounded">
                                    Primary Promo
                                  </span>
                                )}
                                {isSecondaryPromotion && (
                                  <span className="px-2 py-1 bg-blue-600/20 text-blue-400 text-xs rounded">
                                    Secondary Promo
                                  </span>
                                )}
                              </div>
                              <div className="font-medium text-dark-text text-sm mb-1">{theme.theme}</div>
                              <p className="text-xs text-dark-text-muted mb-2">{theme.description}</p>
                              <div className="text-xs text-dark-text-secondary">
                                <div className="mb-1">Focus: {theme.focus}</div>
                                <div>Templates: {theme.templates.join(', ')}</div>
                              </div>
                            </div>
                          </label>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Promotion Focus Settings */}
                <div className="bg-slate-800/30 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-dark-text mb-4">🎯 Promotion Focus</h3>
                  <p className="text-dark-text-muted mb-4">
                    Choose which days to emphasize promotional content and special offers
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-dark-text font-medium mb-2">
                        Primary Promotion Day
                      </label>
                      <select
                        value={settings.promotionFocus.primary}
                        onChange={(e) => updatePromotionFocus('primary', e.target.value)}
                        className="form-control w-full"
                      >
                        {Object.entries(DAILY_THEMES).map(([day, theme]) => (
                          <option key={day} value={day}>
                            {theme.emoji} {day.charAt(0).toUpperCase() + day.slice(1)} - {theme.theme}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-dark-text-muted mt-1">
                        Main day for featuring special offers and promotions
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-dark-text font-medium mb-2">
                        Secondary Promotion Day
                      </label>
                      <select
                        value={settings.promotionFocus.secondary}
                        onChange={(e) => updatePromotionFocus('secondary', e.target.value)}
                        className="form-control w-full"
                      >
                        {Object.entries(DAILY_THEMES).map(([day, theme]) => (
                          <option key={day} value={day}>
                            {theme.emoji} {day.charAt(0).toUpperCase() + day.slice(1)} - {theme.theme}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-dark-text-muted mt-1">
                        Secondary day for additional promotional content
                      </p>
                    </div>
                  </div>
                </div>

                {/* Additional Options */}
                <div className="bg-slate-800/30 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-dark-text mb-4">⚙️ Additional Options</h3>
                  
                  <div className="space-y-4">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={settings.seasonalAdjustments}
                        onChange={(e) => setSettings({
                          ...settings,
                          seasonalAdjustments: e.target.checked
                        })}
                        className="w-4 h-4 text-accent-blue bg-gray-800 border-gray-600 rounded focus:ring-accent-blue"
                      />
                      <div>
                        <div className="font-medium text-dark-text">🌤️ Seasonal Adjustments</div>
                        <div className="text-sm text-dark-text-muted">
                          Automatically adjust content themes based on weather and season
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Save/Reset Actions */}
                <div className="bg-slate-800/30 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-dark-text">💾 Save Changes</h3>
                      <p className="text-sm text-dark-text-muted">
                        {hasChanges 
                          ? `You have unsaved changes to your daily theme strategy` 
                          : `Daily theme strategy is up to date`
                        }
                      </p>
                    </div>
                    <div className="flex gap-3">
                      {hasChanges && (
                        <button
                          onClick={resetChanges}
                          className="btn btn-outline"
                        >
                          Reset Changes
                        </button>
                      )}
                      <button
                        onClick={saveChanges}
                        disabled={saving || !hasChanges}
                        className="btn btn-primary"
                      >
                        {saving ? '💾 Saving...' : '💾 Save Strategy'}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-dark-text-muted">No settings found for this business</p>
              </div>
            )}
          </>
        )}
      </div>
    </CollapsibleSection>
  )
}