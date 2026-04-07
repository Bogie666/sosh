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

    const availableTemplates = [
      { id: 'seasonal_tip', name: 'Seasonal Tips', description: 'Weather-appropriate tips and advice', category: 'Educational', frequency: 'Weekly' },
      { id: 'maintenance_reminder', name: 'Maintenance Reminders', description: 'Regular service reminders', category: 'Service', frequency: 'Monthly' },
      { id: 'weather_alert', name: 'Weather Alerts', description: 'Weather-related protection tips', category: 'Urgent', frequency: 'As needed' },
      { id: 'promotion', name: 'Special Promotions', description: 'Promotions and special offers', category: 'Marketing', frequency: 'Monthly' },
      { id: 'customer_story', name: 'Customer Stories', description: 'Testimonials and reviews', category: 'Social Proof', frequency: 'Weekly' },
      { id: 'company_update', name: 'Company News', description: 'Business updates', category: 'Company', frequency: 'As needed' },
      { id: 'emergency_service', name: 'Emergency Service', description: '24/7 availability reminders', category: 'Service', frequency: 'Monthly' }
    ]

    const currentMonth = new Date().getMonth()

    return NextResponse.json({
      success: true,
      capabilities: {
        isConfigured,
        currentSeason: getSeason(currentMonth),
        availableTemplates,
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
