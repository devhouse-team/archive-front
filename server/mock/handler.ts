// Nitro handler for mock mode. Registered for /api/** and /mock-eais/** in nuxt.config.ts only when
// NUXT_PUBLIC_API_MOCK=1; otherwise the dev proxy forwards those paths to the real backend.
import { createMockApi } from './core'
import type { MockFixtures } from './core'
import fixtures from './fixtures.json'

// One in-memory state per server process: logins, corrections and collections persist until restart.
const api = createMockApi(fixtures as unknown as MockFixtures)

export default defineEventHandler(async (event) => {
  const url = getRequestURL(event)
  const method = event.method
  let body: unknown
  if (method !== 'GET' && method !== 'HEAD') {
    const type = getRequestHeader(event, 'content-type') ?? ''
    body = type.includes('application/json') ? await readBody(event).catch(() => undefined) : undefined
  }
  const query = Object.fromEntries(url.searchParams.entries())
  const res = api.handle({ method, path: url.pathname, query, body, session: getCookie(event, 'session') })

  setResponseStatus(event, res.status)
  if (res.setSession !== undefined) {
    if (res.setSession) setCookie(event, 'session', res.setSession, { httpOnly: true, sameSite: 'lax', path: '/' })
    else deleteCookie(event, 'session', { path: '/' })
  }
  for (const [k, v] of Object.entries(res.headers ?? {})) setResponseHeader(event, k, v)
  if (res.raw !== undefined) return res.raw
  return res.body ?? null
})
