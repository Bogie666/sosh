// src/components/CollapsibleSection.tsx
'use client'

import { useState, useEffect } from 'react'
import { ChevronDownIcon } from '@heroicons/react/24/outline'

interface CollapsibleSectionProps {
  title: string
  children: React.ReactNode
  defaultExpanded?: boolean
  className?: string
}

export default function CollapsibleSection({ 
  title, 
  children, 
  defaultExpanded = false,
  className = ''
}: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  useEffect(() => {
    // Load saved state from localStorage
    const savedState = localStorage.getItem(`section-${title}`)
    if (savedState !== null) {
      setIsExpanded(JSON.parse(savedState))
    }
  }, [title])

  const toggleExpanded = () => {
    const newState = !isExpanded
    setIsExpanded(newState)
    // Save state to localStorage
    localStorage.setItem(`section-${title}`, JSON.stringify(newState))
  }

  return (
    <section className={`card ${className}`}>
      <div 
        className="section-header"
        onClick={toggleExpanded}
      >
        <h2 className="text-xl font-semibold">{title}</h2>
        <ChevronDownIcon 
          className={`w-5 h-5 text-dark-text-muted transition-transform duration-300 ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </div>
      
      <div className={`section-content transition-all duration-300 overflow-hidden ${
        isExpanded ? 'max-h-none opacity-100' : 'max-h-0 opacity-0 py-0'
      }`}>
        {children}
      </div>
    </section>
  )
}