import { handleApi, assertSameOrigin, readJson, json } from '@/shared/errors/http'
import { updateProfileSchema } from '@/modules/identity/validation'
import { updateUserProfile } from '@/modules/identity/user.service'
import { requireUser } from '@/modules/identity/session'

export async function PUT(request: Request): Promise<Response> {
  return handleApi(async () => {
    assertSameOrigin(request)
    const session = await requireUser()
    const input = updateProfileSchema.parse(await readJson(request))
    const user = await updateUserProfile(session.id, input)
    return json({ ok: true, user })
  })
}
