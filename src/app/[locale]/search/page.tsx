import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BookOpen, ScrollText, Search, Users } from 'lucide-react'
import { isLocale } from '@/i18n/config'
import { getDictionary, format } from '@/i18n/dictionaries'
import { searchPlatform } from '@/modules/library/library.service'
import { PageHeader } from '@/components/shared/page-header'
import { buttonStyles } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/field'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const dict = getDictionary(isLocale(locale) ? locale : 'ar')
  return { title: dict.meta.searchTitle }
}

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ q?: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const dict = getDictionary(locale)
  const { q } = await searchParams
  const query = (q ?? '').trim()
  const results = query ? await searchPlatform(query) : null

  const total = results
    ? results.courses.length + results.publications.length + results.communities.length
    : 0

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 px-4 py-10 sm:px-6 sm:py-14">
      <PageHeader
        eyebrow={dict.nav.discover}
        title={dict.search.title}
        description={dict.search.subtitle}
      />

      <form
        method="get"
        className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 shadow-sm sm:flex-row sm:items-center"
        role="search"
      >
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            name="q"
            defaultValue={query}
            placeholder={dict.search.placeholder}
            aria-label={dict.common.search}
            className="ps-9"
            autoFocus
          />
        </div>
        <button type="submit" className={buttonStyles('primary', 'md')}>
          {dict.search.submit}
        </button>
      </form>

      {!query ? (
        <EmptyState
          icon={<Search className="h-8 w-8" aria-hidden="true" />}
          title={dict.search.startTyping}
        />
      ) : total === 0 ? (
        <EmptyState
          icon={<Search className="h-8 w-8" aria-hidden="true" />}
          title={dict.search.empty}
          description={dict.search.emptyHint}
        />
      ) : (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">
            {format(dict.search.resultsFor, { query })}
          </p>

          {results && results.courses.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="inline-flex items-center gap-2">
                  <BookOpen className="h-5 w-5" aria-hidden="true" />
                  {dict.search.courses}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="divide-y divide-border">
                  {results.courses.map((course) => (
                    <li key={course.id} className="py-3">
                      <Link
                        href={`/${locale}/courses/${course.slug}`}
                        className="block font-medium hover:text-primary"
                      >
                        {course.title}
                      </Link>
                      <p className="line-clamp-2 text-sm text-muted-foreground">{course.summary}</p>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          {results && results.publications.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="inline-flex items-center gap-2">
                  <ScrollText className="h-5 w-5" aria-hidden="true" />
                  {dict.search.publications}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="divide-y divide-border">
                  {results.publications.map((publication) => (
                    <li key={publication.id} className="py-3">
                      <Link
                        href={`/${locale}/publications/${publication.slug}`}
                        className="block font-medium hover:text-primary"
                      >
                        {publication.title}
                      </Link>
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {publication.summary}
                      </p>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          {results && results.communities.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="inline-flex items-center gap-2">
                  <Users className="h-5 w-5" aria-hidden="true" />
                  {dict.search.communities}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="divide-y divide-border">
                  {results.communities.map((community) => (
                    <li key={community.id} className="py-3">
                      <Link
                        href={`/${locale}/communities/${community.slug}`}
                        className="block font-medium hover:text-primary"
                      >
                        {community.name}
                      </Link>
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {community.description}
                      </p>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}
    </div>
  )
}
