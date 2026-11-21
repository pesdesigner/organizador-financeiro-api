import type { Collection, Db } from 'mongodb'
import { getDatabase } from '../lib/mongodb.js'
import type {
  InviteDocument,
  SessionDocument,
  UserDocument,
} from './types.js'

type AuthGlobal = typeof globalThis & {
  authIndexesPromise?: Promise<void>
}

const globalForAuth = globalThis as AuthGlobal

async function ensureIndexes(database: Db): Promise<void> {
  const users = database.collection<UserDocument>('users')
  const invites = database.collection<InviteDocument>('invites')
  const sessions = database.collection<SessionDocument>('sessions')

  await Promise.all([
    users.createIndex(
      { email: 1 },
      { unique: true, name: 'users_email_unique' },
      undefined,
    ),
    invites.createIndex(
      { tokenHash: 1 },
      { unique: true, name: 'invites_token_hash_unique' },
      undefined,
    ),
    invites.createIndex(
      { expiresAt: 1 },
      { expireAfterSeconds: 0, name: 'invites_expiration_ttl' },
      undefined,
    ),
    sessions.createIndex(
      { tokenHash: 1 },
      { unique: true, name: 'sessions_token_hash_unique' },
      undefined,
    ),
    sessions.createIndex(
      { expiresAt: 1 },
      { expireAfterSeconds: 0, name: 'sessions_expiration_ttl' },
      undefined,
    ),
    sessions.createIndex(
      { userId: 1 },
      { name: 'sessions_user_id' },
      undefined,
    ),
  ])
}

export async function getAuthCollections(): Promise<{
  users: Collection<UserDocument>
  invites: Collection<InviteDocument>
  sessions: Collection<SessionDocument>
}> {
  const database = await getDatabase()

  const indexesPromise =
    globalForAuth.authIndexesPromise ??
    ensureIndexes(database).catch((error: unknown) => {
      globalForAuth.authIndexesPromise = undefined
      throw error
    })

  globalForAuth.authIndexesPromise = indexesPromise
  await indexesPromise

  return {
    users: database.collection<UserDocument>('users'),
    invites: database.collection<InviteDocument>('invites'),
    sessions: database.collection<SessionDocument>('sessions'),
  }
}