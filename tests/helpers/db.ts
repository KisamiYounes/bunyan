import { afterAll, afterEach, beforeAll } from 'vitest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { connectToDatabase, disconnectFromDatabase } from '@/infrastructure/database/mongoose'
import { hashPassword } from '@/modules/identity/password'
import { UserModel, type UserDocument } from '@/modules/identity/user.model'
import { CommunityModel } from '@/modules/communities/community.model'
import { MembershipModel } from '@/modules/communities/membership.model'
import { PostModel } from '@/modules/communities/post.model'
import { CommentModel } from '@/modules/communities/comment.model'
import { PostLikeModel } from '@/modules/communities/post-like.model'
import { XpEventModel } from '@/modules/gamification/xp-event.model'
import { ReportModel } from '@/modules/admin/report.model'
import { AuditLogModel } from '@/modules/admin/audit-log.model'

export const TEST_PASSWORD = 'TestPassword!2026'

let passwordHash = ''
let sequence = 0

/**
 * Starts an isolated MongoDB instance for one test file and wires the shared native connection
 * to it. Indexes are built explicitly so uniqueness constraints exist before tests run.
 */
export function setupTestDatabase(): void {
  let server: MongoMemoryServer | undefined

  beforeAll(async () => {
    server = await MongoMemoryServer.create({ instance: { dbName: 'bunyan_test' } })
    process.env.MONGODB_URI = server.getUri()
    await connectToDatabase()
    passwordHash = await hashPassword(TEST_PASSWORD)
    await Promise.all([
      UserModel.init(),
      CommunityModel.init(),
      MembershipModel.init(),
      PostModel.init(),
      CommentModel.init(),
      PostLikeModel.init(),
      XpEventModel.init(),
      ReportModel.init(),
      AuditLogModel.init(),
    ])
  }, 180_000)

  afterEach(async () => {
    const collections = Object.values(mongoose.connection.collections)
    await Promise.all(collections.map((collection) => collection.deleteMany({})))
  })

  afterAll(async () => {
    await disconnectFromDatabase()
    await server?.stop()
  })
}

export function nextSequence(): number {
  sequence += 1
  return sequence
}

export async function createTestUser(
  overrides: Partial<{
    email: string
    username: string
    name: string
    role: 'learner' | 'educator' | 'admin'
    ageBand: 'child' | 'teen' | 'adult' | 'unknown'
    guardianConsentAt: Date
    status: 'active' | 'suspended' | 'deleted'
    profileVisibility: 'public' | 'members'
    xp: number
  }> = {},
): Promise<UserDocument> {
  const index = nextSequence()
  return UserModel.create({
    email: overrides.email ?? `user${index}@test.local`,
    username: overrides.username ?? `user${index}`,
    name: overrides.name ?? `Test User ${index}`,
    passwordHash,
    role: overrides.role ?? 'learner',
    status: overrides.status ?? 'active',
    locale: 'ar',
    bio: '',
    ageBand: overrides.ageBand ?? 'adult',
    guardianConsentAt: overrides.guardianConsentAt,
    xp: overrides.xp ?? 0,
    level: 1,
    profileVisibility: overrides.profileVisibility ?? 'public',
  })
}
