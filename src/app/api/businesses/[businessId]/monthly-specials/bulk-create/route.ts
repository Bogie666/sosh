// src/app/api/businesses/[businessId]/monthly-specials/bulk-create/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Industry-standard monthly specials templates
const MONTHLY_SPECIALS_TEMPLATES = {
  0: { // January - New Year, Healthy Home
    hvac: [
      'Air purifier installation special - Free duct cleaning with Premier One',
      'New Year system tune-up - $79 (reg $120)'
    ],
    plumbing: [
      'Free water quality test with any service',
      'New Year drain cleaning special - $99'
    ],
    electrical: [
      '2 Free USB outlets with surge protector installation',
      'Electrical safety inspection - Free with any service'
    ]
  },
  1: { // February - Sweet Home Savings
    hvac: [
      'Free CO detector ($199) with UV kit purchase',
      'Cool Club Deal - BOGO ½ Off maintenance plans'
    ],
    plumbing: [
      'Sweetheart Deal - Free water heater flush with any repair',
      'Valentine\'s special - 20% off fixture upgrades'
    ],
    electrical: [
      '25% off LED lighting upgrade package',
      'Ceiling fan installation special - $150'
    ]
  },
  2: { // March - March Madness Savings
    hvac: [
      '20% off full system replacements',
      'Pre-season AC tune-up special - $49'
    ],
    plumbing: [
      'Texas Independence Special - $1836 water heater installed',
      'Garbage disposal replacement - $450 installed'
    ],
    electrical: [
      'Panel upgrade financing - As low as $89/month',
      '20% off any electrical repair'
    ]
  },
  3: { // April - Spring Into Savings
    hvac: [
      'HVAC deluxe drain cleaning - $270 (reg $450)',
      'Solar attic fan installation - Starting at $1250'
    ],
    plumbing: [
      '½ off area drains/french drains',
      'Sewer line inspection - Free ($313 value)'
    ],
    electrical: [
      'Spring electrical safety check - Free with service',
      'Outdoor lighting installation - 25% off'
    ]
  },
  4: { // May - Early Summer Preparation
    hvac: [
      'Up to 15% off AC replacement + Free surge protection',
      'Free service call with repairs'
    ],
    plumbing: [
      'Tank to tankless upgrade - $1000 off',
      'Leak detection service - 25% off'
    ],
    electrical: [
      'Generator special - Up to $3000 off',
      'EV charger installation - $600'
    ]
  },
  5: { // June - Beat the Heat
    hvac: [
      'Energy savings special - 10% off blown insulation',
      '0% financing for 60 months on new systems'
    ],
    plumbing: [
      'Free camera inspection with drain cleaning',
      '33% off bidet conversion seat'
    ],
    electrical: [
      'Free attic lighting with panel upgrade ($600 value)',
      'Summer electrical safety check'
    ]
  },
  6: { // July - Summer Savings
    hvac: [
      'Same day emergency system replacement',
      '½ off compressor saver kit with repair ($225 value)'
    ],
    plumbing: [
      'Free flood stop with water heater install ($875 value)',
      'Hydro jetting special - 25% off'
    ],
    electrical: [
      '25% off unlimited can lighting',
      'Summer surge protection special'
    ]
  },
  7: { // August - Back to School
    hvac: [
      'Multi-system discount for 2+ system homes',
      '25% off UV light/air purifier'
    ],
    plumbing: [
      'Back to school drain clearing - $93 or it\'s free',
      'Water filtration discount - Up to $1000 off'
    ],
    electrical: [
      '25% off any electrical repair',
      'Student discount on safety inspections'
    ]
  },
  8: { // September - Fall Into Savings
    hvac: [
      'Free furnace special ($3500 value)',
      'Heat tune-up package - $49'
    ],
    plumbing: [
      'Fall plumbing inspection - 25% off',
      'Water heater service special'
    ],
    electrical: [
      'Electrical panel safety check',
      'Fall lighting upgrades - 20% off'
    ]
  },
  9: { // October - Halloween Savings
    hvac: [
      'Scary good deals on system replacements',
      'Pre-winter heating system check - $89'
    ],
    plumbing: [
      'Prevent frozen pipes - Insulation special',
      'Water heater maintenance package'
    ],
    electrical: [
      'Generator installation before winter storms',
      'Outdoor holiday lighting setup'
    ]
  },
  10: { // November - Thanksgiving Specials
    hvac: [
      'Thankful for savings - 15% off heating repairs',
      'Holiday hosting special - Free air filter upgrade'
    ],
    plumbing: [
      'Thanksgiving prep - Garbage disposal service',
      'Water heater check before holiday guests'
    ],
    electrical: [
      'Holiday electrical safety inspection',
      'Outlet upgrades for holiday decorations'
    ]
  },
  11: { // December - Holiday Specials
    hvac: [
      'Gift yourself comfort - New system financing',
      'Holiday heating special - $99 service call'
    ],
    plumbing: [
      'Holiday plumbing emergencies - Same day service',
      'New Year, new water heater - Special pricing'
    ],
    electrical: [
      'Holiday lighting installation',
      'Electrical safety for the holidays'
    ]
  }
} as const

export async function POST(
  request: Request,
  { params }: { params: { businessId: string } }
) {
  try {
    const businessId = params.businessId
    const { year } = await request.json()

    // Verify business exists
    const business = await prisma.business.findUnique({
      where: { id: businessId }
    })

    if (!business) {
      return NextResponse.json({
        success: false,
        error: 'Business not found'
      }, { status: 404 })
    }

    // Check which monthly specials already exist
    const existingSpecials = await prisma.monthlySpecial.findMany({
      where: {
        businessId,
        year: year || new Date().getFullYear()
      }
    })

    const existingMonths = new Set(existingSpecials.map(special => special.month))
    let createdCount = 0

    // Create specials for months that don't exist
    for (let month = 0; month < 12; month++) {
      if (existingMonths.has(month)) {
        continue // Skip if already exists
      }

      const template = MONTHLY_SPECIALS_TEMPLATES[month as keyof typeof MONTHLY_SPECIALS_TEMPLATES]
      
      // FIXED: Add null checking and use Array.isArray to ensure we have arrays
      if (!template) {
        console.warn(`No template found for month ${month}`)
        continue
      }

      let hvacSpecials: string[] = []
      let plumbingSpecials: string[] = []
      let electricalSpecials: string[] = []
      let allSpecials: string[] = []

      // Type-safe property access with explicit array checking
      if ('hvac' in template && Array.isArray(template.hvac)) {
        hvacSpecials = [...template.hvac]
      }
      if ('plumbing' in template && Array.isArray(template.plumbing)) {
        plumbingSpecials = [...template.plumbing]
      }
      if ('electrical' in template && Array.isArray(template.electrical)) {
        electricalSpecials = [...template.electrical]
      }
      if ('all' in template && Array.isArray(template.all)) {
        allSpecials = [...template.all]
      }

      // Filter specials based on business type
      if (business.type === 'hvac') {
        plumbingSpecials = []
        electricalSpecials = []
      } else if (business.type === 'plumbing') {
        hvacSpecials = []
        electricalSpecials = []
      } else if (business.type === 'electrical') {
        hvacSpecials = []
        plumbingSpecials = []
      }
      // For 'all' type businesses, keep all specials

      await prisma.monthlySpecial.create({
        data: {
          businessId,
          month,
          year: year || new Date().getFullYear(),
          hvac: hvacSpecials,
          plumbing: plumbingSpecials,
          electrical: electricalSpecials,
          all: allSpecials
        }
      })

      createdCount++
    }

    return NextResponse.json({
      success: true,
      message: `Created monthly specials for ${createdCount} months`,
      created: createdCount,
      skipped: 12 - createdCount
    })

  } catch (error) {
    console.error('Failed to bulk create monthly specials:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to bulk create monthly specials'
    }, { status: 500 })
  }
}