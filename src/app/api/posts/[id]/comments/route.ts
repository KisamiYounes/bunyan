import { handleApi, assertSameOrigin, readJson, json, enforceRateLimit } from '@/shared/errors/http'
import { RATE_LIMITS } from '@/shared/constants'
import { requireUser } from '@/modules/identity/session'
import { createCommentSchema } from '@/modules/communities/validation'
import { createComment } from '@/modules/communities/post.service'
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
    await enforceRateLimit(`comment:${viewer.id}`, RATE_LIMITS.comment)

    const input = createCommentSchema.parse(await readJson(request))
    const commentId = await createComment(viewer, id, input)
    return json({ ok: true, commentId }, 201)
  })
}
