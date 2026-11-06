import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, MessageSquare } from 'lucide-react'
import { isLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionaries'
import { formatDateTime, formatNumber } from '@/shared/utils/format'
import { isAppError } from '@/shared/errors/app-error'
import { getSessionUser } from '@/modules/identity/session'
import { getPostForViewer, listComments } from '@/modules/communities/post.service'
import {
  CommentForm,
  DeleteCommentButton,
  DeletePostButton,
  LikeButton,
} from '@/components/communities/actions'
import { ReportButton } from '@/components/communities/report-button'
import { Alert } from '@/components/ui/alert'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'

export default async function PostPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string; id: string }>
}) {
  const { locale, slug, id } = await params
  if (!isLocale(locale)) notFound()
  const dict = getDictionary(locale)
  const viewer = await getSessionUser()

  let data: Awaited<ReturnType<typeof getPostForViewer>>
  try {
    data = await getPostForViewer(id, viewer)
  } catch (error) {
    if (isAppError(error) && error.code === 'COMMUNITY_PRIVATE') {
      return (
        <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-12 sm:px-6">
          <Alert variant="warning">
            {dict.errors.communityPrivate}{' '}
            <Link
              href={`/${locale}/communities`}
              className="font-medium text-primary hover:underline"
            >
              {dict.common.back}
            </Link>
          </Alert>
        </div>
      )
    }
    notFound()
  }

  if (data.access.community.slug !== slug) notFound()

  const { post, access } = data
  const comments = await listComments(post.id, viewer)

  const reportLabels = {
    report: dict.communities.report,
    title: dict.posts.reportTitle,
    subtitle: dict.communities.reportSubtitle,
    reason: dict.communities.reportReason,
    details: dict.communities.reportDetails,
    detailsPlaceholder: dict.communities.reportDetailsPlaceholder,
    submit: dict.common.submit,
    submitting: dict.common.saving,
    cancel: dict.common.cancel,
    success: dict.communities.reportSuccess,
    genericError: dict.errors.generic,
    errors: dict.errors,
    reasons: dict.posts.reasons,
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-10 sm:px-6 sm:py-14">
      <Link
        href={`/${locale}/communities/${access.community.slug}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
        {dict.posts.backToCommunity}
      </Link>

      <article className="space-y-4 rounded-lg border border-border bg-surface p-5 shadow-sm sm:p-6">
        {post.status === 'removed' ? (
          <Badge variant="danger">{dict.posts.removedNotice}</Badge>
        ) : null}

        {post.title ? (
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{post.title}</h1>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {post.author ? (
            <Link
              href={`/${locale}/u/${post.author.username}`}
              className="flex items-center gap-2 hover:underline"
            >
              <Avatar name={post.author.name} src={post.author.avatarUrl} size="sm" />
              <span className="font-medium text-foreground">{post.author.name}</span>
            </Link>
          ) : (
            <span>{dict.common.unknown}</span>
          )}
          <span aria-hidden="true">·</span>
          <time dateTime={post.createdAt}>{formatDateTime(post.createdAt, locale)}</time>
        </div>

        <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{post.body}</p>

        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
          <LikeButton
            postId={post.id}
            liked={post.likedByMe}
            count={post.likeCount}
            labels={{
              like: dict.communities.like,
              liked: dict.communities.liked,
              genericError: dict.errors.generic,
              errors: dict.errors,
            }}
          />
          <span className="inline-flex items-center gap-1.5 px-2 py-1 text-sm text-muted-foreground">
            <MessageSquare className="h-4 w-4" aria-hidden="true" />
            {formatNumber(post.commentCount, locale)}
          </span>
          <div className="ms-auto flex flex-wrap items-center gap-1">
            {post.canDelete ? (
              <DeletePostButton
                postId={post.id}
                redirectTo={`/${locale}/communities/${access.community.slug}`}
                labels={{
                  deletePost: dict.communities.deletePost,
                  confirmDeletePost: dict.communities.confirmDeletePost,
                  genericError: dict.errors.generic,
                  errors: dict.errors,
                }}
              />
            ) : null}
            {viewer ? (
              <ReportButton targetType="post" targetId={post.id} labels={reportLabels} />
            ) : null}
          </div>
        </div>
      </article>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">
          {dict.posts.commentsTitle}{' '}
          <span className="text-sm font-normal text-muted-foreground">
            ({formatNumber(comments.length, locale)})
          </span>
        </h2>

        {comments.length === 0 ? (
          <EmptyState
            icon={<MessageSquare className="h-8 w-8" aria-hidden="true" />}
            title={dict.posts.noComments}
          />
        ) : (
          <ul className="space-y-3">
            {comments.map((comment) => (
              <li key={comment.id}>
                <Card>
                  <CardContent className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 text-sm">
                        {comment.author ? (
                          <Link
                            href={`/${locale}/u/${comment.author.username}`}
                            className="flex items-center gap-2 hover:underline"
                          >
                            <Avatar
                              name={comment.author.name}
                              src={comment.author.avatarUrl}
                              size="sm"
                            />
                            <span className="font-medium">{comment.author.name}</span>
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">{dict.common.unknown}</span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(comment.createdAt, locale)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {comment.canDelete ? (
                          <DeleteCommentButton
                            commentId={comment.id}
                            labels={{
                              deletePost: dict.common.delete,
                              genericError: dict.errors.generic,
                              errors: dict.errors,
                            }}
                          />
                        ) : null}
                        {viewer ? (
                          <ReportButton
                            targetType="comment"
                            targetId={comment.id}
                            labels={reportLabels}
                          />
                        ) : null}
                      </div>
                    </div>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{comment.body}</p>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}

        {access.canPost ? (
          <Card>
            <CardContent>
              <CommentForm
                postId={post.id}
                labels={{
                  placeholder: dict.communities.commentPlaceholder,
                  submit: dict.communities.comment,
                  submitting: dict.common.saving,
                  success: dict.posts.commentSuccess,
                  label: dict.posts.writeComment,
                  genericError: dict.errors.generic,
                  errors: dict.errors,
                }}
              />
            </CardContent>
          </Card>
        ) : (
          <Alert variant="info">
            {!viewer ? (
              <Link href={`/${locale}/login`} className="font-medium text-primary hover:underline">
                {dict.common.signIn}
              </Link>
            ) : (
              dict.errors.notMember
            )}
          </Alert>
        )}
      </section>
    </div>
  )
}
