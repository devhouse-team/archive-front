import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { setActivePinia } from 'pinia'
import type { Pinia } from 'pinia'
import LoginPage from '~/pages/login.vue'
import { useAuthStore } from '~/stores/auth'
import type { User } from '~/types/api'
import { ApiError } from '~/utils/api-error'

const { navigateToMock } = vi.hoisted(() => ({ navigateToMock: vi.fn() }))
mockNuxtImport('navigateTo', () => navigateToMock)

const users = {
  archivist: { id: 2, username: 'archivist', full_name: 'Архивист Демо', role: 'archivist', role_ru: 'Архивист' },
  operator: { id: 3, username: 'operator', full_name: 'Оператор Демо', role: 'operator', role_ru: 'Оператор' },
} as const

let lastBody: { username?: string, password?: string } = {}

// The page talks to the auth store; its login() is replaced so the test needs no server.
beforeEach(() => {
  setActivePinia(useNuxtApp().$pinia as Pinia)
  const auth = useAuthStore()
  auth.clear()
  navigateToMock.mockReset()
  lastBody = {}
  vi.spyOn(auth, 'login').mockImplementation(async (username: string, password: string) => {
    lastBody = { username, password }
    const u = users[username as keyof typeof users] as User | undefined
    if (!u || password !== username) throw new ApiError(401, 'unauthorized', 'Неверный логин или пароль', 'Неверный логин или пароль')
    auth.setUser(u)
    return u
  })
})

async function submit(w: Awaited<ReturnType<typeof mountSuspended>>, username: string, password: string) {
  await w.get('input[autocomplete="username"]').setValue(username)
  await w.get('input[autocomplete="current-password"]').setValue(password)
  await w.get('form').trigger('submit')
  await vi.waitFor(() => expect(lastBody.username).toBe(username))
  await flushPromises()
}

describe('login', () => {
  it('follows a safe ?next= after sign-in', async () => {
    const w = await mountSuspended(LoginPage, { route: '/login?next=/page/9?hl=мектеп' })
    await submit(w, 'archivist', 'archivist')
    await vi.waitFor(() => expect(navigateToMock).toHaveBeenCalled())
    expect(navigateToMock).toHaveBeenCalledWith('/page/9?hl=мектеп', { replace: true })
  })

  it('ignores an external ?next= and goes to the role start route', async () => {
    const w = await mountSuspended(LoginPage, { route: '/login?next=//evil.example' })
    await submit(w, 'operator', 'operator')
    await vi.waitFor(() => expect(navigateToMock).toHaveBeenCalled())
    expect(navigateToMock).toHaveBeenCalledWith('/ops', { replace: true })
  })

  it('keeps the submit button enabled and validates on submit with field messages', async () => {
    const w = await mountSuspended(LoginPage, { route: '/login' })
    const button = w.get('button[type="submit"]')
    expect(button.attributes('disabled')).toBeUndefined()
    await w.get('form').trigger('submit')
    await vi.waitFor(() => expect(w.text()).toContain('Введите логин'))
    expect(w.text()).toContain('Введите пароль')
    expect(lastBody).toEqual({})
  })

  it('shows the server detail inline on a wrong password', async () => {
    const w = await mountSuspended(LoginPage, { route: '/login' })
    await submit(w, 'archivist', 'wrong')
    await vi.waitFor(() => expect(w.find('[role="alert"]').exists()).toBe(true))
    expect(w.get('[role="alert"]').text()).toContain('Неверный логин или пароль')
    expect(useAuthStore().me).toBeNull()
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('demo chips sign in with one click, one per role', async () => {
    const w = await mountSuspended(LoginPage, { route: '/login' })
    const chips = w.findAll('button[aria-label^="Войти как"]')
    expect(chips.map(c => c.text())).toEqual(['Администратор', 'Архивист', 'Оператор', 'Читатель'])
    await chips[1]!.trigger('click')
    await vi.waitFor(() => expect(navigateToMock).toHaveBeenCalledWith('/search', { replace: true }))
    expect(lastBody).toEqual({ username: 'archivist', password: 'archivist' })
  })
})
