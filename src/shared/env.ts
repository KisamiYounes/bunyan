import { z } from 'zod'

const envSchema = z.object({
  MONGODB_URI: z.string().min(1).default('mongodb://127.0.0.1:27017/bunyan'),
  SESSION_SECRET: z.string().min(32).optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
})

export type ServerEnv = z.infer<typeof envSchema>

let cached: ServerEnv | null = null

export const DEV_SESSION_SECRET = 'bunyan-development-session-secret-do-not-use-in-production'

export function getServerEnv(): ServerEnv {
  if (cached) return cached
  const parsed = envSchema.parse({
    MONGODB_URI: process.env.MONGODB_URI,
    SESSION_SECRET: process.env.SESSION_SECRET,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NODE_ENV: process.env.NODE_ENV,
  })
  if (parsed.NODE_ENV === 'production' && !parsed.SESSION_SECRET) {
    throw new Error('SESSION_SECRET is required in production (minimum 32 characters)')
  }
  cached = parsed
  return parsed
}

export function getMongoUri(): string {
  return getServerEnv().MONGODB_URI
}
