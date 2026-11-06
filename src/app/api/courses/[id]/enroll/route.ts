import { handleApi, assertSameOrigin, json, enforceRateLimit } from '@/shared/errors/http'
import { RATE_LIMITS } from '@/shared/constants'
import { requireUser } from '@/modules/identity/session'
import { enrollInCourse } from '@/modules/learning/course.service'
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
    await enforceRateLimit(`enroll:${viewer.id}`, RATE_LIMITS.learning)
    await enrollInCourse(viewer, id)
    return json({ ok: true }, 201)
  })
}
