import { handleApi, assertSameOrigin, readJson, json } from '@/shared/errors/http'
import { requireUser } from '@/modules/identity/session'
import { requireAdmin } from '@/modules/identity/authorization'
import { adminUserActionSchema } from '@/modules/admin/validation'
import { adminSetUserStatus } from '@/modules/admin/admin.service'
import { assertObjectId } from '@/shared/utils/request'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  return handleApi(async () => {
    assertSameOrigin(request)
    const viewer = await requireUser()
    requireAdmin(viewer)
    const { id } = await params
    assertObjectId(id, 'USER_NOT_FOUND')
    const input = adminUserActionSchema.parse(await readJson(request))
    await adminSetUserStatus(viewer, id, input.action)
    return json({ ok: true })
  })
}
