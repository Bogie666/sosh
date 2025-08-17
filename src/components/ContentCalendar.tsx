// src/components/ContentCalendar.tsx
'use client'

import { useState, useEffect } from 'react'
import CollapsibleSection from './CollapsibleSection'

type MonthlySpecials = {
  [month: number]: {
    [department: string]: string[]
  }
}

export default function ContentCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [monthlySpecials, setMonthlySpecials] = useState<MonthlySpecials>({})
  const [loading, setLoading] = useState(false)
  const [selectedBusinesses, setSelectedBusinesses] = useState(['lex-dallas', 'lex-etx', 'lyons'])
  const [selectedPlatforms, setSelectedPlatforms] = useState(['google', 'facebook', 'instagram', 'twitter'])
  const [generatedContent, setGeneratedContent] = useState('')

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const departments = ['service', 'parts', 'sales']

  const businesses = [
    { id: 'lex-dallas', name: 'Lex Dallas', color: 'text-blue-400' },
    { id: 'lex-etx', name: 'Lex ETX', color: 'text-green-400' },
    { id: 'lyons', name: 'Lyons', color: 'text-purple-400' }
  ]

  const platforms = [
    { id: 'google', name: 'Google Business Profile', icon: '🏢', color: 'text-blue-400' },
    { id: 'facebook', name: 'Facebook', icon: '📘', color: 'text-blue-600' },
    { id: 'instagram', name: 'Instagram', icon: '📷', color: 'text-pink-500' },
    { id: 'twitter', name: 'X/Twitter', icon: '🐦', color: 'text-sky-400' }
  ]

  useEffect(() => {
    loadMonthData(currentMonth)
  }, [currentMonth])

  const loadMonthData = async (monthIndex: number) => {
    // Load monthly specials data (this would come from your API)
    const defaultData = {
      service: [
        'Oil Change Special - $29.99',
        'Brake Inspection - FREE with service',
        'Tire Rotation - $19.99'
      ],
      parts: [
        'Genuine Parts - 10% off',
        'Battery Special - $99 installed',
        'Filter Replacement - 20% off'
      ],
      sales: [
        'New Vehicle Incentives',
        'Certified Pre-Owned Special',
        'Trade-in Bonus - Extra $500'
      ]
    }
    
    setMonthlySpecials(prev => ({
      ...prev,
      [monthIndex]: defaultData
    }))
  }

  const handleBusinessChange = (businessId: string) => {
    setSelectedBusinesses(prev => 
      prev.includes(businessId) 
        ? prev.filter(id => id !== businessId)
        : [...prev, businessId]
    )
  }

  const handlePlatformChange = (platformId: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platformId) 
        ? prev.filter(id => id !== platformId)
        : [...prev, platformId]
    )
  }

  const generateContent = async () => {
    if (selectedBusinesses.length === 0) {
      alert('Please select at least one business')
      return
    }
    if (selectedPlatforms.length === 0) {
      alert('Please select at least one platform')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/ai/generate-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: months[currentMonth],
          specials: monthlySpecials[currentMonth] || {},
          businesses: selectedBusinesses,
          platforms: selectedPlatforms
        })
      })
      
      const data = await response.json()
      if (data.success) {
        setGeneratedContent(data.content)
      } else {
        alert('Failed to generate content: ' + data.error)
      }
    } catch (error) {
      console.error('Content generation failed:', error)
      alert('Content generation failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <CollapsibleSection title="📅 Content Calendar" defaultExpanded={false}>
      <div className="space-y-8">
        {/* Month Selector */}
        <div className="flex items-center gap-4">
          <label className="text-dark-text font-medium">Month:</label>
          <select 
            value={currentMonth}
            onChange={(e) => setCurrentMonth(parseInt(e.target.value))}
            className="form-control max-w-xs"
          >
            {months.map((month, index) => (
              <option key={index} value={index}>{month}</option>
            ))}
          </select>
        </div>

        {/* Business Selection */}
        <div className="bg-slate-800/30 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-dark-text mb-4">Select Businesses</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {businesses.map(business => (
              <label key={business.id} className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700/70 transition-colors">
                <input
                  type="checkbox"
                  checked={selectedBusinesses.includes(business.id)}
                  onChange={() => handleBusinessChange(business.id)}
                  className="w-4 h-4 text-accent-blue bg-gray-800 border-gray-600 rounded focus:ring-accent-blue"
                />
                <span className={`font-medium ${business.color}`}>
                  {business.name}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Platform Selection */}
        <div className="bg-slate-800/30 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-dark-text mb-4">Select Platforms</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {platforms.map(platform => (
              <label key={platform.id} className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700/70 transition-colors">
                <input
                  type="checkbox"
                  checked={selectedPlatforms.includes(platform.id)}
                  onChange={() => handlePlatformChange(platform.id)}
                  className="w-4 h-4 text-accent-blue bg-gray-800 border-gray-600 rounded focus:ring-accent-blue"
                />
                <span className="text-lg">{platform.icon}</span>
                <span className={`text-sm font-medium ${platform.color}`}>
                  {platform.name}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Monthly Specials */}
        <div className="grid gap-6 lg:grid-cols-3">
          {departments.map(dept => (
            <div key={dept} className="bg-slate-800/50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-accent-blue capitalize mb-4">
                {dept} Specials
              </h3>
              
              <div className="space-y-3">
                {(monthlySpecials[currentMonth]?.[dept] || []).map((special: string, index: number) => (
                  <div key={index} className="p-3 bg-gray-700/50 rounded-lg">
                    <textarea
                      value={special}
                      onChange={(e) => {
                        const newSpecials = { ...monthlySpecials }
                        if (!newSpecials[currentMonth]) newSpecials[currentMonth] = {}
                        if (!newSpecials[currentMonth][dept]) newSpecials[currentMonth][dept] = []
                        newSpecials[currentMonth][dept][index] = e.target.value
                        setMonthlySpecials(newSpecials)
                      }}
                      className="w-full bg-transparent border-none text-dark-text text-sm resize-none focus:outline-none"
                      rows={2}
                    />
                  </div>
                ))}
                
                <button 
                  onClick={() => {
                    const newSpecials = { ...monthlySpecials }
                    if (!newSpecials[currentMonth]) newSpecials[currentMonth] = {}
                    if (!newSpecials[currentMonth][dept]) newSpecials[currentMonth][dept] = []
                    newSpecials[currentMonth][dept].push('New special...')
                    setMonthlySpecials(newSpecials)
                  }}
                  className="w-full p-2 border-2 border-dashed border-gray-600 rounded-lg text-dark-text-muted hover:border-accent-blue hover:text-accent-blue transition-colors"
                >
                  + Add Special
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Generate Content Button */}
        <div className="flex justify-center">
          <button 
            onClick={generateContent}
            disabled={loading || selectedBusinesses.length === 0 || selectedPlatforms.length === 0}
            className="btn btn-success"
          >
            {loading ? '🤖 Generating...' : `🤖 Generate Content for ${selectedBusinesses.length} Business${selectedBusinesses.length !== 1 ? 'es' : ''} & ${selectedPlatforms.length} Platform${selectedPlatforms.length !== 1 ? 's' : ''}`}
          </button>
        </div>

        {/* Generated Content Preview */}
        {generatedContent && (
          <div className="bg-green-900/20 border border-green-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-accent-green mb-4">🎯 Generated Content</h3>
            <div className="bg-gray-900/50 rounded-lg p-4">
              <pre className="text-dark-text whitespace-pre-wrap text-sm">{generatedContent}</pre>
            </div>
          </div>
        )}
      </div>
    </CollapsibleSection>
  )
}