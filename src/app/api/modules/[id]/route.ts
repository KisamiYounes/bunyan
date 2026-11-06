import { handleApi, assertSameOrigin, readJson, json, enforceRateLimit } from '@/shared/errors/http'
import { RATE_LIMITS } from '@/shared/constants'
import { requireUser } from '@/modules/identity/session'
import { updateModuleSchema } from '@/modules/learning/validation'
import { deleteModule, updateModule } from '@/modules/learning/course.service'
import { assertObjectId } from '@/shared/utils/request'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  return handleApi(async () => {
    assertSameOrigin(request)
    const viewer = await requireUser()
    const { id } = await params
    assertObjectId(id)
    await enforceRateLimit(`module-edit:${viewer.id}`, RATE_LIMITS.learning)
    const input = updateModuleSchema.parse(await readJson(request))
    await updateModule(viewer, id, input)
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
    assertObjectId(id)
    await deleteModule(viewer, id)
    return json({ ok: true })
  })
}
