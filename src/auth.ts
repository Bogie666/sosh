// src/auth.ts
import NextAuth, { DefaultSession } from 'next-auth'
import Google from 'next-auth/providers/google'
import type { NextAuthConfig } from 'next-auth'

// Enhanced scope for Google Business Profile access
const GOOGLE_SCOPES = [
  'openid',
  'email', 
  'profile',
  'https://www.googleapis.com/auth/business.manage', // Google Business Profile management
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
].join(' ')

// Ensure required environment variables are present
if (!process.env.GOOGLE_CLIENT_ID) {
  throw new Error('Missing GOOGLE_CLIENT_ID environment variable')
}

if (!process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error('Missing GOOGLE_CLIENT_SECRET environment variable')
}

if (!process.env.NEXTAUTH_SECRET) {
  throw new Error('Missing NEXTAUTH_SECRET environment variable')
}

export const config = {
  // Temporarily disable Prisma adapter to fix connection issues
  // adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope: GOOGLE_SCOPES,
          access_type: 'offline',
          prompt: 'consent',
          response_type: 'code'
        }
      }
    })
  ],
  callbacks: {
    async session({ session, token }) {
      if (session?.user && token) {
        // Stable user ID resolution:
        // 1. Prefer token.sub (Google OAuth subject ID - stable across sessions)
        // 2. Fall back to token.userId (saved from JWT callback)
        // 3. Fall back to a deterministic hash of email (stable per user)
        // NEVER use Date.now() - that creates a new ID every request
        const stableId = token.sub
          || (token.userId as string | undefined)
          || (session.user.email ? `email-${session.user.email}` : null)
          || 'anonymous'

        session.user.id = stableId

        // Add token info from JWT callback
        if (token?.accessToken) {
          session.accessToken = token.accessToken as string
        }
        if (token?.refreshToken) {
          session.refreshToken = token.refreshToken as string
        }
        if (token?.expiresAt) {
          session.expiresAt = token.expiresAt as number
        }

        // For now, assign all businesses to user (since we can't check database)
        session.user.businesses = ['lex-dallas', 'lex-etx', 'lyons']
      }

      return session
    },
    
    async jwt({ token, account, user }) {
      // Initial sign in - save tokens to JWT
      if (account && user) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.expiresAt = account.expires_at
        token.userId = user.id || account.providerAccountId
        
        console.log('🔐 Initial JWT setup for user:', user.email)
        return token
      }
      
      // Return previous token if still valid
      return token
    },
    
    async signIn({ user, account, profile }) {
      console.log('🔐 Sign in attempt:', {
        provider: account?.provider,
        userEmail: user?.email,
        hasAccessToken: !!account?.access_token
      })
      
      // Allow sign in for Google provider
      if (account?.provider === 'google') {
        console.log('✅ Google sign in approved for:', user?.email)
        return true
      }
      
      console.log('❌ Sign in rejected - unsupported provider:', account?.provider)
      return false
    }
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error'
  },
  session: {
    strategy: 'jwt', // Use JWT sessions while fixing database connection
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60     // 24 hours
  },
  debug: process.env.NODE_ENV === 'development',
  secret: process.env.NEXTAUTH_SECRET,
  // Important for Vercel deployments
  trustHost: true
} satisfies NextAuthConfig

export const { handlers, auth, signIn, signOut } = NextAuth(config)