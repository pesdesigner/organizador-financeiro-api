import { ObjectId } from 'mongodb'
import { getAuthCollections } from '../../src/auth/collections.js'
import { getCurrentUser } from '../../src/auth/current-user.js'
import { revokeUserSessions } from '../../src/auth/sessions.js'
import type { UserDocument } from '../../src/auth/types.js'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function json(body: unknown, status: number): Response {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })
}

type AdminCheck =
  | { ok: true; admin: UserDocument }
  | { ok: false; response: Response }

async function getAdmin(request: Request): Promise<AdminCheck> {
  const user = await getCurrentUser(request)

  if (!user) {
    return { ok: false, response: json({ error: 'Não autenticado.' }, 401) }
  }

  if (user.role !== 'admin') {
    return {
      ok: false,
      response: json({ error: 'Acesso não autorizado.' }, 403),
    }
  }

  return { ok: true, admin: user }
}

export async function GET(request: Request): Promise<Response> {
  try {
    const authorization = await getAdmin(request)

    if (!authorization.ok) {
        return authorization.response
    }

    const { users } = await getAuthCollections()
    const records = await users
      .find(
        {},
        {
          projection: {
            name: 1,
            email: 1,
            role: 1,
            status: 1,
            createdAt: 1,
          },
        },
      )
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray()

    return json(
      {
        users: records.map((user) => ({
          id: user._id.toHexString(),
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          createdAt: user.createdAt.toISOString(),
        })),
      },
      200,
    )
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Falha ao listar usuários:', error)
    } else {
      console.error('Falha ao listar usuários.')
    }
    return json({ error: 'Erro interno ao listar usuários.' }, 500)
  }
}

export async function PATCH(request: Request): Promise<Response> {
  try {
    const authorization = await getAdmin(request)

    if (!authorization.ok) {
        return authorization.response
    }

    let body: unknown

    try {
      body = await request.json()
    } catch {
      return json({ error: 'Corpo da requisição inválido.' }, 400)
    }

    if (!isRecord(body)) {
      return json({ error: 'Corpo da requisição inválido.' }, 400)
    }

    const { userId, status } = body

    if (
      typeof userId !== 'string' ||
      !/^[a-fA-F0-9]{24}$/.test(userId) ||
      (status !== 'active' && status !== 'disabled')
    ) {
      return json({ error: 'Informe um usuário e estado válidos.' }, 400)
    }

    const { users } = await getAuthCollections()
    const target = await users.findOne({ _id: new ObjectId(userId) })

    if (!target) {
      return json({ error: 'Usuário não encontrado.' }, 404)
    }

    if (target.role !== 'user') {
      return json(
        { error: 'O estado de uma conta admin não pode ser alterado por esta rota.' },
        403,
      )
    }

    await users.updateOne(
      { _id: target._id, role: 'user' },
      { $set: { status, updatedAt: new Date() } },
    )

    if (status === 'disabled') {
      await revokeUserSessions(target._id)
    }

    return json({ userId, status }, 200)
  } catch {
    console.error('Falha ao atualizar usuário.')
    return json({ error: 'Erro interno ao atualizar usuário.' }, 500)
  }
}