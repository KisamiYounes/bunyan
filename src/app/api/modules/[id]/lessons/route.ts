import { handleApi, assertSameOrigin, readJson, json, enforceRateLimit } from '@/shared/errors/http'
import { RATE_LIMITS } from '@/shared/constants'
import { requireUser } from '@/modules/identity/session'
import { createLessonSchema } from '@/modules/learning/validation'
import { createLesson } from '@/modules/learning/course.service'
import { assertObjectId } from '@/shared/utils/request'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  return handleApi(async () => {
    assertSameOrigin(request)
    const viewer = await requireUser()
    const { id } = await params
    assertObjectId(id)
    await enforceRateLimit(`lesson-create:${viewer.id}`, RATE_LIMITS.learning)
    const input = createLessonSchema.parse(await readJson(request))
    const lessonId = await createLesson(viewer, id, input)
    return json({ ok: true, lessonId }, 201)
  })
}
