// src/app/settings/page.tsx
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import Header from '@/components/Header'
import BusinessProfileManager from '@/components/settings/BusinessProfileManager'
import ContentBlocksManager from '@/components/settings/ContentBlocksManager'
import MonthlySpecialsManager from '@/components/settings/MonthlySpecialsManager'
import DailyThemeStrategy from '@/components/settings/DailyThemeStrategy'
import ImageLibraryManager from '@/components/settings/ImageLibraryManager'
import PostingScheduleManager from '@/components/settings/PostingScheduleManager'

export default async function SettingsPage() {
  const session = await auth()

  if (!session) {
    redirect('/auth/signin')
  }

  return (
    <div className="min-h-screen p-3 sm:p-5">
      <div className="max-w-7xl mx-auto">
        <Header />
        
        {/* Settings Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-dark-text mb-2">⚙️ Settings</h1>
              <p className="text-dark-text-muted">
                Manage your business profiles, content strategy, and automation settings
              </p>
            </div>
            <a 
              href="/"
              className="btn btn-outline"
            >
              🏠 Back to Dashboard
            </a>
          </div>
        </div>

        <main className="space-y-8">
          {/* Content Blocks Library */}
          <section>
            <ContentBlocksManager />
          </section>

          {/* Business Profile Management */}
          <section>
            <BusinessProfileManager />
          </section>

          {/* Posting Schedule Manager */}
          <section>
            <PostingScheduleManager />
          </section>
          
          {/* Monthly Specials */}
          <section>
            <MonthlySpecialsManager />
          </section>

          {/* NEW: Daily Theme Strategy (replaces Template Preferences) */}
          <section>
            <DailyThemeStrategy />
          </section>

          {/* Image Library Manager */}
          <section>
            <ImageLibraryManager />
          </section>
        </main>
      </div>
    </div>
  )
}