#!/usr/bin/env node
// Browser smoke test for routing and role gating against a running dev server (proxy or mock mode).
//   node scripts/smoke-roles.mjs [http://localhost:3000]
// Uses the locally installed Chrome through playwright-core (no browser download).
import { chromium } from 'playwright-core'

const base = process.argv[2] || 'http://localhost:3000'
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

// rail: the §2 screens in menu order (handoff §2, app/utils/nav.ts); groups: the bilingual labels that must render.
const CASES = [
  {
    user: 'admin', start: '/ops', forbidden: null, allowed: ['/admin', '/review', '/search'], bell: true,
    rail: ['/search', '/dela', '/collections', '/ops', '/upload', '/errors', '/review', '/journal', '/admin'],
    groups: ['Қор · Фонд', 'Өңдеу · Обработка', 'Жүйе · Система'],
  },
  {
    user: 'archivist', start: '/search', forbidden: '/admin', allowed: ['/review', '/ops'], bell: true,
    rail: ['/search', '/dela', '/collections', '/ops', '/upload', '/errors', '/review', '/journal'],
    groups: ['Қор · Фонд', 'Өңдеу · Обработка'],
  },
  {
    user: 'operator', start: '/ops', forbidden: '/review', allowed: ['/errors', '/dela'], bell: true,
    rail: ['/search', '/dela', '/collections', '/ops', '/upload', '/errors', '/journal'],
    groups: ['Қор · Фонд', 'Өңдеу · Обработка'],
  },
  {
    user: 'reader', start: '/search', forbidden: '/ops', allowed: ['/collections', '/dela'], bell: false,
    rail: ['/search', '/dela', '/collections'],
    groups: ['Қор · Фонд'],
  },
]
const RAIL = 'nav[aria-label="Основное меню"]'

const browser = await chromium.launch({ executablePath: CHROME, headless: true })
// Desktop width: the rail is visible (below 1024 px it moves into the header's slideover).
const VIEWPORT = { width: 1440, height: 900 }
const results = []
let failed = 0
const check = (ok, label) => {
  results.push(`${ok ? 'PASS' : 'FAIL'}  ${label}`)
  if (!ok) failed++
}

for (const c of CASES) {
  const context = await browser.newContext({ viewport: VIEWPORT })
  const requests = []
  context.on('request', r => requests.push(new URL(r.url()).pathname))
  const page = await context.newPage()
  const consoleErrors = []
  // Expected 401/403/404 responses (session check, hidden cases) are logged by the browser itself; they are not app errors.
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource: the server responded with a status of (401|403|404)/.test(m.text())) consoleErrors.push(m.text())
  })
  page.on('pageerror', e => consoleErrors.push(String(e)))

  // Unauthenticated deep link → /login?next=
  await page.goto(`${base}${c.start}`)
  await page.waitForURL(/\/login/)
  check(new URL(page.url()).searchParams.get('next') === c.start, `${c.user}: anonymous ${c.start} → /login?next=${c.start}`)

  // Unknown address while anonymous → /login?next= as well
  await page.goto(`${base}/no-such-place`)
  await page.waitForURL(/\/login/)
  check(new URL(page.url()).searchParams.get('next') === '/no-such-place', `${c.user}: anonymous unknown path → /login?next=/no-such-place`)

  // Wrong password shows the server's detail and stays on /login
  await page.fill('input[autocomplete="username"]', c.user)
  await page.fill('input[autocomplete="current-password"]', 'wrong')
  await page.click('button[type="submit"]')
  await page.getByRole('alert').filter({ hasText: 'Неверный логин или пароль' }).waitFor({ timeout: 5000 })
  check(page.url().includes('/login'), `${c.user}: wrong password shows «Неверный логин или пароль»`)

  // Login from a plain /login lands on the role's start route
  await page.goto(`${base}/login`)
  await page.fill('input[autocomplete="username"]', c.user)
  await page.fill('input[autocomplete="current-password"]', c.user)
  await page.click('button[type="submit"]')
  await page.waitForURL(u => new URL(u).pathname === c.start, { timeout: 10000 })
  check(new URL(page.url()).pathname === c.start, `${c.user}: login → ${c.start}`)

  // Shell: the rail shows exactly the §2 screens, the bell only for STAFF, the ЕАИС indicator for everyone.
  await page.locator(RAIL).first().locator('a').first().waitFor({ timeout: 20000 })
  const rail = await page.locator(RAIL).first().locator('a').evaluateAll(as => as.map(a => a.getAttribute('href')))
  check(JSON.stringify(rail) === JSON.stringify(c.rail), `${c.user}: rail shows exactly ${c.rail.join(' ')}${JSON.stringify(rail) === JSON.stringify(c.rail) ? '' : ` (got ${rail.join(' ')})`}`)
  const groups = (await page.locator(RAIL).first().locator(':scope > div > p').allInnerTexts()).map(g => g.trim().replace(/\s+/g, ' '))
  const groupsOk = JSON.stringify(groups.map(g => g.toLowerCase())) === JSON.stringify(c.groups.map(g => g.toLowerCase()))
  check(groupsOk, `${c.user}: rail groups ${c.groups.join(' / ')}${groupsOk ? '' : ` (got ${groups.join(' / ')})`}`)
  await page.locator('header').getByText(/ЕАИС (на связи|недоступна)/).first().waitFor({ timeout: 15000 })
  check(true, `${c.user}: header shows the ЕАИС state`)
  // Give the bell's first poll time to run (or not, for the reader).
  await page.waitForTimeout(1500)
  const bell = await page.locator('header button[aria-label^="Уведомления"]').count()
  check((bell === 1) === c.bell, `${c.user}: bell ${c.bell ? 'present' : 'absent'}`)
  const askedNotifications = requests.includes('/api/notifications')
  check(askedNotifications === c.bell, `${c.user}: /api/notifications ${c.bell ? 'requested' : 'never requested'}`)
  if (!c.bell) {
    check(!requests.includes('/api/m1/queue') && !requests.includes('/api/review'), `${c.user}: no counter requests (m1/queue, review)`)
  }
  check(await page.title() === `${c.start === '/ops' ? 'Панель оператора' : 'Поиск'} — Цифровой архив Астаны`, `${c.user}: document title «${await page.title()}»`)

  // `/` → start route
  await page.goto(`${base}/`)
  await page.waitForURL(u => new URL(u).pathname === c.start, { timeout: 10000 })
  check(true, `${c.user}: / → ${c.start}`)

  for (const path of c.allowed) {
    await page.goto(`${base}${path}`)
    const h1 = await page.locator('main h1').first().textContent({ timeout: 10000 })
    check(!!h1 && !h1.includes('Нет доступа'), `${c.user}: ${path} renders («${h1?.trim()}»)`)
  }

  if (c.forbidden) {
    await page.goto(`${base}${c.forbidden}`)
    const denied = page.locator('main h1').filter({ hasText: 'Нет доступа' })
    await denied.waitFor({ timeout: 10000 })
    check(await denied.isVisible(), `${c.user}: ${c.forbidden} shows «Нет доступа»`)
    // The forbidden item is not in the menu
    const navHas = await page.locator(`nav a[href="${c.forbidden}"]`).count()
    check(navHas === 0, `${c.user}: ${c.forbidden} not rendered in the nav`)
  }

  // Unknown address while logged in → «Не найдено» inside the shell (logout button still there)
  await page.goto(`${base}/no-such-place`)
  const notFound = page.locator('main h1').filter({ hasText: 'Не найдено' })
  await notFound.waitFor({ timeout: 10000 })
  check(await page.locator(RAIL).first().isVisible(), `${c.user}: unknown path shows «Не найдено» inside the shell`)

  // Logout through the user menu → /login, then a protected route asks for login again
  await page.locator('header button[aria-haspopup="menu"]').last().click()
  await page.getByRole('menuitem', { name: 'Выйти' }).click()
  await page.waitForURL(/\/login/, { timeout: 10000 })
  const afterLogout = requests.length
  await page.waitForTimeout(6000)
  const late = requests.slice(afterLogout).filter(p => /^\/api\/(health|m1\/queue|review|notifications)$/.test(p))
  check(late.length === 0, `${c.user}: polling stopped after logout${late.length ? ` (got ${late.join(' ')})` : ''}`)
  await page.goto(`${base}${c.start}`)
  await page.waitForURL(/\/login\?next=/, { timeout: 10000 })
  check(true, `${c.user}: logout → /login, session gone`)

  check(consoleErrors.length === 0, `${c.user}: no console errors${consoleErrors.length ? `: ${consoleErrors.join(' | ').slice(0, 300)}` : ''}`)
  await context.close()
}

await browser.close()
console.log(results.join('\n'))
console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed')
process.exit(failed ? 1 : 0)
