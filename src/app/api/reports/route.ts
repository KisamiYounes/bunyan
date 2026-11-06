import { handleApi, assertSameOrigin, readJson, json, enforceRateLimit } from '@/shared/errors/http'
import { RATE_LIMITS } from '@/shared/constants'
import { requireUser } from '@/modules/identity/session'
import { createReportSchema } from '@/modules/admin/validation'
import { createReport } from '@/modules/admin/report.service'

export async function POST(request: Request): Promise<Response> {
  return handleApi(async () => {
    assertSameOrigin(request)
    const viewer = await requireUser()
    await enforceRateLimit(`report:${viewer.id}`, RATE_LIMITS.report)

    const input = createReportSchema.parse(await readJson(request))
    const result = await createReport(viewer, input)
    return json({ ok: true, ...result }, result.duplicate ? 200 : 201)
  })
}
