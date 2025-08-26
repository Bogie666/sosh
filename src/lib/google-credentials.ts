// src/lib/google-credentials.ts
// Utility to safely parse Google Cloud credentials

export function getGoogleCredentials(): any | null {
  if (!process.env.GOOGLE_CLOUD_CREDENTIALS) {
    console.warn('GOOGLE_CLOUD_CREDENTIALS not set')
    return null
  }

  // Check if it's just an empty or incomplete JSON
  const creds = process.env.GOOGLE_CLOUD_CREDENTIALS.trim()
  if (creds === '{' || creds === '{}' || creds.length < 10) {
    console.warn('GOOGLE_CLOUD_CREDENTIALS appears to be empty or incomplete')
    return null
  }

  try {
    return JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS)
  } catch (error) {
    console.warn('Failed to parse GOOGLE_CLOUD_CREDENTIALS:', error)
    return null
  }
}

export function hasValidGoogleCredentials(): boolean {
  const creds = getGoogleCredentials()
  return creds !== null && creds.client_email && creds.private_key
}