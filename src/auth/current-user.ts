import { getAuthCollections } from './collections.js'
import { readSessionToken } from './cookies.js'
import { findSession, revokeSession } from './sessions.js'
import type { UserDocument } from './types.js'

export async function getCurrentUser(
  request: Request,
): Promise<UserDocument | null> {
  const token = readSessionToken(request)

  if (!token) {
    return null
  }

  const session = await findSession(token)

  if (!session) {
    return null
  }

  const { users } = await getAuthCollections()
  const user = await users.findOne({ _id: session.userId })

  if (!user || user.status !== 'active') {
    await revokeSession(token)
    return null
  }

  return user
}