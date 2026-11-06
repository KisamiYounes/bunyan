import { handleApi, assertSameOrigin, readJson, json, enforceRateLimit } from '@/shared/errors/http'
import { RATE_LIMITS } from '@/shared/constants'
import { requireUser } from '@/modules/identity/session'
import { updateCourseSchema } from '@/modules/learning/validation'
import { archiveCourse, updateCourse } from '@/modules/learning/course.service'
import { assertObjectId } from '@/shared/utils/request'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  return handleApi(async () => {
    assertSameOrigin(request)
    const viewer = await requireUser()
    const { id } = await params
    assertObjectId(id, 'COURSE_NOT_FOUND')
    await enforceRateLimit(`course-edit:${viewer.id}`, RATE_LIMITS.learning)
    const input = updateCourseSchema.parse(await readJson(request))
    await updateCourse(viewer, id, input)
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
    assertObjectId(id, 'COURSE_NOT_FOUND')
    await archiveCourse(viewer, id)
    return json({ ok: true })
  })
}
