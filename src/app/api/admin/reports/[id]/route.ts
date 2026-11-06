import { handleApi, assertSameOrigin, readJson, json } from '@/shared/errors/http'
import { requireUser } from '@/modules/identity/session'
import { requireAdmin } from '@/modules/identity/authorization'
import { resolveReportSchema } from '@/modules/admin/validation'
import { resolveReport } from '@/modules/admin/report.service'
import { recordAudit } from '@/modules/admin/audit.service'
import { assertObjectId } from '@/shared/utils/request'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  return handleApi(async () => {
    assertSameOrigin(request)
    const viewer = await requireUser()
    requireAdmin(viewer)
    const { id } = await params
    assertObjectId(id, 'REPORT_NOT_FOUND')
    const input = resolveReportSchema.parse(await readJson(request))
    await resolveReport(viewer, id, input.status)
    await recordAudit({
      actorId: viewer.id,
      action: `report.${input.status}`,
      targetType: 'report',
      targetId: id,
    })
    return json({ ok: true })
  })
}
