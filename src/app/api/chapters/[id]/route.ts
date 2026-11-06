import { handleApi, assertSameOrigin, readJson, json, enforceRateLimit } from '@/shared/errors/http'
import { RATE_LIMITS } from '@/shared/constants'
import { requireUser } from '@/modules/identity/session'
import { updateChapterSchema } from '@/modules/learning/validation'
import { deleteChapter, updateChapter } from '@/modules/learning/publication.service'
import { assertObjectId } from '@/shared/utils/request'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  return handleApi(async () => {
    assertSameOrigin(request)
    const viewer = await requireUser()
    const { id } = await params
    assertObjectId(id, 'CHAPTER_NOT_FOUND')
    await enforceRateLimit(`chapter-edit:${viewer.id}`, RATE_LIMITS.learning)
    const input = updateChapterSchema.parse(await readJson(request))
    await updateChapter(viewer, id, input)
    return json({ ok: true })
  })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  return handleApi(async () => {
    assertSameOrigin(request)
    const viewer = await requireUser()
    const { id } = await params
    assertObjectId(id, 'CHAPTER_NOT_FOUND')
    await deleteChapter(viewer, id)
    return json({ ok: true })
  })
}
