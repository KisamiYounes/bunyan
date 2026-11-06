import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Search } from 'lucide-react'
import { isLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionaries'
import { formatDate, formatNumber } from '@/shared/utils/format'
import { listCommunitiesForAdmin } from '@/modules/communities/community.service'
import { AdminCommunityActions } from '@/components/admin/community-actions'
import { Pagination } from '@/components/shared/page-header'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/field'
import { buttonStyles } from '@/components/ui/button'

export default async function AdminCommunitiesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const dict = getDictionary(locale)
  const query = await searchParams
  const page = Number.parseInt(query.page ?? '1', 10) || 1

  const result = await listCommunitiesForAdmin({ page, limit: 20, search: query.q })

  return (
    <div className="space-y-4">
      <form method="get" className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            name="q"
            defaultValue={query.q ?? ''}
            placeholder={dict.communities.searchPlaceholder}
            aria-label={dict.common.search}
            className="ps-9"
          />
        </div>
        <button type="submit" className={buttonStyles('secondary', 'md')}>
          {dict.common.search}
        </button>
      </form>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          {result.items.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">{dict.admin.noCommunities}</p>
          ) : (
            <table className="w-full min-w-[52rem] text-sm">
              <thead className="border-b border-border text-start text-xs tracking-wide text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3 text-start font-medium">{dict.admin.communities}</th>
                  <th className="px-4 py-3 text-start font-medium">{dict.common.owner}</th>
                  <th className="px-4 py-3 text-start font-medium">{dict.admin.status}</th>
                  <th className="px-4 py-3 text-start font-medium">
                    {dict.settings.profileVisibility}
                  </th>
                  <th className="px-4 py-3 text-start font-medium">{dict.admin.joined}</th>
                  <th className="px-4 py-3 text-start font-medium">{dict.common.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {result.items.map((community) => (
                  <tr key={community.id}>
                    <td className="px-4 py-3">
                      <Link
                        href={`/${locale}/communities/${community.slug}`}
                        className="block font-medium hover:text-primary"
                      >
                        {community.name}
                      </Link>
                      <span className="block text-xs text-muted-foreground">
                        {formatNumber(community.memberCount, locale)} ·{' '}
                        {formatNumber(community.postCount, locale)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {community.ownerName ?? dict.common.unknown}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          community.status === 'active'
                            ? 'success'
                            : community.status === 'archived'
                              ? 'neutral'
                              : 'danger'
                        }
                      >
                        {community.status === 'active'
                          ? dict.common.active
                          : community.status === 'archived'
                            ? dict.common.archived
                            : dict.common.suspended}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {community.visibility === 'private'
                        ? dict.common.private
                        : dict.common.public}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(community.createdAt, locale)}
                    </td>
                    <td className="px-4 py-3">
                      <AdminCommunityActions
                        communityId={community.id}
                        status={community.status}
                        labels={{
                          archive: dict.admin.archive,
                          activate: dict.admin.activate,
                          archived: dict.admin.archived,
                          genericError: dict.errors.generic,
                          errors: dict.errors,
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Pagination
        basePath={`/${locale}/admin/communities`}
        page={result.page}
        totalItems={result.total}
        limit={result.limit}
        searchParams={{ q: query.q }}
        labels={{
          previous: dict.common.previous,
          next: dict.common.next,
          pageOf: dict.common.pageOf,
        }}
      />
    </div>
  )
}
