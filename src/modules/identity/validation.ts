import { z } from 'zod'
import { locales } from '@/i18n/config'
import { MAX_BIO_LENGTH } from '@/shared/constants'

const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must be at most 30 characters')
  .regex(/^[a-z0-9_]+$/, 'Username may only contain Latin letters, numbers and underscores')

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(5)
  .max(254)
  .refine((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), 'Invalid email address')

export const passwordSchema = z
  .string()
  .min(10, 'Password must be at least 10 characters')
  .max(128, 'Password must be at most 128 characters')

const birthYearSchema = z.preprocess(
  (value) => (value === '' || value === null || value === undefined ? undefined : value),
  z.coerce
    .number()
    .int()
    .min(1900)
    .max(new Date().getUTCFullYear(), 'Birth year cannot be in the future')
    .optional(),
)

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name is too short').max(80),
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
  birthYear: birthYearSchema,
})

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required').max(128),
})

const avatarUrlSchema = z.preprocess(
  (value) => (value === '' || value === null ? undefined : value),
  z
    .string()
    .trim()
    .max(500)
    .refine((value) => {
      try {
        return new URL(value).protocol === 'https:'
      } catch {
        return false
      }
    }, 'Avatar must be a valid https URL')
    .optional(),
)

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  username: usernameSchema,
  bio: z.string().trim().max(MAX_BIO_LENGTH).optional().default(''),
  avatarUrl: avatarUrlSchema,
  locale: z.enum(locales),
  profileVisibility: z.enum(['public', 'members']),
})

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(128),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1).max(128),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
