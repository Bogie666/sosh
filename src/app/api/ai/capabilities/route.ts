// src/app/api/ai/capabilities/route.ts
import { NextResponse } from 'next/server'
import { aiService } from '@/lib/ai-service'
import { prisma } from '@/lib/prisma'
import { getAllPlatforms } from '@/lib/platform-specs'

export async function GET() {
  try {
    const isConfigured = aiService.isConfigured()

    // Load businesses dynamically from database
    const businesses = await prisma.business.findMany({
      select: { id: true, displayName: true, brandVoice: true, tagline: true },
      orderBy: { displayName: 'asc' }
    })

    const supportedBusinesses = businesses.map((b: any) => ({
      id: b.id,
      name: b.displayName,
      voice: b.brandVoice || 'Professional',
      tagline: b.tagline || ''
    }))

    // Platform specs from single source of truth
    const supportedPlatforms = getAllPlatforms().map(p => ({
      id: p.id,
      name: p.name,
      icon: p.icon,
      specs: {
        charLimit: p.charLimit,
        sweetSpot: p.recommendedLength,
        contentStyle: p.bestPractices[0] || ''
      }
    }))

    const currentMonth = new Date().getMonth()

    return NextResponse.json({
      success: true,
      capabilities: {
        isConfigured,
        currentSeason: getSeason(currentMonth),
        availableTemplates: [],
        supportedPlatforms,
        supportedBusinesses,
        features: {
          contentGeneration: isConfigured,
          businessSettings: true,
          contentBlocks: true,
          monthlySpecials: true,
          imageLibrary: true,
          multiPlatform: true,
          bulkGeneration: true,
          postingOptimization: true,
          contentFreshness: true,
          imageSelection: true
        }
      }
    })
  } catch (error) {
    console.error('Error fetching AI capabilities:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch AI capabilities',
      capabilities: {
        isConfigured: false,
        currentSeason: 'Unknown',
        availableTemplates: [],
        supportedPlatforms: [],
        supportedBusinesses: [],
        features: {}
      }
    })
  }
}

function getSeason(month: number): string {
  if (month >= 2 && month <= 4) return 'Spring'
  if (month >= 5 && month <= 7) return 'Summer'
  if (month >= 8 && month <= 10) return 'Fall'
  return 'Winter'
}
