// src/app/api/ai/capabilities/route.ts
import { NextResponse } from 'next/server'
import { aiService } from '@/lib/ai-service'

export async function GET() {
  try {
    // Check if AI service is configured
    const isConfigured = aiService.isConfigured()
    
    // Define available templates
    const availableTemplates = [
      {
        id: 'seasonal_tip',
        name: 'Seasonal Tips',
        description: 'Weather-appropriate HVAC tips and advice',
        category: 'Educational',
        frequency: 'Weekly'
      },
      {
        id: 'maintenance_reminder',
        name: 'Maintenance Reminders',
        description: 'Regular service and tune-up reminders',
        category: 'Service',
        frequency: 'Monthly'
      },
      {
        id: 'weather_alert',
        name: 'Weather Alerts',
        description: 'Weather-related HVAC protection tips',
        category: 'Urgent',
        frequency: 'As needed'
      },
      {
        id: 'promotion',
        name: 'Special Promotions',
        description: 'Service promotions and special offers',
        category: 'Marketing',
        frequency: 'Monthly'
      },
      {
        id: 'customer_story',
        name: 'Customer Success Stories',
        description: 'Testimonials and positive reviews',
        category: 'Social Proof',
        frequency: 'Weekly'
      },
      {
        id: 'company_update',
        name: 'Company News',
        description: 'Business updates and announcements',
        category: 'Company',
        frequency: 'As needed'
      },
      {
        id: 'emergency_service',
        name: 'Emergency Service',
        description: '24/7 emergency availability reminders',
        category: 'Service',
        frequency: 'Monthly'
      }
    ]

    // Define supported platforms
    const supportedPlatforms = [
      {
        id: 'google',
        name: 'Google Business Profile',
        icon: '🏢',
        specs: {
          charLimit: 1500,
          sweetSpot: '200-400',
          contentStyle: 'Professional, informative'
        }
      },
      {
        id: 'facebook',
        name: 'Facebook',
        icon: '📘',
        specs: {
          charLimit: 63206,
          sweetSpot: '200-400',
          contentStyle: 'Conversational, community-focused'
        }
      },
      {
        id: 'instagram',
        name: 'Instagram',
        icon: '📷',
        specs: {
          charLimit: 2200,
          sweetSpot: '100-200',
          contentStyle: 'Visual-friendly, emoji-rich'
        }
      },
      {
        id: 'twitter',
        name: 'X/Twitter',
        icon: '🦅',
        specs: {
          charLimit: 280,
          sweetSpot: '240-280',
          contentStyle: 'Concise, punchy'
        }
      }
    ]

    // Define supported businesses
    const supportedBusinesses = [
      {
        id: 'lex-dallas',
        name: 'Lex Dallas',
        voice: 'Professional and trustworthy',
        tagline: 'Your trusted HVAC experts in Dallas'
      },
      {
        id: 'lex-etx',
        name: 'Lex ETX',
        voice: 'Friendly and reliable',
        tagline: 'East Texas HVAC specialists'
      },
      {
        id: 'lyons',
        name: 'Lyons',
        voice: 'Enthusiastic and service-focused',
        tagline: 'The King of 5-Star Service'
      }
    ]

    // Determine current season
    const currentMonth = new Date().getMonth()
    const currentSeason = getCurrentSeason(currentMonth)

    const capabilities = {
      isConfigured,
      currentSeason,
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
        bulkGeneration: true
      }
    }

    return NextResponse.json({
      success: true,
      capabilities
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

function getCurrentSeason(month: number): string {
  if (month >= 2 && month <= 4) return 'Spring'
  if (month >= 5 && month <= 7) return 'Summer'
  if (month >= 8 && month <= 10) return 'Fall'
  return 'Winter'
}