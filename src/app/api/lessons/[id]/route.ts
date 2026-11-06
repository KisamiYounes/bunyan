import { handleApi, assertSameOrigin, readJson, json, enforceRateLimit } from '@/shared/errors/http'
import { RATE_LIMITS } from '@/shared/constants'
import { requireUser } from '@/modules/identity/session'
import { updateLessonSchema } from '@/modules/learning/validation'
import { deleteLesson, updateLesson } from '@/modules/learning/course.service'
import { assertObjectId } from '@/shared/utils/request'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  return handleApi(async () => {
    assertSameOrigin(request)
    const viewer = await requireUser()
    const { id } = await params
    assertObjectId(id, 'LESSON_NOT_FOUND')
    await enforceRateLimit(`lesson-edit:${viewer.id}`, RATE_LIMITS.learning)
    const input = updateLessonSchema.parse(await readJson(request))
    await updateLesson(viewer, id, input)
    return json({ ok: true })
  })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  return handleApi(async () => {
    assertSameOrigin(request)
    const viewer = await requireUser()
    const { id } = await params
    assertObjectId(id, 'LESSON_NOT_FOUND')
    await deleteLesson(viewer, id)
    return json({ ok: true })
  })
}
