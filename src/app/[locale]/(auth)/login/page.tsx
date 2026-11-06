import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionaries'
import { LoginForm } from '@/components/auth/login-form'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const dict = getDictionary(isLocale(locale) ? locale : 'ar')
  return { title: dict.meta.loginTitle }
}

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ next?: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const { next } = await searchParams
  const dict = getDictionary(locale)

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold">{dict.auth.loginTitle}</h1>
        <p className="text-sm text-muted-foreground">{dict.auth.loginSubtitle}</p>
      </div>

      <LoginForm
        locale={locale}
        next={next}
        labels={{
          email: dict.auth.email,
          password: dict.auth.password,
          submit: dict.auth.submitLogin,
          noAccount: dict.auth.noAccount,
          registerLink: dict.auth.registerLink,
          genericError: dict.errors.generic,
          errors: dict.errors,
        }}
      />

      <p className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
        {dict.auth.demoHint}
      </p>
    </div>
  )
}
