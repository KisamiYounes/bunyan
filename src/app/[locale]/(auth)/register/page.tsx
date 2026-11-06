import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionaries'
import { RegisterForm } from '@/components/auth/register-form'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const dict = getDictionary(isLocale(locale) ? locale : 'ar')
  return { title: dict.meta.registerTitle }
}

export default async function RegisterPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const dict = getDictionary(locale)

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold">{dict.auth.registerTitle}</h1>
        <p className="text-sm text-muted-foreground">{dict.auth.registerSubtitle}</p>
      </div>

      <RegisterForm
        locale={locale}
        labels={{
          name: dict.auth.name,
          username: dict.auth.username,
          email: dict.auth.email,
          password: dict.auth.password,
          birthYear: dict.auth.birthYear,
          birthYearHint: dict.auth.birthYearHint,
          submit: dict.auth.submitRegister,
          passwordHint: dict.auth.passwordHint,
          guardianNotice: dict.auth.guardianNotice,
          minorBlocked: dict.auth.minorBlocked,
          haveAccount: dict.auth.haveAccount,
          loginLink: dict.auth.loginLink,
          genericError: dict.errors.generic,
          errors: dict.errors,
        }}
      />
    </div>
  )
}
