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
  brandVoice?: string
  businessProfile?: BusinessProfile
}

interface PlatformConfigInfo {
  platform: string
  isActive: boolean
  status: string
  hasCredentials: boolean
  configuredFields: string[]
}

const PLATFORM_FIELDS: Record<string, Array<{ key: string; label: string; type: string; placeholder: string }>> = {
  GOOGLE: [
    { key: 'accountId', label: 'Account ID', type: 'text', placeholder: 'Google Business Profile account ID' },
    { key: 'locationIds', label: 'Location IDs (comma-separated)', type: 'text', placeholder: '123456,789012' },
    { key: 'locationNames', label: 'Location Names (comma-separated)', type: 'text', placeholder: 'Main Office, Branch 2' }
  ],
  FACEBOOK: [
    { key: 'pageId', label: 'Page ID', type: 'text', placeholder: 'Facebook Page ID (numeric)' },
    { key: 'accessToken', label: 'Access Token', type: 'password', placeholder: 'Page access token' }
  ],
  INSTAGRAM: [
    { key: 'pageId', label: 'Facebook Page ID (linked to IG)', type: 'text', placeholder: 'Facebook Page ID that owns the IG account' },
    { key: 'accessToken', label: 'Access Token', type: 'password', placeholder: 'Meta access token' }
  ],
  TWITTER: [
    { key: 'consumerKey', label: 'Consumer Key (API Key)', type: 'password', placeholder: 'OAuth consumer key' },
    { key: 'consumerSecret', label: 'Consumer Secret', type: 'password', placeholder: 'OAuth consumer secret' },
    { key: 'accessToken', label: 'Access Token', type: 'password', placeholder: 'OAuth access token' },
    { key: 'accessTokenSecret', label: 'Access Token Secret', type: 'password', placeholder: 'OAuth access token secret' }
  ]
}

const PLATFORM_META: Record<string, { name: string; icon: string; color: string }> = {
  GOOGLE: { name: 'Google Business Profile', icon: '🏢', color: 'text-blue-400' },
  FACEBOOK: { name: 'Facebook', icon: '📘', color: 'text-blue-500' },
  INSTAGRAM: { name: 'Instagram', icon: '📷', color: 'text-pink-400' },
  TWITTER: { name: 'X / Twitter', icon: '🐦', color: 'text-sky-400' }
}

export default function BusinessProfileManager() {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [selectedBusiness, setSelectedBusiness] = useState('')
  const [profile, setProfile] = useState<BusinessProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // AI Guidelines (stored in autoPostSettings, separate from profile)
  const [aiGuidelines, setAiGuidelines] = useState('')

  // New business form
  const [showNewBusinessForm, setShowNewBusinessForm] = useState(false)
  const [newBusiness, setNewBusiness] = useState({ name: '', displayName: '', type: 'all', phone: '', website: '', tagline: '', brandVoice: '' })
  const [creatingBusiness, setCreatingBusiness] = useState(false)

  // Platform connections
  const [platformConfigs, setPlatformConfigs] = useState<PlatformConfigInfo[]>([])
  const [editingPlatform, setEditingPlatform] = useState<string | null>(null)
  const [platformCreds, setPlatformCreds] = useState<Record<string, string>>({})
  const [savingPlatform, setSavingPlatform] = useState(false)

  useEffect(() => { loadBusinesses() }, [])
  useEffect(() => {
    if (selectedBusiness) {
      loadBusinessProfile(selectedBusiness)
      loadPlatformConfigs(selectedBusiness)
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
    } catch { showMessage('error', 'Failed to load businesses') }
    finally { setLoading(false) }
  }

  const loadBusinessProfile = async (businessId: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/businesses/${businessId}/profile`)
      const data = await response.json()
      if (data.success) {
        setProfile(data.profile)
        // Load AI guidelines from autoPostSettings
        setAiGuidelines(data.profile?.autoPostSettings?.aiGuidelines || '')
      }
    } catch { showMessage('error', 'Failed to load profile') }
    finally { setLoading(false) }
  }

  const loadPlatformConfigs = async (businessId: string) => {
    try {
      const response = await fetch(`/api/businesses/${businessId}/platform-config`)
      const data = await response.json()
      if (data.success) setPlatformConfigs(data.configs || [])
    } catch { /* non-critical */ }
  }

  const saveProfile = async () => {
    if (!profile || !selectedBusiness) return
    setSaving(true)
    try {
      const response = await fetch(`/api/businesses/${selectedBusiness}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...profile, aiGuidelines })
      })
      const data = await response.json()
      if (data.success) {
        showMessage('success', 'Profile saved!')
        await loadBusinessProfile(selectedBusiness)
      } else {
        showMessage('error', data.error || 'Failed to save')
      }
    } catch { showMessage('error', 'Failed to save profile') }
    finally { setSaving(false) }
  }

  const createBusiness = async () => {
    if (!newBusiness.name || !newBusiness.displayName) {
      showMessage('error', 'Business name and display name are required')
      return
    }
    setCreatingBusiness(true)
    try {
      const response = await fetch('/api/businesses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBusiness)
      })
      const data = await response.json()
      if (data.success) {
        showMessage('success', `${data.business.displayName} created!`)
        setShowNewBusinessForm(false)
        setNewBusiness({ name: '', displayName: '', type: 'all', phone: '', website: '', tagline: '', brandVoice: '' })
        await loadBusinesses()
        setSelectedBusiness(data.business.id)
      } else {
        showMessage('error', data.error || 'Failed to create business')
      }
    } catch { showMessage('error', 'Failed to create business') }
    finally { setCreatingBusiness(false) }
  }

  const savePlatformConfig = async () => {
    if (!editingPlatform || !selectedBusiness) return
    setSavingPlatform(true)
    try {
      // Convert comma-separated fields to arrays for Google
      const credentials = { ...platformCreds }
      if (editingPlatform === 'GOOGLE') {
        if (credentials.locationIds) {
          (credentials as any).locationIds = credentials.locationIds.split(',').map((s: string) => s.trim()).filter(Boolean)
        }
        if (credentials.locationNames) {
          (credentials as any).locationNames = credentials.locationNames.split(',').map((s: string) => s.trim()).filter(Boolean)
        }
      }

      const response = await fetch(`/api/businesses/${selectedBusiness}/platform-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: editingPlatform, credentials })
      })
      const data = await response.json()
      if (data.success) {
        showMessage('success', `${PLATFORM_META[editingPlatform].name} credentials saved!`)
        setEditingPlatform(null)
        setPlatformCreds({})
        await loadPlatformConfigs(selectedBusiness)
      } else {
        showMessage('error', data.error || 'Failed to save')
      }
    } catch { showMessage('error', 'Failed to save platform config') }
    finally { setSavingPlatform(false) }
  }

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 5000)
  }

  const updateProfile = (updates: Partial<BusinessProfile>) => {
    if (profile) setProfile({ ...profile, ...updates })
  }

  const updateListField = (field: 'certifications' | 'serviceAreas', index: number, value: string) => {
    if (!profile) return
    const arr = [...profile[field]]
    arr[index] = value
    updateProfile({ [field]: arr })
  }

  const removeListItem = (field: 'certifications' | 'serviceAreas', index: number) => {
    if (!profile) return
    updateProfile({ [field]: profile[field].filter((_, i) => i !== index) })
  }

  const addListItem = (field: 'certifications' | 'serviceAreas') => {
    if (!profile) return
    updateProfile({ [field]: [...profile[field], ''] })
  }

  return (
    <CollapsibleSection title="Business Profile Management" defaultExpanded={false}>
      <div className="space-y-6">

        {/* Business Selector + Add New */}
        <div className="bg-slate-800/30 rounded-lg p-4 sm:p-6">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <h3 className="text-lg font-semibold text-dark-text">Select Business</h3>
            <button onClick={() => setShowNewBusinessForm(!showNewBusinessForm)} className="btn btn-sm btn-primary">
              {showNewBusinessForm ? 'Cancel' : '+ Add New Business'}
            </button>
          </div>

          {!showNewBusinessForm ? (
            <select value={selectedBusiness} onChange={(e) => setSelectedBusiness(e.target.value)} className="form-control w-full sm:max-w-md">
              <option value="">Choose a business...</option>
              {businesses.map(b => <option key={b.id} value={b.id}>{b.displayName} ({b.type})</option>)}
            </select>
          ) : (
            /* New Business Form */
            <div className="bg-slate-700/30 rounded-lg p-4 space-y-4 border border-slate-600/30">
              <h4 className="font-medium text-dark-text">New Business</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-dark-text mb-1">Full Business Name *</label>
                  <input type="text" value={newBusiness.name} onChange={(e) => setNewBusiness({ ...newBusiness, name: e.target.value })}
                    placeholder="Acme Air Conditioning & Heating" className="form-control" />
                </div>
                <div>
                  <label className="block text-sm text-dark-text mb-1">Display Name *</label>
                  <input type="text" value={newBusiness.displayName} onChange={(e) => setNewBusiness({ ...newBusiness, displayName: e.target.value })}
                    placeholder="Acme" className="form-control" />
                  <p className="text-xs text-dark-text-muted mt-1">Short name used in the app</p>
                </div>
                <div>
                  <label className="block text-sm text-dark-text mb-1">Business Type</label>
                  <select value={newBusiness.type} onChange={(e) => setNewBusiness({ ...newBusiness, type: e.target.value })} className="form-control">
                    <option value="all">All Services</option>
                    <option value="hvac">HVAC</option>
                    <option value="plumbing">Plumbing</option>
                    <option value="electrical">Electrical</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-dark-text mb-1">Phone</label>
                  <input type="tel" value={newBusiness.phone} onChange={(e) => setNewBusiness({ ...newBusiness, phone: e.target.value })}
                    placeholder="(555) 123-4567" className="form-control" />
                </div>
                <div>
                  <label className="block text-sm text-dark-text mb-1">Website</label>
                  <input type="url" value={newBusiness.website} onChange={(e) => setNewBusiness({ ...newBusiness, website: e.target.value })}
                    placeholder="https://example.com" className="form-control" />
                </div>
                <div>
                  <label className="block text-sm text-dark-text mb-1">Tagline</label>
                  <input type="text" value={newBusiness.tagline} onChange={(e) => setNewBusiness({ ...newBusiness, tagline: e.target.value })}
                    placeholder="Your trusted comfort experts" className="form-control" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-dark-text mb-1">Brand Voice</label>
                <textarea value={newBusiness.brandVoice} onChange={(e) => setNewBusiness({ ...newBusiness, brandVoice: e.target.value })}
                  placeholder="Describe the brand's personality: professional, friendly, bold, etc." className="form-control" rows={2} />
              </div>
              <button onClick={createBusiness} disabled={creatingBusiness} className="btn btn-success">
                {creatingBusiness ? 'Creating...' : 'Create Business'}
              </button>
            </div>
          )}
        </div>

        {message && (
          <div className={`p-4 rounded-lg border ${message.type === 'success' ? 'bg-green-400/10 border-green-400/20 text-green-400' : 'bg-red-400/10 border-red-400/20 text-red-400'}`}>
            {message.text}
          </div>
        )}

        {/* Platform Connections */}
        {selectedBusiness && (
          <div className="bg-slate-800/30 rounded-lg p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-dark-text mb-4">Platform Connections</h3>
            <p className="text-sm text-dark-text-muted mb-4">Configure API credentials for each platform to enable posting.</p>

            <div className="space-y-3">
              {Object.entries(PLATFORM_META).map(([platformKey, meta]) => {
                const config = platformConfigs.find(c => c.platform === platformKey)
                const isEditing = editingPlatform === platformKey

                return (
                  <div key={platformKey} className="bg-slate-700/30 rounded-lg border border-slate-600/30">
                    <div className="flex items-center justify-between p-3 sm:p-4">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{meta.icon}</span>
                        <div>
                          <span className={`font-medium ${meta.color}`}>{meta.name}</span>
                          <div className="text-xs text-dark-text-muted">
                            {config?.hasCredentials ? (
                              <span className="text-green-400">Configured ({config.configuredFields.length} fields)</span>
                            ) : (
                              <span className="text-slate-400">Not configured</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          if (isEditing) { setEditingPlatform(null); setPlatformCreds({}) }
                          else { setEditingPlatform(platformKey); setPlatformCreds({}) }
                        }}
                        className="btn btn-sm btn-outline"
                      >
                        {isEditing ? 'Cancel' : config?.hasCredentials ? 'Update' : 'Configure'}
                      </button>
                    </div>

                    {isEditing && (
                      <div className="border-t border-slate-600/30 p-3 sm:p-4 space-y-3 bg-slate-800/30">
                        {PLATFORM_FIELDS[platformKey].map(field => (
                          <div key={field.key}>
                            <label className="block text-sm font-medium text-dark-text mb-1">{field.label}</label>
                            <input
                              type={field.type}
                              value={platformCreds[field.key] || ''}
                              onChange={(e) => setPlatformCreds({ ...platformCreds, [field.key]: e.target.value })}
                              placeholder={field.placeholder}
                              className="form-control"
                            />
                          </div>
                        ))}
                        <p className="text-xs text-dark-text-secondary">
                          {config?.hasCredentials ? 'Leave fields blank to keep existing values. Only filled fields will be updated.' : 'Fill in all required fields to enable this platform.'}
                        </p>
                        <button onClick={savePlatformConfig} disabled={savingPlatform} className="btn btn-sm btn-success">
                          {savingPlatform ? 'Saving...' : 'Save Credentials'}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Profile Form */}
        {profile && selectedBusiness && (
          <div className="bg-slate-800/30 rounded-lg p-4 sm:p-6 space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h3 className="text-lg font-semibold text-dark-text">
                Profile: {businesses.find(b => b.id === selectedBusiness)?.displayName}
              </h3>
              <button onClick={saveProfile} disabled={saving} className="btn btn-success">
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>

            {/* AI Guidelines */}
            <div className="bg-slate-700/20 rounded-lg p-4 border border-slate-600/30">
              <h4 className="font-medium text-dark-text mb-2">AI Content Guidelines</h4>
              <p className="text-xs text-dark-text-muted mb-3">Custom rules the AI will follow when generating content for this business. These are injected into every prompt.</p>
              <textarea
                value={aiGuidelines}
                onChange={(e) => setAiGuidelines(e.target.value)}
                placeholder={"Examples:\n- Don't use emojis\n- Never mention seasonal weather\n- Always include a call-to-action with the phone number\n- Keep posts under 3 sentences\n- Never use the word \"expertise\""}
                className="form-control min-h-[100px]"
              />
            </div>

            {/* Brand Voice & Messaging */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium text-dark-text">Brand Voice & Messaging</h4>
                <div>
                  <label className="block text-sm font-medium text-dark-text mb-2">Brand Voice Description</label>
                  <textarea value={profile.brandVoice || ''} onChange={(e) => updateProfile({ brandVoice: e.target.value })}
                    placeholder="Describe your brand's personality and tone..." className="form-control min-h-[100px]" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-dark-text mb-2">Message Style</label>
                    <select value={profile.messageStyle || ''} onChange={(e) => updateProfile({ messageStyle: e.target.value })} className="form-control">
                      <option value="professional">Professional</option>
                      <option value="friendly">Friendly</option>
                      <option value="technical">Technical</option>
                      <option value="casual">Casual</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-text mb-2">Voice Tone</label>
                    <select value={profile.voiceTone || ''} onChange={(e) => updateProfile({ voiceTone: e.target.value })} className="form-control">
                      <option value="formal">Formal</option>
                      <option value="professional">Professional</option>
                      <option value="enthusiastic">Enthusiastic</option>
                      <option value="helpful">Helpful</option>
                      <option value="confident">Confident</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-dark-text">Contact Information</h4>
                <div>
                  <label className="block text-sm font-medium text-dark-text mb-2">Emergency Contact</label>
                  <input type="tel" value={profile.emergencyContact || ''} onChange={(e) => updateProfile({ emergencyContact: e.target.value })}
                    placeholder="24/7 emergency number" className="form-control" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-text mb-2">After Hours Phone</label>
                  <input type="tel" value={profile.afterHoursPhone || ''} onChange={(e) => updateProfile({ afterHoursPhone: e.target.value })}
                    placeholder="After hours contact" className="form-control" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-text mb-2">License Information</label>
                  <textarea value={profile.licenseInfo || ''} onChange={(e) => updateProfile({ licenseInfo: e.target.value })}
                    placeholder="License numbers, certifications..." className="form-control" />
                </div>
              </div>
            </div>

            {/* Certifications */}
            <div>
              <h4 className="font-medium text-dark-text mb-3">Certifications</h4>
              <div className="space-y-2">
                {profile.certifications.map((cert, i) => (
                  <div key={i} className="flex gap-2">
                    <input type="text" value={cert} onChange={(e) => updateListField('certifications', i, e.target.value)}
                      placeholder="Certification name" className="form-control flex-1" />
                    <button onClick={() => removeListItem('certifications', i)} className="btn btn-outline btn-sm text-red-400">Remove</button>
                  </div>
                ))}
                <button onClick={() => addListItem('certifications')} className="btn btn-outline btn-sm">+ Add Certification</button>
              </div>
            </div>

            {/* Service Areas */}
            <div>
              <h4 className="font-medium text-dark-text mb-3">Service Areas</h4>
              <div className="space-y-2">
                {profile.serviceAreas.map((area, i) => (
                  <div key={i} className="flex gap-2">
                    <input type="text" value={area} onChange={(e) => updateListField('serviceAreas', i, e.target.value)}
                      placeholder="City or region" className="form-control flex-1" />
                    <button onClick={() => removeListItem('serviceAreas', i)} className="btn btn-outline btn-sm text-red-400">Remove</button>
                  </div>
                ))}
                <button onClick={() => addListItem('serviceAreas')} className="btn btn-outline btn-sm">+ Add Service Area</button>
              </div>
            </div>

            {/* Service Types */}
            <div>
              <h4 className="font-medium text-dark-text mb-3">Service Types</h4>
              <div className="flex flex-wrap gap-3">
                {['hvac', 'plumbing', 'electrical', 'residential', 'commercial', 'emergency', 'maintenance'].map(type => (
                  <label key={type} className="flex items-center gap-2">
                    <input type="checkbox" checked={profile.serviceTypes.includes(type)}
                      onChange={(e) => {
                        if (e.target.checked) updateProfile({ serviceTypes: [...profile.serviceTypes, type] })
                        else updateProfile({ serviceTypes: profile.serviceTypes.filter(t => t !== type) })
                      }} className="rounded" />
                    <span className="text-sm text-dark-text capitalize">{type}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </CollapsibleSection>
  )
}
