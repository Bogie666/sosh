// src/app/layout.tsx
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { SessionProvider } from 'next-auth/react'
import { auth } from '@/auth'
import { Toaster } from 'react-hot-toast'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Social Media Manager',
  description: 'AI-powered social media automation for multiple business locations',
  keywords: ['social media', 'automation', 'Google Business Profile', 'AI', 'reviews'],
  authors: [{ name: 'Ryan' }],
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} min-h-screen bg-gradient-dark text-dark-text antialiased`}>
        <SessionProvider session={session}>
          <div className="min-h-screen">
            {children}
          </div>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'rgba(15, 23, 42, 0.95)',
                color: '#e2e8f0',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                backdropFilter: 'blur(20px)',
              },
              success: {
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#ffffff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#ffffff',
                },
              },
            }}
          />
        </SessionProvider>
      </body>
    </html>
  )
}