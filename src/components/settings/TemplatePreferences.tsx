// src/components/settings/TemplatePreferences.tsx
'use client'
import { useState, useEffect } from 'react'
import CollapsibleSection from '../CollapsibleSection'

interface Business {
  id: string
  displayName: string
  businessName: string
}

interface BusinessProfile {
  id?: string
  businessId: string
  approvedTemplates: string[]
  contentThemes: string[]
  autoPostSettings?: {
    templatePreferences?: {
      [templateType: string]: {
        isEnabled: boolean
        tone: string
        includePromotions: boolean
        maxLength: number
        callToActionStyle: string
      }
    }
  }
}

export default function TemplatePreferences() {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [selectedBusiness, setSelectedBusiness] = useState('')
  const [originalProfile, setOriginalProfile] = useState<BusinessProfile | null>(null)
  const [profile, setProfile] = useState<BusinessProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)

  // Available template types
  const availableTemplates = [
    { 
      id: 'seasonal_tip', 
      name: 'Seasonal Tips', 
      description: 'Weather-appropriate HVAC tips and advice',
      category: 'Educational',
      example: 'Winter is coming! Time to check your heating system...'
    },
    { 
      id: 'maintenance_reminder', 
      name: 'Maintenance Reminders', 
      description: 'Regular service and tune-up reminders',
      category: 'Service',
      example: 'Don\'t wait for a breakdown - schedule your tune-up today!'
    },
    { 
      id: 'weather_alert', 
      name: 'Weather Alerts', 
      description: 'Weather-related HVAC protection tips',
      category: 'Urgent',
      example: 'Storm warning! Protect your outdoor HVAC units...'
    },
    { 
      id: 'promotion', 
      name: 'Special Promotions', 
      description: 'Service promotions and special offers',
      category: 'Marketing',
      example: 'This month only: 20% off all HVAC maintenance!'
    },
    { 
      id: 'customer_story', 
      name: 'Customer Success Stories', 
      description: 'Testimonials and positive reviews',
      category: 'Social Proof',
      example: 'Another happy customer! See what Sarah says about our service...'
    },
    { 
      id: 'company_update', 
      name: 'Company News', 
      description: 'Business updates and announcements',
      category: 'Company',
      example: 'We\'re excited to announce our new team member...'
    },
    { 
      id: 'emergency_service', 
      name: 'Emergency Service', 
      description: '24/7 emergency availability reminders',
      category: 'Service',
      example: 'HVAC emergency? We\'re here 24/7 to help!'
    },
    { 
      id: 'energy_efficiency', 
      name: 'Energy Saving Tips', 
      description: 'Tips to help customers save on energy bills',
      category: 'Educational',
      example: 'Save money on your energy bill with these simple tips...'
    },
    { 
      id: 'safety_tips', 
      name: 'Safety & Prevention', 
      description: 'Important safety information for customers',
      category: 'Educational',
      example: 'Keep your family safe with these important HVAC safety tips...'
    }
  ]

  const contentThemeOptions = [
    { id: 'educational', name: 'Educational & Helpful', description: 'Informative content that teaches customers' },
    { id: 'seasonal', name: 'Seasonal & Timely', description: 'Weather and season-appropriate content' },
    { id: 'promotional', name: 'Promotional & Sales', description: 'Special offers and marketing content' },
    { id: 'behind-scenes', name: 'Behind the Scenes', description: 'Team and work process content' },
    { id: 'customer-stories', name: 'Customer Stories', description: 'Reviews and success stories' }
  ]

  const toneOptions = [
    { value: 'professional', label: 'Professional & Polished' },
    { value: 'friendly', label: 'Friendly & Approachable' },
    { value: 'urgent', label: 'Urgent & Direct' },
    { value: 'educational', label: 'Educational & Informative' }
  ]

  useEffect(() => {
    loadBusinesses()
  }, [])

  useEffect(() => {
    if (selectedBusiness) {
      loadBusinessProfile()
    }
  }, [selectedBusiness])

  useEffect(() => {
    // Check if there are changes
    if (originalProfile && profile) {
      const hasChanges = JSON.stringify(originalProfile) !== JSON.stringify(profile)
      setHasChanges(hasChanges)
    }
  }, [originalProfile, profile])

  const loadBusinesses = async () => {
    try {
      const response = await fetch('/api/businesses')
      const data = await response.json()
      
      if (data.success) {
        setBusinesses(data.businesses)
        if (data.businesses.length > 0 && !selectedBusiness) {
          setSelectedBusiness(data.businesses[0].id)
        }
      }
    } catch (error) {
      console.error('Failed to load businesses:', error)
      showMessage('error', 'Failed to load businesses')
    }
  }

  const loadBusinessProfile = async () => {
    if (!selectedBusiness) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/businesses/${selectedBusiness}/profile`)
      const data = await response.json()
      
      const profileData = data.success ? data.profile : null
      const defaultProfile = createDefaultProfile()
      
      // Merge with defaults to ensure all required fields exist
      const mergedProfile = profileData ? {
        ...defaultProfile,
        ...profileData,
        approvedTemplates: profileData.approvedTemplates || [],
        contentThemes: profileData.contentThemes || ['educational', 'seasonal']
      } : defaultProfile

      setProfile(mergedProfile)
      setOriginalProfile(JSON.parse(JSON.stringify(mergedProfile))) // Deep copy
      setHasChanges(false)
    } catch (error) {
      console.error('Failed to load business profile:', error)
      showMessage('error', 'Failed to load business profile')
      const defaultProfile = createDefaultProfile()
      setProfile(defaultProfile)
      setOriginalProfile(JSON.parse(JSON.stringify(defaultProfile)))
    } finally {
      setLoading(false)
    }
  }

  const createDefaultProfile = (): BusinessProfile => {
    return {
      businessId: selectedBusiness,
      approvedTemplates: ['seasonal_tip', 'maintenance_reminder', 'promotion'], // Default enabled
      contentThemes: ['educational', 'seasonal'],
      autoPostSettings: {
        templatePreferences: {}
      }
    }
  }

  const toggleTemplate = (templateId: string) => {
    if (!profile) return

    const isCurrentlyEnabled = profile.approvedTemplates.includes(templateId)
    const updatedTemplates = isCurrentlyEnabled 
      ? profile.approvedTemplates.filter(id => id !== templateId)
      : [...profile.approvedTemplates, templateId]

    setProfile({
      ...profile,
      approvedTemplates: updatedTemplates
    })
  }

  const toggleContentTheme = (themeId: string) => {
    if (!profile) return

    const isCurrentlyEnabled = profile.contentThemes.includes(themeId)
    const updatedThemes = isCurrentlyEnabled 
      ? profile.contentThemes.filter(id => id !== themeId)
      : [...profile.contentThemes, themeId]

    setProfile({
      ...profile,
      contentThemes: updatedThemes
    })
  }

  const saveChanges = async () => {
    if (!profile || !hasChanges) return

    setSaving(true)
    try {
      const response = await fetch(`/api/businesses/${selectedBusiness}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      })

      const data = await response.json()
      if (data.success) {
        setOriginalProfile(JSON.parse(JSON.stringify(profile))) // Update original to match current
        setHasChanges(false)
        showMessage('success', 'Template preferences saved successfully!')
      } else {
        showMessage('error', data.error || 'Failed to save preferences')
      }
    } catch (error) {
      console.error('Failed to save profile:', error)
      showMessage('error', 'Failed to save template preferences')
    } finally {
      setSaving(false)
    }
  }

  const resetChanges = () => {
    if (originalProfile) {
      setProfile(JSON.parse(JSON.stringify(originalProfile)))
      setHasChanges(false)
    }
  }

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 5000)
  }

  const getEnabledCount = () => profile?.approvedTemplates.length || 0
  const getTotalCount = () => availableTemplates.length

  return (
    <CollapsibleSection title="🎨 Template Preferences" defaultExpanded={false}>
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
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-blue"></div>
                <span className="ml-3 text-dark-text">Loading template preferences...</span>
              </div>
            ) : (
              <>
                {/* Status Overview */}
                <div className="bg-slate-800/30 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-dark-text">📊 Current Status</h3>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-dark-text-muted">
                        {getEnabledCount()} of {getTotalCount()} templates enabled
                      </span>
                      {hasChanges && (
                        <span className="text-yellow-400 text-sm">● Unsaved changes</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <h4 className="font-medium text-dark-text mb-2">✅ Enabled Templates</h4>
                      <div className="text-sm text-dark-text-muted">
                        {profile?.approvedTemplates.length ? (
                          <ul className="space-y-1">
                            {profile.approvedTemplates.map(templateId => {
                              const template = availableTemplates.find(t => t.id === templateId)
                              return template ? (
                                <li key={templateId}>• {template.name}</li>
                              ) : null
                            })}
                          </ul>
                        ) : (
                          'No templates enabled'
                        )}
                      </div>
                    </div>
                    
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <h4 className="font-medium text-dark-text mb-2">🎨 Active Content Themes</h4>
                      <div className="text-sm text-dark-text-muted">
                        {profile?.contentThemes.length ? (
                          <ul className="space-y-1">
                            {profile.contentThemes.map(themeId => {
                              const theme = contentThemeOptions.find(t => t.id === themeId)
                              return theme ? (
                                <li key={themeId}>• {theme.name}</li>
                              ) : null
                            })}
                          </ul>
                        ) : (
                          'No content themes selected'
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Content Themes Selection */}
                <div className="bg-slate-800/30 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-dark-text mb-4">🎭 Content Themes</h3>
                  <p className="text-dark-text-muted mb-4">
                    Select the types of content you want the AI to create for your business:
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {contentThemeOptions.map(theme => (
                      <label key={theme.id} className="flex items-start gap-3 p-4 bg-slate-700/30 rounded-lg cursor-pointer hover:bg-slate-700/50 transition-colors">
                        <input
                          type="checkbox"
                          checked={profile?.contentThemes.includes(theme.id) ?? false}
                          onChange={() => toggleContentTheme(theme.id)}
                          className="w-4 h-4 text-accent-blue bg-gray-800 border-gray-600 rounded focus:ring-accent-blue mt-1"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-dark-text">{theme.name}</div>
                          <div className="text-sm text-dark-text-muted">{theme.description}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Available Templates */}
                <div className="bg-slate-800/30 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-dark-text mb-4">📋 Available Templates</h3>
                  <p className="text-dark-text-muted mb-4">
                    Choose which types of content templates the AI can use to generate posts:
                  </p>
                  
                  <div className="space-y-3">
                    {availableTemplates.map(template => {
                      const isEnabled = profile?.approvedTemplates.includes(template.id) ?? false
                      
                      return (
                        <div key={template.id} className={`p-4 rounded-lg border transition-all ${
                          isEnabled 
                            ? 'bg-green-400/10 border-green-400/20' 
                            : 'bg-slate-700/30 border-slate-600/50 hover:border-slate-500/50'
                        }`}>
                          <label className="flex items-start gap-4 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isEnabled}
                              onChange={() => toggleTemplate(template.id)}
                              className="w-5 h-5 text-accent-blue bg-gray-800 border-gray-600 rounded focus:ring-accent-blue mt-1"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="font-medium text-dark-text">{template.name}</h4>
                                <span className={`px-2 py-1 text-xs rounded ${
                                  template.category === 'Educational' ? 'bg-blue-600/20 text-blue-400' :
                                  template.category === 'Service' ? 'bg-green-600/20 text-green-400' :
                                  template.category === 'Marketing' ? 'bg-purple-600/20 text-purple-400' :
                                  template.category === 'Urgent' ? 'bg-red-600/20 text-red-400' :
                                  template.category === 'Company' ? 'bg-yellow-600/20 text-yellow-400' :
                                  'bg-gray-600/20 text-gray-400'
                                }`}>
                                  {template.category}
                                </span>
                              </div>
                              <p className="text-sm text-dark-text-muted mb-2">{template.description}</p>
                              <div className="text-xs text-dark-text-secondary italic">
                                Example: "{template.example}"
                              </div>
                            </div>
                          </label>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Save/Reset Actions */}
                <div className="bg-slate-800/30 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-dark-text">💾 Save Changes</h3>
                      <p className="text-sm text-dark-text-muted">
                        {hasChanges 
                          ? 'You have unsaved changes to your template preferences'
                          : 'All changes saved'
                        }
                      </p>
                    </div>
                    
                    <div className="flex gap-3">
                      {hasChanges && (
                        <button
                          onClick={resetChanges}
                          className="btn btn-outline"
                          disabled={saving}
                        >
                          🔄 Reset
                        </button>
                      )}
                      <button
                        onClick={saveChanges}
                        disabled={!hasChanges || saving}
                        className={`btn ${hasChanges ? 'btn-primary' : 'btn-outline opacity-50'}`}
                      >
                        {saving ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Saving...
                          </>
                        ) : (
                          <>💾 Save Changes</>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </CollapsibleSection>
  )
}