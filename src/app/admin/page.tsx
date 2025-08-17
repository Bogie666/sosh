// src/app/admin/page.tsx
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import DatabaseMigration from '@/components/admin/DatabaseMigration'

export default async function AdminPage() {
  const session = await auth()

  if (!session) {
    redirect('/auth/signin')
  }

  return (
    <div className="min-h-screen p-5">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-dark-text mb-2">🔧 Admin Dashboard</h1>
          <p className="text-dark-text-muted">Manage database migrations and system settings</p>
        </div>

        <main className="space-y-6">
          {/* Database Migration Section */}
          <section>
            <DatabaseMigration />
          </section>

          {/* Database Status Quick Check */}
          <section className="bg-slate-800/50 rounded-lg p-6 border border-slate-600/50">
            <h2 className="text-xl font-semibold text-dark-text mb-4">📊 System Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-900/50 rounded-lg">
                <h3 className="font-medium text-dark-text mb-2">🗄️ Database</h3>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400"></div>
                  <span className="text-sm text-green-400">Connected</span>
                </div>
              </div>
              
              <div className="p-4 bg-slate-900/50 rounded-lg">
                <h3 className="font-medium text-dark-text mb-2">🤖 AI Services</h3>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400"></div>
                  <span className="text-sm text-green-400">Available</span>
                </div>
              </div>
              
              <div className="p-4 bg-slate-900/50 rounded-lg">
                <h3 className="font-medium text-dark-text mb-2">📸 Image Processing</h3>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                  <span className="text-sm text-yellow-400">Phase 1 Pending</span>
                </div>
              </div>
            </div>
          </section>

          {/* Quick Actions */}
          <section className="bg-slate-800/50 rounded-lg p-6 border border-slate-600/50">
            <h2 className="text-xl font-semibold text-dark-text mb-4">⚡ Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <a href="/" className="btn btn-outline">
                🏠 Back to Dashboard
              </a>
              <a href="/api/db-test" target="_blank" className="btn btn-outline">
                🧪 Test Database Connection
              </a>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}