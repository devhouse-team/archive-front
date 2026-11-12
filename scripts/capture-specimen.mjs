#!/usr/bin/env node
// Headless captures of the dev-only token specimen for the Stage 3 review.
//   node scripts/capture-specimen.mjs [http://localhost:3000]
// Writes .impeccable/review/stage3-specimen.png plus hover/focus/active captures of the civic rail and header,
// and prints the computed focus colours so the evidence is numeric as well as visual.
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

const base = process.argv[2] || 'http://localhost:3000'
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const out = fileURLToPath(new URL('../.impeccable/review/', import.meta.url))
await mkdir(out, { recursive: true })

const browser = await chromium.launch({ executablePath: CHROME, headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
const page = await context.newPage()
const errors = []
page.on('pageerror', e => errors.push(String(e)))
page.on('console', (m) => {
  if (m.type() === 'error' && !/status of (401|403|404)/.test(m.text())) errors.push(m.text())
})

await page.goto(`${base}/login?next=/_specimen`)
await page.fill('input[autocomplete="username"]', 'admin')
await page.fill('input[autocomplete="current-password"]', 'admin')
await page.click('button[type="submit"]')
await page.waitForURL(/\/_specimen/)
await page.locator('#civic-preview').waitFor()
await page.evaluate(() => document.fonts.ready)
await page.waitForTimeout(500)

await page.screenshot({ path: `${out}stage3-specimen.png`, fullPage: true })

const preview = page.locator('#civic-preview')
await preview.scrollIntoViewIfNeeded()

/** Computed focus styles of the focused element (and its ::before for nav links). */
async function focusReport(label) {
  const r = await page.evaluate(() => {
    const el = document.activeElement
    if (!el) return null
    const cs = getComputedStyle(el)
    const before = getComputedStyle(el, '::before')
    return {
      tag: el.tagName.toLowerCase(),
      text: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 40),
      ariaCurrent: el.getAttribute('aria-current'),
      outline: `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor} offset ${cs.outlineOffset}`,
      boxShadow: cs.boxShadow,
      beforeOutline: `${before.outlineStyle} ${before.outlineWidth} ${before.outlineColor}`,
      beforeBg: before.backgroundColor,
      color: cs.color,
      height: el.getBoundingClientRect().height,
    }
  })
  console.log(`${label}: ${JSON.stringify(r)}`)
}

// Hover: an inactive rail link.
const uploadLink = preview.locator('nav a[href="/upload"]')
await uploadLink.hover()
await page.waitForTimeout(250)
await preview.screenshot({ path: `${out}stage3-civic-hover.png` })
await page.mouse.move(0, 0)

// Keyboard: start just before the preview and Tab into it.
await page.locator('#sp-civic').click()
await page.keyboard.press('Tab')
await page.waitForTimeout(450)
await focusReport('rail first link (focus)')
await preview.screenshot({ path: `${out}stage3-civic-focus-rail.png` })

// The active item «Поиск» is the first link; Tab to Дела to show focus on an inactive link next to the active one.
await page.keyboard.press('Tab')
await page.waitForTimeout(450)
await focusReport('rail second link (focus, inactive)')
await preview.screenshot({ path: `${out}stage3-civic-focus-rail-inactive.png` })

// Header search input.
await preview.locator('#civic-header-online input').focus()
await page.keyboard.press('Shift+Tab')
await page.keyboard.press('Tab')
await page.waitForTimeout(450)
await focusReport('header search (focus)')
await preview.screenshot({ path: `${out}stage3-civic-focus-search.png` })

// Bell and user menu buttons.
await page.keyboard.press('Tab')
await page.waitForTimeout(450)
await focusReport('header bell (focus)')
await preview.screenshot({ path: `${out}stage3-civic-focus-bell.png` })
await page.keyboard.press('Tab')
await page.waitForTimeout(450)
await focusReport('header user menu (focus)')
await preview.screenshot({ path: `${out}stage3-civic-focus-user.png` })

// Light-ground focus on solid fills: the solid primary and the solid error button, reached by keyboard.
// Both crops are stitched into stage3-focus-light.png by scripts/design/stitch.py.
async function tabTo(id, max = 12) {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab')
    if (await page.evaluate(() => document.activeElement?.id) === id) return
  }
  throw new Error(`could not Tab to #${id}`)
}
const controlsRow = page.locator('#sp-btn-primary').locator('..')
await page.locator('#sp-controls').click()
for (const id of ['sp-btn-primary', 'sp-btn-error']) {
  await tabTo(id)
  await page.waitForTimeout(450)
  await focusReport(`light ground: solid ${id.replace('sp-btn-', '')} button (focus)`)
  const box = await controlsRow.boundingBox()
  await page.screenshot({ path: `${out}.stage3-focus-light-${id}.png`, clip: { x: box.x - 12, y: box.y - 12, width: Math.min(box.width + 24, 1200), height: box.height + 24 } })
}

// 36 px click targets: click near the top and bottom edge of each checkbox / switch / radio row and confirm the
// control toggles. This measures the clickable box, not the layout root.
async function state(sel) {
  return page.evaluate(s => document.querySelector(s)?.getAttribute('aria-checked') ?? document.querySelector(s)?.getAttribute('data-state'), sel)
}
async function clickEdges(label, rowSel, controlSel) {
  const row = await page.locator(rowSel).first().boundingBox()
  const results = []
  for (const [where, x, y] of [['top-left', row.x + 2, row.y + 2], ['bottom-left', row.x + 2, row.y + row.height - 2], ['label-end', row.x + row.width - 4, row.y + row.height / 2]]) {
    const before = await state(controlSel)
    await page.mouse.click(x, y)
    await page.waitForTimeout(120)
    const after = await state(controlSel)
    results.push(`${where}:${before}->${after}`)
  }
  console.log(`click target ${label}: row ${Math.round(row.width)}x${Math.round(row.height)} px; ${results.join(', ')}`)
}
await clickEdges('checkbox', '[data-slot="root"]:has(#sp-checkbox)', '#sp-checkbox')
await clickEdges('switch', '[data-slot="root"]:has(#sp-switch)', '#sp-switch')
// Radio: clicking an item's edge selects that item.
const radioItems = page.locator('#sp-radio [data-slot="item"]')
const radioCount = await radioItems.count()
for (let i = radioCount - 1; i >= 0; i--) {
  const row = await radioItems.nth(i).boundingBox()
  await page.mouse.click(row.x + 2, i % 2 ? row.y + 2 : row.y + row.height - 2)
  await page.waitForTimeout(120)
  const checked = await radioItems.nth(i).locator('[role="radio"]').getAttribute('aria-checked')
  console.log(`click target radio item ${i + 1}: row ${Math.round(row.width)}x${Math.round(row.height)} px; edge click → aria-checked=${checked}`)
}

// Toast: role="status" on the toast element, polite announcement.
await page.locator('#sp-toast').click()
const toast = page.locator('li[role="status"]').filter({ hasText: 'Дубликат' })
await toast.waitFor({ timeout: 5000 })
await page.screenshot({ path: `${out}stage3-toast.png` })
const toastInfo = await page.evaluate(() => {
  const el = [...document.querySelectorAll('[role="status"]')].find(e => e.textContent?.includes('Дубликат'))
  const announce = [...document.querySelectorAll('[aria-live]')].map(e => `${e.getAttribute('role')}/${e.getAttribute('aria-live')}`)
  return { role: el?.getAttribute('role'), tag: el?.tagName.toLowerCase(), liveRegions: announce }
})
console.log(`toast: ${JSON.stringify(toastInfo)}`)

// 36 px targets: buttons, inputs and nav links by their own box; checkbox/switch/radio by their clickable row
// (the label ::after spans the row, see app.config.ts).
const small = await page.evaluate(() => [...document.querySelectorAll('main button, main input, main select, main textarea, main nav a')]
  .map((el) => {
    const role = el.getAttribute('role')
    const row = role === 'radio' ? el.closest('[data-slot="item"]') : (role === 'checkbox' || role === 'switch') ? el.closest('[data-slot="root"]') : null
    const hasLabel = row?.querySelector('label')
    const target = row && hasLabel ? row : el
    return { el: (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 30), h: Math.round(target.getBoundingClientRect().height) }
  })
  .filter(x => x.h > 0 && x.h < 36))
console.log(`targets under 36 px: ${JSON.stringify(small)}`)

console.log(errors.length ? `console errors: ${errors.join(' | ')}` : 'console errors: none')
await browser.close()

// Stitch the two light-ground focus crops into one evidence image (rendered in the browser; no image libraries).
{
  const { readFile, rm } = await import('node:fs/promises')
  const crops = ['sp-btn-primary', 'sp-btn-error'].map(id => `${out}.stage3-focus-light-${id}.png`)
  const srcs = await Promise.all(crops.map(async f => `data:image/png;base64,${(await readFile(f)).toString('base64')}`))
  const b2 = await chromium.launch({ executablePath: CHROME, headless: true })
  const p2 = await b2.newPage({ deviceScaleFactor: 1 })
  await p2.setContent(`<body style="margin:0;background:#F4F7FA"><div id="s" style="display:inline-flex;flex-direction:column;gap:16px">${srcs.map(s => `<img src="${s}" style="display:block">`).join('')}</div></body>`)
  await p2.locator('#s').screenshot({ path: `${out}stage3-focus-light.png` })
  await b2.close()
  await Promise.all(crops.map(f => rm(f)))
  console.log('stitched stage3-focus-light.png (solid primary, solid error)')
}
