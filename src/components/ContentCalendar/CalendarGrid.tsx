// src/components/ContentCalendar/CalendarGrid.tsx - Monthly Grid Layout
'use client'

import React from 'react'
import { format, startOfWeek, addDays } from 'date-fns'
import CalendarDay from './CalendarDay'
import type { CalendarDay as CalendarDayType } from './ContentCalendar'

interface CalendarGridProps {
  days: CalendarDayType[]
  platforms: Array<{
    id: string
    name: string
    icon: string
    color: string
  }>
  businesses: Array<{
    id: string
    name: string
    displayName: string
    color: string
  }>
  showScheduleTemplate: boolean
  onPostClick: (post: any) => void
  onDateClick: (date: Date) => void
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const WEEKDAYS_FULL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function CalendarGrid({
  days,
  platforms,
  businesses,
  showScheduleTemplate,
  onPostClick,
  onDateClick
}: CalendarGridProps) {
  // Get the first day of the month to determine starting position
  const firstDay = days[0]?.date
  if (!firstDay) return null

  // Get the start of the week for the first day of the month
  const calendarStart = startOfWeek(firstDay, { weekStartsOn: 0 }) // Sunday start
  
  // Generate all days for the calendar grid (including prev/next month days)
  const calendarDays = []
  for (let i = 0; i < 42; i++) { // 6 weeks × 7 days
    const day = addDays(calendarStart, i)
    const monthDay = days.find(d => d.date.getTime() === day.getTime())
    
    if (monthDay) {
      calendarDays.push(monthDay)
    } else {
      // Days from previous/next month (empty state)
      calendarDays.push({
        date: day,
        posts: [],
        expectedPosts: 0,
        isToday: false,
        isWeekend: day.getDay() === 0 || day.getDay() === 6,
        hasScheduledPosts: false,
        isOnTrack: true,
        isOtherMonth: true
      })
    }
  }

  return (
    <div className="bg-slate-900/50 rounded-lg border border-gray-600 overflow-hidden">
      {/* Weekday Headers */}
      <div className="grid grid-cols-7 border-b border-gray-600">
        {WEEKDAYS.map((day, i) => (
          <div
            key={`${day}-${i}`}
            className="p-1.5 sm:p-3 text-center text-xs sm:text-sm font-medium text-gray-300 bg-slate-800/50"
          >
            <span className="sm:hidden">{day}</span>
            <span className="hidden sm:inline">{WEEKDAYS_FULL[i]}</span>
          </div>
        ))}
      </div>

      {/* Calendar Days Grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day, index) => (
          <CalendarDay
            key={`${day.date.getTime()}-${index}`}
            day={day}
            platforms={platforms}
            businesses={businesses}
            showScheduleTemplate={showScheduleTemplate}
            onPostClick={onPostClick}
            onDateClick={onDateClick}
          />
        ))}
      </div>
    </div>
  )
}