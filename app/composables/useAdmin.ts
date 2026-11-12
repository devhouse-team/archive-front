import type { Role } from '~/types/api'
import { isRole } from '~/utils/access'
import { translate } from '~/composables/useT'

// Stage 8 helpers for /admin. The user form validation is pure so it is unit-tested (brief 8 §5).

export const PASSWORD_MIN = 4
export const FULL_NAME_MAX = 100
const USERNAME = /^[a-z0-9._-]{3,32}$/i

export interface UserFormState {
  username: string
  password: string
  role: Role | undefined
  full_name: string
}

export interface FieldError {
  name: keyof UserFormState
  message: string
}

export function validatePassword(password: string): string | null {
  if (!password) return translate('admin.form.passwordRequired')
  if (password.length < PASSWORD_MIN) return translate('admin.form.passwordShort', { min: PASSWORD_MIN })
  return null
}

/**
 * Create-user form rules. `taken` holds the usernames already in the table, so a duplicate is caught before
 * the request (the backend's 400 detail still shows if it disagrees).
 */
export function validateUserForm(state: UserFormState, taken: readonly string[] = []): FieldError[] {
  const errors: FieldError[] = []
  const username = state.username.trim()
  if (!username) errors.push({ name: 'username', message: translate('admin.form.usernameRequired') })
  else if (!USERNAME.test(username)) errors.push({ name: 'username', message: translate('admin.form.usernameFormat') })
  else if (taken.some(u => u.toLowerCase() === username.toLowerCase())) errors.push({ name: 'username', message: translate('admin.form.usernameTaken') })

  const password = validatePassword(state.password)
  if (password) errors.push({ name: 'password', message: password })

  if (!isRole(state.role)) errors.push({ name: 'role', message: translate('admin.form.roleRequired') })

  if (state.full_name.trim().length > FULL_NAME_MAX) {
    errors.push({ name: 'full_name', message: translate('admin.form.fullNameLong', { max: FULL_NAME_MAX }) })
  }
  return errors
}

/** Seconds as «2,7 с» for worker heartbeats. */
export function adminAge(seconds: number): string {
  const s = seconds < 10 ? seconds.toFixed(1).replace('.', ',') : String(Math.round(seconds))
  return translate('admin.health.seconds', { s })
}
