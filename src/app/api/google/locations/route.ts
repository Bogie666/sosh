// src/app/api/google/locations/route.ts
import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import { googleBusinessApiManager } from '@/lib/google-business-api-manager'

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.accessToken) {
      console.error('No access token in session')
      return NextResponse.json({ 
        success: false, 
        error: 'Not authenticated',
        requiresAuth: true 
      }, { status: 401 })
    }

    console.log('=== FETCHING BUSINESS LOCATIONS ===')
    console.log('Session exists:', !!session)
    console.log('Access token exists:', !!session.accessToken)
    console.log('Access token preview:', session.accessToken?.substring(0, 20) + '...')

    // Set the access token for the Google Business API manager
    googleBusinessApiManager.setAccessToken(session.accessToken)

    // Use the enhanced API manager to get all locations
    const result = await googleBusinessApiManager.getAllLocations()

    if (!result.success) {
      console.error('Google Business API error:', result.error)
      
      // Check if it's an auth error
      if (result.error?.includes('401') || result.error?.includes('403')) {
        return NextResponse.json({
          success: false,
          error: 'Authentication failed. Please sign out and sign in again.',
          requiresReauth: true
        }, { status: 401 })
      }
      
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 500 })
    }

    const locations = result.locations || []
    
    // Format locations for easier UI consumption
    const formattedLocations = locations.map(location => ({
      id: location.name,
      locationId: location.locationId,
      accountId: location.accountId,
      name: location.title || 'Unnamed Location',
      address: formatAddress(location),
      phoneNumber: location.phoneNumbers?.[0]?.number || null,
      websiteUrl: location.websiteUri,
      accountName: location.accountName,
      accountDisplayName: location.accountDisplayName,
      fullLocationName: location.name,
      storeCode: location.storeCode
    }))

    console.log(`Successfully processed ${formattedLocations.length} locations`)

    if (formattedLocations.length === 0) {
      return NextResponse.json({
        success: true,
        locations: [],
        message: "Connected successfully but no business locations found. Make sure you have access to Google Business Profile locations.",
        totalCount: 0
      })
    }

    return NextResponse.json({
      success: true,
      locations: formattedLocations,
      message: `Connected successfully. Found ${formattedLocations.length} business location${formattedLocations.length !== 1 ? 's' : ''}.`,
      totalCount: formattedLocations.length
    })

  } catch (error) {
    console.error('Error in locations API:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 })
  }
}

// Helper function to format address from Google Business API response
function formatAddress(location: any): string | null {
  const address = location.storefrontAddress || location.address
  if (!address) return location.storeCode || null
  
  const parts = []
  if (address.addressLines) parts.push(...address.addressLines)
  if (address.locality) parts.push(address.locality)
  if (address.administrativeArea) parts.push(address.administrativeArea)
  if (address.regionCode) parts.push(address.regionCode)
  
  return parts.length > 0 ? parts.join(', ') : null
}