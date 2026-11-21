export const SESSION_COOKIE_NAME = '__Host-organizador-financeiro-session'

export function readSessionToken(request: Request): string | null {
  const cookieHeader = request.headers.get('cookie')

  if (!cookieHeader) {
    return null
  }

  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=')

    if (separator === -1) {
      continue
    }

    const name = part.slice(0, separator).trim()
    const value = part.slice(separator + 1).trim()

    if (name === SESSION_COOKIE_NAME) {
      return value || null
    }
  }

  return null
}

export function createSessionCookie(token: string, expiresAt: Date): string {
  const maxAge = Math.max(
    0,
    Math.floor((expiresAt.getTime() - Date.now()) / 1000),
  )

  return [
    `${SESSION_COOKIE_NAME}=${token}`,
    `Max-Age=${maxAge}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Strict',
  ].join('; ')
}

export function clearSessionCookie(): string {
  return [
    `${SESSION_COOKIE_NAME}=`,
    'Max-Age=0',
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Strict',
  ].join('; ')
}