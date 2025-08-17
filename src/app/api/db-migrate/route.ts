// src/app/api/db-migrate/route.ts
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    // Use raw SQL to create tables if they don't exist
    const { Pool } = require('pg')
    
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    })

    console.log('🔧 Creating database tables...')

    // Create NextAuth tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE,
        name TEXT,
        image TEXT,
        "emailVerified" TIMESTAMP WITH TIME ZONE,
        role TEXT DEFAULT 'USER',
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL,
        type TEXT NOT NULL,
        provider TEXT NOT NULL,
        "providerAccountId" TEXT NOT NULL,
        refresh_token TEXT,
        access_token TEXT,
        expires_at INTEGER,
        token_type TEXT,
        scope TEXT,
        id_token TEXT,
        session_state TEXT,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT accounts_userId_fkey FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(provider, "providerAccountId")
      );
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        "sessionToken" TEXT UNIQUE NOT NULL,
        "userId" TEXT NOT NULL,
        expires TIMESTAMP WITH TIME ZONE NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT sessions_userId_fkey FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
      );
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS verification_tokens (
        identifier TEXT,
        token TEXT,
        expires TIMESTAMP WITH TIME ZONE NOT NULL,
        PRIMARY KEY (identifier, token)
      );
    `)

    // Create business tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS businesses (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        "displayName" TEXT NOT NULL,
        type TEXT NOT NULL,
        website TEXT,
        phone TEXT,
        address TEXT,
        logo TEXT,
        "brandVoice" TEXT,
        tagline TEXT,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_businesses (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "userId" TEXT NOT NULL,
        "businessId" TEXT NOT NULL,
        role TEXT DEFAULT 'MEMBER',
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT user_businesses_userId_fkey FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT user_businesses_businessId_fkey FOREIGN KEY ("businessId") REFERENCES businesses(id) ON DELETE CASCADE,
        UNIQUE("userId", "businessId")
      );
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS monthly_specials (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "businessId" TEXT NOT NULL,
        month INTEGER NOT NULL,
        year INTEGER NOT NULL,
        hvac TEXT[] DEFAULT '{}',
        plumbing TEXT[] DEFAULT '{}',
        electrical TEXT[] DEFAULT '{}',
        "all" TEXT[] DEFAULT '{}',
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT monthly_specials_businessId_fkey FOREIGN KEY ("businessId") REFERENCES businesses(id) ON DELETE CASCADE,
        UNIQUE("businessId", month, year)
      );
    `)

    await pool.end()

    console.log('✅ Database tables created successfully')

    return NextResponse.json({
      success: true,
      message: 'Database tables created successfully',
      tables: [
        'users',
        'accounts', 
        'sessions',
        'verification_tokens',
        'businesses',
        'user_businesses',
        'monthly_specials'
      ]
    })

  } catch (error) {
    console.error('❌ Database migration failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Migration failed'
    }, { status: 500 })
  }
}