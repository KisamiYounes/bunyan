import { handleApi, assertSameOrigin, readJson, json, enforceRateLimit } from '@/shared/errors/http'
import { RATE_LIMITS } from '@/shared/constants'
import { requireUser } from '@/modules/identity/session'
import { createPostSchema } from '@/modules/communities/validation'
import { createPost } from '@/modules/communities/post.service'
import { assertObjectId } from '@/shared/utils/request'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  return handleApi(async () => {
    assertSameOrigin(request)
    const viewer = await requireUser()
    const { id } = await params
    assertObjectId(id, 'COMMUNITY_NOT_FOUND')
    await enforceRateLimit(`post:${viewer.id}`, RATE_LIMITS.post)

    const input = createPostSchema.parse(await readJson(request))
    const postId = await createPost(viewer, id, input)
    return json({ ok: true, postId }, 201)
  })
}
