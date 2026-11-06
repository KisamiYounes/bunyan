import { handleApi, assertSameOrigin, json } from '@/shared/errors/http'
import { requireUser } from '@/modules/identity/session'
import { deletePost } from '@/modules/communities/post.service'
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
    assertObjectId(id, 'POST_NOT_FOUND')
    await deletePost(viewer, id)
    await recordAudit({
      actorId: viewer.id,
      action: 'post.remove',
      targetType: 'post',
      targetId: id,
    })
    return json({ ok: true })
  })
}
