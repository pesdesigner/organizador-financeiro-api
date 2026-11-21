import { getAuthCollections } from '../../src/auth/collections.js'
import { createSessionCookie } from '../../src/auth/cookies.js'
import { verifyPassword } from '../../src/auth/passwords.js'
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

  const email =
    typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''

  if (!email || email.length > 254 || !password) {
    return json({ error: 'E-mail e senha são obrigatórios.' }, 400)
  }

  try {
    const { users } = await getAuthCollections()
    const user = await users.findOne({ email, status: 'active' })

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return json({ error: 'E-mail ou senha inválidos.' }, 401)
    }

    const session = await createSession(user._id)

    return json(
      {
        user: {
          id: user._id.toHexString(),
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      200,
      { 'Set-Cookie': createSessionCookie(session.token, session.expiresAt) },
    )
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message.replace(/mongodb(?:\+srv)?:\/\/\S+/gi, '[URI ocultada]')
        : 'Erro desconhecido'

    const errorName = error instanceof Error ? error.name : 'UnknownError'

    console.error(`Falha ao processar login [${errorName}]: ${message}`)
    return json({ error: 'Erro interno ao processar login.' }, 500)
  }
}