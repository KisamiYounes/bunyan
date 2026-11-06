import { handleApi, json } from '@/shared/errors/http'
import { searchPlatform } from '@/modules/library/library.service'

export async function GET(request: Request): Promise<Response> {
  return handleApi(async () => {
    const url = new URL(request.url)
    const query = (url.searchParams.get('q') ?? '').slice(0, 120)
    const results = await searchPlatform(query)
    return json({ query, ...results })
  })
}
