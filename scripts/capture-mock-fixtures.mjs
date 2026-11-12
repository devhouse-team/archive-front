#!/usr/bin/env node
// Snapshot the seeded backend into server/mock/fixtures.json for the offline mock (NUXT_PUBLIC_API_MOCK=1).
// Reads as admin, which sees every case; the mock applies the access rules itself.
// Server file paths (spool_path, archive_path, error_path) are dropped: they are never displayed.
//
//   node scripts/capture-mock-fixtures.mjs [http://127.0.0.1:8000]
import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const base = process.argv[2] || 'http://127.0.0.1:8000'
const out = fileURLToPath(new URL('../server/mock/fixtures.json', import.meta.url))

const login = await fetch(`${base}/api/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'admin', password: 'admin' }),
})
if (!login.ok) throw new Error(`login failed: ${login.status}`)
const cookie = login.headers.get('set-cookie').split(';')[0]

async function get(path) {
  const r = await fetch(`${base}${path}`, { headers: { cookie } })
  if (!r.ok) throw new Error(`${path}: ${r.status}`)
  return r.json()
}

const PATH_KEYS = new Set(['spool_path', 'archive_path', 'error_path', 'image_path', 'stored_path'])
const strip = value => JSON.parse(JSON.stringify(value, (k, v) => (PATH_KEYS.has(k) ? undefined : v)))

const dela = await get('/api/dela')
const delaDetail = []
const pages = []
for (const d of dela) {
  const detail = await get(`/api/dela/${d.id}`)
  delaDetail.push(detail)
  for (const p of detail.pages) {
    const page = await get(`/api/pages/${p.id}`)
    delete page.highlight_word_ids
    pages.push(page)
  }
}

const eaisCases = []
for (const c of await get('/mock-eais/api/cases')) eaisCases.push(await get(`/mock-eais/api/cases/${c.id}`))

const fixtures = strip({
  capturedAt: new Date().toISOString(),
  source: 'astana-archive demo seed',
  users: await get('/api/users'),
  health: await get('/api/health'),
  notifications: (await get('/api/notifications')).items,
  files: await get('/api/m1/files?limit=500'),
  journal: await get('/api/m1/journal?limit=200'),
  statsDay: await get('/api/m1/stats?period=day'),
  statsMonth: await get('/api/m1/stats?period=month'),
  dela: delaDetail,
  pages,
  eaisCases,
})

await writeFile(out, `${JSON.stringify(fixtures, null, 1)}\n`)
console.log(`wrote ${out}: ${fixtures.dela.length} дела, ${fixtures.pages.length} pages, ${fixtures.files.length} files`)
