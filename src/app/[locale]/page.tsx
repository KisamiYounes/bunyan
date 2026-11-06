import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Compass,
  FlaskConical,
  GraduationCap,
  Library,
  Network,
  PenLine,
  Sparkles,
  Users,
} from 'lucide-react'
import { isLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionaries'
import { buttonStyles } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const principleIcons = [BookOpen, Compass, FlaskConical, Users, GraduationCap, Library]
const domainIcons = [
  Users,
  GraduationCap,
  Library,
  PenLine,
  FlaskConical,
  BadgeCheck,
  Network,
  Sparkles,
]

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const dict = getDictionary(locale)

  return (
    <div>
      <section className="relative overflow-hidden border-b border-border">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 [background-image:radial-gradient(circle_at_1px_1px,var(--border)_1px,transparent_0)] [background-size:24px_24px] opacity-60"
        />
        <div className="relative mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="max-w-3xl space-y-6">
            <Badge variant="accent">{dict.home.eyebrow}</Badge>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{dict.home.title}</h1>
            <p className="max-w-2xl text-lg text-muted-foreground">{dict.home.subtitle}</p>
            <div className="flex flex-wrap items-center gap-3">
              <Link href={`/${locale}/register`} className={buttonStyles('primary', 'lg')}>
                {dict.home.primaryCta}
                <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
              </Link>
              <Link href={`/${locale}/communities`} className={buttonStyles('outline', 'lg')}>
                {dict.home.secondaryCta}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[1fr_2fr]">
          <div>
            <h2 className="text-2xl font-semibold">{dict.home.missionTitle}</h2>
          </div>
          <p className="text-base text-muted-foreground sm:text-lg">{dict.home.missionBody}</p>
        </div>
      </section>

      <section className="border-y border-border bg-surface-muted/40">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-semibold">{dict.home.principlesTitle}</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {dict.home.principles.map((principle, index) => {
              const Icon = principleIcons[index] ?? Sparkles
              return (
                <Card key={principle.title}>
                  <CardContent className="space-y-2">
                    <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
                    <h3 className="text-base font-semibold">{principle.title}</h3>
                    <p className="text-sm text-muted-foreground">{principle.body}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold">{dict.home.domainsTitle}</h2>
          <p className="mt-2 text-muted-foreground">{dict.home.domainsSubtitle}</p>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {dict.home.domains.map((domain, index) => {
            const Icon = domainIcons[index] ?? Sparkles
            return (
              <Card key={domain.name}>
                <CardHeader>
                  <Icon className="h-5 w-5 text-accent" aria-hidden="true" />
                  <CardTitle className="text-base">{domain.name}</CardTitle>
                  <CardDescription>{domain.body}</CardDescription>
                </CardHeader>
              </Card>
            )
          })}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6">
        <Card className="overflow-hidden border-primary/25 bg-primary/5">
          <CardContent className="flex flex-col items-start gap-4 p-8 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold">{dict.home.ctaTitle}</h2>
              <p className="text-sm text-muted-foreground">{dict.home.ctaBody}</p>
            </div>
            <Link href={`/${locale}/register`} className={buttonStyles('primary', 'lg')}>
              {dict.home.ctaButton}
            </Link>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
