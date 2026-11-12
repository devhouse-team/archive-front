#!/usr/bin/env node
// Headless captures of the Stage 6 screens (/search, /collections) for review, against a running dev server
// in proxy mode (real backend).
//   node scripts/capture-search.mjs [http://localhost:3020] [--only=search,mobile,collections]
// Writes .impeccable/review/stage6-*.png and prints checks: small targets, horizontal overflow, console errors,
// restricted Д.21 visibility per role, the RTL snippet direction.
// The collections flow creates a temporary подборка «stage6-capture …», exports CSV, and ALWAYS deletes it.
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

const args = process.argv.slice(2)
const base = args.find(a => !a.startsWith('--')) || 'http://localhost:3020'
const only = args.find(a => a.startsWith('--only='))?.slice(7).split(',')
const want = part => !only || only.includes(part)
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const out = fileURLToPath(new URL('../.impeccable/review/', import.meta.url))
await mkdir(out, { recursive: true })

const ROLE_RU = { admin: 'Администратор', archivist: 'Архивист', operator: 'Оператор', reader: 'Читатель' }
const Q = 'мектеп'
const browser = await chromium.launch({ executablePath: CHROME, headless: true })
const errors = []
const report = []

async function newPage(viewport = { width: 1920, height: 1080 }) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, acceptDownloads: true })
  const page = await context.newPage()
  // The dev server transforms modules on first request; under load a cold page can take a minute.
  page.setDefaultTimeout(240000)
  page.on('pageerror', e => errors.push(String(e)))
  page.on('console', (m) => {
    if (m.type() === 'error' && !/status of (401|403|404)/.test(m.text())) errors.push(m.text())
  })
  return { context, page }
}

async function settle(page, ms = 500) {
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(ms)
}

async function loginAs(page, role) {
  await page.goto(`${base}/login`)
  await page.getByRole('button', { name: `Войти как ${ROLE_RU[role]}` }).click()
  await page.waitForURL(u => !new URL(u).pathname.startsWith('/login'), { timeout: 240000 })
  await page.locator('main#main').waitFor({ timeout: 240000 })
}

async function smallTargets(page) {
  return page.evaluate(() => {
    const els = [...document.querySelectorAll('main a[href], main button, main input, main [role="radio"], [role="dialog"] button, [role="dialog"] input')]
    return els.filter((el) => {
      const r = el.getBoundingClientRect()
      if (!r.width || !r.height) return false
      const cs = getComputedStyle(el)
      if (cs.visibility === 'hidden' || el.closest('.sr-only')) return false
      // Radio inputs are covered by their 36 px label row.
      if (el.getAttribute('role') === 'radio' || el.type === 'radio') return false
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

async function waitResults(page) {
  await page.getByRole('article').first().waitFor({ timeout: 180000 })
  await settle(page)
}

async function search(role) {
  const { context, page } = await newPage()
  await loginAs(page, role)
  await page.goto(`${base}/search?q=${encodeURIComponent(Q)}`)
  await waitResults(page)
  const titles = await page.getByRole('article').locator('h2').allInnerTexts()
  const shifrs = await page.getByRole('article').locator('.text-secondary').allInnerTexts()
  const restrictedBadges = await page.getByText('Ограниченный доступ').count()
  const rtl = await page.evaluate(() => {
    const p = [...document.querySelectorAll('.search-snippet')].find(el => /[؀-ۿ]/.test(el.textContent || ''))
    return p ? getComputedStyle(p).direction : 'none'
  })
  report.push({ role, cases: titles.length, d21: shifrs.some(s => s.includes('Д.21')), restrictedBadges, rtlSnippet: rtl, titles })
  if (role === 'archivist') {
    await page.screenshot({ path: `${out}stage6-search-results.png`, fullPage: false })
    report.push({ check: 'small targets (results)', items: await smallTargets(page) })
    // «Все страницы дела» on the case with two hit pages.
    const toggle = page.getByRole('button', { name: /Все страницы дела/ }).first()
    await toggle.click()
    await page.locator('ol[aria-label="Страницы с совпадениями"] li').first().waitFor({ timeout: 120000 })
    await settle(page)
    await toggle.scrollIntoViewIfNeeded()
    await page.evaluate(() => document.querySelector('main#main')?.scrollBy(0, -120))
    await page.screenshot({ path: `${out}stage6-search-all-pages.png` })
    // Empty state.
    await page.goto(`${base}/search?q=${encodeURIComponent('абырвалгзз')}`)
    await page.getByText('Ничего не найдено').waitFor({ timeout: 180000 })
    await settle(page)
    await page.screenshot({ path: `${out}stage6-search-empty.png` })
    // Initial state.
    await page.goto(`${base}/search`)
    await page.getByText('Примеры запросов').waitFor({ timeout: 180000 })
    await settle(page)
    await page.screenshot({ path: `${out}stage6-search-initial.png` })
    // URL sync: filter + fuzzy + sort + back.
    await page.goto(`${base}/search?q=${encodeURIComponent(Q)}&fuzzy=1&sort=date&lang=kk-arab`)
    await waitResults(page)
    const n = await page.getByRole('article').count()
    await page.goBack()
    report.push({ check: 'url filters lang=kk-arab', cases: n })
  }
  await context.close()
}

async function mobile() {
  const { context, page } = await newPage({ width: 375, height: 812 })
  await loginAs(page, 'reader')
  await page.goto(`${base}/search?q=${encodeURIComponent(Q)}`)
  await waitResults(page)
  report.push({ check: 'mobile overflow (results)', ...(await overflowX(page)) })
  await page.screenshot({ path: `${out}stage6-search-mobile.png` })
  await page.getByRole('button', { name: /^Фильтры/ }).click()
  await page.getByRole('dialog').waitFor({ timeout: 60000 })
  await settle(page, 700)
  report.push({ check: 'mobile overflow (filters open)', ...(await overflowX(page)) })
  report.push({ check: 'small targets (mobile filters)', items: await smallTargets(page) })
  await page.screenshot({ path: `${out}stage6-search-mobile-filters.png` })
  await context.close()
}

async function collections() {
  const { context, page } = await newPage()
  await loginAs(page, 'reader')
  const name = `stage6-capture ${Date.now()}`
  let createdId = null
  try {
    // Add to a new collection from the search result popover.
    await page.goto(`${base}/search?q=${encodeURIComponent(Q)}`)
    await waitResults(page)
    await page.getByRole('button', { name: /Добавить лист .* в подборку/ }).first().click()
    await page.getByLabel('Новая подборка').fill(name)
    await settle(page, 300)
    await page.screenshot({ path: `${out}stage6-search-add-popover.png` })
    await page.getByRole('button', { name: 'Создать и добавить' }).click()
    await page.getByText(/Лист добавлен в/).first().waitFor({ timeout: 120000 })
    // Idempotency: reopen the popover; the collection shows «уже добавлен» and is disabled.
    await page.getByRole('button', { name: /Добавить лист .* в подборку/ }).first().click()
    const already = await page.getByText('уже добавлен').count()
    report.push({ check: 'add twice shows «уже добавлен»', already })
    await page.keyboard.press('Escape')

    await page.goto(`${base}/collections`)
    await page.getByRole('link', { name }).waitFor({ timeout: 120000 })
    await settle(page)
    await page.screenshot({ path: `${out}stage6-collections-list.png` })
    await page.getByRole('link', { name }).click()
    await page.waitForURL(/\/collections\/\d+/)
    createdId = Number(new URL(page.url()).pathname.split('/').pop())
    await page.getByRole('article').first().waitFor({ timeout: 120000 }).catch(() => {})
    await settle(page)
    await page.screenshot({ path: `${out}stage6-collection-detail.png` })
    const dl = page.waitForEvent('download', { timeout: 180000 })
    await page.getByRole('button', { name: 'CSV' }).click()
    const file = await dl
    report.push({ check: 'export csv', filename: file.suggestedFilename() })
    report.push({ check: 'small targets (detail)', items: await smallTargets(page) })
  }
  finally {
    // Cleanup: delete through the UI when possible, else through the API.
    if (createdId) {
      const res = await page.evaluate(async id => (await fetch(`/api/collections/${id}`, { method: 'DELETE', credentials: 'same-origin' })).status, createdId)
      report.push({ check: 'cleanup delete', id: createdId, status: res })
    }
    const left = await page.evaluate(async () => (await (await fetch('/api/collections', { credentials: 'same-origin' })).json()).filter(c => c.name.startsWith('stage6-capture')).map(c => c.id))
    for (const id of left) await page.evaluate(async i => fetch(`/api/collections/${i}`, { method: 'DELETE', credentials: 'same-origin' }), id)
    report.push({ check: 'leftover test collections removed', ids: left })
  }
  await context.close()
}

try {
  if (want('search')) {
    await search('archivist')
    await search('reader')
  }
  if (want('mobile')) await mobile()
  if (want('collections')) await collections()
}
finally {
  await browser.close()
}
console.log(JSON.stringify(report, null, 2))
console.log('console errors:', errors.length ? errors : 'none')
