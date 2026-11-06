import { handleApi, assertSameOrigin, json, enforceRateLimit } from '@/shared/errors/http'
import { RATE_LIMITS } from '@/shared/constants'
import { requireUser } from '@/modules/identity/session'
import { publishCourse } from '@/modules/learning/course.service'
import { assertObjectId } from '@/shared/utils/request'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  return handleApi(async () => {
    assertSameOrigin(request)
    const viewer = await requireUser()
    const { id } = await params
    assertObjectId(id, 'COURSE_NOT_FOUND')
    await enforceRateLimit(`course-publish:${viewer.id}`, RATE_LIMITS.learning)
    await publishCourse(viewer, id)
    return json({ ok: true })
  })
}
