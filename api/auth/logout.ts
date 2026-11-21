import { clearSessionCookie, readSessionToken } from '../../src/auth/cookies.js'
import { revokeSession } from '../../src/auth/sessions.js'

export async function POST(request: Request): Promise<Response> {
  const token = readSessionToken(request)

  try {
    if (token) {
      await revokeSession(token)
    }
  } catch {
    console.error('Falha ao revogar sessão.')
    return Response.json(
      { error: 'Erro interno ao encerrar sessão.' },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
          'Set-Cookie': clearSessionCookie(),
        },
      },
    )
  }

  return new Response(null, {
    status: 204,
    headers: {
      'Cache-Control': 'no-store',
      'Set-Cookie': clearSessionCookie(),
    },
  })
}