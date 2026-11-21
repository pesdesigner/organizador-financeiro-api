import { getAuthCollections } from '../../src/auth/collections.js'
import { createSessionCookie } from '../../src/auth/cookies.js'
import { hashInviteToken, isInviteToken } from '../../src/auth/invites.js'
import { hashPassword } from '../../src/auth/passwords.js'
import { createSession } from '../../src/auth/sessions.js'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function json(
  body: unknown,
  status: number,
  headers?: HeadersInit,
): Response {
  const responseHeaders = new Headers(headers)
  responseHeaders.set('Cache-Control', 'no-store')

  return Response.json(body, { status, headers: responseHeaders })
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 11000
  )
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return json({ error: 'Corpo da requisição inválido.' }, 400)
  }

  if (!isRecord(body)) {
    return json({ error: 'Corpo da requisição inválido.' }, 400)
  }

  const token = typeof body.token === 'string' ? body.token : ''
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const password = typeof body.password === 'string' ? body.password : ''

  if (!isInviteToken(token)) {
    return json({ error: 'Convite inválido ou expirado.' }, 400)
  }

  if (!name || name.length > 100 || !password) {
    return json({ error: 'Nome e senha são obrigatórios.' }, 400)
  }

  try {
    const { invites, users } = await getAuthCollections()
    const now = new Date()

    const invite = await invites.findOne({
      tokenHash: hashInviteToken(token),
      usedAt: null,
      expiresAt: { $gt: now },
    })

    if (!invite) {
      return json({ error: 'Convite inválido ou expirado.' }, 400)
    }

    if (await users.findOne({ email: invite.email })) {
      return json({ error: 'Este convite não pode mais ser utilizado.' }, 409)
    }

    let passwordHash: string

    try {
      passwordHash = await hashPassword(password)
    } catch {
      return json(
        { error: 'A senha deve ter ao menos 12 caracteres e no máximo 128 bytes.' },
        400,
      )
    }

    const claim = await invites.updateOne(
      {
        _id: invite._id,
        usedAt: null,
        expiresAt: { $gt: new Date() },
      },
      { $set: { usedAt: new Date() } },
    )

    if (claim.modifiedCount !== 1) {
      return json({ error: 'Convite inválido ou expirado.' }, 400)
    }

    const createdAt = new Date()
    let userId

    try {
      const result = await users.insertOne({
        name,
        email: invite.email,
        passwordHash,
        role: 'user',
        status: 'active',
        createdAt,
        updatedAt: createdAt,
      })

      userId = result.insertedId
    } catch (error) {
      await invites.updateOne(
        { _id: invite._id, usedAt: { $exists: true } },
        { $set: { usedAt: null } },
      )

      if (isDuplicateKeyError(error)) {
        return json({ error: 'Este convite não pode mais ser utilizado.' }, 409)
      }

      throw error
    }

    const session = await createSession(userId)

    return json(
      {
        user: {
          id: userId.toHexString(),
          name,
          email: invite.email,
          role: 'user',
        },
      },
      201,
      { 'Set-Cookie': createSessionCookie(session.token, session.expiresAt) },
    )
  } catch {
    console.error('Falha ao resgatar convite.')
    return json({ error: 'Erro interno ao criar a conta.' }, 500)
  }
}