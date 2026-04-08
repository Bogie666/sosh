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
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        buttonRef.current && !buttonRef.current.contains(event.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsUserMenuOpen(false)
      }
    }

    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isUserMenuOpen])

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/auth/signin', redirect: true })
  }

  const handleNavigation = (path: string) => {
    setIsUserMenuOpen(false)
    router.push(path)
  }

  const getDropdownPosition = () => {
    if (!buttonRef.current) return { top: 0, right: 0 }
    const rect = buttonRef.current.getBoundingClientRect()
    const isMobile = window.innerWidth < 640
    return {
      top: rect.bottom + 8,
      right: isMobile ? 16 : Math.max(16, window.innerWidth - rect.right)
    }
  }

  const dropdownContent = isUserMenuOpen && mounted ? (
    <div
      ref={dropdownRef}
      className="fixed w-56 sm:w-48 bg-dark-card border border-dark-border rounded-lg shadow-lg py-1"
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
        onClick={() => handleNavigation('/')}
        className="block w-full text-left px-3 py-2.5 text-sm text-dark-text hover:bg-slate-700/50 active:bg-slate-700/70 transition-colors"
      >
        Dashboard
      </button>

      <button
        onClick={() => handleNavigation('/calendar')}
        className="block w-full text-left px-3 py-2.5 text-sm text-dark-text hover:bg-slate-700/50 active:bg-slate-700/70 transition-colors"
      >
        Calendar
      </button>

      <button
        onClick={() => handleNavigation('/settings')}
        className="block w-full text-left px-3 py-2.5 text-sm text-dark-text hover:bg-slate-700/50 active:bg-slate-700/70 transition-colors"
      >
        Settings
      </button>

      <div className="border-t border-dark-border mt-1 pt-1">
        <button
          onClick={handleSignOut}
          className="w-full text-left px-3 py-2.5 text-sm text-red-400 hover:bg-slate-700/50 active:bg-slate-700/70 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  ) : null

  return (
    <header className="flex justify-between items-center bg-dark-card border border-dark-border p-3 sm:p-6 rounded-xl sm:rounded-2xl shadow-dark backdrop-blur-lg mb-4 sm:mb-8 gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <Image
          src="/sosh.png"
          alt="Sosh"
          width={150}
          height={60}
          className="rounded-lg shadow-lg w-[80px] sm:w-[150px] h-auto"
        />
        <p className="text-dark-text-muted text-xs sm:text-base hidden sm:block">
          AI-powered social media automation
        </p>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
        {/* Connection Status - hide on very small screens */}
        <div className="hidden sm:flex items-center gap-2 text-dark-text-muted">
          <div className="w-3 h-3 rounded-full bg-accent-green animate-pulse"></div>
          <span className="text-sm font-medium">Connected</span>
        </div>

        {/* User Menu */}
        {session && (
          <button
            ref={buttonRef}
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2 p-2 rounded-lg border border-dark-border hover:bg-slate-700/50 active:bg-slate-700/70 transition-colors min-h-[44px]"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-blue flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
              {session.user?.name?.charAt(0) || 'U'}
            </div>
            <span className="text-dark-text text-sm hidden md:block">
              {session.user?.name || 'User'}
            </span>
            <svg className="w-4 h-4 text-dark-text-muted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}

        {/* Portal the dropdown to document.body */}
        {mounted && typeof document !== 'undefined' && createPortal(dropdownContent, document.body)}
      </div>
    </header>
  )
}
