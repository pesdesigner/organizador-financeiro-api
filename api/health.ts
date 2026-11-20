import { getDatabase } from '../src/lib/mongodb.js'

export async function GET() {
  try {
    const database = await getDatabase()
    await database.command({ ping: 1 })

    return Response.json({
      status: 'ok',
      service: 'organizador-financeiro-api',
      database: 'connected',
    })
  } catch (error) {
    console.error(
      'MongoDB ping failed:',
      error instanceof Error ? error.message : 'Unknown error',
    )

    return Response.json(
      {
        status: 'error',
        service: 'organizador-financeiro-api',
        database: 'unavailable',
      },
      { status: 503 },
    )
  }
}