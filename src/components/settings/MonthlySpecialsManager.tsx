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

  // FIXED: Helper function to safely get array values
  const getArrayValue = (obj: MonthlySpecial, key: keyof MonthlySpecial): string[] => {
    const value = obj[key];
    return Array.isArray(value) ? value : [];
  };

  useEffect(() => {
    loadBusinesses()
  }, [])

  useEffect(() => {
    if (selectedBusiness) {
      loadSpecials(selectedBusiness, selectedYear)
    }
  }, [selectedBusiness, selectedYear])

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

  const loadSpecials = async (businessId: string, year: number) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/businesses/${businessId}/monthly-specials?year=${year}`)
      const data = await response.json()
      
      if (data.success) {
        setSpecials(data.specials)
      } else {
        showMessage('error', data.error || 'Failed to load monthly specials')
      }
    } catch (error) {
      console.error('Failed to load monthly specials:', error)
      showMessage('error', 'Failed to load monthly specials')
    } finally {
      setLoading(false)
    }
  }

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 5000)
  }

  const getSpecialForMonth = (month: number): MonthlySpecial | null => {
    return specials.find(special => special.month === month) || null
  }

  const startEditingMonth = (month: number) => {
    const existing = getSpecialForMonth(month)
    
    if (existing) {
      setEditingSpecial({ ...existing })
    } else {
      // Create new special for this month
      setEditingSpecial({
        id: '',
        businessId: selectedBusiness,
        month,
        year: selectedYear,
        hvac: [],
        plumbing: [],
        electrical: [],
        all: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
    }
  }

  const saveSpecial = async () => {
    if (!editingSpecial) return

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
        await loadSpecials(selectedBusiness, selectedYear)
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
        showMessage('success', `Created specials for ${data.created} months`)
        await loadSpecials(selectedBusiness, selectedYear)
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
    <CollapsibleSection title="📅 Monthly Specials Manager" defaultExpanded={false}>
      <div className="space-y-6">
        
        {/* Business and Year Selection */}
        <div className="bg-slate-800/30 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-dark-text mb-4">Select Business & Year</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select
              value={selectedBusiness}
              onChange={(e) => setSelectedBusiness(e.target.value)}
              className="form-control"
            >
              <option value="">Choose a business...</option>
              {businesses.map(business => (
                <option key={business.id} value={business.id}>
                  {business.displayName} ({business.type.toUpperCase()})
                </option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="form-control"
            >
              {[2024, 2025, 2026].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
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
          <div className="space-y-6">
            
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
                            // FIXED: Use helper function for type-safe access
                            const count = special ? getArrayValue(special, serviceType.key as keyof MonthlySpecial).length : 0;
                            if (count === 0) return null
                            
                            return (
                              <div key={serviceType.key} className="flex items-center gap-2">
                                <span className={`text-sm ${serviceType.color}`}>
                                  {serviceType.label}
                                </span>
                                <span className="text-xs text-dark-text-muted">
                                  {count} special{count !== 1 ? 's' : ''}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-dark-text-muted text-sm">
                          No specials set
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Edit Modal */}
            {editingSpecial && (
              <div className="bg-slate-800/50 rounded-lg p-6 border border-blue-400/30">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-lg font-semibold text-dark-text">
                    Edit {MONTHS[editingSpecial.month]} {editingSpecial.year} Specials
                  </h4>
                  <div className="flex gap-2">
                    <button
                      onClick={saveSpecial}
                      disabled={saving}
                      className="btn btn-success"
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

                  {SERVICE_TYPES.map(serviceType => {
                    // FIXED: Use helper function for type-safe access
                    const items = getArrayValue(editingSpecial, serviceType.key as keyof MonthlySpecial);
                    
                    return (
                      <div key={serviceType.key} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h5 className={`font-medium ${serviceType.color}`}>
                            {serviceType.label}
                          </h5>
                          <button
                            onClick={() => addSpecialItem(serviceType.key as any)}
                            className="btn btn-outline btn-sm"
                          >
                            ➕ Add Special
                          </button>
                        </div>

                        <div className="space-y-2">
                          {/* FIXED: Use helper function result which is always an array */}
                          {items.map((special: string, index: number) => (
                            <div key={index} className="flex gap-2">
                              <input
                                type="text"
                                value={special}
                                onChange={(e) => updateSpecialItem(serviceType.key as any, index, e.target.value)}
                                placeholder={`Enter ${serviceType.label.toLowerCase()} special...`}
                                className="form-control flex-1"
                              />
                              <button
                                onClick={() => removeSpecialItem(serviceType.key as any, index)}
                                className="btn btn-outline btn-sm text-red-400 hover:bg-red-400/10"
                              >
                                ❌
                              </button>
                            </div>
                          ))}

                          {/* FIXED: Use helper function result which is always an array */}
                          {items.length === 0 && (
                            <div className="text-center py-3 text-dark-text-muted text-sm border-2 border-dashed border-slate-600/30 rounded">
                              No {serviceType.label.toLowerCase()} specials for this month
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </CollapsibleSection>
  )
}