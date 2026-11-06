import { handleApi, assertSameOrigin, readJson, json } from '@/shared/errors/http'
import { requireUser } from '@/modules/identity/session'
import { approveMembership } from '@/modules/communities/community.service'
import { approveMembershipSchema } from '@/modules/communities/validation'
import { assertObjectId } from '@/shared/utils/request'
import { recordAudit } from '@/modules/admin/audit.service'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  return handleApi(async () => {
    assertSameOrigin(request)
    const viewer = await requireUser()
    const { id } = await params
    assertObjectId(id)
    const input = approveMembershipSchema.parse(await readJson(request))
    await approveMembership(viewer, id, input.decision)
    await recordAudit({
      actorId: viewer.id,
      action: `membership.${input.decision}`,
      targetType: 'membership',
      targetId: id,
    })
    return json({ ok: true })
  })
}
