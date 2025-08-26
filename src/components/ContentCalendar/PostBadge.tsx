// src/components/ContentCalendar/PostBadge.tsx - Individual Post Indicator
'use client'

import React from 'react'
import type { CalendarPost } from './ContentCalendar'

interface PostBadgeProps {
  post: CalendarPost
  platform: {
    id: string
    name: string
    icon: string
    color: string
  }
  onClick: () => void
}

export default function PostBadge({ post, platform, onClick }: PostBadgeProps) {
  const getStatusColor = () => {
    switch (post.status) {
      case 'posted':
        return 'bg-green-600 border-green-500'
      case 'scheduled':
        return 'bg-blue-600 border-blue-500'
      case 'draft':
        return 'bg-gray-600 border-gray-500'
      case 'failed':
        return 'bg-red-600 border-red-500'
      default:
        return 'bg-gray-600 border-gray-500'
    }
  }

  const getStatusIcon = () => {
    switch (post.status) {
      case 'posted':
        return '✅'
      case 'scheduled':
        return '📅'
      case 'draft':
        return '📝'
      case 'failed':
        return '❌'
      default:
        return '📝'
    }
  }

  const truncateContent = (content: string, maxLength: number = 30) => {
    if (content.length <= maxLength) return content
    return content.substring(0, maxLength) + '...'
  }

  return (
    <div
      onClick={onClick}
      className={`
        relative px-2 py-1 rounded text-xs border cursor-pointer
        transition-all duration-200 hover:scale-105 hover:shadow-lg
        ${getStatusColor()}
        text-white
      `}
      title={`${platform.name} - ${post.status} - ${truncateContent(post.content, 100)}`}
    >
      <div className="flex items-center gap-1">
        {/* Platform Icon */}
        <span className="text-xs">{platform.icon}</span>
        
        {/* Status Icon */}
        <span className="text-xs">{getStatusIcon()}</span>
        
        {/* Time */}
        {post.time && (
          <span className="text-xs opacity-80">{post.time}</span>
        )}
      </div>

      {/* Content Preview */}
      <div className="text-xs opacity-90 mt-1 leading-tight">
        {truncateContent(post.content, 40)}
      </div>

      {/* Character Count Indicator */}
      {!post.withinLimits && (
        <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full" 
             title="Over character limit" />
      )}

      {/* Business Indicator (if multiple businesses) */}
      {post.businessName && (
        <div className="absolute -bottom-1 -right-1 text-xs opacity-60">
          {post.businessName.charAt(0)}
        </div>
      )}
    </div>
  )
}