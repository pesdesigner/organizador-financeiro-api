import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto'

const COST = 2 ** 15
const BLOCK_SIZE = 8
const PARALLELIZATION = 3
const KEY_LENGTH = 64
const MAX_MEMORY = 64 * 1024 * 1024

function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(
      password,
      salt,
      KEY_LENGTH,
      {
        N: COST,
        r: BLOCK_SIZE,
        p: PARALLELIZATION,
        maxmem: MAX_MEMORY,
      },
      (error, key) => {
        if (error) {
          reject(error)
          return
        }

        resolve(key)
      },
    )
  })
}

export async function hashPassword(password: string): Promise<string> {
  if (password.length < 12 || Buffer.byteLength(password, 'utf8') > 128) {
    throw new Error('A senha deve ter ao menos 12 caracteres e no máximo 128 bytes.')
  }

  const salt = randomBytes(16)
  const key = await deriveKey(password, salt)

  return [
    'scrypt',
    COST,
    BLOCK_SIZE,
    PARALLELIZATION,
    salt.toString('base64url'),
    key.toString('base64url'),
  ].join('$')
}

export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  if (!password || Buffer.byteLength(password, 'utf8') > 128) {
    return false
  }

  const parts = storedHash.split('$')

  if (parts.length !== 6 || parts[0] !== 'scrypt') {
    return false
  }

  const [, cost, blockSize, parallelization, saltValue, keyValue] = parts

  if (
    Number(cost) !== COST ||
    Number(blockSize) !== BLOCK_SIZE ||
    Number(parallelization) !== PARALLELIZATION
  ) {
    return false
  }

  const salt = Buffer.from(saltValue, 'base64url')
  const expectedKey = Buffer.from(keyValue, 'base64url')

  if (salt.length !== 16 || expectedKey.length !== KEY_LENGTH) {
    return false
  }

  const actualKey = await deriveKey(password, salt)

  return timingSafeEqual(actualKey, expectedKey)
}