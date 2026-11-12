#!/usr/bin/env node
// Stage 4 follow-up from Stage 3: does the first toast in the real shell wait behind a long main-thread task?
//   node scripts/profile-toast.mjs [http://localhost:3000] [--headed] [--runs=3]
// Signs in as archivist, waits for the shell to settle, then raises the first toast of the session through a real
// code path: «Отметить все прочитанными» answered with a 400 (Playwright intercepts that one request), which
// useApi turns into a toast. Reports click → toast-visible latency and every long task (> 50 ms) in that window.
// No CPU throttling is applied.
import { chromium } from 'playwright-core'

const args = process.argv.slice(2)
const base = args.find(a => !a.startsWith('--')) || 'http://localhost:3000'
const headed = args.includes('--headed')
const runs = Number(args.find(a => a.startsWith('--runs='))?.split('=')[1] ?? 3)
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

const browser = await chromium.launch({ executablePath: CHROME, headless: !headed })
const results = []

for (let i = 0; i < runs; i++) {
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } })
  const page = await context.newPage()
  await page.addInitScript(() => {
    window.__longTasks = []
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) window.__longTasks.push({ start: Math.round(e.startTime), duration: Math.round(e.duration) })
    }).observe({ type: 'longtask', buffered: true })
  })
  await page.route('**/api/notifications/read', route => route.fulfill({
    status: 400,
    contentType: 'application/json',
    body: JSON.stringify({ detail: 'Профилирование: первое уведомление' }),
  }))
  await page.goto(`${base}/login`)
  await page.getByRole('button', { name: 'Войти как Архивист' }).click()
  await page.waitForURL(u => !new URL(u).pathname.startsWith('/login'))
  await page.locator('main#main').waitFor()
  await page.locator('header').getByText(/ЕАИС (на связи|недоступна)/).first().waitFor()
  await page.waitForTimeout(1500)
  await page.locator('button[aria-label^="Уведомления"]').click()
  const mark = page.getByRole('button', { name: 'Отметить все прочитанными' })
  await mark.waitFor()
  await page.waitForTimeout(500)

  const t0 = await page.evaluate(() => performance.now())
  await mark.click()
  await page.locator('li[role="status"]').filter({ hasText: 'Профилирование' }).waitFor({ timeout: 10000 })
  const t1 = await page.evaluate(() => performance.now())
  const all = await page.evaluate(() => window.__longTasks)
  const inWindow = all.filter(t => t.start + t.duration >= t0 && t.start <= t1)
  const before = all.filter(t => t.start + t.duration < t0)
  results.push({
    run: i + 1,
    clickToToastMs: Math.round(t1 - t0),
    longTasksInWindow: inWindow.map(t => t.duration),
    longTasksBeforeClick: { count: before.length, maxMs: Math.max(0, ...before.map(t => t.duration)) },
  })
  await context.close()
}

await browser.close()
console.log(JSON.stringify({ base, headed, results }))
