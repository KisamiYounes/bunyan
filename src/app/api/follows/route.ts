import { handleApi, assertSameOrigin, readJson, json, enforceRateLimit } from '@/shared/errors/http'
import { RATE_LIMITS } from '@/shared/constants'
import { requireUser } from '@/modules/identity/session'
import { followSchema } from '@/modules/library/validation'
import { toggleFollow } from '@/modules/library/library.service'

export async function POST(request: Request): Promise<Response> {
  return handleApi(async () => {
    assertSameOrigin(request)
    const viewer = await requireUser()
    await enforceRateLimit(`follow:${viewer.id}`, RATE_LIMITS.library)
    const input = followSchema.parse(await readJson(request))
    const result = await toggleFollow(viewer, input)
    return json({ ok: true, ...result })
  })
}
