import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { isLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionaries'
import { getSessionUser } from '@/modules/identity/session'
import { PageHeader } from '@/components/shared/page-header'
import { ProfileForm } from '@/components/profile/profile-form'
import { PasswordForm } from '@/components/profile/password-form'
import { Alert } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const dict = getDictionary(isLocale(locale) ? locale : 'ar')
  return { title: dict.meta.settingsTitle }
}

export default async function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const dict = getDictionary(locale)

  const viewer = await getSessionUser()
  if (!viewer) redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/settings`)}`)

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-10 sm:px-6 sm:py-14">
      <PageHeader title={dict.settings.title} description={dict.settings.subtitle} />

      <Card>
        <CardHeader>
          <CardTitle>{dict.settings.profileSection}</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm
            initial={{
              name: viewer.name,
              username: viewer.username,
              bio: viewer.bio,
              avatarUrl: viewer.avatarUrl ?? '',
              locale: viewer.locale,
              profileVisibility: viewer.profileVisibility,
            }}
            labels={{
              name: dict.settings.name,
              username: dict.settings.username,
              bio: dict.settings.bio,
              avatarUrl: dict.settings.avatarUrl,
              avatarHint: dict.settings.avatarHint,
              locale: dict.settings.locale,
              profileVisibility: dict.settings.profileVisibility,
              visibilityPublic: dict.settings.visibilityPublic,
              visibilityMembers: dict.settings.visibilityMembers,
              save: dict.settings.save,
              saving: dict.common.saving,
              saved: dict.settings.saved,
              genericError: dict.errors.generic,
              errors: dict.errors,
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{dict.settings.passwordSection}</CardTitle>
        </CardHeader>
        <CardContent>
          <PasswordForm
            labels={{
              currentPassword: dict.settings.currentPassword,
              newPassword: dict.settings.newPassword,
              confirmNewPassword: dict.settings.confirmNewPassword,
              submit: dict.settings.changePassword,
              submitting: dict.common.saving,
              success: dict.settings.passwordChanged,
              genericError: dict.errors.generic,
              errors: dict.errors,
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{dict.settings.dangerZone}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm font-medium">{dict.settings.deleteAccount}</p>
          <p className="text-sm text-muted-foreground">{dict.settings.deleteAccountHint}</p>
          <Alert variant="info">{dict.settings.deleteDisabled}</Alert>
        </CardContent>
      </Card>
    </div>
  )
}
