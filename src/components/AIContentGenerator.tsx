// src/components/AIContentGenerator.tsx
'use client'

import { useState, useEffect } from 'react'
import CollapsibleSection from './CollapsibleSection'

// Business and Platform options like Content Calendar
const BUSINESSES = [
  { id: 'lex-dallas', name: 'Lex Dallas', color: 'text-blue-400' },
  { id: 'lex-etx', name: 'Lex ETX', color: 'text-green-400' },
  { id: 'lyons', name: 'Lyons', color: 'text-purple-400' }
]

const PLATFORMS = [
  { id: 'google', name: 'Google Business Profile', icon: '🏢', color: 'text-blue-400' },
  { id: 'facebook', name: 'Facebook', icon: '📘', color: 'text-blue-500' },
  { id: 'instagram', name: 'Instagram', icon: '📷', color: 'text-pink-400' },
  { id: 'twitter', name: 'X/Twitter', icon: '🐦', color: 'text-sky-400' }
]

// Type-safe monthly specials
type MonthlySpecials = {
  [month: number]: {
    hvac?: string[]
    plumbing?: string[]
    electrical?: string[]
    all?: string[]
  }
}

// Real 2025 specials data from your document
const MONTHLY_SPECIALS_2025: MonthlySpecials = {
  0: { // January - New Year, Healthy Home
    hvac: [
      'Air purifier installation special (Free duct cleaning w/ Premier One)',
    ],
    plumbing: [
      'Free water quality test with inspection or any service',
    ],
    electrical: [
      '2 Free USB plug w/ Whole-house surge/power conditioner installation',
    ]
  },
  1: { // February - Sweet Home Savings
    hvac: [
      'Free CO detector ($199) with purchase of a Premier One UV kit and keep the ones you love healthy',
      'Cool Club Deal - BOGO ½ Off',
    ],
    plumbing: [
      'Sweetheart Deal - Free water heater flush with any plumbing repair',
      'Free water quality test with inspection or any service',
    ],
    electrical: [
      '25% off LED lighting upgrade package or unlimited can lighting',
      'Ceiling fan installation special for only $150',
    ]
  },
  2: { // March - March Madness Savings
    hvac: [
      '20% off full system replacements',
      'Pre-season AC tune-up special -$49',
    ],
    plumbing: [
      'Texas Independence Special - $1836 50 Gal Tank water heater installed',
      'Garbage disposal replacement promotion - Badger 1/2hp Disposal installed $450',
    ],
    electrical: [
      'Panel upgrade - As low as $89 per month',
      '20% Off Any Repair',
    ]
  },
  3: { // April - Spring Into Savings
    hvac: [
      'HVAC deluxe drain cleaning special $270 (reg $450)',
      'Solar attic fan installation - Starting at $1250',
    ],
    plumbing: [
      '½ off area drains/french drains (valued at $450-$650)',
      'Sewer line inspection discount (A $313 value for free!)',
    ],
    electrical: [
      'Free whole home surge protector & power conditioner ($1870) w/ purchase of a new electrical panel',
      '25% Off Outdoor lighting packages',
    ]
  },
  4: { // May - Early Summer Preparation
    hvac: [
      'Up to 15% off replacement & Free surge protection with new system',
      'Free service call with repairs',
    ],
    plumbing: [
      'Water heater replacement special -Tank to tankless upgrade get $1000 Off',
      'Leak detection service package 25% OFF',
    ],
    electrical: [
      'Generator overstock special - Up to $3000 Off',
    ]
  },
  5: { // June - Beat the Heat/Wishing Dad & Grads a Joyful June
    hvac: [
      'Energy savings special 10% off blown insulation',
      '0% for 60mo financing on new systems',
    ],
    plumbing: [
      'Free camera inspection with drain cleaning ($99)',
      '33% Off bidet conversion seat (electrical not included)',
    ],
    electrical: [
      'Free attic lighting or security lighting ($600 Value) with purchase of re-device or panel upgrade',
      'EV charger installation $600 (restrictions apply - panel in garage)',
    ]
  },
  6: { // July - Summer Savings/Independence day
    hvac: [
      'Same day emergency system replacement',
      '½ Off with any approved repair - Compressor Saver Kit, Hard Start Kit ($225 value)',
    ],
    plumbing: [
      'Free flood stop w/ water heater install ($875 value)',
      'Hydro jetting special -25% Off',
    ],
    electrical: [
      '25% Off unlimited can lighting',
    ]
  },
  7: { // August - Back to School Specials
    hvac: [
      'Multi-system discount for 2+ system homes',
      '25% Off any UV light/air purifier',
    ],
    plumbing: [
      'Back to school drain clearing special - $93 or it\'s Free',
      'Water softener or filtration discount -Up to $1000 Off',
    ],
    electrical: [
      '25% Off any electrical repair',
      '2 Free USB plug w/ Whole-house surge/power conditioner installation',
    ]
  },
  8: { // September - Fall Into Savings
    hvac: [
      'Free Furnace special ($3500 value)',
      'Heat Tune-up package - $49',
    ],
    plumbing: [
      'Free fire pit or gill with new gas line (Never deal with Propane again!)',
    ],
    electrical: [
      'Free outdoor circuit and plug w/ purchase of decorative outdoor LED lighting (up to $650 value for free!)',
    ]
  },
  9: { // October - Early Bird Winter Prep
    hvac: [
      'Furnace cleaning Kit (Air Scrubber UV light, pull and clean blower assembly, clean burner assembly, and R/A plenum) (Original Cost is $2240 – $750 off)',
      'Replace or install new CO detector ($199) with purchase of electrostatic filtration and keep the ones you love healthy',
    ],
    plumbing: [
      '$200 Off new power flush toilet',
    ],
    electrical: [
      'Free outdoor circuit and plug w/ purchase of permanent LED lighting installation',
      'Electrical safety inspection (free with any paid service)',
    ]
  },
  10: { // November - Thanks & Giving
    hvac: [
      'Black Friday system installation special - 30% Off (new & open estimates)',
      'Free outdoor unit w/ the purchase of indoor HVAC equipment',
      'BOGO Cool Club – free HVAC, Plumbing, or Electric inspection to a friend or family in our service area',
    ],
    plumbing: [
      'Garbage disposal replacement promotion - Badger 1/2hp Disposal installed $450',
    ],
    electrical: [
      'Free outdoor circuit and plug w/ purchase of permanent LED lighting installation',
    ]
  },
  11: { // December - Holiday Home Comfort
    all: [
      'Year-end clearance and sale. Up to 30% off all repairs and up to 30% off all replacement if done in December',
    ]
  }
}

const MONTH_THEMES = [
  'New Year, Healthy Home',
  'Sweet Home Savings',
  'March Madness Savings',
  'Spring Into Savings',
  'Early Summer Preparation',
  'Beat the Heat/Wishing Dad & Grads a Joyful June',
  'Summer Savings/Independence Day',
  'Back to School Specials',
  'Fall Into Savings',
  'Early Bird Winter Prep',
  'Thanks & Giving',
  'Holiday Home Comfort'
]

const DAILY_THEMES = {
  monday: { theme: 'Monday Motivation', focus: 'Energetic special highlights' },
  tuesday: { theme: 'Tuesday Tips', focus: 'Educational HVAC/plumbing/electrical tips' },
  wednesday: { theme: 'Wednesday Specials', focus: 'Mid-week featured specials' },
  thursday: { theme: 'Thursday Maintenance', focus: 'Maintenance reminders' },
  friday: { theme: 'Friday Prep', focus: 'Weekend prep content' }
}

interface WeeklyPost {
  id: string
  business: string
  day: string
  content: string
  platform: string
  characterCount: number
  withinLimits: boolean
  status: 'generating' | 'completed' | 'error'
}

interface AICapabilities {
  isConfigured: boolean
  currentSeason: string
  availableTemplates: Array<{
    id: string
    name: string
    description: string
    category: string
    frequency: string
  }>
  supportedPlatforms: Array<{
    id: string
    name: string
    icon: string
    specs: any
  }>
  supportedBusinesses: Array<{
    id: string
    name: string
    voice: string
    tagline: string
  }>
}

export default function AIContentGenerator() {
  const [capabilities, setCapabilities] = useState<AICapabilities | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [selectedBusiness, setSelectedBusiness] = useState('lex')
  const [selectedPlatform, setSelectedPlatform] = useState('facebook')
  const [customPrompt, setCustomPrompt] = useState('')
  const [generatedContent, setGeneratedContent] = useState('')
  const [contentMetadata, setContentMetadata] = useState<any>(null)
  
  // Multi-selection state like Content Calendar
  const [selectedBusinesses, setSelectedBusinesses] = useState<string[]>(['lex-dallas', 'lex-etx', 'lyons'])
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['google', 'facebook', 'instagram', 'twitter'])
  
  // Weekly generation state
  const [weeklyPosts, setWeeklyPosts] = useState<WeeklyPost[]>([])
  const [isGeneratingWeek, setIsGeneratingWeek] = useState(false)
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 })
  
  // Posting state
  const [isPosting, setIsPosting] = useState(false)
  const [postingProgress, setPostingProgress] = useState({ current: 0, total: 0, currentAction: '' })
  const [postingResults, setPostingResults] = useState<Array<{
    business: string
    day: string
    platform: string
    success: boolean
    error?: string
    postId?: string
  }>>([])
  
  // Specials editing state
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [editableSpecials, setEditableSpecials] = useState<MonthlySpecials>(MONTHLY_SPECIALS_2025)
  const [editingSpecials, setEditingSpecials] = useState(false)

  // Updated to use selected businesses
  const businesses = selectedBusinesses.map(id => id.replace('-', ''))
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']

  // Handle business selection changes
  const handleBusinessChange = (businessId: string) => {
    setSelectedBusinesses(prev => 
      prev.includes(businessId) 
        ? prev.filter(id => id !== businessId)
        : [...prev, businessId]
    )
  }

  // Handle platform selection changes  
  const handlePlatformChange = (platformId: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platformId) 
        ? prev.filter(id => id !== platformId)
        : [...prev, platformId]
    )
  }

  useEffect(() => {
    fetchCapabilities()
  }, [])

  const fetchCapabilities = async () => {
    try {
      const response = await fetch('/api/ai/generate-content')
      const data = await response.json()
      
      if (data.success) {
        setCapabilities(data)
        if (data.availableTemplates?.length > 0) {
          setSelectedTemplate(data.availableTemplates[0].id)
        }
      }
    } catch (error) {
      console.error('Error fetching AI capabilities:', error)
    }
  }

  const buildDailyPrompt = (day: string, dailyTheme: any, monthSpecials: any, monthTheme: string) => {
    const specialsList = Object.entries(monthSpecials)
      .flatMap(([dept, items]) => 
        Array.isArray(items) ? items.map(item => `${dept.toUpperCase()}: ${item}`) : []
      )

    return `Create a ${dailyTheme.theme} social media post for ${monthTheme}.

DAILY FOCUS: ${dailyTheme.focus}

CURRENT SPECIALS TO HIGHLIGHT:
${specialsList.join('\n')}

REQUIREMENTS:
- Match the ${dailyTheme.theme} energy and tone
- ${dailyTheme.focus}
- Include 1-2 relevant specials naturally
- Use engaging, action-oriented language
- Include relevant emojis
- End with a clear call-to-action

Make it feel authentic and engaging, not salesy.`
  }

  const generateWeeklyContent = async () => {
    if (!capabilities?.isConfigured) {
      alert('AI service not configured')
      return
    }

    if (selectedBusinesses.length === 0) {
      alert('Please select at least one business')
      return
    }

    if (selectedPlatforms.length === 0) {
      alert('Please select at least one platform')
      return
    }

    setIsGeneratingWeek(true)
    const totalPosts = selectedBusinesses.length * days.length
    setGenerationProgress({ current: 0, total: totalPosts })
    
    const newPosts: WeeklyPost[] = []
    let progressCount = 0

    // Initialize all posts for selected businesses
    for (const businessId of selectedBusinesses) {
      const businessName = businessId.replace('-', '')
      for (const day of days) {
        newPosts.push({
          id: `${businessId}-${day}`,
          business: businessName,
          day,
          content: '',
          platform: selectedPlatforms[0], // Use first selected platform for display
          characterCount: 0,
          withinLimits: true,
          status: 'generating'
        })
      }
    }
    setWeeklyPosts(newPosts)

    // Generate content for each post
    for (let i = 0; i < newPosts.length; i++) {
      const post = newPosts[i]
      const dailyTheme = DAILY_THEMES[post.day as keyof typeof DAILY_THEMES]
      const monthSpecials = editableSpecials[currentMonth] || {}
      const monthTheme = MONTH_THEMES[currentMonth]

      try {
        const prompt = buildDailyPrompt(post.day, dailyTheme, monthSpecials, monthTheme)
        
        const response = await fetch('/api/ai/generate-content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            businessName: post.business,
            platform: selectedPlatforms[0],
            contentType: 'weekly-automation'
          })
        })

        const data = await response.json()
        
        if (data.success) {
          const platformSpecs = capabilities?.supportedPlatforms.find(p => p.id === selectedPlatforms[0])?.specs
          const withinLimits = data.content.length <= (platformSpecs?.maxLength || 1000)
          
          newPosts[i] = {
            ...post,
            content: data.content,
            characterCount: data.content.length,
            withinLimits,
            status: 'completed'
          }
        } else {
          newPosts[i] = { ...post, status: 'error' }
        }
      } catch (error) {
        console.error('Error generating post:', error)
        newPosts[i] = { ...post, status: 'error' }
      }

      progressCount++
      setGenerationProgress({ current: progressCount, total: totalPosts })
      setWeeklyPosts([...newPosts])
      
      // Small delay to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    setIsGeneratingWeek(false)
  }

  const postAllContent = async () => {
    const completedPosts = weeklyPosts.filter(p => p.content && p.status === 'completed')
    if (completedPosts.length === 0) {
      alert('No completed posts to share')
      return
    }

    setIsPosting(true)
    setPostingProgress({ current: 0, total: completedPosts.length * 4, currentAction: 'Starting posts...' }) // 4 platforms per post
    setPostingResults([])

    const results: typeof postingResults = []
    let progressCount = 0

    for (const post of completedPosts) {
      // Post to each platform
      const platforms = ['google', 'facebook', 'instagram', 'twitter'] // Get from user selection in real implementation
      
      for (const platform of platforms) {
        setPostingProgress(prev => ({ 
          ...prev, 
          current: progressCount,
          currentAction: `Posting ${post.business} ${post.day} to ${platform}...`
        }))

        try {
          const response = await fetch('/api/social/create-posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: post.content,
              contentType: 'EVENT',
              platforms: [platform],
              businesses: [post.business],
              scheduling: null // Immediate posting
            })
          })

          const data = await response.json()
          
          if (data.success && data.results?.length > 0) {
            results.push({
              business: post.business,
              day: post.day,
              platform,
              success: true,
              postId: data.results[0].postId
            })
          } else {
            results.push({
              business: post.business,
              day: post.day,
              platform,
              success: false,
              error: data.error || 'Unknown error'
            })
          }
        } catch (error) {
          results.push({
            business: post.business,
            day: post.day,
            platform,
            success: false,
            error: error instanceof Error ? error.message : 'Network error'
          })
        }

        progressCount++
        setPostingProgress(prev => ({ ...prev, current: progressCount }))
        
        // Small delay to prevent rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    setPostingResults(results)
    setIsPosting(false)
    
    const successCount = results.filter(r => r.success).length
    const totalCount = results.length
    alert(`Posting complete! ${successCount}/${totalCount} posts successful`)
  }

  const scheduleWeeklyPosts = async () => {
    const completedPosts = weeklyPosts.filter(p => p.content && p.status === 'completed')
    if (completedPosts.length === 0) {
      alert('No completed posts to schedule')
      return
    }

    setIsPosting(true)
    setPostingProgress({ current: 0, total: completedPosts.length, currentAction: 'Scheduling posts...' })
    setPostingResults([])

    const results: typeof postingResults = []
    let progressCount = 0

    // Get Monday of current week for scheduling
    const today = new Date()
    const monday = new Date(today.setDate(today.getDate() - today.getDay() + 1))

    for (const post of completedPosts) {
      setPostingProgress(prev => ({ 
        ...prev, 
        current: progressCount,
        currentAction: `Scheduling ${post.business} ${post.day}...`
      }))

      // Calculate posting date based on day
      const dayIndex = days.indexOf(post.day)
      const postDate = new Date(monday)
      postDate.setDate(monday.getDate() + dayIndex)
      postDate.setHours(9, 0, 0, 0) // Schedule for 9 AM

      try {
        const response = await fetch('/api/social/create-posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: post.content,
            contentType: 'EVENT',
            platforms: [selectedPlatform],
            businesses: [post.business],
            scheduling: {
              scheduleDate: postDate.toISOString().split('T')[0],
              scheduleTime: '09:00'
            }
          })
        })

        const data = await response.json()
        
        if (data.success) {
          results.push({
            business: post.business,
            day: post.day,
            platform: selectedPlatform,
            success: true,
            postId: `scheduled-${postDate.toISOString()}`
          })
        } else {
          results.push({
            business: post.business,
            day: post.day,
            platform: selectedPlatform,
            success: false,
            error: data.error || 'Scheduling failed'
          })
        }
      } catch (error) {
        results.push({
          business: post.business,
          day: post.day,
          platform: selectedPlatform,
          success: false,
          error: error instanceof Error ? error.message : 'Network error'
        })
      }

      progressCount++
      setPostingProgress(prev => ({ ...prev, current: progressCount }))
      
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    setPostingResults(results)
    setIsPosting(false)
    
    const successCount = results.filter(r => r.success).length
    alert(`Scheduling complete! ${successCount}/${completedPosts.length} posts scheduled`)
  }

  const postSingleContent = async (post: WeeklyPost) => {
    setIsPosting(true)
    setPostingProgress({ current: 0, total: 1, currentAction: `Posting ${post.business} ${post.day}...` })

    try {
      const response = await fetch('/api/social/create-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: post.content,
          contentType: 'EVENT',
          platforms: [selectedPlatform],
          businesses: [post.business],
          scheduling: null
        })
      })

      const data = await response.json()
      
      if (data.success) {
        alert(`✅ Posted successfully to ${selectedPlatform}!`)
      } else {
        alert(`❌ Posting failed: ${data.error}`)
      }
    } catch (error) {
      alert(`❌ Posting failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsPosting(false)
    }
  }

  const generateTemplateContent = async () => {
    if (!selectedTemplate) return

    setLoading(true)
    try {
      const response = await fetch('/api/ai/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateType: selectedTemplate,
          businessName: selectedBusiness,
          platform: selectedPlatform
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setGeneratedContent(data.content)
        setContentMetadata(data.metadata)
      } else {
        alert('Failed to generate content: ' + data.error)
      }
    } catch (error) {
      console.error('Error generating template content:', error)
      alert('Failed to generate content')
    } finally {
      setLoading(false)
    }
  }

  const generateCustomContent = async () => {
    if (!customPrompt.trim()) return

    setLoading(true)
    try {
      const response = await fetch('/api/ai/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: customPrompt,
          businessName: selectedBusiness,
          platform: selectedPlatform,
          contentType: 'custom'
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setGeneratedContent(data.content)
        setContentMetadata(data.metadata)
      } else {
        alert('Failed to generate content: ' + data.error)
      }
    } catch (error) {
      console.error('Error generating custom content:', error)
      alert('Failed to generate content')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (content: string = generatedContent) => {
    try {
      await navigator.clipboard.writeText(content)
      alert('Content copied to clipboard!')
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  const updateSpecial = (department: string, index: number, newValue: string) => {
    setEditableSpecials(prev => ({
      ...prev,
      [currentMonth]: {
        ...prev[currentMonth],
        [department]: (prev[currentMonth]?.[department as keyof typeof prev[typeof currentMonth]] as string[] || []).map((item: string, i: number) => 
          i === index ? newValue : item
        )
      }
    }))
  }

  const addSpecial = (department: string) => {
    setEditableSpecials(prev => ({
      ...prev,
      [currentMonth]: {
        ...prev[currentMonth],
        [department]: [...(prev[currentMonth]?.[department as keyof typeof prev[typeof currentMonth]] as string[] || []), 'New special...']
      }
    }))
  }

  const removeSpecial = (department: string, index: number) => {
    setEditableSpecials(prev => ({
      ...prev,
      [currentMonth]: {
        ...prev[currentMonth],
        [department]: (prev[currentMonth]?.[department as keyof typeof prev[typeof currentMonth]] as string[] || []).filter((_: any, i: number) => i !== index)
      }
    }))
  }

  if (!capabilities) {
    return (
      <CollapsibleSection title="🤖 AI Content Generator" defaultExpanded={false}>
        <div className="text-center py-8">
          <div className="animate-spin w-6 h-6 border-2 border-accent-blue border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-dark-text-muted">Loading AI capabilities...</p>
        </div>
      </CollapsibleSection>
    )
  }

  if (!capabilities.isConfigured) {
    return (
      <CollapsibleSection title="🤖 AI Content Generator" defaultExpanded={false}>
        <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-4">
          <h3 className="text-yellow-400 font-semibold mb-2">⚠️ AI Service Not Configured</h3>
          <p className="text-yellow-300 text-sm">
            OpenAI API key is not configured. Please add your API key to enable AI content generation.
          </p>
        </div>
      </CollapsibleSection>
    )
  }

  return (
    <CollapsibleSection title="🤖 AI Content Generator" defaultExpanded={false}>
      <div className="space-y-6">
        {/* AI Status */}
        <div className="bg-green-900/20 border border-green-600 rounded-lg p-4">
          <h3 className="text-green-400 font-semibold mb-2">✅ AI Service Active</h3>
          <p className="text-green-300 text-sm">
            Current season: <strong>{capabilities.currentSeason}</strong> • 
            Templates available: <strong>{capabilities.availableTemplates.length}</strong> • 
            Monthly theme: <strong>{MONTH_THEMES[currentMonth]}</strong>
          </p>
        </div>

        {/* Weekly Automation Section - Now Collapsible */}
        <CollapsibleSection title="📅 Weekly Content Automation" defaultExpanded={true}>
          {/* Month Selection */}
          <div className="mb-6">
            <label className="block text-dark-text font-medium mb-2">Current Month</label>
            <select
              value={currentMonth}
              onChange={(e) => setCurrentMonth(parseInt(e.target.value))}
              className="form-control max-w-xs"
            >
              {MONTH_THEMES.map((theme, index) => (
                <option key={index} value={index}>
                  {new Date(2025, index).toLocaleString('default', { month: 'long' })} - {theme}
                </option>
              ))}
            </select>
          </div>

          {/* Business Selection */}
          <div className="bg-slate-800/30 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-dark-text mb-4">Select Businesses</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {BUSINESSES.map(business => (
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
          <div className="bg-slate-800/30 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-dark-text mb-4">Select Platforms</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {PLATFORMS.map(platform => (
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
          
          {/* Monthly Specials Editor - Moved here for better flow */}
          <div className="bg-slate-800/30 rounded-lg p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-dark-text">📝 Monthly Specials</h3>
              <button
                onClick={() => setEditingSpecials(!editingSpecials)}
                className="btn btn-outline btn-sm"
              >
                {editingSpecials ? '💾 Save Changes' : '✏️ Edit Specials'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['hvac', 'plumbing', 'electrical'].map(department => (
                <div key={department} className="bg-slate-700/50 rounded-lg p-4">
                  <h4 className="text-accent-blue font-semibold capitalize mb-3">{department}</h4>
                  <div className="space-y-2">
                    {((editableSpecials[currentMonth]?.[department as keyof typeof editableSpecials[typeof currentMonth]] as string[]) || []).map((special: string, index: number) => (
                      <div key={index} className="flex gap-2">
                        {editingSpecials ? (
                          <>
                            <textarea
                              value={special}
                              onChange={(e) => updateSpecial(department, index, e.target.value)}
                              className="form-control text-xs flex-1"
                              rows={2}
                            />
                            <button
                              onClick={() => removeSpecial(department, index)}
                              className="btn btn-outline btn-sm text-red-400 hover:bg-red-900/20"
                            >
                              ✗
                            </button>
                          </>
                        ) : (
                          <div className="text-dark-text-muted text-sm p-2 bg-slate-800/50 rounded flex-1">
                            {special}
                          </div>
                        )}
                      </div>
                    ))}
                    {editingSpecials && (
                      <button
                        onClick={() => addSpecial(department)}
                        className="w-full p-2 border-2 border-dashed border-gray-600 rounded text-dark-text-muted hover:border-accent-blue hover:text-accent-blue transition-colors text-sm"
                      >
                        + Add Special
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-4 mb-4">
            <h4 className="text-dark-text font-medium mb-2">📋 Weekly Schedule</h4>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-xs">
              {Object.entries(DAILY_THEMES).map(([day, theme]) => (
                <div key={day} className="bg-slate-700/50 rounded p-2">
                  <div className="font-semibold text-accent-blue capitalize">{day}</div>
                  <div className="text-dark-text-muted">{theme.theme}</div>
                  <div className="text-dark-text-secondary text-xs">{theme.focus}</div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={generateWeeklyContent}
            disabled={isGeneratingWeek || selectedBusinesses.length === 0 || selectedPlatforms.length === 0}
            className="btn btn-primary btn-lg w-full mb-4"
          >
            {isGeneratingWeek 
              ? `🤖 Generating Week... (${generationProgress.current}/${generationProgress.total})` 
              : `🚀 Generate This Week (${selectedBusinesses.length * days.length} Posts)`
            }
          </button>

          {/* Progress Bar */}
          {isGeneratingWeek && (
            <div className="bg-slate-800/50 rounded-lg p-4 mb-4">
              <div className="flex justify-between text-sm text-dark-text-muted mb-2">
                <span>Generating posts...</span>
                <span>{generationProgress.current}/{generationProgress.total}</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div 
                  className="bg-accent-blue h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(generationProgress.current / generationProgress.total) * 100}%` }}
                ></div>
              </div>
            </div>
          )}
        </CollapsibleSection>

        {/* Weekly Posts Display */}
        {weeklyPosts.length > 0 && (
          <div className="bg-slate-800/30 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-dark-text mb-4">📋 Generated Weekly Content</h3>
            
            <div className="space-y-4">
              {businesses.map(business => (
                <div key={business} className="bg-slate-700/50 rounded-lg p-4">
                  <h4 className="text-accent-blue font-semibold capitalize mb-3">{business.replace('-', ' ')}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    {days.map(day => {
                      const post = weeklyPosts.find(p => p.business === business && p.day === day)
                      const dailyTheme = DAILY_THEMES[day as keyof typeof DAILY_THEMES]
                      
                      return (
                        <div key={day} className="bg-slate-800/50 rounded p-3">
                          <div className="flex justify-between items-center mb-2">
                            <div className="text-sm font-medium text-dark-text capitalize">{day}</div>
                            <div className={`text-xs px-2 py-1 rounded ${
                              post?.status === 'completed' ? 'bg-green-900/50 text-green-400' :
                              post?.status === 'generating' ? 'bg-blue-900/50 text-blue-400' :
                              post?.status === 'error' ? 'bg-red-900/50 text-red-400' :
                              'bg-gray-900/50 text-gray-400'
                            }`}>
                              {post?.status === 'completed' ? '✓' : 
                               post?.status === 'generating' ? '⏳' :
                               post?.status === 'error' ? '✗' : '○'}
                            </div>
                          </div>
                          
                          <div className="text-xs text-dark-text-muted mb-2">{dailyTheme.theme}</div>
                          
                          {post?.content ? (
                            <>
                              <div className="bg-gray-900/50 rounded p-2 mb-2 text-xs text-dark-text max-h-20 overflow-y-auto">
                                {post.content.substring(0, 100)}...
                              </div>
                              <div className="flex justify-between items-center">
                                <span className={`text-xs ${post.withinLimits ? 'text-green-400' : 'text-red-400'}`}>
                                  {post.characterCount} chars
                                </span>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => postSingleContent(post)}
                                    disabled={isPosting}
                                    className="btn btn-outline btn-sm text-xs px-2 py-1"
                                  >
                                    📤
                                  </button>
                                  <button
                                    onClick={() => copyToClipboard(post.content)}
                                    className="btn btn-outline btn-sm text-xs px-2 py-1"
                                  >
                                    📋
                                  </button>
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="text-center text-dark-text-secondary text-xs py-4">
                              {post?.status === 'generating' ? 'Generating...' : 'Ready to generate'}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 space-y-4">
              {/* Posting Controls */}
              <div className="bg-slate-700/50 rounded-lg p-4">
                <h4 className="text-dark-text font-medium mb-3">📤 Automated Posting</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="form-group">
                    <label className="block text-dark-text-muted text-sm mb-2">Posting Mode</label>
                    <select className="form-control">
                      <option value="immediate">📤 Post Immediately</option>
                      <option value="scheduled">⏰ Schedule for This Week</option>
                      <option value="draft">📝 Save as Drafts</option>
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label className="block text-dark-text-muted text-sm mb-2">Target Platforms</label>
                    <div className="flex gap-2 flex-wrap">
                      {['google', 'facebook', 'instagram', 'twitter'].map(platform => (
                        <label key={platform} className="flex items-center gap-2 text-sm">
                          <input type="checkbox" defaultChecked className="form-checkbox" />
                          <span>{platform === 'google' ? '🏢' : platform === 'facebook' ? '📘' : platform === 'instagram' ? '📷' : '🐦'}</span>
                          <span className="capitalize">{platform}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 justify-center">
                  <button
                    onClick={postAllContent}
                    disabled={isPosting || weeklyPosts.filter(p => p.content && p.status === 'completed').length === 0}
                    className="btn btn-success"
                  >
                    {isPosting ? '📤 Posting...' : '🚀 Post All to Platforms'}
                  </button>
                  
                  <button
                    onClick={scheduleWeeklyPosts}
                    disabled={isPosting || weeklyPosts.filter(p => p.content && p.status === 'completed').length === 0}
                    className="btn btn-primary"
                  >
                    ⏰ Schedule Weekly Posts
                  </button>
                </div>

                {/* Posting Progress */}
                {isPosting && (
                  <div className="mt-4 bg-slate-800/50 rounded-lg p-3">
                    <div className="flex justify-between text-sm text-dark-text-muted mb-2">
                      <span>Posting to platforms...</span>
                      <span>{postingProgress.current}/{postingProgress.total}</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(postingProgress.current / postingProgress.total) * 100}%` }}
                      ></div>
                    </div>
                    {postingProgress.currentAction && (
                      <div className="text-xs text-dark-text-muted mt-2">
                        {postingProgress.currentAction}
                      </div>
                    )}
                  </div>
                )}

                {/* Posting Results */}
                {postingResults.length > 0 && (
                  <div className="mt-4 bg-slate-800/50 rounded-lg p-3">
                    <h5 className="text-dark-text font-medium mb-2">📊 Posting Results</h5>
                    <div className="space-y-1 text-sm">
                      {postingResults.map((result, index) => (
                        <div key={index} className={`flex justify-between ${
                          result.success ? 'text-green-400' : 'text-red-400'
                        }`}>
                          <span>{result.business} - {result.platform} - {result.day}</span>
                          <span>{result.success ? '✓' : '✗'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Utility Actions */}
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => setWeeklyPosts([])}
                  className="btn btn-outline btn-sm"
                >
                  🗑️ Clear All
                </button>
                <button
                  onClick={() => {
                    const allContent = weeklyPosts
                      .filter(p => p.content)
                      .map(p => `${p.business.toUpperCase()} - ${p.day.toUpperCase()}:\n${p.content}`)
                      .join('\n\n---\n\n')
                    copyToClipboard(allContent)
                  }}
                  disabled={weeklyPosts.filter(p => p.content).length === 0}
                  className="btn btn-outline btn-sm"
                >
                  📋 Backup Copy
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Individual Generation Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Template Generation */}
          <div className="bg-slate-800/30 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-dark-text mb-4">📋 Template Generation</h3>
            
            <div className="form-group">
              <label className="block text-dark-text font-medium mb-2">Business Voice</label>
              <select
                value={selectedBusiness}
                onChange={(e) => setSelectedBusiness(e.target.value)}
                className="form-control"
              >
                {capabilities.supportedBusinesses.map(business => (
                  <option key={business.id} value={business.id}>
                    {business.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="block text-dark-text font-medium mb-2">Content Template</label>
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="form-control"
              >
                {capabilities.availableTemplates.map(template => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={generateTemplateContent}
              disabled={loading || !selectedTemplate}
              className="btn btn-primary w-full"
            >
              {loading ? '🤖 Generating...' : '🎯 Generate Template'}
            </button>
          </div>

          {/* Custom Content Generation */}
          <div className="bg-slate-800/30 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-dark-text mb-4">✍️ Custom Content</h3>
            
            <div className="form-group">
              <label className="block text-dark-text font-medium mb-2">Custom Prompt</label>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Describe the content you want to generate..."
                className="form-control min-h-[100px]"
              />
            </div>

            <button
              onClick={generateCustomContent}
              disabled={loading || !customPrompt.trim()}
              className="btn btn-secondary w-full"
            >
              {loading ? '🤖 Generating...' : '🎨 Generate Custom'}
            </button>
          </div>
        </div>

        {/* Single Generated Content Display */}
        {generatedContent && (
          <div className="bg-slate-800/50 rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-dark-text">📄 Generated Content</h3>
              <button
                onClick={() => copyToClipboard()}
                className="btn btn-outline btn-sm"
              >
                📋 Copy
              </button>
            </div>

            <div className="bg-gray-900/50 rounded-lg p-4 border-l-4 border-accent-blue">
              <pre className="text-dark-text text-sm whitespace-pre-wrap font-sans">
                {generatedContent}
              </pre>
            </div>

            {contentMetadata && (
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div className="bg-slate-700/50 rounded p-2">
                  <div className="text-dark-text-muted">Length</div>
                  <div className="text-dark-text font-semibold">
                    {contentMetadata.contentLength} chars
                  </div>
                </div>
                <div className="bg-slate-700/50 rounded p-2">
                  <div className="text-dark-text-muted">Platform</div>
                  <div className="text-dark-text font-semibold">
                    {contentMetadata.platform}
                  </div>
                </div>
                <div className="bg-slate-700/50 rounded p-2">
                  <div className="text-dark-text-muted">Business</div>
                  <div className="text-dark-text font-semibold">
                    {contentMetadata.business}
                  </div>
                </div>
                <div className="bg-slate-700/50 rounded p-2">
                  <div className="text-dark-text-muted">Within Limits</div>
                  <div className={`font-semibold ${
                    contentMetadata.platformSpecs?.withinLimits 
                      ? 'text-green-400' 
                      : 'text-red-400'
                  }`}>
                    {contentMetadata.platformSpecs?.withinLimits ? '✅ Yes' : '❌ No'}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </CollapsibleSection>
  )
}