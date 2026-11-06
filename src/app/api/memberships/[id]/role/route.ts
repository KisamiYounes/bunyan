import { handleApi, assertSameOrigin, readJson, json } from '@/shared/errors/http'
import { requireUser } from '@/modules/identity/session'
import { setMemberRole } from '@/modules/communities/community.service'
import { updateMemberRoleSchema } from '@/modules/communities/validation'
import { assertObjectId } from '@/shared/utils/request'
import { recordAudit } from '@/modules/admin/audit.service'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  return handleApi(async () => {
    assertSameOrigin(request)
    const viewer = await requireUser()
    const { id } = await params
    assertObjectId(id)
    const input = updateMemberRoleSchema.parse(await readJson(request))
    await setMemberRole(viewer, id, input.role)
    await recordAudit({
      actorId: viewer.id,
      action: 'membership.role',
      targetType: 'membership',
      targetId: id,
      metadata: { role: input.role },
    })
    return json({ ok: true })
  })
}
