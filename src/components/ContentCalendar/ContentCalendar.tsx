// src/components/ContentCalendar/ContentCalendar.tsx - Main Calendar Component
'use client'

import React, { useState, useEffect } from 'react'
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isToday, 
  isWeekend, 
  isSameDay,
  addMonths,
  subMonths
} from 'date-fns'
import CalendarGrid from './CalendarGrid'
import PostDetailsModal from './PostDetailsModal'

// Types
export interface CalendarPost {
  id: string
  businessId: string
  businessName: string
  platform: string
  date: Date
  time?: string
  content: string
  status: 'draft' | 'scheduled' | 'posted' | 'failed'
  source: 'ai-generated' | 'manual' | 'scheduled'
  imageUrl?: string
  imageDescription?: string
  characterCount: number
  withinLimits: boolean
  templateUsed?: string
  monthlySpecials?: string[]
  metadata?: any
}

export interface PostingSchedule {
  platforms: {
    [key: string]: {
      enabled: boolean
      daysOfWeek: string[]
      postsPerDay: number
      timeDistribution: 'auto' | 'custom'
      customTimes: string[]
      autoTimes: string[]
    }
  }
}

export interface CalendarDay {
  date: Date
  posts: CalendarPost[]
  expectedPosts: number
  isToday: boolean
  isWeekend: boolean
  hasScheduledPosts: boolean
  isOnTrack: boolean
}

interface ContentCalendarProps {
  selectedBusinesses?: string[]
  selectedPlatforms?: string[]
}

const BUSINESSES = [
  { id: 'lex-dallas', name: 'Lex Dallas', displayName: 'Lex Dallas', color: 'text-blue-400' },
  { id: 'lex-etx', name: 'Lex ETX', displayName: 'Lex ETX', color: 'text-green-400' },
  { id: 'lyons', name: 'Lyons', displayName: 'Lyons', color: 'text-purple-400' }
]

const PLATFORMS = [
  { id: 'facebook', name: 'Facebook', icon: '📘', color: 'bg-blue-600' },
  { id: 'instagram', name: 'Instagram', icon: '📷', color: 'bg-pink-600' },
  { id: 'twitter', name: 'Twitter/X', icon: '🐦', color: 'bg-sky-600' },
  { id: 'google', name: 'Google Business', icon: '🏢', color: 'bg-red-600' }
]

export default function ContentCalendar({ 
  selectedBusinesses = ['lex-dallas'], 
  selectedPlatforms = ['facebook', 'instagram', 'twitter', 'google'] 
}: ContentCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [calendarPosts, setCalendarPosts] = useState<CalendarPost[]>([])
  const [postingSchedules, setPostingSchedules] = useState<Record<string, PostingSchedule>>({})
  const [loading, setLoading] = useState(false)
  const [selectedPost, setSelectedPost] = useState<CalendarPost | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showScheduleTemplate, setShowScheduleTemplate] = useState(true)
  const [aiGeneratedPosts, setAiGeneratedPosts] = useState<CalendarPost[]>([])

  // Load calendar data when month or filters change
  useEffect(() => {
    loadCalendarData()
  }, [currentMonth, selectedBusinesses, selectedPlatforms])

  const loadCalendarData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadPostingSchedules(),
        loadScheduledPosts(),
        loadAIGeneratedPosts(),
        loadPostedContent()
      ])
    } catch (error) {
      console.error('Failed to load calendar data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Load posting schedules for selected businesses
  const loadPostingSchedules = async () => {
    const schedules: Record<string, PostingSchedule> = {}
    
    for (const businessId of selectedBusinesses) {
      try {
        const response = await fetch(`/api/business/posting-schedule?businessId=${businessId}`)
        const data = await response.json()
        
        if (data.success) {
          schedules[businessId] = data.data.postingSchedule
        }
      } catch (error) {
        console.error(`Failed to load posting schedule for ${businessId}:`, error)
      }
    }
    
    setPostingSchedules(schedules)
  }

  // Load scheduled posts from database
  const loadScheduledPosts = async () => {
    try {
      const startDate = startOfMonth(currentMonth).toISOString().split('T')[0]
      const endDate = endOfMonth(currentMonth).toISOString().split('T')[0]
      
      const response = await fetch(`/api/calendar/posts?startDate=${startDate}&endDate=${endDate}&businesses=${selectedBusinesses.join(',')}&platforms=${selectedPlatforms.join(',')}`)
      
      if (response.ok) {
        const data = await response.json()
        const scheduledPosts = data.posts?.map((post: any) => ({
          ...post,
          date: new Date(post.scheduledFor || post.date),
          status: 'scheduled' as const,
          source: 'scheduled' as const
        })) || []
        
        updateCalendarPosts('scheduled', scheduledPosts)
      }
    } catch (error) {
      console.error('Failed to load scheduled posts:', error)
    }
  }

  // Load AI generated posts (from AIContentGenerator)
  const loadAIGeneratedPosts = async () => {
    try {
      // This would integrate with AIContentGenerator posts that have scheduled dates
      // For now, we'll use a placeholder - in real implementation, this would come from
      // AIContentGenerator component state or a shared store
      const aiPosts: CalendarPost[] = []
      setAiGeneratedPosts(aiPosts)
      updateCalendarPosts('ai-generated', aiPosts)
    } catch (error) {
      console.error('Failed to load AI generated posts:', error)
    }
  }

  // Load posted content history
  const loadPostedContent = async () => {
    try {
      const startDate = startOfMonth(currentMonth).toISOString().split('T')[0]
      const endDate = endOfMonth(currentMonth).toISOString().split('T')[0]
      
      const response = await fetch(`/api/calendar/history?startDate=${startDate}&endDate=${endDate}&businesses=${selectedBusinesses.join(',')}&platforms=${selectedPlatforms.join(',')}`)
      
      if (response.ok) {
        const data = await response.json()
        const postedContent = data.posts?.map((post: any) => ({
          ...post,
          date: new Date(post.postedAt),
          status: 'posted' as const,
          source: 'manual' as const
        })) || []
        
        updateCalendarPosts('posted', postedContent)
      }
    } catch (error) {
      console.error('Failed to load posted content:', error)
    }
  }

  // Update calendar posts by source
  const updateCalendarPosts = (source: string, newPosts: CalendarPost[]) => {
    setCalendarPosts(prev => {
      // Remove existing posts from this source
      const filtered = prev.filter(post => post.source !== source)
      // Add new posts
      return [...filtered, ...newPosts]
    })
  }

  // Generate calendar days with post data
  const generateCalendarDays = (): CalendarDay[] => {
    const start = startOfMonth(currentMonth)
    const end = endOfMonth(currentMonth)
    const days = eachDayOfInterval({ start, end })

    return days.map(day => {
      const dayPosts = calendarPosts.filter(post => isSameDay(post.date, day))
      const expectedPosts = calculateExpectedPosts(day)
      const postedCount = dayPosts.filter(post => post.status === 'posted').length
      
      return {
        date: day,
        posts: dayPosts,
        expectedPosts,
        isToday: isToday(day),
        isWeekend: isWeekend(day),
        hasScheduledPosts: dayPosts.some(post => post.status === 'scheduled'),
        isOnTrack: postedCount >= expectedPosts || dayPosts.length >= expectedPosts
      }
    })
  }

  // Calculate expected posts based on posting schedules
  const calculateExpectedPosts = (date: Date): number => {
    const dayName = format(date, 'EEEE').toLowerCase()
    let totalExpected = 0

    selectedBusinesses.forEach(businessId => {
      const schedule = postingSchedules[businessId]
      if (!schedule) return

      selectedPlatforms.forEach(platformId => {
        const platformSchedule = schedule.platforms[platformId]
        if (platformSchedule?.enabled && platformSchedule.daysOfWeek.includes(dayName)) {
          totalExpected += platformSchedule.postsPerDay
        }
      })
    })

    return totalExpected
  }

  // Navigation functions
  const goToPreviousMonth = () => setCurrentMonth(prev => subMonths(prev, 1))
  const goToNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1))
  const goToToday = () => setCurrentMonth(new Date())

  // Post interaction handlers
  const handlePostClick = (post: CalendarPost) => {
    setSelectedPost(post)
  }

  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
    // Could open a modal to create new posts for this date
  }

  const handleCloseModal = () => {
    setSelectedPost(null)
    setSelectedDate(null)
  }

  // Quick actions
  const handleReschedulePost = async (post: CalendarPost, newDate: Date) => {
    try {
      const response = await fetch(`/api/calendar/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: post.id,
          newDate: newDate.toISOString(),
          newTime: post.time
        })
      })

      if (response.ok) {
        await loadCalendarData() // Refresh data
      }
    } catch (error) {
      console.error('Failed to reschedule post:', error)
    }
  }

  const handleDeletePost = async (post: CalendarPost) => {
    if (!confirm('Are you sure you want to delete this post?')) return

    try {
      const response = await fetch(`/api/calendar/posts/${post.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await loadCalendarData() // Refresh data
      }
    } catch (error) {
      console.error('Failed to delete post:', error)
    }
  }

  const calendarDays = generateCalendarDays()
  const totalPosts = calendarPosts.length
  const scheduledPosts = calendarPosts.filter(post => post.status === 'scheduled').length
  const postedContent = calendarPosts.filter(post => post.status === 'posted').length
  const draftPosts = calendarPosts.filter(post => post.status === 'draft').length

  return (
    <div className="bg-slate-800/30 rounded-lg border border-gray-600 p-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">📅 Content Calendar</h2>
          <p className="text-gray-400 text-sm mt-1">
            View and manage your social media content across all platforms
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Calendar Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={goToPreviousMonth}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
            >
              ←
            </button>
            
            <div className="text-center min-w-[200px]">
              <h3 className="text-lg font-semibold text-white">
                {format(currentMonth, 'MMMM yyyy')}
              </h3>
            </div>
            
            <button
              onClick={goToNextMonth}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
            >
              →
            </button>
          </div>

          <button
            onClick={goToToday}
            className="btn btn-outline btn-sm"
          >
            Today
          </button>
        </div>
      </div>

      {/* Calendar Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-700/30 rounded p-3 text-center">
          <div className="text-2xl font-bold text-white">{totalPosts}</div>
          <div className="text-xs text-gray-400">Total Posts</div>
        </div>
        <div className="bg-slate-700/30 rounded p-3 text-center">
          <div className="text-2xl font-bold text-blue-400">{scheduledPosts}</div>
          <div className="text-xs text-gray-400">Scheduled</div>
        </div>
        <div className="bg-slate-700/30 rounded p-3 text-center">
          <div className="text-2xl font-bold text-green-400">{postedContent}</div>
          <div className="text-xs text-gray-400">Posted</div>
        </div>
        <div className="bg-slate-700/30 rounded p-3 text-center">
          <div className="text-2xl font-bold text-yellow-400">{draftPosts}</div>
          <div className="text-xs text-gray-400">Drafts</div>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showScheduleTemplate}
              onChange={(e) => setShowScheduleTemplate(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-300">Show posting schedule template</span>
          </label>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">Legend:</span>
          {PLATFORMS.filter(p => selectedPlatforms.includes(p.id)).map(platform => (
            <div key={platform.id} className="flex items-center gap-1">
              <div className={`w-3 h-3 rounded ${platform.color}`}></div>
              <span className="text-xs text-gray-400">{platform.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Calendar Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin inline-block w-8 h-8 border-2 border-current border-t-transparent text-blue-400 rounded-full"></div>
          <p className="text-gray-400 mt-2">Loading calendar...</p>
        </div>
      ) : (
        <CalendarGrid
          days={calendarDays}
          platforms={PLATFORMS}
          businesses={BUSINESSES}
          showScheduleTemplate={showScheduleTemplate}
          onPostClick={handlePostClick}
          onDateClick={handleDateClick}
        />
      )}

      {/* Post Details Modal */}
      {selectedPost && (
        <PostDetailsModal
          post={selectedPost}
          onClose={handleCloseModal}
          onReschedule={handleReschedulePost}
          onDelete={handleDeletePost}
        />
      )}
    </div>
  )
}