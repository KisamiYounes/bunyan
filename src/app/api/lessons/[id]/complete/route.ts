import { handleApi, assertSameOrigin, json, enforceRateLimit } from '@/shared/errors/http'
import { RATE_LIMITS } from '@/shared/constants'
import { requireUser } from '@/modules/identity/session'
import { completeLesson } from '@/modules/learning/course.service'
import { assertObjectId } from '@/shared/utils/request'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  return handleApi(async () => {
    assertSameOrigin(request)
    const viewer = await requireUser()
    const { id } = await params
    assertObjectId(id, 'LESSON_NOT_FOUND')
    await enforceRateLimit(`lesson-complete:${viewer.id}`, RATE_LIMITS.progress)
    const result = await completeLesson(viewer, id)
    return json({ ok: true, ...result })
  })
}
