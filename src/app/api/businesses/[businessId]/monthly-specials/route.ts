// src/app/api/businesses/[businessId]/monthly-specials/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: { businessId: string } }
) {
  try {
    const { businessId } = params
    const { searchParams } = new URL(request.url)
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())

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

    // Get monthly specials for the year
    const specials = await prisma.monthlySpecial.findMany({
      where: {
        businessId,
        year
      },
      orderBy: { month: 'asc' }
    })

    return NextResponse.json({
      success: true,
      specials
    })

  } catch (error) {
    console.error('Failed to load monthly specials:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load monthly specials'
    }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: { businessId: string } }
) {
  try {
    const { businessId } = params
    const data = await request.json()

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

    // Validate required fields
    if (data.month === undefined || data.year === undefined) {
      return NextResponse.json({
        success: false,
        error: 'Month and year are required'
      }, { status: 400 })
    }

    // Check if special already exists for this month/year
    const existingSpecial = await prisma.monthlySpecial.findUnique({
      where: {
        businessId_month_year: {
          businessId,
          month: data.month,
          year: data.year
        }
      }
    })

    if (existingSpecial) {
      return NextResponse.json({
        success: false,
        error: 'Monthly special already exists for this month and year'
      }, { status: 400 })
    }

    // Create monthly special
    const monthlySpecial = await prisma.monthlySpecial.create({
      data: {
        businessId,
        month: data.month,
        year: data.year,
        hvac: data.hvac || [],
        plumbing: data.plumbing || [],
        electrical: data.electrical || [],
        all: data.all || []
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Monthly special created successfully',
      monthlySpecial
    })

  } catch (error) {
    console.error('Failed to create monthly special:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create monthly special'
    }, { status: 500 })
  }
}