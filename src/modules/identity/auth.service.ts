import { connectToDatabase } from '@/infrastructure/database/mongoose'
import { AppError } from '@/shared/errors/app-error'
import {
  ageBandFromBirthYear,
  hashPassword,
  passwordIssue,
  verifyPassword,
  DUMMY_PASSWORD_HASH,
} from './password'
import { UserModel, type UserDocument } from './user.model'
import type { LoginInput, RegisterInput } from './validation'

export interface RegisterResult {
  user: UserDocument
}

const DUPLICATE_KEY = 11000

export async function registerUser(input: RegisterInput): Promise<UserDocument> {
  await connectToDatabase()

  const ageBand = ageBandFromBirthYear(input.birthYear)
  if (ageBand === 'child') {
    throw new AppError('MINOR_NOT_ALLOWED')
  }

  const issue = passwordIssue(input.password)
  if (issue) throw new AppError('WEAK_PASSWORD', issue)

  const existing = await UserModel.findOne({
    $or: [{ email: input.email }, { username: input.username }],
  })
    .select('email username')
    .lean<{ email: string; username: string } | null>()

  if (existing) {
    if (existing.email === input.email) throw new AppError('EMAIL_TAKEN')
    throw new AppError('USERNAME_TAKEN')
  }

  const passwordHash = await hashPassword(input.password)

  try {
    const user = await UserModel.create({
      name: input.name,
      username: input.username,
      email: input.email,
      passwordHash,
      birthYear: input.birthYear,
      ageBand,
      role: 'learner',
    })
    return user
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      const keyPattern = (error as { keyPattern?: Record<string, unknown> }).keyPattern ?? {}
      if (keyPattern.email) throw new AppError('EMAIL_TAKEN')
      throw new AppError('USERNAME_TAKEN')
    }
    throw error
  }
}

export async function authenticateUser(input: LoginInput): Promise<UserDocument> {
  await connectToDatabase()

  const user = await UserModel.findOne({ email: input.email }).select('+passwordHash')
  if (!user) {
    // Constant-ish time: perform a hash comparison so a missing account is not distinguishable.
    await verifyPassword(input.password, DUMMY_PASSWORD_HASH)
    throw new AppError('INVALID_CREDENTIALS')
  }

  const valid = await verifyPassword(input.password, user.passwordHash)
  if (!valid) throw new AppError('INVALID_CREDENTIALS')

  if (user.status === 'suspended') throw new AppError('ACCOUNT_SUSPENDED')
  if (user.status === 'deleted') throw new AppError('INVALID_CREDENTIALS')

  return user
}

export async function changeUserPassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<UserDocument> {
  await connectToDatabase()

  const user = await UserModel.findById(userId).select('+passwordHash')
  if (!user) throw new AppError('UNAUTHORIZED')

  const valid = await verifyPassword(currentPassword, user.passwordHash)
  if (!valid) throw new AppError('INVALID_CREDENTIALS', 'Current password is incorrect')

  const issue = passwordIssue(newPassword)
  if (issue) throw new AppError('WEAK_PASSWORD', issue)

  user.passwordHash = await hashPassword(newPassword)
  user.sessionVersion += 1
  await user.save()

  return user
}

export function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: number }).code === DUPLICATE_KEY
  )
}
