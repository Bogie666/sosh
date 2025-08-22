// src/app/api/content-blocks/[blockId]/usage/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { blockId: string } }
) {
  try {
    const { blockId } = params

    if (!blockId) {
      return NextResponse.json(
        { success: false, error: 'Block ID is required' },
        { status: 400 }
      )
    }

    // Increment usage count for the content block
    const updatedBlock = await prisma.contentBlock.update({
      where: { id: blockId },
      data: {
        usageCount: {
          increment: 1
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Usage count updated',
      usageCount: updatedBlock.usageCount
    })

  } catch (error) {
    console.error('Failed to update content block usage:', error)
    
    // Don't fail the main request if usage tracking fails
    return NextResponse.json({
      success: false,
      error: 'Failed to update usage count',
      // Include the error but don't fail with 500 status
    })
  }
}