import { handleApi, assertSameOrigin, json, enforceRateLimit } from '@/shared/errors/http'
import { RATE_LIMITS } from '@/shared/constants'
import { requireUser } from '@/modules/identity/session'
import { leaveCommunity } from '@/modules/communities/community.service'
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
    await leaveCommunity(viewer, id)
    return json({ ok: true })
  })
}
