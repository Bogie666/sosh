// src/lib/ensure-user.ts
// Resolves the database User record for the current session.
// The Prisma adapter is disabled, so users aren't auto-created on sign-in -
// we need to ensure the row exists before creating any FK-linked records.

import { prisma } from './prisma'

export interface EnsureUserResult {
  userId: string
  wasCreated: boolean
  method: string
}

/**
 * Ensures a User row exists for the given session and returns the canonical
 * user ID to use for foreign key references. Handles all edge cases:
 * - User already exists by email
 * - User already exists by googleId
 * - User already exists by session ID
 * - No user exists (create one)
 * - Race conditions on create
 * - Unique constraint conflicts on email or googleId
 */
export async function ensureUserExists(session: {
  user?: { id?: string; email?: string | null; name?: string | null; image?: string | null }
}): Promise<EnsureUserResult> {
  if (!session?.user?.id) {
    throw new Error('No user ID in session')
  }

  const sessionId = session.user.id
  const email = session.user.email || ''
  const name = session.user.name || 'User'
  const image = session.user.image || null

  console.log(`🔍 [ensureUserExists] Resolving user: sessionId=${sessionId}, email=${email}`)

  // Step 1: Look by email (most reliable for real users)
  if (email) {
    const byEmail = await prisma.user.findUnique({ where: { email } })
    if (byEmail) {
      console.log(`✅ [ensureUserExists] Found by email: ${byEmail.id}`)
      return { userId: byEmail.id, wasCreated: false, method: 'email' }
    }
  }

  // Step 2: Look by googleId
  const byGoogleId = await prisma.user.findUnique({ where: { googleId: sessionId } })
  if (byGoogleId) {
    console.log(`✅ [ensureUserExists] Found by googleId: ${byGoogleId.id}`)
    return { userId: byGoogleId.id, wasCreated: false, method: 'googleId' }
  }

  // Step 3: Look by ID directly
  const byId = await prisma.user.findUnique({ where: { id: sessionId } })
  if (byId) {
    console.log(`✅ [ensureUserExists] Found by id: ${byId.id}`)
    return { userId: byId.id, wasCreated: false, method: 'id' }
  }

  // Step 4: No user exists - create one.
  // Use a generated email fallback to avoid unique conflicts if email is empty.
  const safeEmail = email || `user-${sessionId}@sosh.local`

  try {
    const created = await prisma.user.create({
      data: {
        id: sessionId,
        name,
        email: safeEmail,
        image,
        googleId: sessionId
      }
    })
    console.log(`✅ [ensureUserExists] Created new user: ${created.id}`)
    return { userId: created.id, wasCreated: true, method: 'created' }
  } catch (err: any) {
    // P2002 = unique constraint violation
    console.log(`⚠️ [ensureUserExists] Create failed, attempting fallback: ${err?.code || 'unknown'} ${err?.message || ''}`)

    // Retry lookup - maybe it was created in a parallel request, or an existing
    // record conflicts on a different field
    const retryByEmail = await prisma.user.findUnique({ where: { email: safeEmail } })
    if (retryByEmail) {
      console.log(`✅ [ensureUserExists] Resolved on retry by email: ${retryByEmail.id}`)
      return { userId: retryByEmail.id, wasCreated: false, method: 'retry-email' }
    }

    const retryByGoogleId = await prisma.user.findUnique({ where: { googleId: sessionId } })
    if (retryByGoogleId) {
      console.log(`✅ [ensureUserExists] Resolved on retry by googleId: ${retryByGoogleId.id}`)
      return { userId: retryByGoogleId.id, wasCreated: false, method: 'retry-googleId' }
    }

    const retryById = await prisma.user.findUnique({ where: { id: sessionId } })
    if (retryById) {
      console.log(`✅ [ensureUserExists] Resolved on retry by id: ${retryById.id}`)
      return { userId: retryById.id, wasCreated: false, method: 'retry-id' }
    }

    // Last resort: create with a completely unique ID
    try {
      const fallback = await prisma.user.create({
        data: {
          name,
          email: `${sessionId}-${Date.now()}@sosh.local`,
          image,
          googleId: null
        }
      })
      console.log(`✅ [ensureUserExists] Fallback created: ${fallback.id}`)
      return { userId: fallback.id, wasCreated: true, method: 'fallback-create' }
    } catch (fallbackErr: any) {
      console.error('❌ [ensureUserExists] Fallback create also failed:', fallbackErr)
      throw new Error(
        `Could not resolve user for current session. ` +
        `Session: ${sessionId}, Email: ${email}. ` +
        `Error: ${fallbackErr?.message || 'unknown'}`
      )
    }
  }
}
