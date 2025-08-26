// src/components/ContentCalendar/PostDetailsModal.tsx - Post Details and Actions
'use client'

import React, { useState } from 'react'
import { format } from 'date-fns'
import Image from 'next/image'
import type { CalendarPost } from './ContentCalendar'

interface PostDetailsModalProps {
  post: CalendarPost
  onClose: () => void
  onReschedule: (post: CalendarPost, newDate: Date) => void
  onDelete: (post: CalendarPost) => void
}

export default function PostDetailsModal({
  post,
  onClose,
  onReschedule,
  onDelete
}: PostDetailsModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState(post.content)
  const [rescheduleDate, setRescheduleDate] = useState(
    format(post.date, 'yyyy-MM-dd')
  )
  const [rescheduleTime, setRescheduleTime] = useState(post.time || '09:00')

  const getPlatformInfo = () => {
    const platforms = {
      facebook: { name: 'Facebook', icon: '📘', color: 'text-blue-400', limit: 63206 },
      instagram: { name: 'Instagram', icon: '📷', color: 'text-pink-400', limit: 2200 },
      twitter: { name: 'Twitter/X', icon: '🐦', color: 'text-sky-400', limit: 280 },
      google: { name: 'Google Business', icon: '🏢', color: 'text-red-400', limit: 1500 }
    }
    return platforms[post.platform as keyof typeof platforms] || platforms.facebook
  }

  const getStatusInfo = () => {
    const statuses = {
      draft: { label: 'Draft', color: 'text-gray-400', bg: 'bg-gray-900/30', icon: '📝' },
      scheduled: { label: 'Scheduled', color: 'text-blue-400', bg: 'bg-blue-900/30', icon: '📅' },
      posted: { label: 'Posted', color: 'text-green-400', bg: 'bg-green-900/30', icon: '✅' },
      failed: { label: 'Failed', color: 'text-red-400', bg: 'bg-red-900/30', icon: '❌' }
    }
    return statuses[post.status] || statuses.draft
  }

  const handleSaveEdit = () => {
    // In real implementation, this would call an API to update the post
    console.log('Saving edited content:', editedContent)
    setIsEditing(false)
  }

  const handleReschedule = () => {
    const newDate = new Date(`${rescheduleDate}T${rescheduleTime}`)
    onReschedule(post, newDate)
  }

  const platformInfo = getPlatformInfo()
  const statusInfo = getStatusInfo()
  const characterCount = editedContent.length
  const isOverLimit = characterCount > platformInfo.limit

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg border border-gray-600 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-600">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{platformInfo.icon}</span>
            <div>
              <h3 className={`text-lg font-semibold ${platformInfo.color}`}>
                {platformInfo.name} Post
              </h3>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <span>{post.businessName}</span>
                <span>•</span>
                <span>{format(post.date, 'MMM d, yyyy')}</span>
                {post.time && (
                  <>
                    <span>•</span>
                    <span>{post.time}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Status Badge */}
            <div className={`px-2 py-1 rounded text-xs ${statusInfo.bg} ${statusInfo.color}`}>
              {statusInfo.icon} {statusInfo.label}
            </div>
            
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Post Content */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-300">Content</label>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="text-sm text-blue-400 hover:text-blue-300"
                disabled={post.status === 'posted'}
              >
                {isEditing ? 'Cancel' : 'Edit'}
              </button>
            </div>

            {isEditing ? (
              <div className="space-y-3">
                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="w-full p-3 bg-gray-900 border border-gray-600 rounded text-white resize-none focus:border-blue-400 focus:outline-none"
                  rows={6}
                />
                <div className="flex items-center justify-between">
                  <div className={`text-sm ${isOverLimit ? 'text-red-400' : 'text-gray-400'}`}>
                    {characterCount}/{platformInfo.limit} characters
                    {isOverLimit && ' (over limit)'}
                  </div>
                  <button
                    onClick={handleSaveEdit}
                    disabled={isOverLimit}
                    className="btn btn-success btn-sm"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-gray-900/50 p-4 rounded border border-gray-600">
                <div className="text-gray-200 whitespace-pre-wrap">{post.content}</div>
                <div className="mt-2 text-sm text-gray-400">
                  {post.characterCount}/{platformInfo.limit} characters
                  {!post.withinLimits && (
                    <span className="text-yellow-400 ml-2">⚠️ Over limit</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Image */}
          {post.imageUrl && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Image</label>
              <div className="relative w-full h-48 bg-gray-900 rounded border border-gray-600 overflow-hidden">
                <Image
                  src={post.imageUrl}
                  alt={post.imageDescription || 'Post image'}
                  fill
                  className="object-cover"
                  unoptimized={true}
                />
              </div>
              {post.imageDescription && (
                <p className="text-sm text-gray-400 mt-1">{post.imageDescription}</p>
              )}
            </div>
          )}

          {/* Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Template Used */}
            {post.templateUsed && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Template</label>
                <div className="text-sm text-gray-400">{post.templateUsed}</div>
              </div>
            )}

            {/* Source */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Source</label>
              <div className="text-sm text-gray-400 capitalize">{post.source}</div>
            </div>

            {/* Monthly Specials */}
            {post.monthlySpecials && post.monthlySpecials.length > 0 && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-1">Monthly Specials</label>
                <div className="text-sm text-gray-400">
                  {post.monthlySpecials.map((special, index) => (
                    <div key={index} className="mb-1">• {special}</div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Reschedule Section */}
          {(post.status === 'draft' || post.status === 'scheduled') && (
            <div className="border-t border-gray-600 pt-6">
              <h4 className="text-sm font-medium text-gray-300 mb-3">Reschedule Post</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Date</label>
                  <input
                    type="date"
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full p-2 bg-gray-900 border border-gray-600 rounded text-white focus:border-blue-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Time</label>
                  <input
                    type="time"
                    value={rescheduleTime}
                    onChange={(e) => setRescheduleTime(e.target.value)}
                    className="w-full p-2 bg-gray-900 border border-gray-600 rounded text-white focus:border-blue-400 focus:outline-none"
                  />
                </div>
              </div>
              <button
                onClick={handleReschedule}
                className="btn btn-primary btn-sm mt-3"
              >
                Reschedule Post
              </button>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between p-6 border-t border-gray-600">
          <div className="flex items-center gap-2">
            {post.status !== 'posted' && (
              <button
                onClick={() => onDelete(post)}
                className="btn btn-outline btn-sm text-red-400 border-red-400 hover:bg-red-900/30"
              >
                🗑️ Delete
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="btn btn-outline"
            >
              Close
            </button>
            
            {post.status === 'draft' && (
              <>
                <button className="btn btn-primary btn-sm">
                  📅 Schedule
                </button>
                <button className="btn btn-success btn-sm">
                  🚀 Post Now
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}