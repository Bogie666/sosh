// src/components/Header.tsx
'use client'

import { useSession, signOut } from 'next-auth/react'
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function Header() {
  const { data: session } = useSession()
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false)
      }
    }

    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isUserMenuOpen])

  const handleSignOut = async () => {
    await signOut({ 
      callbackUrl: '/auth/signin',
      redirect: true 
    })
  }

  const handleNavigation = (path: string) => {
    setIsUserMenuOpen(false)
    router.push(path)
  }

  const handleSettingsClick = () => {
    setIsUserMenuOpen(false)
    router.push('/settings')
  }

  const handleCalendarClick = () => {
    setIsUserMenuOpen(false)
    router.push('/calendar')
  }

  const getDropdownPosition = () => {
    if (!buttonRef.current) return { top: 0, right: 0 }
    
    const rect = buttonRef.current.getBoundingClientRect()
    return {
      top: rect.bottom + 8,
      right: window.innerWidth - rect.right
    }
  }

  const dropdownContent = isUserMenuOpen && mounted ? (
    <div 
      className="fixed w-48 bg-dark-card border border-dark-border rounded-lg shadow-lg py-1"
      style={{
        top: `${getDropdownPosition().top}px`,
        right: `${getDropdownPosition().right}px`,
        zIndex: 999999
      }}
    >
      <div className="px-3 py-2 border-b border-dark-border">
        <p className="text-sm font-medium text-dark-text truncate">
          {session?.user?.name}
        </p>
        <p className="text-xs text-dark-text-muted truncate">
          {session?.user?.email}
        </p>
      </div>
      
      <button
        onClick={handleCalendarClick}
        className="block w-full text-left px-3 py-2 text-sm text-dark-text hover:bg-slate-700/50 transition-colors"
      >
        📅 Calendar
      </button>
      
      <button
        onClick={handleSettingsClick}
        className="block w-full text-left px-3 py-2 text-sm text-dark-text hover:bg-slate-700/50 transition-colors"
      >
        ⚙️ Settings
      </button>
      
      <div className="border-t border-dark-border mt-1 pt-1">
        <button
          onClick={handleSignOut}
          className="w-full text-left px-3 py-2 text-sm text-dark-text hover:bg-slate-700/50 transition-colors"
        >
          🚪 Sign Out
        </button>
      </div>
    </div>
  ) : null

  return (
    <header className="flex justify-between items-center bg-dark-card border border-dark-border p-6 rounded-2xl shadow-dark backdrop-blur-lg mb-8">
      <div className="flex items-center gap-4">
        {/* Sosh Logo */}
        <Image 
          src="/sosh.png" 
          alt="Sosh" 
          width={150} 
          height={60}
          className="rounded-lg shadow-lg"
        />
        <div>
          <p className="text-dark-text-muted">
            AI-powered social media automation
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Connection Status */}
        <div className="flex items-center gap-2 text-dark-text-muted">
          <div className="w-3 h-3 rounded-full bg-accent-green animate-pulse"></div>
          <span className="text-sm font-medium">Connected</span>
        </div>

        {/* User Menu */}
        {session && (
          <div className="relative">
            <button
              ref={buttonRef}
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 p-2 rounded-lg border border-dark-border hover:bg-slate-700/50 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-blue flex items-center justify-center text-white font-semibold text-sm">
                {session.user?.name?.charAt(0) || 'U'}
              </div>
              <span className="text-dark-text text-sm hidden md:block">
                {session.user?.name || 'User'}
              </span>
              <svg className="w-4 h-4 text-dark-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Portal the dropdown to document.body */}
            {mounted && typeof document !== 'undefined' && createPortal(
              dropdownContent,
              document.body
            )}
          </div>
        )}

        {/* Quick Sign Out Button */}
        <button
          onClick={handleSignOut}
          className="btn btn-outline btn-sm"
        >
          🚪 Sign Out
        </button>
      </div>
    </header>
  )
}