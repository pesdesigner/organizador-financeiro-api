import { MongoClient, type Db } from 'mongodb'

type MongoGlobal = typeof globalThis & {
  mongoClientPromise?: Promise<MongoClient>
}

const globalForMongo = globalThis as MongoGlobal

export async function getDatabase(): Promise<Db> {
  const uri = process.env.MONGODB_URI
  const databaseName = process.env.MONGODB_DATABASE

  if (!uri || !databaseName) {
    throw new Error('MONGODB_URI e MONGODB_DATABASE precisam estar configurados.')
  }

  if (!globalForMongo.mongoClientPromise) {
    const client = new MongoClient(uri, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
    })

    globalForMongo.mongoClientPromise = client.connect().catch((error: unknown) => {
      globalForMongo.mongoClientPromise = undefined
      throw error
    })
  }

  const client = await globalForMongo.mongoClientPromise
  return client.db(databaseName)
}

export async function closeDatabase(): Promise<void> {
  const clientPromise = globalForMongo.mongoClientPromise

  if (!clientPromise) {
    return
  }

  globalForMongo.mongoClientPromise = undefined

  const client = await clientPromise
  await client.close()
}