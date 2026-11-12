#!/usr/bin/env node
// Headless captures of the Stage 8 screens (/dela, /dela/[id], /review, /admin) against a running dev server.
//   node scripts/capture-cases.mjs [http://localhost:3040] [--only=dela,card,review,admin,eais,create]
// Writes .impeccable/review/stage8-*.png and prints checks: restricted rows per role, re-OCR button per role,
// small targets, horizontal overflow, console errors.
// Safety (dev backend): the re-OCR modal is opened and CANCELLED, and the script fails loudly if any
// POST /api/dela/*/ocr leaves the browser. The create-user form is only submitted empty (validation blocks it)
// unless --create is passed (mock mode only). The ЕАИС switch is turned off once and ALWAYS back on.
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

const args = process.argv.slice(2)
const base = args.find(a => !a.startsWith('--')) || 'http://localhost:3040'
const only = args.find(a => a.startsWith('--only='))?.slice(7).split(',')
const want = part => !only || only.includes(part)
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const out = fileURLToPath(new URL('../.impeccable/review/', import.meta.url))
await mkdir(out, { recursive: true })

const ROLE_RU = { admin: 'Администратор', archivist: 'Архивист', operator: 'Оператор', reader: 'Читатель' }
const browser = await chromium.launch({ executablePath: CHROME, headless: true })
const errors = []
const report = []
const forbidden = []

// One shared context: the dev server is slow under load, and a warm module cache makes each reload fast.
// Roles switch by clearing the session cookie and logging in again.
let shared = null
async function newPage(viewport = { width: 1920, height: 1080 }) {
  if (shared) {
    await shared.context.clearCookies()
    return shared
  }
  const real = await browser.newContext({ viewport, deviceScaleFactor: 1 })
  const page = await real.newPage()
  page.setDefaultTimeout(120000)
  const context = { close: async () => {}, clearCookies: () => real.clearCookies(), real }
  shared = { context, page }
  page.on('pageerror', e => errors.push(String(e)))
  page.on('console', (m) => {
    if (m.type() === 'error' && !/status of (401|403|404)/.test(m.text())) errors.push(m.text())
  })
  page.on('request', (r) => {
    if (r.method() === 'POST' && /\/api\/dela\/\d+\/ocr/.test(r.url())) forbidden.push(`re-OCR POST ${r.url()}`)
    if (r.method() === 'POST' && /\/api\/users$/.test(r.url()) && !args.includes('--create')) forbidden.push(`create-user POST ${r.url()}`)
  })
  return shared
}

async function settle(page, ms = 600) {
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(ms)
}

async function loginAs(page, role) {
  await page.goto(`${base}/login`)
  await page.getByRole('button', { name: `Войти как ${ROLE_RU[role]}` }).click()
  await page.waitForURL(u => !new URL(u).pathname.startsWith('/login'), { timeout: 120000 })
  await page.locator('main#main').waitFor({ timeout: 120000 })
}

async function smallTargets(page) {
  return page.evaluate(() => {
    const els = [...document.querySelectorAll('main a[href], main button, main input, main [role="switch"], [role="dialog"] button, [role="dialog"] input')]
    return els.filter((el) => {
      const r = el.getBoundingClientRect()
      if (!r.width || !r.height) return false
      if (getComputedStyle(el).visibility === 'hidden' || el.closest('.sr-only')) return false
      if (el.getAttribute('role') === 'radio' || el.type === 'radio') return false
      // Switch and checkbox: their label row is the 36 px target (app.config).
      if (el.getAttribute('role') === 'switch') return el.closest('[class*="min-h-9"]') === null
      return r.height < 36
    }).map(el => `${el.tagName.toLowerCase()} «${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 40)}» ${Math.round(el.getBoundingClientRect().height)}px`)
  })
}

async function overflowX(page) {
  return page.evaluate(() => {
    const main = document.querySelector('main#main')
    return { doc: document.documentElement.scrollWidth > window.innerWidth, main: main ? main.scrollWidth > main.clientWidth : false }
  })
}

async function shot(page, name, fullPage = false) {
  await page.screenshot({ path: `${out}stage8-${name}.png`, fullPage })
  report.push(`shot stage8-${name}.png`)
}

async function delaList(role) {
  const { context, page } = await newPage()
  await loginAs(page, role)
  await page.goto(`${base}/dela`)
  await page.locator('main table tbody tr').first().waitFor({ timeout: 120000 })
  await settle(page)
  const rows = await page.locator('main table tbody tr').count()
  const badges = await page.locator('[data-testid="restricted-badge"]').count()
  const accessCol = await page.locator('main table thead th', { hasText: 'Доступ' }).count()
  report.push(`dela ${role}: rows=${rows} restrictedBadges=${badges} accessColumn=${accessCol}`)
  report.push(`dela ${role}: small=${JSON.stringify(await smallTargets(page))} overflow=${JSON.stringify(await overflowX(page))}`)
  await shot(page, `dela-${role}`)
  await context.close()
}

async function openCaseWithGaps(page) {
  await page.goto(`${base}/dela`)
  await page.locator('main table tbody tr').first().waitFor({ timeout: 120000 })
  const row = page.locator('main table tbody tr', { hasText: 'пропущены' }).first()
  const target = (await row.count()) ? row : page.locator('main table tbody tr').first()
  await target.locator('a').first().click()
  await page.waitForURL(/\/dela\/\d+/)
  await page.locator('#delo-title').waitFor({ timeout: 120000 })
  await page.waitForFunction(() => [...document.querySelectorAll('main img')].every(i => i.complete), null, { timeout: 120000 }).catch(() => {})
  await settle(page, 800)
}

async function card() {
  const { context, page } = await newPage()
  await loginAs(page, 'archivist')
  await openCaseWithGaps(page)
  const gaps = await page.locator('[data-gap]').count()
  const thumbs = await page.locator('main ul li img').count()
  const reocr = await page.getByRole('button', { name: 'Распознать заново' }).count()
  report.push(`card archivist ${page.url()}: thumbs=${thumbs} gapPlaceholders=${gaps} reocrButton=${reocr}`)
  report.push(`card archivist: small=${JSON.stringify(await smallTargets(page))} overflow=${JSON.stringify(await overflowX(page))}`)
  await shot(page, 'delo-card', true)

  // Re-OCR: open, look, CANCEL. Never confirm on the dev backend.
  await page.getByRole('button', { name: 'Распознать заново' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.waitFor()
  await dialog.getByRole('radio', { name: /төте/ }).check().catch(() => {})
  await settle(page, 400)
  report.push(`reocr modal: small=${JSON.stringify(await smallTargets(page))}`)
  await shot(page, 'reocr-modal')
  await dialog.getByRole('button', { name: 'Отмена' }).click()
  await dialog.waitFor({ state: 'detached' })
  report.push('reocr modal cancelled')

  // Export menu open (no download).
  await page.getByRole('button', { name: /Экспорт дела/ }).click()
  await settle(page, 300)
  await shot(page, 'delo-export-menu')
  await page.keyboard.press('Escape')
  const url = page.url()
  await context.close()

  for (const role of ['operator', 'reader']) {
    const o = await newPage()
    await loginAs(o.page, role)
    await o.page.goto(url)
    await o.page.locator('#delo-title').waitFor({ timeout: 120000 })
    await settle(o.page)
    report.push(`card ${role}: reocrButton=${await o.page.getByRole('button', { name: 'Распознать заново' }).count()} restrictedBadges=${await o.page.locator('[data-testid="restricted-badge"]').count()}`)
    await o.context.close()
  }
}

async function review() {
  const { context, page } = await newPage()
  await loginAs(page, 'archivist')
  await page.goto(`${base}/review`)
  await page.locator('main h1').waitFor()
  await page.waitForFunction(() => !document.querySelector('main [aria-busy="true"]'), null, { timeout: 120000 })
  await settle(page)
  report.push(`review: rows=${await page.locator('main table tbody tr').count()} h1=«${await page.locator('main h1').innerText()}»`)
  report.push(`review: small=${JSON.stringify(await smallTargets(page))} overflow=${JSON.stringify(await overflowX(page))}`)
  await shot(page, 'review')
  await context.close()
}

async function admin() {
  const { context, page } = await newPage()
  await loginAs(page, 'admin')
  await page.goto(`${base}/admin`)
  await page.locator('#admin-users').waitFor()
  await page.locator('main table tbody tr').first().waitFor({ timeout: 120000 })
  await page.getByRole('switch').waitFor({ timeout: 120000 })
  await settle(page, 1500)
  report.push(`admin: users=${await page.locator('main table tbody tr').count()} small=${JSON.stringify(await smallTargets(page))} overflow=${JSON.stringify(await overflowX(page))}`)
  await shot(page, 'admin')

  if (want('create')) {
    await page.getByRole('button', { name: 'Добавить пользователя' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.waitFor()
    if (args.includes('--create')) {
      await dialog.getByLabel('Логин').fill('stage8.demo')
      await dialog.getByLabel('Пароль', { exact: true }).fill('demo1')
      await dialog.getByRole('combobox').click()
      await page.getByRole('option', { name: 'Читатель' }).click()
      await dialog.getByLabel('ФИО').fill('Демо Пользователь')
      await settle(page, 300)
      await shot(page, 'admin-user-form-filled')
      await dialog.getByRole('button', { name: 'Создать' }).click()
      await dialog.waitFor({ state: 'detached' })
      await settle(page, 800)
      await shot(page, 'admin-user-created')
    }
    else {
      await dialog.getByLabel('Логин').fill('a!')
      await dialog.getByLabel('Пароль', { exact: true }).fill('12')
      await dialog.getByRole('button', { name: 'Создать' }).click()
      await settle(page, 400)
      report.push(`user form errors: ${JSON.stringify(await dialog.locator('[id$="-error"]').allInnerTexts())}`)
      await shot(page, 'admin-user-form-validation')
      await dialog.getByRole('button', { name: 'Отмена' }).click()
      await dialog.waitFor({ state: 'detached' })
    }
  }

  if (want('eais')) {
    const sw = page.getByRole('switch')
    try {
      report.push(`eais before: ${await sw.getAttribute('aria-checked')}`)
      await sw.click()
      const dialog = page.getByRole('dialog')
      await dialog.waitFor()
      await settle(page, 300)
      await shot(page, 'admin-eais-confirm')
      await dialog.getByRole('button', { name: 'Отключить ЕАИС' }).click()
      await dialog.waitFor({ state: 'detached' })
      await page.waitForFunction(() => document.querySelector('[role="switch"]')?.getAttribute('aria-checked') === 'false')
      await settle(page, 6000)
      await shot(page, 'admin-eais-off')
      await sw.click()
      await page.waitForFunction(() => document.querySelector('[role="switch"]')?.getAttribute('aria-checked') === 'true')
      await settle(page, 1500)
    }
    finally {
      // Whatever happened above, leave ЕАИС online.
      const res = await page.evaluate(async () => {
        const r = await fetch('/mock-eais/api/status', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ online: true }) })
        return r.json()
      })
      report.push(`eais after (forced on): ${JSON.stringify(res)}`)
    }
  }
  await context.close()
}

// Review round 1: stale health under a failing /api/health, and initial focus on «Отмена» in both confirm modals.
// Opens the modals and cancels them; nothing is switched or re-OCRed.
async function staleAndFocus() {
  const { page } = await newPage()
  await loginAs(page, 'admin')
  await page.goto(`${base}/admin`)
  await page.getByRole('switch').waitFor()
  await settle(page, 1500)
  const focused = () => page.evaluate(() => (document.activeElement?.textContent || document.activeElement?.getAttribute('aria-label') || '').trim())
  await page.getByRole('switch').click()
  await page.getByRole('dialog').waitFor()
  await settle(page, 400)
  report.push(`eais confirm: focus on «${await focused()}»`)
  await page.getByRole('dialog').getByRole('button', { name: 'Отмена' }).click()
  await page.getByRole('dialog').waitFor({ state: 'detached' })
  report.push(`eais after cancel: ${await page.getByRole('switch').getAttribute('aria-checked')}`)

  await page.route('**/api/health', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{"detail":"Сервис недоступен"}' }))
  await page.locator('[data-testid="health-stale"]').waitFor({ timeout: 30000 })
  await settle(page, 600)
  report.push(`health stale: alert=«${await page.locator('[data-testid="health-stale"]').innerText()}» role=${await page.locator('[data-testid="health-stale"]').getAttribute('role')} updatedLine=${await page.getByText('Обновляется каждые 5 секунд').count()} работает=${await page.locator('#admin-health ~ *, section[aria-labelledby="admin-health"]').getByText('работает', { exact: true }).count()}`)
  await shot(page, 'admin-health-stale')
  await page.unroute('**/api/health')
  await page.locator('[data-testid="health-stale"]').waitFor({ state: 'detached', timeout: 30000 })
  report.push('health recovered after unroute')

  await page.context().clearCookies()
  await loginAs(page, 'archivist')
  await openCaseWithGaps(page)
  await page.getByRole('button', { name: 'Распознать заново' }).click()
  await page.getByRole('dialog').waitFor()
  await settle(page, 400)
  report.push(`reocr modal: focus on «${await focused()}»`)
  await shot(page, 'reocr-modal')
  await page.getByRole('dialog').getByRole('button', { name: 'Отмена' }).click()
  await page.getByRole('dialog').waitFor({ state: 'detached' })
}

try {
  if (want('focus')) await staleAndFocus()
  if (want('dela')) {
    await delaList('reader')
    await delaList('archivist')
  }
  if (want('card')) await card()
  if (want('review')) await review()
  if (want('admin')) await admin()
}
finally {
  await browser.close()
  console.log(report.join('\n'))
  console.log(`console errors: ${errors.length ? JSON.stringify(errors, null, 1) : 'none'}`)
  if (forbidden.length) {
    console.log(`FORBIDDEN REQUESTS: ${JSON.stringify(forbidden)}`)
    process.exitCode = 2
  }
}
