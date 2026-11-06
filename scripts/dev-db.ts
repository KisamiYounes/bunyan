import path from 'node:path'
import { MongoMemoryServer } from 'mongodb-memory-server'

/**
 * Local development database with zero external installation.
 * Data is persisted under .data/mongo so it survives restarts.
 */
async function main() {
  const port = Number(process.env.LOCAL_DB_PORT ?? 27017)
  const dbPath = path.resolve(process.cwd(), '.data', 'mongo')

  const server = await MongoMemoryServer.create({
    instance: {
      port,
      dbName: 'bunyan',
      dbPath,
      storageEngine: 'wiredTiger',
    },
  })

  console.log(`BUNYAN local MongoDB running at ${server.getUri()}`)
  console.log('Press Ctrl+C to stop. Data persists in .data/mongo')

  const shutdown = async () => {
    console.log('\nStopping local MongoDB…')
    await server.stop({ doCleanup: false })
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

main().catch((error) => {
  console.error('Failed to start local MongoDB:', error)
  process.exit(1)
})
