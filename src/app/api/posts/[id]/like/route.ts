import { handleApi, assertSameOrigin, json } from '@/shared/errors/http'
import { requireUser } from '@/modules/identity/session'
import { toggleLike } from '@/modules/communities/post.service'
import { assertObjectId } from '@/shared/utils/request'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  return handleApi(async () => {
    assertSameOrigin(request)
    const viewer = await requireUser()
    const { id } = await params
    assertObjectId(id, 'POST_NOT_FOUND')
    const result = await toggleLike(viewer, id)
    return json({ ok: true, ...result })
  })
}
