'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import { Archive, Check, ShieldOff, X } from 'lucide-react'
import type { CommunityRole, MembershipStatus } from '@/shared/constants'
import { apiRequest, errorMessage } from '@/components/shared/api-client'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Select } from '@/components/ui/field'
import { formatDate } from '@/shared/utils/format'
import type { Locale } from '@/i18n/config'

export interface ManagedMember {
  membershipId: string
  role: CommunityRole
  status: MembershipStatus
  joinedAt?: string
  user: {
    id: string
    username: string
    name: string
    avatarUrl?: string
  } | null
}

export interface MembershipManagerLabels {
  membersTitle: string
  pendingRequests: string
  noPendingRequests: string
  approve: string
  reject: string
  removeMember: string
  changeRole: string
  roleUpdated: string
  approveSuccess: string
  rejectSuccess: string
  archiveCommunity: string
  archiveSuccess: string
  genericError: string
  errors: Record<string, string>
  roleLabels: Record<CommunityRole, string>
}

export function MembershipManager({
  locale,
  communityId,
  members,
  pending,
  isOwner,
  isAdmin,
  labels,
}: {
  locale: Locale
  communityId: string
  members: ManagedMember[]
  pending: ManagedMember[]
  isOwner: boolean
  isAdmin: boolean
  labels: MembershipManagerLabels
}) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function act(
    key: string,
    url: string,
    method: 'POST' | 'PATCH',
    body?: Record<string, unknown>,
    success?: string,
  ) {
    setBusy(key)
    setError(null)
    setMessage(null)
    const result = await apiRequest(url, {
      method,
      body: body ? JSON.stringify(body) : undefined,
    })
    setBusy(null)
    if (!result.ok) {
      setError(errorMessage(result.error.code, labels.errors, labels.genericError))
      return
    }
    setMessage(success ?? null)
    router.refresh()
  }

  async function archive() {
    if (!window.confirm(labels.archiveCommunity)) return
    await act(
      'archive',
      `/api/communities/${communityId}/archive`,
      'POST',
      undefined,
      labels.archiveSuccess,
    )
  }

  return (
    <section className="space-y-6 rounded-lg border border-border bg-surface p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{labels.membersTitle}</h2>
        {isOwner || isAdmin ? (
          <Button variant="outline" size="sm" onClick={archive} loading={busy === 'archive'}>
            <Archive className="h-4 w-4" aria-hidden="true" />
            {labels.archiveCommunity}
          </Button>
        ) : null}
      </div>

      {error ? <Alert variant="danger">{error}</Alert> : null}
      {message ? <Alert variant="success">{message}</Alert> : null}

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground">{labels.pendingRequests}</h3>
        {pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">{labels.noPendingRequests}</p>
        ) : (
          <ul className="divide-y divide-border">
            {pending.map((member) => (
              <li key={member.membershipId} className="flex flex-wrap items-center gap-3 py-3">
                <MemberIdentity member={member} locale={locale} />
                <div className="ms-auto flex items-center gap-2">
                  <Button
                    size="sm"
                    loading={busy === `approve:${member.membershipId}`}
                    onClick={() =>
                      act(
                        `approve:${member.membershipId}`,
                        `/api/memberships/${member.membershipId}/approve`,
                        'POST',
                        { decision: 'approve' },
                        labels.approveSuccess,
                      )
                    }
                  >
                    <Check className="h-4 w-4" aria-hidden="true" />
                    {labels.approve}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    loading={busy === `reject:${member.membershipId}`}
                    onClick={() =>
                      act(
                        `reject:${member.membershipId}`,
                        `/api/memberships/${member.membershipId}/approve`,
                        'POST',
                        { decision: 'reject' },
                        labels.rejectSuccess,
                      )
                    }
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                    {labels.reject}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground">{labels.membersTitle}</h3>
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground">{labels.noPendingRequests}</p>
        ) : (
          <ul className="divide-y divide-border">
            {members.map((member) => (
              <li key={member.membershipId} className="flex flex-wrap items-center gap-3 py-3">
                <MemberIdentity member={member} locale={locale} />
                <div className="ms-auto flex flex-wrap items-center gap-2">
                  {member.role === 'owner' ? (
                    <Badge variant="accent">{labels.roleLabels.owner}</Badge>
                  ) : (
                    <>
                      {isOwner || isAdmin ? (
                        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span className="sr-only">{labels.changeRole}</span>
                          <Select
                            value={member.role}
                            disabled={busy === `role:${member.membershipId}`}
                            onChange={(event) =>
                              act(
                                `role:${member.membershipId}`,
                                `/api/memberships/${member.membershipId}/role`,
                                'PATCH',
                                { role: event.target.value },
                                labels.roleUpdated,
                              )
                            }
                            className="h-8 w-32 text-xs"
                          >
                            <option value="member">{labels.roleLabels.member}</option>
                            <option value="moderator">{labels.roleLabels.moderator}</option>
                          </Select>
                        </label>
                      ) : (
                        <Badge variant="neutral">{labels.roleLabels[member.role]}</Badge>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-danger"
                        loading={busy === `ban:${member.membershipId}`}
                        onClick={() =>
                          act(
                            `ban:${member.membershipId}`,
                            `/api/memberships/${member.membershipId}/ban`,
                            'POST',
                          )
                        }
                      >
                        <ShieldOff className="h-4 w-4" aria-hidden="true" />
                        {labels.removeMember}
                      </Button>
                    </>
                  )}
                  {member.joinedAt ? (
                    <span className="text-xs text-muted-foreground">
                      {formatDate(member.joinedAt, locale)}
                    </span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

function MemberIdentity({ member, locale }: { member: ManagedMember; locale: Locale }) {
  if (!member.user) {
    return <span className="text-sm text-muted-foreground">—</span>
  }
  return (
    <Link
      href={`/${locale}/u/${member.user.username}`}
      className="flex min-w-0 items-center gap-2 hover:underline"
    >
      <Avatar name={member.user.name} src={member.user.avatarUrl} size="sm" />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{member.user.name}</span>
        <span className="block truncate text-xs text-muted-foreground" dir="ltr">
          @{member.user.username}
        </span>
      </span>
    </Link>
  )
}
