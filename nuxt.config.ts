// https://nuxt.com/docs/api/configuration/nuxt-config
import { fileURLToPath } from 'node:url'

// Read at config time (Nuxt loads .env first; see .env.example): mock mode swaps the proxy for the
// in-memory Nitro mock (server/mock). API_BASE_URL is the backend that /api and /mock-eais are forwarded to;
// the browser always calls same-origin paths, so the session cookie keeps working (handoff §3).
// ARCHIVE_BACKEND_URL (the older name) is only ever set on the command line, so it wins over .env.
const apiMock = process.env.NUXT_PUBLIC_API_MOCK === '1'
const backend = (process.env.ARCHIVE_BACKEND_URL || process.env.API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '')
const backendProxy = fileURLToPath(new URL('./server/backend-proxy.ts', import.meta.url))
const mockHandler = fileURLToPath(new URL('./server/mock/handler.ts', import.meta.url))

// With icon provider 'none', @iconify/vue still ships its default API provider (api.iconify.design, api2…),
// so an icon missing from the client bundle would be fetched from the internet. Point every built-in
// Iconify endpoint at a dead same-origin path instead: a missing icon then 404s locally and shows up in the console.
const ICON_API = /https:\/\/(?:api2?\.iconify\.design|api\.simplesvg\.com|api\.unisvg\.com)/
const OFFLINE_ICON_API = '/_offline-no-icon-api'
const offlineIconify = {
  name: 'archive:offline-iconify',
  enforce: 'pre' as const,
  transform(code: string, id: string) {
    if (!/[\\/]@(?:iconify|nuxt[\\/]icon)[\\/]/.test(id) || !ICON_API.test(code)) return
    return { code: code.replace(new RegExp(ICON_API.source, 'g'), OFFLINE_ICON_API), map: null }
  },
}

export default defineNuxtConfig({
  modules: ['@nuxt/ui', '@pinia/nuxt', '@nuxt/eslint', '@nuxt/test-utils/module'],
  // The token specimen is a dev-only page.
  // A production build (Vercel, `pnpm preview`) forwards /api and /mock-eais to API_BASE_URL, read at runtime
  // (server/backend-proxy.ts). In dev the devProxy below does this.
  $production: {
    serverHandlers: apiMock
      ? []
      : [
          { route: '/api/**', handler: backendProxy },
          { route: '/mock-eais/**', handler: backendProxy },
        ],
    hooks: {
      'pages:extend'(pages) {
        const i = pages.findIndex(p => p.path === '/_specimen')
        if (i !== -1) pages.splice(i, 1)
      },
    },
  },
  ssr: false,
  devtools: { enabled: false },
  css: ['~/assets/css/main.css', '~/assets/css/focus.css'],
  ui: { fonts: false, colorMode: false },
  runtimeConfig: {
    public: {
      apiMock: apiMock ? '1' : '',
      // One-click demo-account chips on /login (handoff §6 #1). On for this MVP; NUXT_PUBLIC_DEMO_ACCOUNTS=0 hides them.
      demoAccounts: true,
    },
  },
  compatibilityDate: '2025-07-15',
  nitro: {
    devProxy: apiMock
      ? {}
      : {
          '/api': { target: `${backend}/api`, changeOrigin: true },
          '/mock-eais': { target: `${backend}/mock-eais`, changeOrigin: true },
        },
  },
  serverHandlers: apiMock
    ? [
        { route: '/api/**', handler: mockHandler },
        { route: '/mock-eais/**', handler: mockHandler },
      ]
    : [],
  vite: {
    plugins: [offlineIconify],
    // Let `pnpm dev` answer through an ngrok tunnel (Vite blocks unknown Host headers by default).
    server: { allowedHosts: ['.ngrok-free.app', '.ngrok-free.dev', '.ngrok.app', '.ngrok.dev'] },
  },
  typescript: { strict: true },
  eslint: { config: { stylistic: true } },
  // Offline icons (spec 2 §Nuxt UI wiring, verified against @nuxt/icon 2.6.2):
  // - provider 'none' + fallbackToApi false: never call the Iconify API (with ssr:false the default is 'iconify').
  // - serverBundle false: no /api/_nuxt_icon handler; icons ship in the client bundle only.
  // - scan.globInclude adds .ts: the default glob skips plain TS, so icons named in app/utils/nav.ts would be missed.
  icon: {
    provider: 'none',
    fallbackToApi: false,
    serverBundle: false,
    iconifyApiEndpoint: OFFLINE_ICON_API,
    clientBundle: {
      scan: { globInclude: ['app/**/*.{vue,ts}'] },
      includeCustomCollections: true,
    },
  },
})
