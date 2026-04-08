// src/components/settings/MonthlySpecialsManager.tsx
'use client'

import { useState, useEffect } from 'react'
import CollapsibleSection from '../CollapsibleSection'

interface MonthlySpecial {
  id: string
  businessId: string
  month: number
  year: number
  hvac: string[]
  plumbing: string[]
  electrical: string[]
  all: string[]
  createdAt: string
  updatedAt: string
}

interface Business {
  id: string
  displayName: string
  type: string
}

// ADD NEW INTERFACE FOR ROTATION SETTINGS
interface RotationSettings {
  enabled: boolean
  hvacPercentage: number
  plumbingPercentage: number
  electricalPercentage: number
  allServicesPercentage: number
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const MONTH_THEMES = [
  'New Year, Healthy Home',
  'Sweet Home Savings', 
  'March Madness Savings',
  'Spring Into Savings',
  'Early Summer Preparation',
  'Beat the Heat',
  'Summer Savings',
  'Back to School Specials',
  'Fall Into Savings',
  'Early Bird Winter Prep',
  'Thanks & Giving',
  'Holiday Home Comfort'
]

const SERVICE_TYPES = [
  { key: 'hvac', label: '❄️ HVAC', color: 'text-blue-400' },
  { key: 'plumbing', label: '🚰 Plumbing', color: 'text-cyan-400' },
  { key: 'electrical', label: '⚡ Electrical', color: 'text-yellow-400' },
  { key: 'all', label: '🏠 All Services', color: 'text-green-400' }
]

export default function MonthlySpecialsManager() {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [selectedBusiness, setSelectedBusiness] = useState<string>('')
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [specials, setSpecials] = useState<MonthlySpecial[]>([])
  const [editingSpecial, setEditingSpecial] = useState<MonthlySpecial | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)

  // NEW STATE FOR ROTATION SETTINGS
  const [rotationSettings, setRotationSettings] = useState<RotationSettings>({
    enabled: true,
    hvacPercentage: 33,
    plumbingPercentage: 33, 
    electricalPercentage: 33,
    allServicesPercentage: 1
  })
  const [showRotationSettings, setShowRotationSettings] = useState(false)

  // Helper function to safely get array values
  const getArrayValue = (obj: MonthlySpecial, key: keyof MonthlySpecial): string[] => {
    const value = obj[key];
    return Array.isArray(value) ? value : [];
  }

  useEffect(() => {
    loadBusinesses()
  }, [])

  useEffect(() => {
    if (selectedBusiness) {
      loadSpecials()
      loadRotationSettings() // ADD THIS LINE
    }
  }, [selectedBusiness, selectedYear])

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), type === 'success' ? 3000 : 5000)
  }

  const loadBusinesses = async () => {
    try {
      const response = await fetch('/api/businesses')
      if (response.ok) {
        const data = await response.json()
        setBusinesses(data.businesses || [])
        if (data.businesses?.length > 0 && !selectedBusiness) {
          setSelectedBusiness(data.businesses[0].id)
        }
      }
    } catch (error) {
      console.error('Failed to load businesses:', error)
      showMessage('error', 'Failed to load businesses')
    }
  }

  // ADD NEW FUNCTION TO LOAD ROTATION SETTINGS
  const loadRotationSettings = async () => {
    if (!selectedBusiness) return

    try {
      const response = await fetch(`/api/business/specials-rotation?businessId=${selectedBusiness}`)
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setRotationSettings(result.data.rotationSettings)
        }
      }
    } catch (error) {
      console.error('Error loading rotation settings:', error)
    }
  }

  // ADD NEW FUNCTION TO SAVE ROTATION SETTINGS
  const saveRotationSettings = async () => {
    if (!selectedBusiness) return

    setSaving(true)
    try {
      const response = await fetch('/api/business/specials-rotation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: selectedBusiness,
          rotationSettings
        })
      })

      if (response.ok) {
        showMessage('success', '✅ Rotation settings saved successfully!')
      } else {
        throw new Error('Failed to save rotation settings')
      }
    } catch (error) {
      console.error('Error saving rotation settings:', error)
      showMessage('error', '❌ Failed to save rotation settings')
    } finally {
      setSaving(false)
    }
  }

  // ADD HELPER FUNCTIONS FOR ROTATION SETTINGS
  const resetToEqualDistribution = () => {
    setRotationSettings({
      ...rotationSettings,
      hvacPercentage: 33,
      plumbingPercentage: 33,
      electricalPercentage: 33,
      allServicesPercentage: 1
    })
  }

  const validatePercentages = () => {
    const total = rotationSettings.hvacPercentage + rotationSettings.plumbingPercentage + 
                  rotationSettings.electricalPercentage + rotationSettings.allServicesPercentage
    return Math.abs(total - 100) < 1 // Allow small rounding differences
  }

  const loadSpecials = async () => {
    if (!selectedBusiness) return

    setLoading(true)
    try {
      const response = await fetch(`/api/businesses/${selectedBusiness}/monthly-specials?year=${selectedYear}`)
      if (response.ok) {
        const data = await response.json()
        setSpecials(data.specials || [])
      } else {
        showMessage('error', 'Failed to load monthly specials')
      }
    } catch (error) {
      console.error('Failed to load monthly specials:', error)
      showMessage('error', 'Failed to load monthly specials')
    } finally {
      setLoading(false)
    }
  }

  const getSpecialForMonth = (month: number): MonthlySpecial | null => {
    return specials.find(s => s.month === month) || null
  }

  const startEditingMonth = (month: number) => {
    const existingSpecial = getSpecialForMonth(month)
    
    if (existingSpecial) {
      setEditingSpecial({
        ...existingSpecial,
        hvac: getArrayValue(existingSpecial, 'hvac'),
        plumbing: getArrayValue(existingSpecial, 'plumbing'),
        electrical: getArrayValue(existingSpecial, 'electrical'),
        all: getArrayValue(existingSpecial, 'all')
      })
    } else {
      // Create new special
      setEditingSpecial({
        id: '',
        businessId: selectedBusiness,
        month,
        year: selectedYear,
        hvac: [''],
        plumbing: [''],
        electrical: [''],
        all: [''],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
    }
  }

  const saveSpecial = async () => {
    if (!editingSpecial || !selectedBusiness) return

    setSaving(true)
    try {
      const url = editingSpecial.id 
        ? `/api/businesses/${selectedBusiness}/monthly-specials/${editingSpecial.id}`
        : `/api/businesses/${selectedBusiness}/monthly-specials`
      
      const method = editingSpecial.id ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: editingSpecial.month,
          year: editingSpecial.year,
          hvac: editingSpecial.hvac.filter(Boolean),
          plumbing: editingSpecial.plumbing.filter(Boolean),
          electrical: editingSpecial.electrical.filter(Boolean),
          all: editingSpecial.all.filter(Boolean)
        })
      })

      const data = await response.json()
      
      if (data.success) {
        showMessage('success', editingSpecial.id ? 'Monthly special updated!' : 'Monthly special created!')
        await loadSpecials()
        setEditingSpecial(null)
      } else {
        showMessage('error', data.error || 'Failed to save monthly special')
      }
    } catch (error) {
      console.error('Failed to save monthly special:', error)
      showMessage('error', 'Failed to save monthly special')
    } finally {
      setSaving(false)
    }
  }

  const updateEditingSpecial = (updates: Partial<MonthlySpecial>) => {
    if (editingSpecial) {
      setEditingSpecial({ ...editingSpecial, ...updates })
    }
  }

  const addSpecialItem = (serviceType: keyof Pick<MonthlySpecial, 'hvac' | 'plumbing' | 'electrical' | 'all'>) => {
    if (editingSpecial) {
      updateEditingSpecial({
        [serviceType]: [...editingSpecial[serviceType], '']
      })
    }
  }

  const updateSpecialItem = (
    serviceType: keyof Pick<MonthlySpecial, 'hvac' | 'plumbing' | 'electrical' | 'all'>, 
    index: number, 
    value: string
  ) => {
    if (editingSpecial) {
      const newArray = [...editingSpecial[serviceType]]
      newArray[index] = value
      updateEditingSpecial({ [serviceType]: newArray })
    }
  }

  const removeSpecialItem = (
    serviceType: keyof Pick<MonthlySpecial, 'hvac' | 'plumbing' | 'electrical' | 'all'>, 
    index: number
  ) => {
    if (editingSpecial) {
      const newArray = editingSpecial[serviceType].filter((_, i) => i !== index)
      updateEditingSpecial({ [serviceType]: newArray })
    }
  }

  const bulkCreateFromTemplate = async () => {
    if (!selectedBusiness) return

    if (!confirm('This will create specials for all 12 months based on industry templates. Existing specials will be preserved. Continue?')) {
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/businesses/${selectedBusiness}/monthly-specials/bulk-create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: selectedYear })
      })

      const data = await response.json()
      if (data.success) {
        showMessage('success', `✅ Created ${data.created} monthly specials from template!`)
        await loadSpecials()
      } else {
        showMessage('error', data.error || 'Failed to create bulk specials')
      }
    } catch (error) {
      console.error('Failed to create bulk specials:', error)
      showMessage('error', 'Failed to create bulk specials')
    } finally {
      setSaving(false)
    }
  }

  return (
    <CollapsibleSection title="🎯 Monthly Specials Manager" defaultExpanded={false}>
      <div className="space-y-6">
        {/* Business and Year Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-dark-text-secondary text-sm mb-2">Business</label>
            <select
              value={selectedBusiness}
              onChange={(e) => setSelectedBusiness(e.target.value)}
              className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-dark-text focus:border-blue-400 focus:outline-none"
            >
              <option value="">Select a business</option>
              {businesses.map(business => (
                <option key={business.id} value={business.id}>
                  {business.displayName}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-dark-text-secondary text-sm mb-2">Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-dark-text focus:border-blue-400 focus:outline-none"
            >
              {[2023, 2024, 2025, 2026].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Message */}
        {message && (
          <div className={`p-4 rounded border ${
            message.type === 'success' 
              ? 'bg-green-400/10 border-green-400/20 text-green-400' 
              : 'bg-red-400/10 border-red-400/20 text-red-400'
          }`}>
            {message.text}
          </div>
        )}

        {selectedBusiness && (
          <div className="space-y-6">
            
            {/* Rotation Settings */}
            <CollapsibleSection 
              title="🔄 Service Type Rotation Settings"
              defaultExpanded={false}
              className="mb-6"
            >
              <div className="space-y-6">
                <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-blue-400">ℹ️</span>
                    <span className="font-medium text-blue-300">Smart Rotation System</span>
                  </div>
                  <p className="text-sm text-blue-200">
                    Configure how monthly specials are distributed across HVAC, plumbing, and electrical services. 
                    The AI content generator will automatically rotate through service types to ensure balanced representation.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Rotation Toggle */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-dark-text font-medium">Enable Smart Rotation</label>
                      <button
                        onClick={() => setRotationSettings({...rotationSettings, enabled: !rotationSettings.enabled})}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          rotationSettings.enabled ? 'bg-blue-600' : 'bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                            rotationSettings.enabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                    <p className="text-sm text-dark-text-muted">
                      When enabled, the content generator will automatically rotate between service types for balanced content distribution.
                    </p>
                  </div>

                  {/* Service Distribution */}
                  <div className="space-y-4">
                    <h4 className="text-dark-text font-medium">Service Type Distribution</h4>
                    
                    {/* HVAC Percentage */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-sm text-blue-400">❄️ HVAC</label>
                        <span className="text-sm text-dark-text">{rotationSettings.hvacPercentage}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={rotationSettings.hvacPercentage}
                        onChange={(e) => setRotationSettings({
                          ...rotationSettings,
                          hvacPercentage: parseInt(e.target.value)
                        })}
                        disabled={!rotationSettings.enabled}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-blue"
                      />
                    </div>

                    {/* Plumbing Percentage */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-sm text-cyan-400">🚰 Plumbing</label>
                        <span className="text-sm text-dark-text">{rotationSettings.plumbingPercentage}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={rotationSettings.plumbingPercentage}
                        onChange={(e) => setRotationSettings({
                          ...rotationSettings,
                          plumbingPercentage: parseInt(e.target.value)
                        })}
                        disabled={!rotationSettings.enabled}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-cyan"
                      />
                    </div>

                    {/* Electrical Percentage */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-sm text-yellow-400">⚡ Electrical</label>
                        <span className="text-sm text-dark-text">{rotationSettings.electricalPercentage}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={rotationSettings.electricalPercentage}
                        onChange={(e) => setRotationSettings({
                          ...rotationSettings,
                          electricalPercentage: parseInt(e.target.value)
                        })}
                        disabled={!rotationSettings.enabled}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-yellow"
                      />
                    </div>

                    {/* All Services Percentage */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-sm text-green-400">🏠 All Services</label>
                        <span className="text-sm text-dark-text">{rotationSettings.allServicesPercentage}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="10"
                        value={rotationSettings.allServicesPercentage}
                        onChange={(e) => setRotationSettings({
                          ...rotationSettings,
                          allServicesPercentage: parseInt(e.target.value)
                        })}
                        disabled={!rotationSettings.enabled}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-green"
                      />
                    </div>

                    {/* Total Percentage Display */}
                    <div className="mt-4 p-3 bg-gray-800 rounded border">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-dark-text-muted">Total Distribution:</span>
                        <span className={`text-sm font-bold ${
                          validatePercentages() ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {rotationSettings.hvacPercentage + rotationSettings.plumbingPercentage + 
                           rotationSettings.electricalPercentage + rotationSettings.allServicesPercentage}%
                        </span>
                      </div>
                      {!validatePercentages() && (
                        <p className="text-xs text-red-400 mt-1">
                          ⚠️ Percentages should total approximately 100%
                        </p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={resetToEqualDistribution}
                        disabled={!rotationSettings.enabled}
                        className="btn btn-outline btn-sm"
                      >
                        ⚖️ Reset to Equal
                      </button>
                      <button
                        onClick={saveRotationSettings}
                        disabled={saving || !validatePercentages() || !rotationSettings.enabled}
                        className="btn btn-primary btn-sm flex-1"
                      >
                        {saving ? '💾 Saving...' : '💾 Save Settings'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Preview Distribution */}
                {rotationSettings.enabled && (
                  <div className="bg-slate-800/30 rounded-lg p-4">
                    <h4 className="text-dark-text font-medium mb-3">🔮 Rotation Preview</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="text-center">
                        <div className="text-blue-400 font-bold text-lg">{rotationSettings.hvacPercentage}%</div>
                        <div className="text-blue-300">HVAC Content</div>
                      </div>
                      <div className="text-center">
                        <div className="text-cyan-400 font-bold text-lg">{rotationSettings.plumbingPercentage}%</div>
                        <div className="text-cyan-300">Plumbing Content</div>
                      </div>
                      <div className="text-center">
                        <div className="text-yellow-400 font-bold text-lg">{rotationSettings.electricalPercentage}%</div>
                        <div className="text-yellow-300">Electrical Content</div>
                      </div>
                      <div className="text-center">
                        <div className="text-green-400 font-bold text-lg">{rotationSettings.allServicesPercentage}%</div>
                        <div className="text-green-300">All Services</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleSection>
            
            {/* Bulk Actions */}
            <div className="bg-slate-800/30 rounded-lg p-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <h3 className="text-lg font-semibold text-dark-text">
                  {selectedYear} Specials for {businesses.find(b => b.id === selectedBusiness)?.displayName}
                </h3>
                <button
                  onClick={bulkCreateFromTemplate}
                  disabled={saving}
                  className="btn btn-primary"
                >
                  {saving ? '🔄 Creating...' : '🚀 Create From Template'}
                </button>
              </div>
              <p className="text-sm text-dark-text-muted mt-2">
                Quickly populate all months with industry-standard HVAC, plumbing, and electrical specials.
              </p>
            </div>

            {/* Calendar View */}
            {loading ? (
              <div className="flex items-center gap-3 p-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
                <span className="text-dark-text">Loading monthly specials...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {MONTHS.map((monthName, monthIndex) => {
                  const special = getSpecialForMonth(monthIndex)
                  const totalSpecials = special ? 
                    special.hvac.length + special.plumbing.length + special.electrical.length + special.all.length : 0
                  
                  return (
                    <div 
                      key={monthIndex}
                      className="bg-slate-800/30 rounded-lg p-4 border border-slate-600/30 hover:border-slate-500/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-medium text-dark-text">{monthName}</h4>
                          <p className="text-xs text-dark-text-muted">{MONTH_THEMES[monthIndex]}</p>
                        </div>
                        <button
                          onClick={() => startEditingMonth(monthIndex)}
                          className="btn btn-outline btn-sm"
                        >
                          {special ? '✏️ Edit' : '➕ Add'}
                        </button>
                      </div>
                      
                      {totalSpecials > 0 ? (
                        <div className="space-y-2">
                          {SERVICE_TYPES.map(serviceType => {
                            const serviceSpecials = special ? getArrayValue(special, serviceType.key as keyof MonthlySpecial) : []
                            return serviceSpecials.length > 0 && (
                              <div key={serviceType.key} className="text-xs">
                                <span className={`${serviceType.color} font-medium`}>
                                  {serviceType.label}:
                                </span>
                                <span className="text-dark-text-muted ml-1">
                                  {serviceSpecials.length} special{serviceSpecials.length > 1 ? 's' : ''}
                                </span>
                              </div>
                            )
                          })}
                          <div className="text-xs text-dark-text-muted pt-2 border-t border-slate-600/30">
                            Total: {totalSpecials} specials
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-dark-text-muted text-center py-4">
                          No specials configured
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Editing Modal */}
        {editingSpecial && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50">
            <div className="bg-slate-800 rounded-t-xl sm:rounded-lg p-4 sm:p-6 w-full sm:max-w-4xl sm:mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-dark-text">
                  📅 {MONTHS[editingSpecial.month]} {editingSpecial.year} Specials
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={saveSpecial}
                    disabled={saving}
                    className="btn btn-primary"
                  >
                    {saving ? '💾 Saving...' : '💾 Save'}
                  </button>
                  <button
                    onClick={() => setEditingSpecial(null)}
                    className="btn btn-outline"
                  >
                    Cancel
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-slate-900/30 rounded-lg p-4 mb-4">
                  <h5 className="font-medium text-dark-text mb-2">
                    📅 {MONTHS[editingSpecial.month]} Theme: {MONTH_THEMES[editingSpecial.month]}
                  </h5>
                  <p className="text-sm text-dark-text-muted">
                    Consider seasonal factors, holidays, and customer needs for this month.
                  </p>
                </div>

                {SERVICE_TYPES.map(serviceType => (
                  <div key={serviceType.key} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className={`font-medium ${serviceType.color}`}>
                        {serviceType.label} Specials
                      </h4>
                      <button
                        onClick={() => addSpecialItem(serviceType.key as keyof Pick<MonthlySpecial, 'hvac' | 'plumbing' | 'electrical' | 'all'>)}
                        className="btn btn-outline btn-sm"
                      >
                        ➕ Add Special
                      </button>
                    </div>

                    <div className="space-y-2">
                      {getArrayValue(editingSpecial, serviceType.key as keyof MonthlySpecial).map((special, index) => (
                        <div key={index} className="flex gap-2">
                          <input
                            type="text"
                            value={special}
                            onChange={(e) => updateSpecialItem(
                              serviceType.key as keyof Pick<MonthlySpecial, 'hvac' | 'plumbing' | 'electrical' | 'all'>, 
                              index, 
                              e.target.value
                            )}
                            placeholder={`Enter ${serviceType.label.toLowerCase()} special...`}
                            className="flex-1 p-2 bg-gray-800 border border-gray-600 rounded text-dark-text focus:border-blue-400 focus:outline-none"
                          />
                          <button
                            onClick={() => removeSpecialItem(
                              serviceType.key as keyof Pick<MonthlySpecial, 'hvac' | 'plumbing' | 'electrical' | 'all'>, 
                              index
                            )}
                            className="btn btn-outline btn-sm text-red-400 hover:bg-red-900/20"
                          >
                            🗑️
                          </button>
                        </div>
                      ))}

                      {getArrayValue(editingSpecial, serviceType.key as keyof MonthlySpecial).length === 0 && (
                        <div className="text-sm text-dark-text-muted text-center py-4 border-2 border-dashed border-gray-600 rounded">
                          No {serviceType.label.toLowerCase()} specials yet
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </CollapsibleSection>
  )
}