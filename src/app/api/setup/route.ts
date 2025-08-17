// src/app/api/setup/route.ts
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    console.log('🚀 Initializing database with business data...')

    // Check if we already have data
    const existingBusinesses = await prisma.business.count()
    if (existingBusinesses > 0) {
      return NextResponse.json({ 
        success: true, 
        message: `Database already initialized with ${existingBusinesses} businesses`,
        skip: true 
      })
    }

    // Create initial businesses
    const lexDallas = await prisma.business.create({
      data: {
        id: 'lex-dallas',
        name: 'Lex Air Conditioning, Heating, Plumbing, Electrical',
        displayName: 'Lex Dallas',
        type: 'all',
        website: 'https://lexairconditioning.com',
        phone: '972-466-1917',
        brandVoice: 'Professional and polished, representing the gold standard of white glove service',
        tagline: 'The Gold Standard of White Glove Service'
      }
    })

    const lexETX = await prisma.business.create({
      data: {
        id: 'lex-etx',
        name: 'Lex ETX - Air Conditioning, Heating, Plumbing, Electrical',
        displayName: 'Lex ETX',
        type: 'all',
        website: 'https://lexetx.com',
        phone: '903-596-7020',
        brandVoice: 'Honest and straightforward, providing quality workmanship with reliable service',
        tagline: 'Quality workmanship, honest service'
      }
    })

    const lyons = await prisma.business.create({
      data: {
        id: 'lyons',
        name: 'Lyons Air Conditioning and Heating',
        displayName: 'Lyons',
        type: 'hvac',
        website: 'https://lyonsair.com',
        phone: '972-428-2995',
        brandVoice: 'Confident and approachable, treating customers like royalty with unmatched service',
        tagline: 'The King of 5-Star Service'
      }
    })

    console.log('✅ Businesses created')

    // Create sample monthly specials for current month
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()

    // Lex Dallas specials
    await prisma.monthlySpecial.create({
      data: {
        businessId: lexDallas.id,
        month: currentMonth,
        year: currentYear,
        hvac: [
          'Free service call with repairs',
          '10% off full system replacements',
          'Pre-season tune-up special - $89'
        ],
        plumbing: [
          'Free water quality test with inspection',
          'Water heater replacement special - $1836 installed',
          'Drain cleaning special - $99'
        ],
        electrical: [
          'Panel upgrade - As low as $89 per month',
          'Free whole home surge protector with panel upgrade',
          '25% off LED lighting packages'
        ]
      }
    })

    // Lyons specials
    await prisma.monthlySpecial.create({
      data: {
        businessId: lyons.id,
        month: currentMonth,
        year: currentYear,
        hvac: [
          'King of 5-Star Service special - 20% off maintenance',
          'Energy efficiency audit - Free with service',
          'Same day emergency service - No extra charge'
        ],
        plumbing: [
          'Royal treatment plumbing package - $149',
          'Leak detection service - 25% off',
          'Water heater tune-up - $99'
        ]
      }
    })

    console.log('✅ Monthly specials created')

    // Create a temporary system user for templates
    const systemUser = await prisma.user.create({
      data: {
        id: 'system-user',
        email: 'system@sosh.com',
        name: 'System',
        role: 'SUPER_ADMIN'
      }
    })

    // Create sample content templates
    const seasonalTemplate = await prisma.contentTemplate.create({
      data: {
        userId: systemUser.id,
        name: 'Seasonal HVAC Tips',
        content: 'As the season changes, remember to check your HVAC system! 🌡️ Simple maintenance can save you hundreds in emergency repairs. Schedule your tune-up today! #HVAC #Maintenance #DFW',
        category: 'seasonal',
        platforms: ['facebook', 'twitter', 'google'],
        businesses: [lexDallas.id, lexETX.id, lyons.id],
        isPublic: true
      }
    })

    const promotionTemplate = await prisma.contentTemplate.create({
      data: {
        userId: systemUser.id,
        name: 'Monthly Special Promotion',
        content: 'This month only! Special pricing on HVAC maintenance. Don\'t wait for a breakdown - preventive care keeps your family comfortable year-round. Call today! 📞 #SpecialOffer #HVAC',
        category: 'promotion',
        platforms: ['facebook', 'instagram', 'google'],
        businesses: [lexDallas.id, lexETX.id, lyons.id],
        isPublic: true
      }
    })

    console.log('✅ Content templates created')

    return NextResponse.json({
      success: true,
      message: 'Database initialized successfully!',
      data: {
        businesses: [
          { id: lexDallas.id, name: lexDallas.displayName },
          { id: lexETX.id, name: lexETX.displayName },
          { id: lyons.id, name: lyons.displayName }
        ],
        templates: [
          { id: seasonalTemplate.id, name: seasonalTemplate.name },
          { id: promotionTemplate.id, name: promotionTemplate.name }
        ],
        monthlySpecials: 2
      }
    })

  } catch (error) {
    console.error('❌ Database initialization failed:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

// GET method to check current database status
export async function GET() {
  try {
    const businessCount = await prisma.business.count()
    const userCount = await prisma.user.count()
    const templateCount = await prisma.contentTemplate.count()
    const specialsCount = await prisma.monthlySpecial.count()

    return NextResponse.json({
      success: true,
      status: 'Database connected',
      data: {
        businesses: businessCount,
        users: userCount,
        templates: templateCount,
        monthlySpecials: specialsCount,
        initialized: businessCount > 0
      }
    })
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Database connection failed' 
    }, { status: 500 })
  }
}