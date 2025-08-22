// src/app/api/businesses/monthly-specials/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const businessIds = searchParams.get('businesses')?.split(',') || []
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())

    if (businessIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Business IDs are required'
      }, { status: 400 })
    }

    console.log(`Loading monthly specials for businesses: ${businessIds.join(', ')} for year ${year}`)

    // Get monthly specials from database
    const monthlySpecials = await prisma.monthlySpecial.findMany({
      where: {
        businessId: { in: businessIds },
        year: year
      },
      orderBy: { month: 'asc' }
    })

    console.log(`Found ${monthlySpecials.length} monthly special records`)

    // Aggregate specials by month
    const aggregatedSpecials: any = {}
    
    monthlySpecials.forEach(special => {
      if (!aggregatedSpecials[special.month]) {
        aggregatedSpecials[special.month] = {
          hvac: [],
          plumbing: [],
          electrical: [],
          all: []
        }
      }
      
      // Merge specials from different businesses, avoiding duplicates
      aggregatedSpecials[special.month].hvac = [
        ...new Set([...aggregatedSpecials[special.month].hvac, ...special.hvac])
      ]
      aggregatedSpecials[special.month].plumbing = [
        ...new Set([...aggregatedSpecials[special.month].plumbing, ...special.plumbing])
      ]
      aggregatedSpecials[special.month].electrical = [
        ...new Set([...aggregatedSpecials[special.month].electrical, ...special.electrical])
      ]
      aggregatedSpecials[special.month].all = [
        ...new Set([...aggregatedSpecials[special.month].all, ...special.all])
      ]
    })

    return NextResponse.json({
      success: true,
      specials: aggregatedSpecials,
      businessCount: businessIds.length,
      recordCount: monthlySpecials.length
    })

  } catch (error) {
    console.error('Failed to load monthly specials:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to load monthly specials',
      specials: {}
    })
  }
}