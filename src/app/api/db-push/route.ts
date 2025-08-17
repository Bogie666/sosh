// src/app/api/db-push/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    console.log('=== DATABASE CONNECTION TEST ===')
    
    // Test basic connection
    await prisma.$connect()
    console.log('✅ Prisma connected successfully')
    
    // Test query execution
    const result = await prisma.$queryRaw`SELECT 1 as test`
    console.log('✅ Database query successful:', result)
    
    // Test table existence (this will show if migration is needed)
    try {
      const userCount = await prisma.user.count()
      console.log('✅ User table accessible, count:', userCount)
      
      return NextResponse.json({
        success: true,
        message: 'Database connection successful',
        details: {
          connected: true,
          userCount: userCount,
          timestamp: new Date().toISOString()
        }
      })
    } catch (tableError) {
      console.log('⚠️ Tables may not exist yet:', tableError)
      
      return NextResponse.json({
        success: true,
        message: 'Database connected but tables need migration',
        needsMigration: true,
        details: {
          connected: true,
          tablesExist: false,
          error: tableError instanceof Error ? tableError.message : 'Unknown table error'
        }
      })
    }
    
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Database connection failed',
      needsSetup: true,
      details: {
        errorType: error?.constructor?.name || 'Unknown',
        timestamp: new Date().toISOString()
      }
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

export async function POST() {
  try {
    console.log('=== RUNNING DATABASE PUSH ===')
    
    // This would normally run prisma db push
    // For production, we'll just test the connection
    await prisma.$connect()
    
    return NextResponse.json({
      success: true,
      message: 'Database push would run here in development',
      note: 'In production, run migrations via Vercel build process'
    })
    
  } catch (error) {
    console.error('❌ Database push failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Database push failed'
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}