import { handleApi, assertSameOrigin, readJson, json, enforceRateLimit } from '@/shared/errors/http'
import { RATE_LIMITS, TOPICS, type Topic } from '@/shared/constants'
import { requireUser } from '@/modules/identity/session'
import { createPublicationSchema } from '@/modules/learning/validation'
import { createPublication, listPublications } from '@/modules/learning/publication.service'

export async function GET(request: Request): Promise<Response> {
  return handleApi(async () => {
    const url = new URL(request.url)
    const topicParam = url.searchParams.get('topic')
    const topic =
      topicParam && (TOPICS as readonly string[]).includes(topicParam)
        ? (topicParam as Topic)
        : undefined
    const result = await listPublications({
      page: Number(url.searchParams.get('page') ?? 1),
      limit: Number(url.searchParams.get('limit') ?? 12),
      search: url.searchParams.get('q') ?? undefined,
      topic,
      authorId: url.searchParams.get('author') ?? undefined,
    })
    return json(result)
  })
}

export async function POST(request: Request): Promise<Response> {
  return handleApi(async () => {
    assertSameOrigin(request)
    const viewer = await requireUser()
    await enforceRateLimit(`publication-create:${viewer.id}`, RATE_LIMITS.learning)
    const input = createPublicationSchema.parse(await readJson(request))
    const publicationId = await createPublication(viewer, input)
    return json({ ok: true, publicationId }, 201)
  })
}
