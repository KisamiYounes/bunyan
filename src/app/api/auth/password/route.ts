import { handleApi, assertSameOrigin, readJson, json } from '@/shared/errors/http'
import { changePasswordSchema } from '@/modules/identity/validation'
import { changeUserPassword } from '@/modules/identity/auth.service'
import { requireUser, establishSession } from '@/modules/identity/session'
import { toSessionUser } from '@/modules/identity/dto'

export async function POST(request: Request): Promise<Response> {
  return handleApi(async () => {
    assertSameOrigin(request)
    const session = await requireUser()
    const input = changePasswordSchema.parse(await readJson(request))

    const user = await changeUserPassword(session.id, input.currentPassword, input.newPassword)
    await establishSession(user)

    return json({ ok: true, user: toSessionUser(user) })
  })
}
