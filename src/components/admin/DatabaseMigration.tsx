// src/components/admin/DatabaseMigration.tsx
'use client'

import { useState, useEffect } from 'react'

interface MigrationStatus {
  isMigrated: boolean
  isComplete: boolean
  businesses: number
  profiles: number
  contentBlocks: number
  images: number
}

interface MigrationResult {
  success: boolean
  message: string
  data?: any
  error?: string
}

export default function DatabaseMigration() {
  const [status, setStatus] = useState<MigrationStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [migrating, setMigrating] = useState(false)
  const [result, setResult] = useState<MigrationResult | null>(null)

  // Check migration status on component mount
  useEffect(() => {
    checkMigrationStatus()
  }, [])

  const checkMigrationStatus = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/migrate/phase1')
      const data = await response.json()
      
      if (data.success) {
        setStatus(data.status)
      } else {
        console.error('Failed to check migration status:', data.error)
      }
    } catch (error) {
      console.error('Error checking migration status:', error)
    } finally {
      setLoading(false)
    }
  }

  const runMigration = async () => {
    if (!confirm('Are you sure you want to run the Phase 1 database migration? This will add new tables and data to your database.')) {
      return
    }

    setMigrating(true)
    setResult(null)
    
    try {
      console.log('🚀 Starting Phase 1 migration...')
      
      const response = await fetch('/api/migrate/phase1', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      const data = await response.json()
      setResult(data)
      
      if (data.success) {
        console.log('✅ Migration completed successfully')
        await checkMigrationStatus() // Refresh status
      } else {
        console.error('❌ Migration failed:', data.error)
      }
      
    } catch (error) {
      console.error('Migration request failed:', error)
      setResult({
        success: false,
        message: 'Migration request failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setMigrating(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-600/50">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
          <span className="text-dark-text">Checking migration status...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-600/50">
      <h3 className="text-xl font-semibold text-dark-text mb-4">🗄️ Phase 1 Database Migration</h3>
      
      {/* Current Status */}
      {status && (
        <div className="mb-6 p-4 bg-slate-900/50 rounded-lg">
          <h4 className="font-medium text-dark-text mb-3">📊 Current Database Status</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-dark-text-muted">Businesses</div>
              <div className="text-lg font-semibold text-blue-400">{status.businesses}</div>
            </div>
            <div>
              <div className="text-dark-text-muted">Business Profiles</div>
              <div className="text-lg font-semibold text-green-400">{status.profiles}</div>
            </div>
            <div>
              <div className="text-dark-text-muted">Content Blocks</div>
              <div className="text-lg font-semibold text-purple-400">{status.contentBlocks}</div>
            </div>
            <div>
              <div className="text-dark-text-muted">Images</div>
              <div className="text-lg font-semibold text-yellow-400">{status.images}</div>
            </div>
          </div>
          
          <div className="mt-4 flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${status.isComplete ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
            <span className={`text-sm ${status.isComplete ? 'text-green-400' : 'text-yellow-400'}`}>
              {status.isComplete ? '✅ Phase 1 Migration Complete' : 
               status.isMigrated ? '⚠️ Partial Migration' : '🔄 Migration Needed'}
            </span>
          </div>
        </div>
      )}

      {/* Migration Control */}
      <div className="space-y-4">
        {!status?.isComplete ? (
          <div>
            <h4 className="font-medium text-dark-text mb-2">🚀 Run Phase 1 Migration</h4>
            <p className="text-sm text-dark-text-muted mb-4">
              This will add the new Phase 1 features to your database:
            </p>
            <ul className="text-sm text-dark-text-muted mb-4 space-y-1 ml-4">
              <li>• Enhanced Business Profiles with brand voice settings</li>
              <li>• Content Blocks Library for reusable snippets</li>
              <li>• Image Library with AI tagging system</li>
              <li>• Platform-specific image optimization</li>
            </ul>
            
            <button
              onClick={runMigration}
              disabled={migrating}
              className="btn btn-primary"
            >
              {migrating ? '🔄 Migrating...' : '🚀 Run Phase 1 Migration'}
            </button>
          </div>
        ) : (
          <div className="p-4 bg-green-400/10 border border-green-400/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-green-400 text-lg">✅</span>
              <h4 className="font-medium text-green-400">Phase 1 Migration Complete</h4>
            </div>
            <p className="text-sm text-dark-text-muted">
              Your database is ready for Phase 1 features! You can now use:
            </p>
            <ul className="text-sm text-dark-text-muted mt-2 space-y-1 ml-4">
              <li>• Business Profile Management</li>
              <li>• Content Blocks System</li>
              <li>• Enhanced Image Library</li>
              <li>• AI-Powered Content Safety</li>
            </ul>
          </div>
        )}

        {/* Refresh Status */}
        <button
          onClick={checkMigrationStatus}
          disabled={loading}
          className="btn btn-outline btn-sm"
        >
          {loading ? '🔄 Checking...' : '🔄 Refresh Status'}
        </button>
      </div>

      {/* Migration Result */}
      {result && (
        <div className={`mt-6 p-4 rounded-lg border ${
          result.success 
            ? 'bg-green-400/10 border-green-400/20' 
            : 'bg-red-400/10 border-red-400/20'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-lg ${result.success ? 'text-green-400' : 'text-red-400'}`}>
              {result.success ? '✅' : '❌'}
            </span>
            <h4 className={`font-medium ${result.success ? 'text-green-400' : 'text-red-400'}`}>
              Migration {result.success ? 'Success' : 'Failed'}
            </h4>
          </div>
          
          <p className="text-sm text-dark-text-muted mb-2">{result.message}</p>
          
          {result.data && result.success && (
            <div className="text-xs text-dark-text-muted mt-2">
              <div>Business Profiles Created: {result.data.businessProfiles?.count || 0}</div>
              <div>Content Blocks Created: {result.data.contentBlocks?.count || 0}</div>
            </div>
          )}
          
          {result.error && (
            <div className="text-xs text-red-400 mt-2 font-mono">
              Error: {result.error}
            </div>
          )}
        </div>
      )}
    </div>
  )
}