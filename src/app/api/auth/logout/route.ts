import { handleApi, assertSameOrigin, json } from '@/shared/errors/http'
import { destroySession } from '@/modules/identity/session'

export async function POST(request: Request): Promise<Response> {
  return handleApi(async () => {
    assertSameOrigin(request)
    await destroySession()
    return json({ ok: true })
  })
}
