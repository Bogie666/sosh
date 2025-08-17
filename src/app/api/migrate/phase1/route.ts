// src/app/api/migrate/phase1/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST() {
  try {
    console.log('🚀 Starting Phase 1 Database Migration...')
    
    // Step 1: Check if migration already completed
    const existingProfiles = await prisma.businessProfile.count()
    if (existingProfiles > 0) {
      return NextResponse.json({
        success: true,
        message: 'Phase 1 migration already completed',
        data: {
          businessProfiles: existingProfiles,
          alreadyMigrated: true
        }
      })
    }
    
    // Step 2: Get existing businesses
    const businesses = await prisma.business.findMany()
    if (businesses.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No businesses found. Please run initial setup first.'
      }, { status: 400 })
    }
    
    console.log(`Found ${businesses.length} businesses to migrate`)
    
    // Step 3: Create business profiles
    const profilesCreated = []
    
    for (const business of businesses) {
      const profile = await prisma.businessProfile.create({
        data: {
          businessId: business.id,
          brandVoice: business.brandVoice || `Professional ${business.type} service provider with a focus on quality and customer satisfaction.`,
          messageStyle: 'professional',
          voiceTone: business.id === 'lyons' ? 'enthusiastic' : 'professional',
          serviceTypes: business.type === 'hvac' ? ['hvac'] : ['hvac', 'plumbing', 'electrical'],
          contentThemes: ['educational', 'seasonal', 'promotional'],
          certifications: business.id.includes('lex') ? ['NATE Certified', 'EPA Licensed'] : ['NATE Certified'],
          businessHours: {
            monday: { open: '07:00', close: '18:00', isOpen: true },
            tuesday: { open: '07:00', close: '18:00', isOpen: true },
            wednesday: { open: '07:00', close: '18:00', isOpen: true },
            thursday: { open: '07:00', close: '18:00', isOpen: true },
            friday: { open: '07:00', close: '18:00', isOpen: true },
            saturday: { open: '08:00', close: '16:00', isOpen: true },
            sunday: { open: '00:00', close: '00:00', isOpen: false }
          },
          serviceAreas: business.id === 'lex-dallas' ? ['Dallas', 'Plano', 'Frisco', 'McKinney'] :
                       business.id === 'lex-etx' ? ['Tyler', 'Longview', 'Marshall', 'Kilgore'] :
                       ['Carrollton', 'Addison', 'Farmers Branch', 'Plano']
        }
      })
      
      profilesCreated.push({
        businessId: business.id,
        businessName: business.displayName,
        profileId: profile.id
      })
      
      console.log(`✅ Created profile for ${business.displayName}`)
    }
    
    // Step 4: Create standard content blocks
    const standardBlocks = [
      {
        name: 'Standard Phone Number',
        type: 'phone',
        category: 'contact',
        shortCode: '{PHONE}',
        sortOrder: 0
      },
      {
        name: 'Emergency Call-to-Action',
        type: 'cta',
        category: 'contact',
        content: 'Need emergency service? Call us 24/7 for immediate assistance!',
        shortCode: '{EMERGENCY_CTA}',
        sortOrder: 1
      },
      {
        name: 'Business Hours',
        type: 'hours',
        category: 'informational',
        content: 'Mon-Fri: 7AM-6PM | Sat: 8AM-4PM | Sunday: Emergency Service Only',
        shortCode: '{HOURS}',
        sortOrder: 2
      },
      {
        name: 'Service Guarantee',
        type: 'custom',
        category: 'promotional',
        content: '100% satisfaction guaranteed or we make it right!',
        shortCode: '{GUARANTEE}',
        sortOrder: 3
      },
      {
        name: 'Licensed & Insured',
        type: 'custom',
        category: 'legal',
        content: 'Fully licensed, bonded, and insured for your protection.',
        shortCode: '{LICENSING}',
        sortOrder: 4
      }
    ]
    
    const blocksCreated = []
    
    for (const business of businesses) {
      for (const blockTemplate of standardBlocks) {
        const block = await prisma.contentBlock.create({
          data: {
            businessId: business.id,
            name: blockTemplate.name,
            type: blockTemplate.type,
            category: blockTemplate.category,
            content: blockTemplate.name === 'Standard Phone Number' 
              ? business.phone || 'Call us today!' 
              : blockTemplate.content,
            shortCode: blockTemplate.shortCode,
            sortOrder: blockTemplate.sortOrder
          }
        })
        
        blocksCreated.push({
          businessId: business.id,
          blockName: blockTemplate.name,
          blockId: block.id
        })
      }
      console.log(`✅ Created content blocks for ${business.displayName}`)
    }
    
    // Step 5: Verify migration
    const finalProfileCount = await prisma.businessProfile.count()
    const finalBlockCount = await prisma.contentBlock.count()
    
    console.log('🎉 Phase 1 Migration completed successfully!')
    
    return NextResponse.json({
      success: true,
      message: 'Phase 1 migration completed successfully',
      data: {
        businessProfiles: {
          count: finalProfileCount,
          created: profilesCreated
        },
        contentBlocks: {
          count: finalBlockCount,
          created: blocksCreated.length
        },
        migrationTimestamp: new Date().toISOString()
      }
    })
    
  } catch (error) {
    console.error('❌ Phase 1 migration failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Migration failed',
      details: {
        phase: 'Phase 1 Database Migration',
        timestamp: new Date().toISOString()
      }
    }, { status: 500 })
  }
}

// GET endpoint to check migration status
export async function GET() {
  try {
    const businessCount = await prisma.business.count()
    const profileCount = await prisma.businessProfile.count()
    const blockCount = await prisma.contentBlock.count()
    const imageCount = await prisma.imageLibrary.count()
    
    const isMigrated = profileCount > 0
    const isComplete = businessCount === profileCount && blockCount > 0
    
    return NextResponse.json({
      success: true,
      status: {
        isMigrated,
        isComplete,
        businesses: businessCount,
        profiles: profileCount,
        contentBlocks: blockCount,
        images: imageCount
      },
      readyForPhase1: isComplete
    })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Status check failed'
    }, { status: 500 })
  }
}