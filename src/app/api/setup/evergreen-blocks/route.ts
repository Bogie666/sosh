// src/app/api/setup/evergreen-blocks/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Evergreen content blocks that work year-round
const EVERGREEN_BLOCKS = [
  // Financing & Payment Options
  {
    name: 'Zero Percent Financing',
    type: 'financing',
    category: 'promotional',
    content: '0% financing available! Call us today for details and approval.',
    shortCode: '{ZERO_FINANCING}',
    sortOrder: 10
  },
  {
    name: 'Flexible Payment Options',
    type: 'financing', 
    category: 'promotional',
    content: 'Flexible payment plans available to fit your budget.',
    shortCode: '{PAYMENT_PLANS}',
    sortOrder: 11
  },
  
  // Discounts & Savings
  {
    name: 'Air Filter Discount',
    type: 'evergreen',
    category: 'promotional',
    content: '10% off air filters with code CLEAN10 - order online or call!',
    shortCode: '{FILTER_DISCOUNT}',
    sortOrder: 12
  },
  {
    name: 'Free Estimates',
    type: 'evergreen',
    category: 'promotional', 
    content: 'Free estimates on all system replacements and major repairs!',
    shortCode: '{FREE_ESTIMATE}',
    sortOrder: 13
  },
  {
    name: 'Senior Discount',
    type: 'evergreen',
    category: 'promotional',
    content: 'Ask about our senior citizen and military discounts!',
    shortCode: '{SENIOR_DISCOUNT}',
    sortOrder: 14
  },
  
  // Service Guarantees
  {
    name: 'Satisfaction Guarantee',
    type: 'evergreen',
    category: 'promotional',
    content: '100% satisfaction guaranteed or we make it right!',
    shortCode: '{SATISFACTION}',
    sortOrder: 15
  },
  {
    name: 'Parts & Labor Warranty',
    type: 'evergreen',
    category: 'legal',
    content: 'All work comes with parts and labor warranty for your peace of mind.',
    shortCode: '{WARRANTY}',
    sortOrder: 16
  },
  
  // Membership & Programs
  {
    name: 'Cool Club Membership',
    type: 'evergreen',
    category: 'promotional',
    content: 'Join our Cool Club for priority service, exclusive discounts, and annual maintenance!',
    shortCode: '{COOL_CLUB}',
    sortOrder: 17
  },
  {
    name: 'Maintenance Plans',
    type: 'evergreen',
    category: 'promotional',
    content: 'Maintenance plans available - keep your system running efficiently year-round!',
    shortCode: '{MAINTENANCE_PLAN}',
    sortOrder: 18
  },
  
  // Service Features
  {
    name: 'Same Day Service',
    type: 'evergreen',
    category: 'informational',
    content: 'Same day service available! Call early for best availability.',
    shortCode: '{SAME_DAY}',
    sortOrder: 19
  },
  {
    name: 'Emergency Service',
    type: 'evergreen',
    category: 'informational',
    content: '24/7 emergency service available - we\'re here when you need us most!',
    shortCode: '{EMERGENCY_24_7}',
    sortOrder: 20
  },
  {
    name: 'Licensed & Insured',
    type: 'evergreen',
    category: 'legal',
    content: 'Fully licensed, bonded, and insured for your protection.',
    shortCode: '{LICENSED}',
    sortOrder: 21
  },
  {
    name: 'Background Checked Techs',
    type: 'evergreen',
    category: 'informational',
    content: 'All technicians are background checked and drug tested for your safety.',
    shortCode: '{BACKGROUND_CHECK}',
    sortOrder: 22
  },
  
  // Digital & Convenience
  {
    name: 'Online Scheduling',
    type: 'evergreen',
    category: 'informational',
    content: 'Schedule service online 24/7 at your convenience!',
    shortCode: '{ONLINE_BOOKING}',
    sortOrder: 23
  },
  {
    name: 'Upfront Pricing',
    type: 'evergreen',
    category: 'informational',
    content: 'Upfront pricing with no hidden fees - you know the cost before we start!',
    shortCode: '{UPFRONT_PRICING}',
    sortOrder: 24
  },
  
  // Trust & Recognition
  {
    name: 'BBB Accredited',
    type: 'evergreen',
    category: 'informational',
    content: 'Proud BBB Accredited Business with A+ rating.',
    shortCode: '{BBB_RATING}',
    sortOrder: 25
  },
  {
    name: 'Google Reviews',
    type: 'evergreen',
    category: 'promotional',
    content: 'Check out our 5-star Google reviews from satisfied customers!',
    shortCode: '{FIVE_STAR}',
    sortOrder: 26
  }
]

// Business-specific customizations
const BUSINESS_CUSTOMIZATIONS = {
  'lex-dallas': {
    taglineBlock: {
      name: 'Lex Dallas Tagline',
      type: 'custom',
      category: 'informational',
      content: 'The Gold Standard of White Glove Service',
      shortCode: '{LEX_TAGLINE}',
      sortOrder: 5
    }
  },
  'lex-etx': {
    taglineBlock: {
      name: 'Lex ETX Tagline', 
      type: 'custom',
      category: 'informational',
      content: 'Quality workmanship, honest service',
      shortCode: '{LEX_ETX_TAGLINE}',
      sortOrder: 5
    }
  },
  'lyons': {
    taglineBlock: {
      name: 'Lyons Tagline',
      type: 'custom', 
      category: 'informational',
      content: 'The King of 5-Star Service',
      shortCode: '{LYONS_TAGLINE}',
      sortOrder: 5
    },
    royaltyBlock: {
      name: 'Royal Treatment',
      type: 'evergreen',
      category: 'promotional', 
      content: 'Experience the royal treatment - you deserve the best!',
      shortCode: '{ROYAL_TREATMENT}',
      sortOrder: 27
    }
  }
}

export async function POST() {
  try {
    console.log('🌲 Setting up evergreen content blocks...')

    // Get all businesses
    const businesses = await prisma.business.findMany()
    
    if (businesses.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No businesses found. Please run initial setup first.'
      }, { status: 400 })
    }

    let totalCreated = 0
    const results = []

    for (const business of businesses) {
      console.log(`Setting up evergreen blocks for ${business.displayName}...`)
      
      let businessBlocksCreated = 0
      
      // Create standard evergreen blocks for each business
      for (const blockTemplate of EVERGREEN_BLOCKS) {
        // Check if block already exists
        const existingBlock = await prisma.contentBlock.findFirst({
          where: {
            businessId: business.id,
            shortCode: blockTemplate.shortCode
          }
        })

        if (!existingBlock) {
          await prisma.contentBlock.create({
            data: {
              businessId: business.id,
              ...blockTemplate
            }
          })
          businessBlocksCreated++
          totalCreated++
        }
      }

      // Add business-specific customizations
      const customizations = BUSINESS_CUSTOMIZATIONS[business.id as keyof typeof BUSINESS_CUSTOMIZATIONS]
      if (customizations) {
        for (const [key, blockTemplate] of Object.entries(customizations)) {
          const existingBlock = await prisma.contentBlock.findFirst({
            where: {
              businessId: business.id,
              shortCode: blockTemplate.shortCode
            }
          })

          if (!existingBlock) {
            await prisma.contentBlock.create({
              data: {
                businessId: business.id,
                ...blockTemplate
              }
            })
            businessBlocksCreated++
            totalCreated++
          }
        }
      }

      results.push({
        businessId: business.id,
        businessName: business.displayName,
        blocksCreated: businessBlocksCreated
      })

      console.log(`✅ Created ${businessBlocksCreated} evergreen blocks for ${business.displayName}`)
    }

    console.log(`🎉 Evergreen setup complete! Created ${totalCreated} total blocks.`)

    return NextResponse.json({
      success: true,
      message: `Successfully created ${totalCreated} evergreen content blocks!`,
      data: {
        totalBlocks: totalCreated,
        businesses: results,
        blockTypes: [
          'Financing Options (0% financing, payment plans)',
          'Evergreen Discounts (filter discount, free estimates)', 
          'Service Guarantees (satisfaction, warranty)',
          'Membership Programs (Cool Club, maintenance plans)',
          'Service Features (same day, emergency, licensing)',
          'Digital Convenience (online booking, upfront pricing)',
          'Trust Indicators (BBB rating, Google reviews)',
          'Business-Specific Taglines'
        ]
      }
    })

  } catch (error) {
    console.error('❌ Evergreen setup failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Evergreen setup failed'
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    // Get count of evergreen blocks by business
    const businesses = await prisma.business.findMany({
      include: {
        contentBlocks: {
          where: {
            OR: [
              { type: 'evergreen' },
              { type: 'financing' },
              { category: 'promotional' }
            ]
          }
        }
      }
    })

    const summary = businesses.map(business => ({
      businessId: business.id,
      businessName: business.displayName,
      evergreenBlocks: business.contentBlocks.length,
      hasSetup: business.contentBlocks.length > 0
    }))

    const totalEvergreen = summary.reduce((total, business) => total + business.evergreenBlocks, 0)

    return NextResponse.json({
      success: true,
      summary: {
        totalEvergreen,
        businesses: summary,
        isSetup: totalEvergreen > 0
      }
    })

  } catch (error) {
    console.error('Failed to get evergreen status:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get status'
    }, { status: 500 })
  }
}