import { handleApi, assertSameOrigin, readJson, json, enforceRateLimit } from '@/shared/errors/http'
import { RATE_LIMITS } from '@/shared/constants'
import { requireUser } from '@/modules/identity/session'
import { bookmarkSchema } from '@/modules/library/validation'
import { toggleBookmark } from '@/modules/library/library.service'

export async function POST(request: Request): Promise<Response> {
  return handleApi(async () => {
    assertSameOrigin(request)
    const viewer = await requireUser()
    await enforceRateLimit(`bookmark:${viewer.id}`, RATE_LIMITS.library)
    const input = bookmarkSchema.parse(await readJson(request))
    const result = await toggleBookmark(viewer, input)
    return json({ ok: true, ...result })
  })
}
