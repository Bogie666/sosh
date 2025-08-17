// src/app/settings/page.tsx
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import Header from '@/components/Header'
import BusinessProfileManager from '@/components/settings/BusinessProfileManager'
import ContentBlocksManager from '@/components/settings/ContentBlocksManager'
import MonthlySpecialsManager from '@/components/settings/MonthlySpecialsManager'
import TemplatePreferences from '@/components/settings/TemplatePreferences'
import ImageLibraryManager from '@/components/settings/ImageLibraryManager'

export default async function SettingsPage() {
  const session = await auth()

  if (!session) {
    redirect('/auth/signin')
  }

  return (
    <div className="min-h-screen p-5">
      <div className="max-w-7xl mx-auto">
        <Header />
        
        {/* Settings Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-dark-text mb-2">⚙️ Settings</h1>
              <p className="text-dark-text-muted">
                Manage your business profiles, content blocks, and automation settings
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
          {/* Content Blocks Library (now includes evergreen setup) */}
          <section>
            <ContentBlocksManager />
          </section>

          {/* Business Profile Management */}
          <section>
            <BusinessProfileManager />
          </section>

          {/* Enhanced Monthly Specials */}
          <section>
            <MonthlySpecialsManager />
          </section>

          {/* Template Preferences */}
          <section>
            <TemplatePreferences />
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