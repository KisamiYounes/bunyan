import mongoose from 'mongoose'
import { logger } from '@/infrastructure/logging/logger'

interface MongooseCache {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

declare global {
  var __bunyanMongoose: MongooseCache | undefined
}

const globalCache = globalThis as typeof globalThis & { __bunyanMongoose?: MongooseCache }

const cache: MongooseCache = (globalCache.__bunyanMongoose ??= {
  conn: null,
  promise: null,
})

const MONGOOSE_OPTIONS: mongoose.ConnectOptions = {
  serverSelectionTimeoutMS: 10_000,
  maxPoolSize: 10,
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn

  if (!process.env.MONGODB_URI) {
    process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/bunyan'
  }

  if (!cache.promise) {
    mongoose.set('strictQuery', true)
    mongoose.set('bufferCommands', false)
    if (process.env.NODE_ENV === 'production') {
      mongoose.set('autoIndex', false)
    }
    cache.promise = mongoose
      .connect(process.env.MONGODB_URI, MONGOOSE_OPTIONS)
      .then((instance) => {
        logger.info('MongoDB connected', { database: instance.connection.name })
        return instance
      })
      .catch((error) => {
        cache.promise = null
        logger.error('MongoDB connection failed', {
          error: error instanceof Error ? error.message : String(error),
        })
        throw error
      })
  }

  cache.conn = await cache.promise
  return cache.conn
}

export async function disconnectFromDatabase(): Promise<void> {
  await mongoose.disconnect()
  cache.conn = null
  cache.promise = null
}

export function isValidObjectId(value: string): boolean {
  return (
    mongoose.Types.ObjectId.isValid(value) && String(new mongoose.Types.ObjectId(value)) === value
  )
}
