import { handleApi, assertSameOrigin, readJson, json, enforceRateLimit } from '@/shared/errors/http'
import { RATE_LIMITS } from '@/shared/constants'
import { requireUser } from '@/modules/identity/session'
import { saveReadingProgressSchema } from '@/modules/learning/validation'
import { saveReadingProgress } from '@/modules/learning/publication.service'
import { assertObjectId } from '@/shared/utils/request'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  return handleApi(async () => {
    assertSameOrigin(request)
    const viewer = await requireUser()
    const { id } = await params
    assertObjectId(id, 'PUBLICATION_NOT_FOUND')
    await enforceRateLimit(`reading:${viewer.id}`, RATE_LIMITS.progress)
    const input = saveReadingProgressSchema.parse(await readJson(request))
    await saveReadingProgress(viewer, id, input)
    return json({ ok: true })
  })
}
