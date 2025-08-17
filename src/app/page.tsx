// src/app/page.tsx
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import Header from '@/components/Header'
import ConnectionSection from '@/components/ConnectionSection'
import ReviewManagement from '@/components/ReviewManagement'
import PostCreation from '@/components/PostCreation'
import ContentCalendar from '@/components/ContentCalendar'
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
        
        <main className="space-y-6">
          {/* Connection Status */}
          <ConnectionSection session={session} />

          {/* Review Management */}
          <ReviewManagement />

          {/* Customer Insights - New Standalone Section */}
          <CustomerInsights />

          {/* New Enhanced Content Generator */}
          <EnhancedWeeklyAutomation />
          
          {/* AI Content Generator - AI-powered content creation */}
          <AIContentGenerator />
          
          {/* Post Creation */}
          <PostCreation />
          
          {/* Activity Log */}
          <ActivityLog />
        </main>
      </div>
    </div>
  )
}