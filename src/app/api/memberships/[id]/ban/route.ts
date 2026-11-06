import { handleApi, assertSameOrigin, json } from '@/shared/errors/http'
import { requireUser } from '@/modules/identity/session'
import { banMember } from '@/modules/communities/community.service'
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
    await banMember(viewer, id)
    await recordAudit({
      actorId: viewer.id,
      action: 'membership.ban',
      targetType: 'membership',
      targetId: id,
    })
    return json({ ok: true })
  })
}
