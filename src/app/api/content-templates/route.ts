// src/app/api/content-templates/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const businessId = searchParams.get('businessId')
    const platform = searchParams.get('platform')

    // Build where clause
    const whereClause: any = {
      isPublic: true // Only return public templates for now
    }

    if (category) {
      whereClause.category = category
    }

    if (businessId) {
      whereClause.OR = [
        { businesses: { has: businessId } },
        { businesses: { isEmpty: true } }, // Templates available to all businesses
        { isPublic: true }
      ]
    }

    if (platform) {
      whereClause.platforms = { has: platform }
    }

    // Get content templates
    const templates = await prisma.contentTemplate.findMany({
      where: whereClause,
      orderBy: [
        { usageCount: 'desc' }, // Most used first
        { createdAt: 'desc' }
      ],
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      templates: templates.map(template => ({
        id: template.id,
        name: template.name,
        content: template.content,
        category: template.category,
        platforms: template.platforms,
        businesses: template.businesses,
        isPublic: template.isPublic,
        usageCount: template.usageCount,
        createdAt: template.createdAt,
        author: template.user.name || template.user.email
      }))
    })

  } catch (error) {
    console.error('Failed to load content templates:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load content templates'
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json()

    // For now, we'll create templates as system templates
    // In a real app, you'd get the user ID from the session
    const systemUser = await prisma.user.findFirst({
      where: { email: 'system@sosh.com' }
    })

    if (!systemUser) {
      return NextResponse.json({
        success: false,
        error: 'System user not found'
      }, { status: 500 })
    }

    // Validate required fields
    if (!data.name || !data.content) {
      return NextResponse.json({
        success: false,
        error: 'Name and content are required'
      }, { status: 400 })
    }

    // Create content template
    const template = await prisma.contentTemplate.create({
      data: {
        userId: systemUser.id,
        name: data.name,
        content: data.content,
        category: data.category || 'custom',
        platforms: data.platforms || [],
        businesses: data.businesses || [],
        isPublic: data.isPublic !== false // Default to true
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Content template created successfully',
      template
    })

  } catch (error) {
    console.error('Failed to create content template:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create content template'
    }, { status: 500 })
  }
}