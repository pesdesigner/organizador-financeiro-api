import { createHash, randomBytes } from 'node:crypto'
import type { ObjectId } from 'mongodb'
import { getAuthCollections } from './collections.js'
import type { SessionDocument } from './types.js'

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000
const SESSION_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

function isSessionToken(token: string): boolean {
  return SESSION_TOKEN_PATTERN.test(token)
}

export async function createSession(
  userId: ObjectId,
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString('base64url')
  const now = new Date()
  const expiresAt = new Date(now.getTime() + SESSION_DURATION_MS)
  const { sessions } = await getAuthCollections()

  await sessions.insertOne({
    userId,
    tokenHash: hashToken(token),
    createdAt: now,
    expiresAt,
  })

  return { token, expiresAt }
}

export async function findSession(
  token: string,
): Promise<SessionDocument | null> {
  if (!isSessionToken(token)) {
    return null
  }

  const { sessions } = await getAuthCollections()

  return sessions.findOne({
    tokenHash: hashToken(token),
    expiresAt: { $gt: new Date() },
  })
}

export async function revokeSession(token: string): Promise<void> {
  if (!isSessionToken(token)) {
    return
  }

  const { sessions } = await getAuthCollections()
  await sessions.deleteOne({ tokenHash: hashToken(token) })
}

export async function revokeUserSessions(userId: ObjectId): Promise<void> {
  const { sessions } = await getAuthCollections()
  await sessions.deleteMany({ userId })
}