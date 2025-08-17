// src/components/ActivityLog.tsx
'use client'

import { useState, useEffect } from 'react'

interface ActivityItem {
  id: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  timestamp: Date
}

export default function ActivityLog() {
  const [activities, setActivities] = useState<ActivityItem[]>([])

  const addActivity = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const newActivity: ActivityItem = {
      id: Date.now().toString(),
      message,
      type,
      timestamp: new Date()
    }
    
    setActivities(prev => [newActivity, ...prev.slice(0, 9)]) // Keep only last 10
  }

  // Expose addActivity function globally for other components to use
  useEffect(() => {
    (window as any).addActivityLog = addActivity
    
    // Add initial activity
    addActivity('🚀 Social Media Manager initialized', 'success')
    
    return () => {
      delete (window as any).addActivityLog
    }
  }, [])

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'success': return '✅'
      case 'warning': return '⚠️'
      case 'error': return '❌'
      default: return 'ℹ️'
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'success': return 'text-accent-green'
      case 'warning': return 'text-accent-yellow'
      case 'error': return 'text-accent-red'
      default: return 'text-accent-blue'
    }
  }

  return (
    <section className="card">
      <h2 className="text-xl font-semibold mb-6">Recent Activity</h2>
      
      <div className="space-y-3 max-h-80 overflow-y-auto">
        {activities.length > 0 ? (
          activities.map((activity) => (
            <div 
              key={activity.id}
              className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg"
            >
              <span className="text-lg">{getActivityIcon(activity.type)}</span>
              <div className="flex-1">
                <p className={`text-sm ${getActivityColor(activity.type)}`}>
                  {activity.message}
                </p>
                <p className="text-xs text-dark-text-secondary mt-1">
                  {activity.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <p className="text-dark-text-muted">No recent activity</p>
          </div>
        )}
      </div>
    </section>
  )
}
