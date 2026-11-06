import { handleApi, assertSameOrigin, readJson, json, enforceRateLimit } from '@/shared/errors/http'
import { TOPICS, type Topic } from '@/shared/constants'
import { getSessionUser, requireUser } from '@/modules/identity/session'
import { createCommunitySchema } from '@/modules/communities/validation'
import { createCommunity, listCommunities } from '@/modules/communities/community.service'
import { clientIp } from '@/shared/utils/request'

export async function GET(request: Request): Promise<Response> {
  return handleApi(async () => {
    const viewer = await getSessionUser()
    const url = new URL(request.url)
    const topicParam = url.searchParams.get('topic')
    const topic =
      topicParam && (TOPICS as readonly string[]).includes(topicParam)
        ? (topicParam as Topic)
        : undefined

    const result = await listCommunities({
      page: Number(url.searchParams.get('page') ?? 1),
      limit: Number(url.searchParams.get('limit') ?? 12),
      topic,
      search: url.searchParams.get('q') ?? undefined,
      onlyMine: url.searchParams.get('mine') === '1',
      viewerId: viewer?.id,
    })
    return json({ ok: true, ...result })
  })
}

export async function POST(request: Request): Promise<Response> {
  return handleApi(async () => {
    assertSameOrigin(request)
    const viewer = await requireUser()
    await enforceRateLimit(`community-create:${viewer.id}:${clientIp(request)}`, {
      limit: 5,
      windowMs: 60 * 60 * 1000,
    })
    const input = createCommunitySchema.parse(await readJson(request))
    const community = await createCommunity(viewer, input)
    return json({ ok: true, community }, 201)
  })
}
