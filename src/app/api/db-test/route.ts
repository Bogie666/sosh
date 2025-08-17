// src/app/api/db-test/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Test raw database connection without Prisma first
    const { Pool } = require('pg')
    
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    })

    // Check what tables exist
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `)

    const tables = tablesResult.rows.map((row: any) => row.table_name)

    // Check if NextAuth tables exist
    const authTables = ['users', 'accounts', 'sessions', 'verification_tokens']
    const missingAuthTables = authTables.filter(table => !tables.includes(table))

    // Check if business tables exist
    const businessTables = ['businesses', 'user_businesses', 'monthly_specials']
    const missingBusinessTables = businessTables.filter(table => !tables.includes(table))

    await pool.end()

    return NextResponse.json({
      success: true,
      database: 'Connected',
      tables: {
        all: tables,
        auth: {
          existing: authTables.filter(table => tables.includes(table)),
          missing: missingAuthTables
        },
        business: {
          existing: businessTables.filter(table => tables.includes(table)),
          missing: missingBusinessTables
        }
      },
      needsSetup: missingAuthTables.length > 0 || missingBusinessTables.length > 0
    })

  } catch (error) {
    console.error('Database test failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Database connection failed',
      needsSetup: true
    }, { status: 500 })
  }
}