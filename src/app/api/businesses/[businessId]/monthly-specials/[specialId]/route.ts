// src/app/api/businesses/[businessId]/monthly-specials/[specialId]/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: Request,
  { params }: { params: { businessId: string; specialId: string } }
) {
  try {
    const { businessId, specialId } = params
    const data = await request.json()

    // Verify monthly special exists and belongs to business
    const monthlySpecial = await prisma.monthlySpecial.findUnique({
      where: { 
        id: specialId,
        businessId 
      }
    })

    if (!monthlySpecial) {
      return NextResponse.json({
        success: false,
        error: 'Monthly special not found'
      }, { status: 404 })
    }

    // Update monthly special
    const updatedSpecial = await prisma.monthlySpecial.update({
      where: { id: specialId },
      data: {
        hvac: data.hvac || monthlySpecial.hvac,
        plumbing: data.plumbing || monthlySpecial.plumbing,
        electrical: data.electrical || monthlySpecial.electrical,
        all: data.all || monthlySpecial.all
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Monthly special updated successfully',
      monthlySpecial: updatedSpecial
    })

  } catch (error) {
    console.error('Failed to update monthly special:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update monthly special'
    }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { businessId: string; specialId: string } }
) {
  try {
    const { businessId, specialId } = params

    // Verify monthly special exists and belongs to business
    const monthlySpecial = await prisma.monthlySpecial.findUnique({
      where: { 
        id: specialId,
        businessId 
      }
    })

    if (!monthlySpecial) {
      return NextResponse.json({
        success: false,
        error: 'Monthly special not found'
      }, { status: 404 })
    }

    // Delete monthly special
    await prisma.monthlySpecial.delete({
      where: { id: specialId }
    })

    return NextResponse.json({
      success: true,
      message: 'Monthly special deleted successfully'
    })

  } catch (error) {
    console.error('Failed to delete monthly special:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete monthly special'
    }, { status: 500 })
  }
}