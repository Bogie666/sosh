// src/components/ContentCalendar/CalendarDay.tsx - Individual Day Cell
'use client'

import React from 'react'
import { format, isToday, isSameMonth } from 'date-fns'
import PostBadge from './PostBadge'
import type { CalendarDay as CalendarDayType, CalendarPost } from './ContentCalendar'

interface CalendarDayProps {
  day: CalendarDayType & { isOtherMonth?: boolean }
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
  onPostClick: (post: CalendarPost) => void
  onDateClick: (date: Date) => void
}

export default function CalendarDay({
  day,
  platforms,
  businesses,
  showScheduleTemplate,
  onPostClick,
  onDateClick
}: CalendarDayProps) {
  const isCurrentMonth = !day.isOtherMonth
  const dayNumber = format(day.date, 'd')
  const isCurrentDay = isToday(day.date)
  const hasAnyPosts = day.posts.length > 0
  const isOnSchedule = day.isOnTrack
  const missingPosts = Math.max(0, day.expectedPosts - day.posts.filter(p => p.status === 'posted').length)

  // Group posts by platform for better display
  const postsByPlatform = day.posts.reduce((acc, post) => {
    if (!acc[post.platform]) acc[post.platform] = []
    acc[post.platform].push(post)
    return acc
  }, {} as Record<string, CalendarPost[]>)

  const handleDayClick = () => {
    if (isCurrentMonth) {
      onDateClick(day.date)
    }
  }

  return (
    <div
      className={`relative min-h-[120px] border-r border-b border-gray-600 p-2 cursor-pointer transition-colors ${
        !isCurrentMonth
          ? 'bg-slate-900/20 text-gray-500'
          : isCurrentDay
          ? 'bg-blue-900/20 border-blue-400'
          : day.isWeekend
          ? 'bg-slate-800/20'
          : 'hover:bg-slate-700/20'
      }`}
      onClick={handleDayClick}
    >
      {/* Day Number */}
      <div className="flex items-center justify-between mb-2">
        <div
          className={`text-sm font-medium ${
            !isCurrentMonth
              ? 'text-gray-500'
              : isCurrentDay
              ? 'text-blue-400 font-bold'
              : 'text-gray-200'
          }`}
        >
          {dayNumber}
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-1">
          {/* Expected Posts Indicator */}
          {showScheduleTemplate && day.expectedPosts > 0 && isCurrentMonth && (
            <div 
              className="w-2 h-2 rounded-full bg-gray-500 opacity-50" 
              title={`${day.expectedPosts} expected posts`}
            />
          )}

          {/* On Track Indicator */}
          {isCurrentMonth && day.expectedPosts > 0 && (
            <div
              className={`w-2 h-2 rounded-full ${
                isOnSchedule ? 'bg-green-400' : 'bg-yellow-400'
              }`}
              title={isOnSchedule ? 'On track' : `${missingPosts} posts missing`}
            />
          )}
        </div>
      </div>

      {/* Posts */}
      {isCurrentMonth && (
        <div className="space-y-1">
          {/* Show posts grouped by platform */}
          {platforms
            .filter(platform => postsByPlatform[platform.id])
            .map(platform => (
              <div key={platform.id} className="space-y-1">
                {postsByPlatform[platform.id].map(post => (
                  <PostBadge
                    key={post.id}
                    post={post}
                    platform={platform}
                    onClick={() => onPostClick(post)}
                  />
                ))}
              </div>
            ))}

          {/* Show missing posts indicator */}
          {showScheduleTemplate && missingPosts > 0 && (
            <div className="space-y-1">
              {Array.from({ length: Math.min(missingPosts, 3) }, (_, i) => (
                <div
                  key={`missing-${i}`}
                  className="h-5 border border-dashed border-gray-500 rounded flex items-center justify-center"
                  title="Missing post"
                >
                  <span className="text-xs text-gray-500">+</span>
                </div>
              ))}
              {missingPosts > 3 && (
                <div className="text-xs text-gray-500 text-center">
                  +{missingPosts - 3} more
                </div>
              )}
            </div>
          )}

          {/* Empty state for days with expected posts but no actual posts */}
          {hasAnyPosts === false && day.expectedPosts > 0 && showScheduleTemplate && (
            <div className="text-xs text-gray-500 text-center mt-2">
              {day.expectedPosts} expected
            </div>
          )}
        </div>
      )}

      {/* Today Highlight */}
      {isCurrentDay && isCurrentMonth && (
        <div className="absolute inset-0 border-2 border-blue-400 rounded pointer-events-none opacity-50" />
      )}
    </div>
  )
}