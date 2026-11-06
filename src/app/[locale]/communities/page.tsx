import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Compass, Plus, Search, Users } from 'lucide-react'
import { isLocale } from '@/i18n/config'
import { getDictionary, format } from '@/i18n/dictionaries'
import { TOPICS, type Topic } from '@/shared/constants'
import { formatNumber } from '@/shared/utils/format'
import { getSessionUser } from '@/modules/identity/session'
import { listCommunities } from '@/modules/communities/community.service'
import { PageHeader, Pagination } from '@/components/shared/page-header'
import { buttonStyles } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Input, Select } from '@/components/ui/field'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const dict = getDictionary(isLocale(locale) ? locale : 'ar')
  return { title: dict.meta.communitiesTitle }
}

export default async function CommunitiesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ q?: string; topic?: string; page?: string; mine?: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const dict = getDictionary(locale)
  const query = await searchParams

  const viewer = await getSessionUser()
  const topic =
    query.topic && (TOPICS as readonly string[]).includes(query.topic)
      ? (query.topic as Topic)
      : undefined
  const onlyMine = query.mine === '1' && Boolean(viewer)
  const page = Number.parseInt(query.page ?? '1', 10) || 1

  const result = await listCommunities({
    page,
    limit: 12,
    topic,
    search: query.q,
    onlyMine,
    viewerId: viewer?.id,
  })

  const canCreate = Boolean(
    viewer && viewer.status === 'active' && viewer.ageBand !== 'teen' && viewer.ageBand !== 'child',
  )

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-10 sm:px-6 sm:py-14">
      <PageHeader
        eyebrow={dict.nav.discover}
        title={dict.communities.title}
        description={dict.communities.subtitle}
        actions={
          canCreate ? (
            <Link href={`/${locale}/communities/new`} className={buttonStyles('primary', 'md')}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              {dict.communities.create}
            </Link>
          ) : null
        }
      />

      <form
        method="get"
        className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 shadow-sm sm:flex-row sm:items-center"
      >
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
        <Select
          name="topic"
          defaultValue={topic ?? ''}
          aria-label={dict.communities.topic}
          className="sm:w-56"
        >
          <option value="">{dict.communities.allTopics}</option>
          {TOPICS.map((item) => (
            <option key={item} value={item}>
              {dict.communities.topicOptions[item]}
            </option>
          ))}
        </Select>
        {viewer ? (
          <label className="flex items-center gap-2 px-1 text-sm whitespace-nowrap">
            <input type="checkbox" name="mine" value="1" defaultChecked={onlyMine} />
            {dict.communities.myCommunities}
          </label>
        ) : null}
        <button type="submit" className={buttonStyles('secondary', 'md')}>
          {dict.common.search}
        </button>
      </form>

      {result.items.length === 0 ? (
        <EmptyState
          icon={<Compass className="h-8 w-8" aria-hidden="true" />}
          title={dict.communities.empty}
          description={dict.communities.emptyHint}
          action={
            canCreate ? (
              <Link href={`/${locale}/communities/new`} className={buttonStyles('primary', 'sm')}>
                {dict.communities.createFirst}
              </Link>
            ) : null
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {result.items.map((community) => (
            <Card key={community.id} className="transition-shadow hover:shadow-md">
              <CardContent className="flex h-full flex-col gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant={community.visibility === 'private' ? 'warning' : 'success'}>
                    {community.visibility === 'private'
                      ? dict.communities.privateBadge
                      : dict.communities.open}
                  </Badge>
                  {community.topic ? (
                    <Badge variant="neutral">
                      {dict.communities.topicOptions[community.topic]}
                    </Badge>
                  ) : null}
                  {community.status !== 'active' ? (
                    <Badge variant="danger">
                      {community.status === 'archived'
                        ? dict.common.archived
                        : dict.common.suspended}
                    </Badge>
                  ) : null}
                </div>

                <Link
                  href={`/${locale}/communities/${community.slug}`}
                  className="text-lg font-semibold hover:text-primary"
                >
                  {community.name}
                </Link>
                <p className="line-clamp-3 flex-1 text-sm text-muted-foreground">
                  {community.description}
                </p>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" aria-hidden="true" />
                    {format(dict.communities.memberCount, {
                      count: formatNumber(community.memberCount, locale),
                    })}
                  </span>
                  <span>
                    {format(dict.communities.postCount, {
                      count: formatNumber(community.postCount, locale),
                    })}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Pagination
        basePath={`/${locale}/communities`}
        page={result.page}
        totalItems={result.total}
        limit={result.limit}
        searchParams={{ q: query.q, topic, mine: onlyMine ? '1' : undefined }}
        labels={{
          previous: dict.common.previous,
          next: dict.common.next,
          pageOf: dict.common.pageOf,
        }}
      />
    </div>
  )
}
