import { handleApi, assertSameOrigin, json } from '@/shared/errors/http'
import { requireUser } from '@/modules/identity/session'
import { deleteComment } from '@/modules/communities/post.service'
import { assertObjectId } from '@/shared/utils/request'
import { recordAudit } from '@/modules/admin/audit.service'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  return handleApi(async () => {
    assertSameOrigin(request)
    const viewer = await requireUser()
    const { id } = await params
    assertObjectId(id)
    await deleteComment(viewer, id)
    await recordAudit({
      actorId: viewer.id,
      action: 'comment.remove',
      targetType: 'comment',
      targetId: id,
    })
    return json({ ok: true })
  })
}
