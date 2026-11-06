import { describe, expect, it } from 'vitest'
import { authenticateUser, changeUserPassword, registerUser } from '@/modules/identity/auth.service'
import { setupTestDatabase } from '../helpers/db'

setupTestDatabase()

const STRONG_PASSWORD = 'BunyanDemo!2026'

describe('registration and authentication', () => {
  it('registers an adult learner with a hashed password', async () => {
    const user = await registerUser({
      name: 'New Learner',
      username: 'new_learner',
      email: 'new@test.local',
      password: STRONG_PASSWORD,
      birthYear: 1995,
    })

    expect(user.ageBand).toBe('adult')
    expect(user.role).toBe('learner')
    expect(user.status).toBe('active')
    expect(user.passwordHash).not.toBe(STRONG_PASSWORD)
    expect(user.passwordHash.startsWith('$2')).toBe(true)
  })

  it('classifies 13–17 year olds as teens', async () => {
    const birthYear = new Date().getUTCFullYear() - 15
    const user = await registerUser({
      name: 'Teen Learner',
      username: 'teen_learner',
      email: 'teen@test.local',
      password: STRONG_PASSWORD,
      birthYear,
    })
    expect(user.ageBand).toBe('teen')
    expect(user.guardianConsentAt).toBeUndefined()
  })

  it('blocks self-registration for children under 13', async () => {
    const birthYear = new Date().getUTCFullYear() - 10
    await expect(
      registerUser({
        name: 'Child Learner',
        username: 'child_learner',
        email: 'child@test.local',
        password: STRONG_PASSWORD,
        birthYear,
      }),
    ).rejects.toMatchObject({ code: 'MINOR_NOT_ALLOWED' })
  })

  it('rejects duplicate emails and usernames', async () => {
    const base = {
      name: 'Duplicate User',
      username: 'duplicate_user',
      email: 'duplicate@test.local',
      password: STRONG_PASSWORD,
      birthYear: 1990,
    }
    await registerUser(base)

    await expect(registerUser({ ...base, username: 'other_user' })).rejects.toMatchObject({
      code: 'EMAIL_TAKEN',
    })
    await expect(registerUser({ ...base, email: 'other@test.local' })).rejects.toMatchObject({
      code: 'USERNAME_TAKEN',
    })
  })

  it('authenticates only with the correct password', async () => {
    await registerUser({
      name: 'Login User',
      username: 'login_user',
      email: 'login@test.local',
      password: STRONG_PASSWORD,
      birthYear: 1990,
    })

    const user = await authenticateUser({
      email: 'login@test.local',
      password: STRONG_PASSWORD,
    })
    expect(user.username).toBe('login_user')

    await expect(
      authenticateUser({ email: 'login@test.local', password: 'WrongPassword!2026' }),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' })
  })

  it('rotates the session version and password when the password changes', async () => {
    const user = await registerUser({
      name: 'Password User',
      username: 'password_user',
      email: 'password@test.local',
      password: STRONG_PASSWORD,
      birthYear: 1990,
    })
    expect(user.sessionVersion).toBe(0)

    const updated = await changeUserPassword(user.id, STRONG_PASSWORD, 'ReplacedPass!2026')
    expect(updated.sessionVersion).toBe(1)

    await expect(
      authenticateUser({ email: 'password@test.local', password: STRONG_PASSWORD }),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' })

    const authenticated = await authenticateUser({
      email: 'password@test.local',
      password: 'ReplacedPass!2026',
    })
    expect(authenticated.id).toBe(user.id)
  })

  it('refuses a password change with the wrong current password', async () => {
    const user = await registerUser({
      name: 'Wrong Current',
      username: 'wrong_current',
      email: 'wrong-current@test.local',
      password: STRONG_PASSWORD,
      birthYear: 1990,
    })

    await expect(
      changeUserPassword(user.id, 'NotThePassword!1', 'ReplacedPass!2026'),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' })
  })
})
