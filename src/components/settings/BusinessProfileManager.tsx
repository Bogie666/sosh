// src/components/settings/BusinessProfileManager.tsx
'use client'

import { useState, useEffect } from 'react'
import CollapsibleSection from '../CollapsibleSection'

interface BusinessProfile {
  id: string
  businessId: string
  brandVoice: string
  messageStyle: string
  voiceTone: string
  emergencyContact?: string
  afterHoursPhone?: string
  licenseInfo?: string
  certifications: string[]
  businessHours: any
  serviceAreas: string[]
  serviceTypes: string[]
  contentThemes: string[]
  approvedTemplates: string[]
}

interface Business {
  id: string
  name: string
  displayName: string
  type: string
  website?: string
  phone?: string
  tagline?: string
  businessProfile?: BusinessProfile
}

export default function BusinessProfileManager() {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [selectedBusiness, setSelectedBusiness] = useState<string>('')
  const [profile, setProfile] = useState<BusinessProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)

  // Load businesses on component mount
  useEffect(() => {
    loadBusinesses()
  }, [])

  // Load profile when business selection changes
  useEffect(() => {
    if (selectedBusiness) {
      loadBusinessProfile(selectedBusiness)
    }
  }, [selectedBusiness])

  const loadBusinesses = async () => {
    setLoading(true)
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
    } finally {
      setLoading(false)
    }
  }

  const loadBusinessProfile = async (businessId: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/businesses/${businessId}/profile`)
      const data = await response.json()
      
      if (data.success) {
        setProfile(data.profile)
      } else {
        showMessage('error', data.error || 'Failed to load business profile')
      }
    } catch (error) {
      console.error('Failed to load business profile:', error)
      showMessage('error', 'Failed to load business profile')
    } finally {
      setLoading(false)
    }
  }

  const saveProfile = async () => {
    if (!profile || !selectedBusiness) return

    setSaving(true)
    try {
      const response = await fetch(`/api/businesses/${selectedBusiness}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      })

      const data = await response.json()
      
      if (data.success) {
        showMessage('success', 'Business profile updated successfully!')
        await loadBusinessProfile(selectedBusiness) // Refresh data
      } else {
        showMessage('error', data.error || 'Failed to save profile')
      }
    } catch (error) {
      console.error('Failed to save profile:', error)
      showMessage('error', 'Failed to save business profile')
    } finally {
      setSaving(false)
    }
  }

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 5000)
  }

  const updateProfile = (updates: Partial<BusinessProfile>) => {
    if (profile) {
      setProfile({ ...profile, ...updates })
    }
  }

  const addCertification = () => {
    if (profile) {
      updateProfile({
        certifications: [...profile.certifications, '']
      })
    }
  }

  const updateCertification = (index: number, value: string) => {
    if (profile) {
      const newCertifications = [...profile.certifications]
      newCertifications[index] = value
      updateProfile({ certifications: newCertifications })
    }
  }

  const removeCertification = (index: number) => {
    if (profile) {
      updateProfile({
        certifications: profile.certifications.filter((_, i) => i !== index)
      })
    }
  }

  const addServiceArea = () => {
    if (profile) {
      updateProfile({
        serviceAreas: [...profile.serviceAreas, '']
      })
    }
  }

  const updateServiceArea = (index: number, value: string) => {
    if (profile) {
      const newAreas = [...profile.serviceAreas]
      newAreas[index] = value
      updateProfile({ serviceAreas: newAreas })
    }
  }

  const removeServiceArea = (index: number) => {
    if (profile) {
      updateProfile({
        serviceAreas: profile.serviceAreas.filter((_, i) => i !== index)
      })
    }
  }

  if (loading && !profile) {
    return (
      <CollapsibleSection title="🏢 Business Profile Management" defaultExpanded={false}>
        <div className="flex items-center gap-3 p-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
          <span className="text-dark-text">Loading business profiles...</span>
        </div>
      </CollapsibleSection>
    )
  }

  return (
    <CollapsibleSection title="🏢 Business Profile Management" defaultExpanded={false}>
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
                {business.displayName} ({business.type.toUpperCase()})
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

        {/* Profile Form */}
        {profile && (
          <div className="bg-slate-800/30 rounded-lg p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-dark-text">
                Profile Settings for {businesses.find(b => b.id === selectedBusiness)?.displayName}
              </h3>
              <button
                onClick={saveProfile}
                disabled={saving}
                className="btn btn-success"
              >
                {saving ? '💾 Saving...' : '💾 Save Profile'}
              </button>
            </div>

            {/* Brand Voice & Messaging */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium text-dark-text">🎯 Brand Voice & Messaging</h4>
                
                <div>
                  <label className="block text-sm font-medium text-dark-text mb-2">
                    Brand Voice Description
                  </label>
                  <textarea
                    value={profile.brandVoice || ''}
                    onChange={(e) => updateProfile({ brandVoice: e.target.value })}
                    placeholder="Describe your brand's personality and tone..."
                    className="form-control min-h-[100px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-dark-text mb-2">
                      Message Style
                    </label>
                    <select
                      value={profile.messageStyle || ''}
                      onChange={(e) => updateProfile({ messageStyle: e.target.value })}
                      className="form-control"
                    >
                      <option value="professional">Professional</option>
                      <option value="friendly">Friendly</option>
                      <option value="technical">Technical</option>
                      <option value="casual">Casual</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-dark-text mb-2">
                      Voice Tone
                    </label>
                    <select
                      value={profile.voiceTone || ''}
                      onChange={(e) => updateProfile({ voiceTone: e.target.value })}
                      className="form-control"
                    >
                      <option value="formal">Formal</option>
                      <option value="professional">Professional</option>
                      <option value="enthusiastic">Enthusiastic</option>
                      <option value="helpful">Helpful</option>
                      <option value="confident">Confident</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <h4 className="font-medium text-dark-text">📞 Contact Information</h4>
                
                <div>
                  <label className="block text-sm font-medium text-dark-text mb-2">
                    Emergency Contact
                  </label>
                  <input
                    type="tel"
                    value={profile.emergencyContact || ''}
                    onChange={(e) => updateProfile({ emergencyContact: e.target.value })}
                    placeholder="24/7 emergency number"
                    className="form-control"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-text mb-2">
                    After Hours Phone
                  </label>
                  <input
                    type="tel"
                    value={profile.afterHoursPhone || ''}
                    onChange={(e) => updateProfile({ afterHoursPhone: e.target.value })}
                    placeholder="After hours contact"
                    className="form-control"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-text mb-2">
                    License Information
                  </label>
                  <textarea
                    value={profile.licenseInfo || ''}
                    onChange={(e) => updateProfile({ licenseInfo: e.target.value })}
                    placeholder="License numbers, certifications..."
                    className="form-control"
                  />
                </div>
              </div>
            </div>

            {/* Certifications */}
            <div>
              <h4 className="font-medium text-dark-text mb-3">🏆 Certifications</h4>
              <div className="space-y-2">
                {profile.certifications.map((cert, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={cert}
                      onChange={(e) => updateCertification(index, e.target.value)}
                      placeholder="Certification name"
                      className="form-control flex-1"
                    />
                    <button
                      onClick={() => removeCertification(index)}
                      className="btn btn-outline btn-sm text-red-400 hover:bg-red-400/10"
                    >
                      ❌
                    </button>
                  </div>
                ))}
                <button
                  onClick={addCertification}
                  className="btn btn-outline btn-sm"
                >
                  ➕ Add Certification
                </button>
              </div>
            </div>

            {/* Service Areas */}
            <div>
              <h4 className="font-medium text-dark-text mb-3">📍 Service Areas</h4>
              <div className="space-y-2">
                {profile.serviceAreas.map((area, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={area}
                      onChange={(e) => updateServiceArea(index, e.target.value)}
                      placeholder="City or region"
                      className="form-control flex-1"
                    />
                    <button
                      onClick={() => removeServiceArea(index)}
                      className="btn btn-outline btn-sm text-red-400 hover:bg-red-400/10"
                    >
                      ❌
                    </button>
                  </div>
                ))}
                <button
                  onClick={addServiceArea}
                  className="btn btn-outline btn-sm"
                >
                  ➕ Add Service Area
                </button>
              </div>
            </div>

            {/* Content Preferences */}
            <div>
              <h4 className="font-medium text-dark-text mb-3">🎨 Content Preferences</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-text mb-2">
                    Service Types
                  </label>
                  <div className="space-y-2">
                    {['residential', 'commercial', 'emergency', 'maintenance'].map(type => (
                      <label key={type} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={profile.serviceTypes.includes(type)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              updateProfile({ serviceTypes: [...profile.serviceTypes, type] })
                            } else {
                              updateProfile({ 
                                serviceTypes: profile.serviceTypes.filter(t => t !== type) 
                              })
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-sm text-dark-text capitalize">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-text mb-2">
                    Content Themes
                  </label>
                  <div className="space-y-2">
                    {['educational', 'seasonal', 'promotional', 'behind-scenes', 'customer-stories'].map(theme => (
                      <label key={theme} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={profile.contentThemes.includes(theme)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              updateProfile({ contentThemes: [...profile.contentThemes, theme] })
                            } else {
                              updateProfile({ 
                                contentThemes: profile.contentThemes.filter(t => t !== theme) 
                              })
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-sm text-dark-text capitalize">
                          {theme.replace('-', ' ')}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </CollapsibleSection>
  )
}