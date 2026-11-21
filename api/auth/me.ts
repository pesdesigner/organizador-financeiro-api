import { clearSessionCookie } from '../../src/auth/cookies.js'
import { getCurrentUser } from '../../src/auth/current-user.js'

export async function GET(request: Request): Promise<Response> {
  try {
    const user = await getCurrentUser(request)

    if (!user) {
      return Response.json(
        { error: 'Não autenticado.' },
        {
          status: 401,
          headers: {
            'Cache-Control': 'no-store',
            'Set-Cookie': clearSessionCookie(),
          },
        },
      )
    }

    return Response.json(
      {
        user: {
          id: user._id.toHexString(),
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch {
    console.error('Falha ao consultar sessão.')
    return Response.json(
      { error: 'Erro interno ao consultar sessão.' },
      {
        status: 500,
        headers: { 'Cache-Control': 'no-store' },
      },
    )
  }
}