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
      'Free fire pit/grill gas line with installation',
      'Fall plumbing maintenance package'
    ],
    electrical: [
      'Fall electrical safety inspection',
      'Outdoor holiday lighting prep - 25% off'
    ]
  },
  9: { // October - Early Bird Winter Prep
    hvac: [
      'Furnace cleaning kit - $750 off (reg $2240)',
      'CO detector replacement with filtration purchase'
    ],
    plumbing: [
      '$200 off new power flush toilet',
      'Winter pipe protection service'
    ],
    electrical: [
      'Free outdoor circuit with permanent LED lighting',
      'Winter electrical safety check'
    ]
  },
  10: { // November - Thanks & Giving
    hvac: [
      'Black Friday system special - 30% off',
      'Free outdoor unit with indoor equipment purchase'
    ],
    plumbing: [
      'Thanksgiving plumbing special - Disposal $450',
      'Holiday guest prep plumbing package'
    ],
    electrical: [
      'Holiday lighting installation special',
      'Thanksgiving electrical safety check'
    ]
  },
  11: { // December - Holiday Home Comfort
    all: [
      'Year-end clearance - Up to 30% off all repairs',
      'Holiday emergency service - Same pricing',
      'New Year prep maintenance packages'
    ]
  }
}

export async function POST(
  request: Request,
  { params }: { params: { businessId: string } }
) {
  try {
    const { businessId } = params
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

    // Get existing specials to avoid duplicates
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
      
      // Customize template based on business type
      let hvacSpecials = template.hvac || []
      let plumbingSpecials = template.plumbing || []
      let electricalSpecials = template.electrical || []
      let allSpecials = template.all || []

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