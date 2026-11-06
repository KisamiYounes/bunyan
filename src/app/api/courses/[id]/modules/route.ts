import { handleApi, assertSameOrigin, readJson, json, enforceRateLimit } from '@/shared/errors/http'
import { RATE_LIMITS } from '@/shared/constants'
import { requireUser } from '@/modules/identity/session'
import { createModuleSchema } from '@/modules/learning/validation'
import { createModule } from '@/modules/learning/course.service'
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
    await enforceRateLimit(`module-create:${viewer.id}`, RATE_LIMITS.learning)
    const input = createModuleSchema.parse(await readJson(request))
    const moduleId = await createModule(viewer, id, input)
    return json({ ok: true, moduleId }, 201)
  })
}
