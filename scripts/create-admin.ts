import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import { closeDatabase } from '../src/lib/mongodb.js'
import { getAuthCollections } from '../src/auth/collections.js'
import { hashPassword } from '../src/auth/passwords.js'

function askSecret(question: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!stdin.isTTY) {
      reject(new Error('Execute este script em um terminal interativo.'))
      return
    }

    const wasRaw = stdin.isRaw
    let value = ''
    let finished = false

    const finish = (error?: Error) => {
      if (finished) return
      finished = true

      stdin.off('data', onData)
      stdin.setRawMode(wasRaw ?? false)
      stdin.pause()
      stdout.write('\n')

      if (error) {
        reject(error)
      } else {
        resolve(value)
      }
    }

    const onData = (chunk: Buffer) => {
      for (const character of chunk.toString('utf8')) {
        if (character === '\u0003') {
          finish(new Error('Operação cancelada.'))
          return
        }

        if (character === '\r' || character === '\n') {
          finish()
          return
        }

        if (character === '\u007f' || character === '\b') {
          value = [...value].slice(0, -1).join('')
          continue
        }

        if (character >= ' ') {
          value += character
        }
      }
    }

    stdout.write(question)
    stdin.setRawMode(true)
    stdin.resume()
    stdin.on('data', onData)
  })
}

async function main(): Promise<void> {
  const prompt = createInterface({ input: stdin, output: stdout })

  let name: string
  let email: string

  try {
    name = (await prompt.question('Nome do admin: ')).trim()
    email = (await prompt.question('E-mail do admin: ')).trim().toLowerCase()
  } finally {
    prompt.close()
  }

  if (!name) {
    throw new Error('O nome é obrigatório.')
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Informe um e-mail válido.')
  }

  const password = await askSecret('Senha (mínimo 12 caracteres): ')
  const confirmation = await askSecret('Confirme a senha: ')

  if (password !== confirmation) {
    throw new Error('As senhas não conferem.')
  }

  const { users } = await getAuthCollections()

  try {
    const existingAdmin = await users.findOne({ role: 'admin' })

    if (existingAdmin) {
      throw new Error('Já existe um admin. O bootstrap não pode ser repetido.')
    }

    const existingUser = await users.findOne({ email })

    if (existingUser) {
      throw new Error('Já existe um usuário com esse e-mail.')
    }

    const now = new Date()

    await users.insertOne({
      name,
      email,
      passwordHash: await hashPassword(password),
      role: 'admin',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    })

    stdout.write(`Admin criado para ${email}.\n`)
  } finally {
    await closeDatabase()
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Erro ao criar o admin.'
  console.error(message)
  process.exitCode = 1
})