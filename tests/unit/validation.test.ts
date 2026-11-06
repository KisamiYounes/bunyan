import { describe, expect, it } from 'vitest'
import {
  changePasswordSchema,
  loginSchema,
  registerSchema,
  updateProfileSchema,
} from '@/modules/identity/validation'
import {
  createCommentSchema,
  createCommunitySchema,
  createPostSchema,
  updateMemberRoleSchema,
} from '@/modules/communities/validation'
import {
  adminCommunityActionSchema,
  adminUserActionSchema,
  createReportSchema,
  resolveReportSchema,
} from '@/modules/admin/validation'

describe('identity contracts', () => {
  it('normalises email and username during registration', () => {
    const parsed = registerSchema.parse({
      name: '  Sara Ali ',
      username: '  Sara_Ali ',
      email: '  Sara@Example.COM ',
      password: 'BunyanDemo!2026',
      birthYear: '1995',
    })
    expect(parsed.username).toBe('sara_ali')
    expect(parsed.email).toBe('sara@example.com')
    expect(parsed.birthYear).toBe(1995)
  })

  it('rejects non-Latin usernames and short passwords', () => {
    expect(
      registerSchema.safeParse({
        name: 'مستخدم',
        username: 'مستخدم',
        email: 'a@b.co',
        password: 'BunyanDemo!2026',
      }).success,
    ).toBe(false)
    expect(
      registerSchema.safeParse({
        name: 'User',
        username: 'valid_name',
        email: 'a@b.co',
        password: 'short',
      }).success,
    ).toBe(false)
  })

  it('requires passwords to match on change', () => {
    expect(
      changePasswordSchema.safeParse({
        currentPassword: 'BunyanDemo!2026',
        newPassword: 'NewBunyan!2026',
        confirmPassword: 'Different!2026',
      }).success,
    ).toBe(false)
  })

  it('accepts only https avatar URLs', () => {
    const base = {
      name: 'Sara',
      username: 'sara',
      bio: '',
      locale: 'ar',
      profileVisibility: 'public',
    }
    expect(
      updateProfileSchema.safeParse({ ...base, avatarUrl: 'http://insecure.test/a.png' }).success,
    ).toBe(false)
    expect(
      updateProfileSchema.safeParse({ ...base, avatarUrl: 'https://cdn.test/a.png' }).success,
    ).toBe(true)
  })

  it('accepts a login payload with any non-empty password length', () => {
    expect(loginSchema.safeParse({ email: 'a@b.co', password: 'x' }).success).toBe(true)
  })
})

describe('community contracts', () => {
  const community = {
    name: 'Programming Basics',
    slug: 'programming-basics',
    description: 'A place to learn programming fundamentals together.',
    visibility: 'public',
    language: 'ar',
  }

  it('accepts a valid community and defaults the language', () => {
    const parsed = createCommunitySchema.parse({ ...community, language: undefined })
    expect(parsed.language).toBe('ar')
  })

  it('rejects invalid slugs, short descriptions and unknown topics', () => {
    expect(createCommunitySchema.safeParse({ ...community, slug: 'Bad Slug' }).success).toBe(false)
    expect(createCommunitySchema.safeParse({ ...community, description: 'short' }).success).toBe(
      false,
    )
    expect(createCommunitySchema.safeParse({ ...community, topic: 'astrology' }).success).toBe(
      false,
    )
  })

  it('enforces post and comment length limits', () => {
    expect(createPostSchema.safeParse({ body: 'hello' }).success).toBe(true)
    expect(createPostSchema.safeParse({ body: '' }).success).toBe(false)
    expect(createCommentSchema.safeParse({ body: 'x'.repeat(3001) }).success).toBe(false)
    expect(updateMemberRoleSchema.safeParse({ role: 'owner' }).success).toBe(false)
  })
})

describe('moderation contracts', () => {
  it('accepts known report targets and reasons only', () => {
    expect(
      createReportSchema.safeParse({
        targetType: 'post',
        targetId: 'abc',
        reason: 'spam',
      }).success,
    ).toBe(true)
    expect(
      createReportSchema.safeParse({
        targetType: 'payment',
        targetId: 'abc',
        reason: 'spam',
      }).success,
    ).toBe(false)
    expect(
      createReportSchema.safeParse({
        targetType: 'post',
        targetId: 'abc',
        reason: 'dislike',
      }).success,
    ).toBe(false)
  })

  it('allows only the documented admin actions', () => {
    expect(resolveReportSchema.safeParse({ status: 'escalated' }).success).toBe(true)
    expect(resolveReportSchema.safeParse({ status: 'open' }).success).toBe(false)
    expect(adminUserActionSchema.safeParse({ action: 'delete' }).success).toBe(false)
    expect(adminCommunityActionSchema.safeParse({ action: 'suspend' }).success).toBe(true)
  })
})
