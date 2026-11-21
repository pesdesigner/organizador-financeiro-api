import { createHash, randomBytes } from 'node:crypto'
import type { ObjectId } from 'mongodb'
import { getAuthCollections } from './collections.js'

const INVITE_DURATION_MS = 7 * 24 * 60 * 60 * 1000
const INVITE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/

export function isInviteToken(token: string): boolean {
  return INVITE_TOKEN_PATTERN.test(token)
}

export function hashInviteToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export async function createInvite(
  email: string,
  createdBy: ObjectId,
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString('base64url')
  const tokenHash = hashInviteToken(token)
  const now = new Date()
  const expiresAt = new Date(now.getTime() + INVITE_DURATION_MS)
  const { invites } = await getAuthCollections()

  await invites.insertOne({
    email,
    tokenHash,
    createdBy,
    createdAt: now,
    expiresAt,
    usedAt: null,
  })

  return { token, expiresAt }
}