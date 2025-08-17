// types/next-auth.d.ts
import { DefaultSession, DefaultUser } from 'next-auth'
import { JWT, DefaultJWT } from 'next-auth/jwt'
import { UserRole, BusinessRole } from '@prisma/client'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role?: UserRole
      businesses?: string[]
    } & DefaultSession['user']
    accessToken?: string
    refreshToken?: string | null
    expiresAt?: number | null
    error?: string
  }

  interface User extends DefaultUser {
    id: string
    role?: UserRole
    businesses?: string[]
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    accessToken?: string
    refreshToken?: string | null
    expiresAt?: number | null
    userId?: string
    role?: UserRole
    businesses?: string[]
    error?: string
  }
}

declare module '@auth/core/adapters' {
  interface AdapterUser extends DefaultUser {
    id: string
    role?: UserRole
    businesses?: string[]
  }
}