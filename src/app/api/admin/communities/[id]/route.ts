import { handleApi, assertSameOrigin, readJson, json } from '@/shared/errors/http'
import { requireUser } from '@/modules/identity/session'
import { requireAdmin } from '@/modules/identity/authorization'
import { adminCommunityActionSchema } from '@/modules/admin/validation'
import { adminSetCommunityStatus } from '@/modules/admin/admin.service'
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
    assertObjectId(id, 'COMMUNITY_NOT_FOUND')
    const input = adminCommunityActionSchema.parse(await readJson(request))
    await adminSetCommunityStatus(viewer, id, input.action)
    return json({ ok: true })
  })
}
