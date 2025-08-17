// src/components/posts/PostScheduler.tsx
'use client'

import { useState } from 'react'

interface PostSchedulerProps {
  onSchedule: (date: Date) => void
}

export default function PostScheduler({ onSchedule }: PostSchedulerProps) {
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('')

  const handleSchedule = () => {
    if (scheduleDate && scheduleTime) {
      const date = new Date(`${scheduleDate}T${scheduleTime}`)
      onSchedule(date)
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-dark-text font-medium">Schedule Post</h3>
      
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-dark-text-muted text-sm mb-1">Date</label>
          <input
            type="date"
            value={scheduleDate}
            onChange={(e) => setScheduleDate(e.target.value)}
            className="form-control"
            min={new Date().toISOString().split('T')[0]}
          />
        </div>
        
        <div>
          <label className="block text-dark-text-muted text-sm mb-1">Time</label>
          <input
            type="time"
            value={scheduleTime}
            onChange={(e) => setScheduleTime(e.target.value)}
            className="form-control"
          />
        </div>
      </div>

      <button
        onClick={handleSchedule}
        disabled={!scheduleDate || !scheduleTime}
        className="btn btn-secondary btn-sm"
      >
        📅 Schedule Post
      </button>
    </div>
  )
}
