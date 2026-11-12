// Production only (registered in nuxt.config.ts): forwards /api/** and /mock-eais/** to the backend, so a build
// served on its own (Vercel, `pnpm preview`) talks to the API same-origin and the session cookie keeps working.
// The backend URL is read at runtime from API_BASE_URL (set it in the Vercel project's environment variables).
// In dev, nitro.devProxy does this instead.
import { createError, defineEventHandler, getRequestURL, proxyRequest } from 'h3'

export default defineEventHandler((event) => {
  const base = (process.env.API_BASE_URL || process.env.NUXT_API_BASE_URL || process.env.ARCHIVE_BACKEND_URL || '')
    .replace(/\/+$/, '')
    .replace(/\/api$/, '') // tolerate a URL given with the /api suffix
  if (!base) {
    throw createError({ statusCode: 502, statusMessage: 'API_BASE_URL is not set', data: { detail: 'Сервер архива не настроен.' } })
  }
  const url = getRequestURL(event)
  return proxyRequest(event, `${base}${url.pathname}${url.search}`, {
    // A free ngrok tunnel answers browser-like requests with an HTML warning page unless this header is set;
    // other backends ignore it.
    headers: { 'ngrok-skip-browser-warning': '1' },
  })
})
