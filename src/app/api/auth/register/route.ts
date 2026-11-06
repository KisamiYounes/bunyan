import { handleApi, assertSameOrigin, readJson, json, enforceRateLimit } from '@/shared/errors/http'
import { RATE_LIMITS } from '@/shared/constants'
import { clientIp } from '@/shared/utils/request'
import { registerSchema } from '@/modules/identity/validation'
import { registerUser } from '@/modules/identity/auth.service'
import { establishSession } from '@/modules/identity/session'
import { toSessionUser } from '@/modules/identity/dto'

export async function POST(request: Request): Promise<Response> {
  return handleApi(async () => {
    assertSameOrigin(request)
    await enforceRateLimit(`register:${clientIp(request)}`, RATE_LIMITS.register)

    const input = registerSchema.parse(await readJson(request))
    const user = await registerUser(input)
    await establishSession(user)

    return json({ ok: true, user: toSessionUser(user) }, 201)
  })
}
