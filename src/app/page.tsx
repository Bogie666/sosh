// src/app/page.tsx
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import Header from '@/components/Header'
import ConnectionSection from '@/components/ConnectionSection'
import ReviewManagement from '@/components/ReviewManagement'
import PostCreation from '@/components/PostCreation'
import ContentCalendar from '@/components/ContentCalendar/ContentCalendar'
import AIContentGenerator from '@/components/AIContentGenerator'
import PlatformManagement from '@/components/PlatformManagement'
import CustomerInsights from '@/components/CustomerInsights'
import ActivityLog from '@/components/ActivityLog'
import EnhancedWeeklyAutomation from '@/components/EnhancedWeeklyAutomation'

export default async function Dashboard() {
  const session = await auth()

  if (!session) {
    redirect('/auth/signin')
  }

  return (
    <div className="min-h-screen p-5">
      <div className="max-w-7xl mx-auto">
        <Header />
        
        {/* Quick Navigation */}
        <div className="bg-slate-900/30 rounded-lg p-6 mb-6 border border-slate-600/50">
          <h2 className="text-lg font-semibold text-dark-text mb-4">🚀 Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <a 
              href="/calendar" 
              className="flex items-center gap-3 p-4 bg-slate-800/50 rounded-lg border border-slate-600 hover:border-blue-500 transition-all duration-200 hover:bg-slate-700/50 group"
            >
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center group-hover:bg-blue-500/30">
                <span className="text-xl">📅</span>
              </div>
              <div>
                <h3 className="font-medium text-dark-text">Content Calendar</h3>
                <p className="text-xs text-dark-text-muted">View & manage posts</p>
              </div>
            </a>
            
            <a 
              href="/settings" 
              className="flex items-center gap-3 p-4 bg-slate-800/50 rounded-lg border border-slate-600 hover:border-green-500 transition-all duration-200 hover:bg-slate-700/50 group"
            >
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center group-hover:bg-green-500/30">
                <span className="text-xl">⚙️</span>
              </div>
              <div>
                <h3 className="font-medium text-dark-text">Settings</h3>
                <p className="text-xs text-dark-text-muted">Business & automation</p>
              </div>
            </a>
            
            <div className="flex items-center gap-3 p-4 bg-slate-800/50 rounded-lg border border-slate-600 opacity-60">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <span className="text-xl">📊</span>
              </div>
              <div>
                <h3 className="font-medium text-dark-text">Analytics</h3>
                <p className="text-xs text-dark-text-muted">Coming soon</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 bg-slate-800/50 rounded-lg border border-slate-600 opacity-60">
              <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <span className="text-xl">🤖</span>
              </div>
              <div>
                <h3 className="font-medium text-dark-text">AI Templates</h3>
                <p className="text-xs text-dark-text-muted">Coming soon</p>
              </div>
            </div>
          </div>
        </div>
        
        <main className="space-y-6">
          {/* Connection Status */}
          <ConnectionSection session={session} />

          {/* Connection Section */}
          <PlatformManagement />

          {/* Review Management */}
          <ReviewManagement />

          {/* Customer Review Insights  */}
          <CustomerInsights />
          
          {/* AI Content Generator - AI-powered content creation */}
          <AIContentGenerator />
          
          {/* Single Post Creation */}
          <PostCreation />
          
          {/* Activity Log */}
          <ActivityLog />
        </main>
      </div>
    </div>
  )
}