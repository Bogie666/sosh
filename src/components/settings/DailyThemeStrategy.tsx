// src/components/settings/DailyThemeStrategy.tsx
'use client'

import { useState, useEffect } from 'react'
import CollapsibleSection from '../CollapsibleSection'

interface Business {
  id: string
  displayName: string
  businessName: string
}

interface ThemeConfig {
  theme: string
  focus: string
  emoji: string
  contentStyle: string
}

interface DailyThemeSettings {
  id?: string
  businessId: string
  enabledDays: string[]
  contentStrategy: 'conservative' | 'balanced' | 'aggressive'
  seasonalAdjustments: boolean
  promotionFocus: {
    primary: string
    secondary: string
  }
  customThemes: Record<string, ThemeConfig>
}

const DEFAULT_THEMES: Record<string, ThemeConfig> = {
  monday: { theme: 'Monday Motivation', focus: 'Start the week strong with energy and special highlights', emoji: '💪', contentStyle: 'motivational, energetic, forward-looking' },
  tuesday: { theme: 'Tuesday Tips', focus: 'Educational tips and expert advice', emoji: '💡', contentStyle: 'educational, helpful, expert advice' },
  wednesday: { theme: 'Wednesday Specials', focus: 'Mid-week promotional offers and featured services', emoji: '🎯', contentStyle: 'promotional, urgent, value-focused' },
  thursday: { theme: 'Thursday Maintenance', focus: 'Maintenance reminders and preventive care tips', emoji: '🔧', contentStyle: 'preventive, safety-focused, practical' },
  friday: { theme: 'Friday Prep', focus: 'Weekend preparation and emergency service availability', emoji: '🏠', contentStyle: 'preparatory, reassuring, service-focused' },
  saturday: { theme: 'Saturday Service', focus: 'Weekend service availability and quick tips', emoji: '⚡', contentStyle: 'quick, actionable, weekend-friendly' },
  sunday: { theme: 'Sunday Planning', focus: 'Week ahead preparation and family comfort', emoji: '🏡', contentStyle: 'family-focused, planning, comfort-oriented' }
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

const EMOJI_OPTIONS = ['💪', '💡', '🎯', '🔧', '🏠', '⚡', '🏡', '🔥', '✨', '🌟', '💰', '🛠️', '📞', '❤️', '🎉', '📋', '🚀', '💎', '👷', '🏆']

export default function DailyThemeStrategy() {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [selectedBusiness, setSelectedBusiness] = useState('')
  const [originalSettings, setOriginalSettings] = useState<DailyThemeSettings | null>(null)
  const [settings, setSettings] = useState<DailyThemeSettings | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [editingDay, setEditingDay] = useState<string | null>(null)

  useEffect(() => { loadBusinesses() }, [])
  useEffect(() => { if (selectedBusiness) loadSettings() }, [selectedBusiness])
  useEffect(() => {
    if (originalSettings && settings) {
      setHasChanges(JSON.stringify(originalSettings) !== JSON.stringify(settings))
    }
  }, [originalSettings, settings])

  const loadBusinesses = async () => {
    try {
      const response = await fetch('/api/businesses')
      const data = await response.json()
      if (data.success) setBusinesses(data.businesses)
    } catch {
      showMessage('error', 'Failed to load businesses')
    }
  }

  const loadSettings = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/businesses/${selectedBusiness}/daily-theme-settings`)
      const data = await response.json()
      const saved = data.success ? data.settings : null
      const defaults = createDefaultSettings()
      const merged = saved ? {
        ...defaults,
        ...saved,
        enabledDays: saved.enabledDays || defaults.enabledDays,
        customThemes: { ...DEFAULT_THEMES, ...(saved.customThemes || {}) }
      } : defaults
      setSettings(merged)
      setOriginalSettings(JSON.parse(JSON.stringify(merged)))
      setHasChanges(false)
    } catch {
      showMessage('error', 'Failed to load settings')
      const defaults = createDefaultSettings()
      setSettings(defaults)
      setOriginalSettings(JSON.parse(JSON.stringify(defaults)))
    } finally {
      setLoading(false)
    }
  }

  const createDefaultSettings = (): DailyThemeSettings => ({
    businessId: selectedBusiness,
    enabledDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    contentStrategy: 'balanced',
    seasonalAdjustments: true,
    promotionFocus: { primary: 'wednesday', secondary: 'monday' },
    customThemes: { ...DEFAULT_THEMES }
  })

  const getTheme = (day: string): ThemeConfig =>
    settings?.customThemes?.[day] || DEFAULT_THEMES[day] || { theme: day, focus: '', emoji: '📝', contentStyle: '' }

  const updateTheme = (day: string, field: keyof ThemeConfig, value: string) => {
    if (!settings) return
    setSettings({
      ...settings,
      customThemes: {
        ...settings.customThemes,
        [day]: { ...getTheme(day), [field]: value }
      }
    })
  }

  const resetThemeToDefault = (day: string) => {
    if (!settings || !DEFAULT_THEMES[day]) return
    setSettings({
      ...settings,
      customThemes: {
        ...settings.customThemes,
        [day]: { ...DEFAULT_THEMES[day] }
      }
    })
    showMessage('success', `${day} reset to default`)
  }

  const toggleDay = (day: string) => {
    if (!settings) return
    const updated = settings.enabledDays.includes(day)
      ? settings.enabledDays.filter(d => d !== day)
      : [...settings.enabledDays, day]
    setSettings({ ...settings, enabledDays: updated })
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
        setOriginalSettings(JSON.parse(JSON.stringify(settings)))
        setHasChanges(false)
        showMessage('success', 'Daily theme strategy saved!')
      } else {
        showMessage('error', data.error || 'Failed to save')
      }
    } catch {
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

  return (
    <CollapsibleSection title="Daily Theme Strategy" defaultExpanded={false}>
      <div className="space-y-6">

        {/* Business Selection */}
        <div className="bg-slate-800/30 rounded-lg p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-dark-text mb-4">Select Business</h3>
          <select
            value={selectedBusiness}
            onChange={(e) => setSelectedBusiness(e.target.value)}
            className="form-control w-full sm:max-w-md"
          >
            <option value="">Choose a business...</option>
            {businesses.map(business => (
              <option key={business.id} value={business.id}>{business.displayName}</option>
            ))}
          </select>
        </div>

        {message && (
          <div className={`p-4 rounded-lg border ${message.type === 'success' ? 'bg-green-400/10 border-green-400/20 text-green-400' : 'bg-red-400/10 border-red-400/20 text-red-400'}`}>
            {message.text}
          </div>
        )}

        {selectedBusiness && (
          <>
            {loading ? (
              <div className="text-center py-8 text-dark-text-muted">Loading settings...</div>
            ) : settings ? (
              <>
                {/* Content Strategy */}
                <div className="bg-slate-800/30 rounded-lg p-4 sm:p-6">
                  <h3 className="text-lg font-semibold text-dark-text mb-4">Content Strategy</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.entries(CONTENT_STRATEGIES).map(([key, strategy]) => (
                      <label key={key} className={`p-4 rounded-lg border cursor-pointer transition-all ${settings.contentStrategy === key ? 'bg-accent-blue/20 border-accent-blue/50' : 'bg-slate-700/30 border-slate-600/50 hover:border-slate-500/50'}`}>
                        <input type="radio" name="contentStrategy" value={key} checked={settings.contentStrategy === key} onChange={() => setSettings({ ...settings, contentStrategy: key as any })} className="sr-only" />
                        <div className="text-center">
                          <h4 className="font-semibold text-dark-text mb-2">{strategy.name}</h4>
                          <p className="text-sm text-dark-text-muted mb-3">{strategy.description}</p>
                          <div className="space-y-1 text-xs text-dark-text-secondary">
                            <div>{strategy.postFrequency}</div>
                            <div>{strategy.promotionRatio} promotions</div>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Editable Daily Themes */}
                <div className="bg-slate-800/30 rounded-lg p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <div>
                      <h3 className="text-lg font-semibold text-dark-text">Daily Themes</h3>
                      <p className="text-sm text-dark-text-muted">Customize each day's theme, focus, and style. These drive AI content generation.</p>
                    </div>
                    <span className="text-sm text-dark-text-muted">{settings.enabledDays.length}/7 days enabled</span>
                  </div>

                  <div className="space-y-3">
                    {Object.keys(DEFAULT_THEMES).map(day => {
                      const theme = getTheme(day)
                      const isEnabled = settings.enabledDays.includes(day)
                      const isEditing = editingDay === day
                      const isDefault = JSON.stringify(theme) === JSON.stringify(DEFAULT_THEMES[day])

                      return (
                        <div key={day} className={`rounded-lg border transition-all ${isEnabled ? 'bg-slate-700/30 border-slate-500/50' : 'bg-slate-800/20 border-slate-700/30 opacity-60'}`}>
                          {/* Summary row - always visible */}
                          <div className="flex items-center gap-3 p-3 sm:p-4">
                            <input
                              type="checkbox"
                              checked={isEnabled}
                              onChange={() => toggleDay(day)}
                              className="w-5 h-5 text-accent-blue bg-gray-800 border-gray-600 rounded flex-shrink-0"
                            />
                            <span className="text-xl flex-shrink-0">{theme.emoji}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-dark-text capitalize">{day}</span>
                                <span className="text-sm text-dark-text-muted truncate">{theme.theme}</span>
                                {!isDefault && <span className="text-xs text-accent-blue bg-accent-blue/10 px-1.5 py-0.5 rounded">Custom</span>}
                              </div>
                              <p className="text-xs text-dark-text-secondary truncate mt-0.5">{theme.focus}</p>
                            </div>
                            <button
                              onClick={() => setEditingDay(isEditing ? null : day)}
                              className="btn btn-sm btn-outline flex-shrink-0"
                            >
                              {isEditing ? 'Done' : 'Edit'}
                            </button>
                          </div>

                          {/* Edit panel - expands when editing */}
                          {isEditing && (
                            <div className="border-t border-slate-600/30 p-3 sm:p-4 space-y-4 bg-slate-800/30">
                              {/* Theme Name */}
                              <div>
                                <label className="block text-sm font-medium text-dark-text mb-1">Theme Name</label>
                                <input
                                  type="text"
                                  value={theme.theme}
                                  onChange={(e) => updateTheme(day, 'theme', e.target.value)}
                                  className="form-control w-full"
                                  placeholder="e.g. Monday Motivation"
                                />
                              </div>

                              {/* Focus */}
                              <div>
                                <label className="block text-sm font-medium text-dark-text mb-1">Content Focus</label>
                                <input
                                  type="text"
                                  value={theme.focus}
                                  onChange={(e) => updateTheme(day, 'focus', e.target.value)}
                                  className="form-control w-full"
                                  placeholder="What should the AI focus on for this day?"
                                />
                                <p className="text-xs text-dark-text-secondary mt-1">This tells the AI what angle to take when writing posts for this day.</p>
                              </div>

                              {/* Content Style */}
                              <div>
                                <label className="block text-sm font-medium text-dark-text mb-1">Content Style / Tone</label>
                                <input
                                  type="text"
                                  value={theme.contentStyle}
                                  onChange={(e) => updateTheme(day, 'contentStyle', e.target.value)}
                                  className="form-control w-full"
                                  placeholder="e.g. motivational, energetic, forward-looking"
                                />
                                <p className="text-xs text-dark-text-secondary mt-1">Comma-separated adjectives describing the writing style for this day.</p>
                              </div>

                              {/* Emoji picker */}
                              <div>
                                <label className="block text-sm font-medium text-dark-text mb-1">Emoji</label>
                                <div className="flex flex-wrap gap-2">
                                  {EMOJI_OPTIONS.map(e => (
                                    <button
                                      key={e}
                                      onClick={() => updateTheme(day, 'emoji', e)}
                                      className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${theme.emoji === e ? 'bg-accent-blue/30 border-2 border-accent-blue scale-110' : 'bg-slate-700/50 border border-slate-600/30 hover:bg-slate-600/50'}`}
                                    >
                                      {e}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Reset to default */}
                              {!isDefault && (
                                <button onClick={() => resetThemeToDefault(day)} className="btn btn-sm btn-outline text-yellow-400 border-yellow-400/30">
                                  Reset to Default
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Promotion Focus */}
                <div className="bg-slate-800/30 rounded-lg p-4 sm:p-6">
                  <h3 className="text-lg font-semibold text-dark-text mb-4">Promotion Focus</h3>
                  <p className="text-dark-text-muted mb-4 text-sm">Choose which days emphasize promotional content and specials</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-dark-text font-medium mb-2 text-sm">Primary Promotion Day</label>
                      <select value={settings.promotionFocus.primary} onChange={(e) => setSettings({ ...settings, promotionFocus: { ...settings.promotionFocus, primary: e.target.value } })} className="form-control w-full">
                        {Object.keys(DEFAULT_THEMES).map(day => {
                          const t = getTheme(day)
                          return <option key={day} value={day}>{t.emoji} {day.charAt(0).toUpperCase() + day.slice(1)} - {t.theme}</option>
                        })}
                      </select>
                    </div>
                    <div>
                      <label className="block text-dark-text font-medium mb-2 text-sm">Secondary Promotion Day</label>
                      <select value={settings.promotionFocus.secondary} onChange={(e) => setSettings({ ...settings, promotionFocus: { ...settings.promotionFocus, secondary: e.target.value } })} className="form-control w-full">
                        {Object.keys(DEFAULT_THEMES).map(day => {
                          const t = getTheme(day)
                          return <option key={day} value={day}>{t.emoji} {day.charAt(0).toUpperCase() + day.slice(1)} - {t.theme}</option>
                        })}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Additional Options */}
                <div className="bg-slate-800/30 rounded-lg p-4 sm:p-6">
                  <label className="flex items-center gap-3">
                    <input type="checkbox" checked={settings.seasonalAdjustments} onChange={(e) => setSettings({ ...settings, seasonalAdjustments: e.target.checked })} className="w-5 h-5 text-accent-blue bg-gray-800 border-gray-600 rounded" />
                    <div>
                      <div className="font-medium text-dark-text">Seasonal Adjustments</div>
                      <div className="text-sm text-dark-text-muted">Automatically adjust content themes based on weather and season</div>
                    </div>
                  </label>
                </div>

                {/* Save */}
                <div className="bg-slate-800/30 rounded-lg p-4 sm:p-6">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <h3 className="font-semibold text-dark-text">Save Changes</h3>
                      <p className="text-sm text-dark-text-muted">{hasChanges ? 'You have unsaved changes' : 'Up to date'}</p>
                    </div>
                    <div className="flex gap-3">
                      {hasChanges && <button onClick={resetChanges} className="btn btn-outline">Reset</button>}
                      <button onClick={saveChanges} disabled={saving || !hasChanges} className="btn btn-primary">{saving ? 'Saving...' : 'Save Strategy'}</button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-dark-text-muted">No settings found</div>
            )}
          </>
        )}
      </div>
    </CollapsibleSection>
  )
}
