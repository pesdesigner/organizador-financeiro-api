import type { Document, ObjectId } from 'mongodb'

export type UserRole = 'admin' | 'user'
export type UserStatus = 'active' | 'disabled'

export interface UserDocument extends Document {
  name: string
  email: string
  passwordHash: string
  role: UserRole
  status: UserStatus
  createdAt: Date
  updatedAt: Date
}

export interface InviteDocument extends Document {
  email: string
  tokenHash: string
  createdBy: ObjectId
  createdAt: Date
  expiresAt: Date
  usedAt: Date | null
}

export interface SessionDocument extends Document {
  userId: ObjectId
  tokenHash: string
  createdAt: Date
  expiresAt: Date
}