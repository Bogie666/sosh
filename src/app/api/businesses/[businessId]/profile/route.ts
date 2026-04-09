// src/app/api/businesses/[businessId]/profile/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: { businessId: string } }
) {
  try {
    const { businessId } = params

    // Get business with profile
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      include: {
        businessProfile: true
      }
    })

    if (!business) {
      return NextResponse.json({
        success: false,
        error: 'Business not found'
      }, { status: 404 })
    }

    // If no profile exists, create a default one
    let profile = business.businessProfile
    if (!profile) {
      profile = await prisma.businessProfile.create({
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
    }

    return NextResponse.json({
      success: true,
      business: {
        id: business.id,
        name: business.name,
        displayName: business.displayName,
        type: business.type,
        website: business.website,
        phone: business.phone,
        tagline: business.tagline
      },
      profile
    })

  } catch (error) {
    console.error('Failed to load business profile:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load business profile'
    }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { businessId: string } }
) {
  try {
    const { businessId } = params
    const updates = await request.json()

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
    const requiredFields = ['brandVoice', 'messageStyle', 'voiceTone']
    for (const field of requiredFields) {
      if (!updates[field]) {
        return NextResponse.json({
          success: false,
          error: `${field} is required`
        }, { status: 400 })
      }
    }

    // Extract aiGuidelines (stored in autoPostSettings JSON, not a top-level column)
    const { aiGuidelines, ...rest } = updates

    // Ensure arrays are properly formatted
    const profileData = {
      ...rest,
      certifications: Array.isArray(rest.certifications) ? rest.certifications.filter(Boolean) : [],
      serviceAreas: Array.isArray(rest.serviceAreas) ? rest.serviceAreas.filter(Boolean) : [],
      serviceTypes: Array.isArray(rest.serviceTypes) ? rest.serviceTypes : [],
      contentThemes: Array.isArray(rest.contentThemes) ? rest.contentThemes : [],
      approvedTemplates: Array.isArray(rest.approvedTemplates) ? rest.approvedTemplates : []
    }

    // If aiGuidelines was provided, merge into autoPostSettings
    if (aiGuidelines !== undefined) {
      const existingProfile = await prisma.businessProfile.findUnique({ where: { businessId } })
      const currentAutoPost = (existingProfile?.autoPostSettings as any) || {}
      profileData.autoPostSettings = { ...currentAutoPost, aiGuidelines }
    }

    // Update or create business profile
    const profile = await prisma.businessProfile.upsert({
      where: { businessId },
      update: profileData,
      create: {
        businessId,
        ...profileData
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Business profile updated successfully',
      profile
    })

  } catch (error) {
    console.error('Failed to update business profile:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update business profile'
    }, { status: 500 })
  }
}