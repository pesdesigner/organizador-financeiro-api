import { getAuthCollections } from '../../src/auth/collections.js'
import { getCurrentUser } from '../../src/auth/current-user.js'
import { createInvite } from '../../src/auth/invites.js'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function json(body: unknown, status: number): Response {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })
}

export async function POST(request: Request): Promise<Response> {
  try {
    const admin = await getCurrentUser(request)

    if (!admin) {
      return json({ error: 'Não autenticado.' }, 401)
    }

    if (admin.role !== 'admin') {
      return json({ error: 'Acesso não autorizado.' }, 403)
    }

    let body: unknown

    try {
      body = await request.json()
    } catch {
      return json({ error: 'Corpo da requisição inválido.' }, 400)
    }

    if (!isRecord(body) || typeof body.email !== 'string') {
      return json({ error: 'Informe o e-mail do convidado.' }, 400)
    }

    const email = body.email.trim().toLowerCase()

    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: 'Informe um e-mail válido.' }, 400)
    }

    const { users, invites } = await getAuthCollections()

    if (await users.findOne({ email })) {
      return json({ error: 'Já existe um usuário com esse e-mail.' }, 409)
    }

    const now = new Date()
    const existingInvite = await invites.findOne({
      email,
      usedAt: null,
      expiresAt: { $gt: now },
    })

    if (existingInvite) {
      return json(
        { error: 'Já existe um convite válido para esse e-mail.' },
        409,
      )
    }

    const invite = await createInvite(email, admin._id)

    return Response.json(
      {
        invite: {
          email,
          token: invite.token,
          expiresAt: invite.expiresAt.toISOString(),
        },
      },
      {
        status: 201,
        headers: { 'Cache-Control': 'no-store' },
      },
    )
  } catch {
    console.error('Falha ao criar convite.')
    return json({ error: 'Erro interno ao criar convite.' }, 500)
  }
}