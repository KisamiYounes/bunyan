import { handleApi, assertSameOrigin, json, enforceRateLimit } from '@/shared/errors/http'
import { RATE_LIMITS } from '@/shared/constants'
import { requireUser } from '@/modules/identity/session'
import { joinCommunity } from '@/modules/communities/community.service'
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
    await enforceRateLimit(`membership:${viewer.id}`, RATE_LIMITS.membership)
    const result = await joinCommunity(viewer, id)
    return json({ ok: true, status: result.status })
  })
}
