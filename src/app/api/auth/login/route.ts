import { handleApi, assertSameOrigin, readJson, json, enforceRateLimit } from '@/shared/errors/http'
import { RATE_LIMITS } from '@/shared/constants'
import { clientIp } from '@/shared/utils/request'
import { loginSchema } from '@/modules/identity/validation'
import { authenticateUser } from '@/modules/identity/auth.service'
import { establishSession } from '@/modules/identity/session'
import { toSessionUser } from '@/modules/identity/dto'

export async function POST(request: Request): Promise<Response> {
  return handleApi(async () => {
    assertSameOrigin(request)
    const ip = clientIp(request)
    await enforceRateLimit(`login-ip:${ip}`, RATE_LIMITS.loginIp)

    const input = loginSchema.parse(await readJson(request))
    await enforceRateLimit(`login-account:${input.email}`, RATE_LIMITS.loginAccount)

    const user = await authenticateUser(input)
    await establishSession(user)

    return json({ ok: true, user: toSessionUser(user) })
  })
}
