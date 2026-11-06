import { connectToDatabase } from '@/infrastructure/database/mongoose'
import { XP_POINTS, type XpKind } from '@/shared/constants'
import { applyExperience } from '@/modules/identity/user.service'
import { XpEventModel } from './xp-event.model'

export interface AwardResult {
  awarded: boolean
  points: number
}

/**
 * Awards XP exactly once per (user, kind, reference). The unique compound index is the
 * anti-abuse mechanism: replaying an action cannot mint additional experience.
 * Points always come from the server-side XP_POINTS table; client input is never trusted.
 */
export async function awardXp(userId: string, kind: XpKind, refId: string): Promise<AwardResult> {
  const points = XP_POINTS[kind]
  await connectToDatabase()

  try {
    await XpEventModel.create({ userId, kind, refId, points })
  } catch (error) {
    if (isDuplicate(error)) return { awarded: false, points: 0 }
    throw error
  }

  await applyExperience(userId, points)
  return { awarded: true, points }
}

function isDuplicate(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: number }).code === 11000
  )
}
