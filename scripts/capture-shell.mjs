#!/usr/bin/env node
// Headless captures of the Stage 4 shell and login for review, against a running dev server.
//   node scripts/capture-shell.mjs [http://localhost:3000] [--eais-down]
// Writes .impeccable/review/stage4-*.png and prints measurements (targets under 36 px, horizontal overflow,
// the keyboard path, console errors).
// --eais-down (proxy mode, needs the real backend): as admin, switches the mock ЕАИС off through
// POST /mock-eais/api/status, captures the header in the outage state, and ALWAYS switches it back on.
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

const args = process.argv.slice(2)
const base = args.find(a => !a.startsWith('--')) || 'http://localhost:3000'
const eaisDown = args.includes('--eais-down')
// --only=login,roles,mobile,shifr runs a subset.
const only = args.find(a => a.startsWith('--only='))?.slice(7).split(',')
const want = part => !only || only.includes(part)
// --suffix=-mock keeps mock-mode outage captures next to the real-backend ones.
const suffix = args.find(a => a.startsWith('--suffix='))?.slice(9) ?? ''
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const out = fileURLToPath(new URL('../.impeccable/review/', import.meta.url))
await mkdir(out, { recursive: true })

const ROLES = ['admin', 'archivist', 'operator', 'reader']
const ROLE_RU = { admin: 'Администратор', archivist: 'Архивист', operator: 'Оператор', reader: 'Читатель' }
const browser = await chromium.launch({ executablePath: CHROME, headless: true })
const errors = []

async function newPage(viewport = { width: 1920, height: 1080 }) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 })
  const page = await context.newPage()
  page.on('pageerror', e => errors.push(String(e)))
  page.on('console', (m) => {
    if (m.type() === 'error' && !/status of (401|403|404)/.test(m.text())) errors.push(m.text())
  })
  return { context, page }
}

async function settle(page) {
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(600)
}

async function loginAs(page, role) {
  await page.goto(`${base}/login`)
  await page.getByRole('button', { name: `Войти как ${ROLE_RU[role]}` }).click()
  await page.waitForURL(u => !new URL(u).pathname.startsWith('/login'), { timeout: 20000 })
  await page.locator('main#main').waitFor({ timeout: 20000 })
  // First health answer has arrived: the indicator shows its state.
  await page.locator('header').getByText(/ЕАИС (на связи|недоступна)/).first().waitFor({ timeout: 15000 })
  await settle(page)
}

/** Visible interactive elements under 36 px tall (or wide, for icon-only controls). */
async function smallTargets(page) {
  return page.evaluate(() => {
    const els = [...document.querySelectorAll('a[href], button, input, [role="menuitem"], [tabindex]:not([tabindex="-1"])')]
    return els.filter((el) => {
      const r = el.getBoundingClientRect()
      if (!r.width || !r.height) return false
      const cs = getComputedStyle(el)
      if (cs.visibility === 'hidden' || el.closest('.sr-only')) return false
      return r.height < 36 || (r.width < 36 && !el.textContent.trim())
    }).map(el => `${el.tagName.toLowerCase()} «${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 30)}» ${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`)
  })
}

async function overflowX(page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
}

if (eaisDown) {
  const { page } = await newPage()
  await loginAs(page, 'admin')
  const setOnline = online => page.evaluate(async (value) => {
    const r = await fetch('/mock-eais/api/status', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ online: value }),
    })
    return { status: r.status, body: await r.json() }
  }, online)
  try {
    console.log('switch off:', JSON.stringify(await setOnline(false)))
    await page.locator('header').getByText('ЕАИС недоступна').first().waitFor({ timeout: 20000 })
    // Let the countdown (if a retry is scheduled) tick at least once.
    await page.waitForTimeout(2200)
    await page.locator('header').screenshot({ path: `${out}stage4-shell-eais-down${suffix}-header.png` })
    await page.screenshot({ path: `${out}stage4-shell-eais-down${suffix}.png` })
    await page.locator('header button', { hasText: 'ЕАИС недоступна' }).click()
    await page.getByRole('dialog').waitFor()
    await settle(page)
    await page.screenshot({ path: `${out}stage4-shell-eais-down${suffix}-details.png` })
    console.log('eais-down header text:', (await page.locator('header').innerText()).replace(/\s+/g, ' '))
    console.log('details:', (await page.getByRole('dialog').innerText()).replace(/\s+/g, ' '))
  }
  finally {
    console.log('switch back on:', JSON.stringify(await setOnline(true)))
    const status = await page.evaluate(async () => (await fetch('/mock-eais/api/status')).json())
    console.log('mock ЕАИС status after capture:', JSON.stringify(status))
    await page.keyboard.press('Escape')
    await page.locator('header').getByText('ЕАИС на связи').first().waitFor({ timeout: 20000 })
    console.log('header back online: yes')
  }
}
else {
  // Login
  if (want('login')) {
    const { page, context } = await newPage()
    await page.goto(`${base}/login`)
    await page.locator('h1').waitFor()
    await settle(page)
    await page.screenshot({ path: `${out}stage4-login.png` })
    // Validation on submit: the button is enabled, field messages appear.
    await page.click('button[type="submit"]')
    await page.getByText('Введите логин').waitFor()
    await page.screenshot({ path: `${out}stage4-login-validation.png` })
    console.log('login targets < 36 px:', JSON.stringify(await smallTargets(page)))
    await context.close()
  }
  if (want('login')) {
    const { page, context } = await newPage({ width: 375, height: 812 })
    await page.goto(`${base}/login`)
    await page.locator('h1').waitFor()
    await settle(page)
    await page.screenshot({ path: `${out}stage4-login-mobile.png`, fullPage: true })
    console.log('login 375 overflow-x px:', await overflowX(page))
    await context.close()
  }

  // Shell per role at 1920x1080
  for (const role of want('roles') ? ROLES : []) {
    const { page, context } = await newPage()
    await loginAs(page, role)
    await page.waitForTimeout(800)
    await page.screenshot({ path: `${out}stage4-shell-${role}.png` })
    const rail = await page.locator('nav[aria-label="Основное меню"]').first().locator('a').evaluateAll(as => as.map(a => a.getAttribute('href')))
    const labels = await page.locator('nav[aria-label="Основное меню"]').first().locator(':scope > div > p').allInnerTexts()
    const bell = await page.locator('button[aria-label^="Уведомления"]').count()
    console.log(`${role}: rail ${JSON.stringify(rail)} groups ${JSON.stringify(labels)} bell ${bell} title «${await page.title()}»`)
    console.log(`${role}: targets < 36 px: ${JSON.stringify(await smallTargets(page))}`)

    if (role === 'archivist') {
      // Bell open
      await page.locator('button[aria-label^="Уведомления"]').click()
      await page.getByRole('dialog').waitFor()
      await settle(page)
      await page.screenshot({ path: `${out}stage4-bell-open.png` })
      await page.keyboard.press('Escape')
      // ЕАИС details (online)
      await page.locator('header button', { hasText: 'ЕАИС на связи' }).click()
      await page.getByRole('dialog').waitFor()
      await settle(page)
      await page.screenshot({ path: `${out}stage4-eais-details.png` })
      await page.keyboard.press('Escape')
      // User menu
      await page.locator('header button', { hasText: 'Архивист Демо' }).click()
      await page.getByRole('menu').waitFor()
      await settle(page)
      await page.screenshot({ path: `${out}stage4-user-menu.png` })
      await page.keyboard.press('Escape')

      // Keyboard path: skip link → rail → header. Reload so focus starts at the document.
      await page.reload()
      await page.locator('main#main').waitFor()
      await page.locator('header').getByText(/ЕАИС (на связи|недоступна)/).first().waitFor()
      await settle(page)
      const path = []
      for (let i = 1; i <= 13; i++) {
        await page.keyboard.press('Tab')
        // Nuxt UI links and buttons transition their colours; read the settled focus style.
        await page.waitForTimeout(300)
        const info = await page.evaluate(() => {
          const el = document.activeElement
          const cs = getComputedStyle(el)
          const before = getComputedStyle(el, '::before')
          const outline = cs.outlineStyle !== 'none' ? `${cs.outlineWidth} ${cs.outlineColor}` : (before.outlineStyle !== 'none' ? `::before ${before.outlineWidth} ${before.outlineColor}` : 'none')
          return `${el.tagName.toLowerCase()} «${(el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40)}» in ${el.closest('nav') ? 'nav' : el.closest('header') ? 'header' : el.closest('main') ? 'main' : 'body'}, outline ${outline}`
        })
        path.push(`${i}. ${info}`)
        if (i === 1) await page.screenshot({ path: `${out}stage4-keyboard-1-skip.png`, clip: { x: 0, y: 0, width: 640, height: 200 } })
        if (i === 2) await page.screenshot({ path: `${out}stage4-keyboard-2-rail.png`, clip: { x: 0, y: 0, width: 640, height: 300 } })
        if (info.includes('ЕАИС')) await page.screenshot({ path: `${out}stage4-keyboard-3-header.png`, clip: { x: 1280, y: 0, width: 640, height: 120 } })
      }
      console.log(`keyboard path:\n  ${path.join('\n  ')}`)
      // Skip link moves focus to <main>
      await page.reload()
      await page.locator('main#main').waitFor()
      await page.keyboard.press('Tab')
      await page.keyboard.press('Enter')
      console.log('after skip link Enter, focus on:', await page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName))
    }

    // Logout through the user menu
    await page.locator('header button[aria-haspopup="menu"]').last().click()
    await page.getByRole('menuitem', { name: 'Выйти' }).click()
    await page.waitForURL(/\/login/)
    console.log(`${role}: logout → ${new URL(page.url()).pathname}`)
    await context.close()
  }

  // Session lost while in the shell: the cookie disappears, the next polls all answer 401 together.
  // Expect one redirect to /login?next=<current> and one toast, no loop.
  if (want('session')) {
    const { page, context } = await newPage()
    await loginAs(page, 'archivist')
    const navs = []
    page.on('framenavigated', f => f === page.mainFrame() && navs.push(new URL(f.url()).pathname + new URL(f.url()).search))
    await context.clearCookies()
    await page.waitForURL(/\/login\?next=/, { timeout: 15000 })
    await page.waitForTimeout(6000)
    const toasts = await page.locator('li[role="status"]').filter({ hasText: 'Сеанс завершён' }).count()
    console.log(`session lost: url ${new URL(page.url()).pathname}${new URL(page.url()).search}, navigations ${JSON.stringify(navs)}, session toasts ${toasts}`)
    await context.close()
  }

  // Mobile reader
  if (want('mobile')) {
    const { page, context } = await newPage({ width: 375, height: 812 })
    await loginAs(page, 'reader')
    await page.screenshot({ path: `${out}stage4-shell-mobile-reader.png` })
    console.log('mobile reader overflow-x px (drawer closed):', await overflowX(page))
    console.log('mobile reader targets < 36 px:', JSON.stringify(await smallTargets(page)))
    await page.locator('header button[aria-label]').first().click()
    await page.getByRole('dialog').waitFor()
    await settle(page)
    await page.screenshot({ path: `${out}stage4-shell-mobile-reader-drawer.png` })
    console.log('drawer links:', JSON.stringify(await page.getByRole('dialog').locator('a').evaluateAll(as => as.map(a => a.getAttribute('href')))))
    await page.getByRole('dialog').locator('a[href="/dela"]').click()
    await page.waitForURL(/\/dela/)
    // The slideover leaves the DOM once its exit animation ends.
    const closed = await page.getByRole('dialog').waitFor({ state: 'detached', timeout: 5000 }).then(() => true, () => false)
    console.log('drawer closes on navigation:', closed)
    await page.screenshot({ path: `${out}stage4-shell-mobile-reader-after-nav.png` })
    await context.close()
  }

  // ShifrPlate on the specimen
  if (want('shifr')) {
    const { page, context } = await newPage({ width: 1440, height: 900 })
    await loginAs(page, 'admin')
    await page.goto(`${base}/_specimen`)
    await page.locator('#sp-shifr').waitFor()
    await settle(page)
    const section = page.locator('section', { has: page.locator('#sp-shifr') })
    await section.scrollIntoViewIfNeeded()
    await section.screenshot({ path: `${out}stage4-shifrplate.png` })
    // 36 px rows: click the far end of each control row and the link in the required checkbox's description.
    const rows = await page.evaluate(() => ['sp-checkbox', 'sp-switch', 'sp-checkbox-required'].map((id) => {
      const el = document.getElementById(id)
      const root = el.closest('[data-slot="root"]')
      const r = root.getBoundingClientRect()
      const after = getComputedStyle(root.querySelector('[data-slot="label"]'), '::after').content
      return { id, w: Math.round(r.width), h: Math.round(r.height), labelAfter: after }
    }))
    console.log('control rows:', JSON.stringify(rows))
    for (const id of ['sp-checkbox', 'sp-switch', 'sp-checkbox-required']) {
      const root = page.locator(`#${id}`).locator('xpath=ancestor::*[@data-slot="root"][1]')
      await root.scrollIntoViewIfNeeded()
      const box = await root.boundingBox()
      // The required row's bottom-right corner is its description link, so probe its top-right corner instead.
      const y = id === 'sp-checkbox-required' ? box.y + 3 : box.y + box.height - 3
      const before = await page.locator(`#${id}`).getAttribute('data-state')
      await page.mouse.click(box.x + box.width - 3, y)
      const after = await page.locator(`#${id}`).getAttribute('data-state')
      console.log(`${id}: click at far ${id === 'sp-checkbox-required' ? 'top' : 'bottom'} corner ${before} → ${after}`)
    }
    const radio = page.locator('#sp-radio [role="radio"]').last()
    const item = radio.locator('xpath=ancestor::*[contains(@class,"min-h-9")][1]')
    await item.scrollIntoViewIfNeeded()
    const ib = await item.boundingBox()
    await page.mouse.click(ib.x + ib.width - 3, ib.y + 3)
    console.log('radio last item click at far top corner → checked:', await radio.getAttribute('data-state'))
    await page.locator('#sp-checkbox-link').scrollIntoViewIfNeeded()
    const linkBox = await page.locator('#sp-checkbox-link').boundingBox()
    const stateBefore = await page.locator('#sp-checkbox-required').getAttribute('data-state')
    await page.mouse.click(linkBox.x + linkBox.width / 2, linkBox.y + linkBox.height / 2)
    await page.waitForTimeout(300)
    console.log(`link in description: url hash ${new URL(page.url()).hash}, checkbox ${stateBefore} → ${await page.locator('#sp-checkbox-required').getAttribute('data-state')}`)
    await context.close()
  }
}

await browser.close()
console.log(errors.length ? `\nconsole errors:\n${errors.join('\n')}` : '\nno console errors')
