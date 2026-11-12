#!/usr/bin/env node
// Offline guard (handoff §7, CLAUDE.md): the built SPA must not reference remote hosts.
// Run after `nuxt build`. Scans .output/public for http(s):// and protocol-relative //host URLs and the known CDN
// hosts in CSS, JS and HTML. `node scripts/check-offline.mjs <dir>` scans another directory (used to test the check).
// Fails on any hit that is not on the allowlist below.
import { readdir, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.argv[2] || fileURLToPath(new URL('../.output/public', import.meta.url))
const EXTENSIONS = /\.(?:css|js|mjs|html|json|webmanifest|svg)$/i

// Always fatal, wherever they appear.
const FORBIDDEN_HOSTS = /fonts\.googleapis\.com|fonts\.gstatic\.com|api\.iconify\.design|api\.simplesvg\.com|api\.unisvg\.com|cdn\.jsdelivr\.net|unpkg\.com/i
// Any absolute URL to a host: https://, http:// or protocol-relative //host.tld (CSS url(//…), "//cdn…").
const URL_RE = /(?:https?:)?\/\/[a-z0-9.-]+\.[a-z]{2,}[^\s"'`)<>\\]*/gi

/**
 * Strings that are text, not fetches. Each entry needs a reason; nothing here is ever requested.
 */
const ALLOW = [
  { re: /^(?:https?:)?\/\/www\.w3\.org\/(?:2000\/svg|1999\/xlink|1999\/xhtml|XML\/1998\/namespace|1998\/Math\/MathML)$/, why: 'XML/SVG namespace identifier' },
  { re: /^https:\/\/tailwindcss\.com$/, why: 'Tailwind CSS license comment' },
  { re: /^https:\/\/vuejs\.org\/error-reference\//, why: 'Vue runtime error message text' },
  { re: /^https:\/\/nuxt\.com\/docs\/[\w.]+\/errors\//, why: 'Nuxt runtime error message text' },
  { re: /^https:\/\/[ab]\.invalid\/probe\/$/, why: 'URL-parsing probe on the reserved .invalid TLD (RFC 2606), unresolvable' },
]

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name)
    if (entry.isDirectory()) yield* walk(p)
    else if (EXTENSIONS.test(entry.name)) yield p
  }
}

let files = 0
const hits = []
try {
  for await (const file of walk(root)) {
    files++
    const text = await readFile(file, 'utf8')
    const rel = relative(root, file)
    for (const m of text.matchAll(URL_RE)) {
      const url = m[0]
      if (FORBIDDEN_HOSTS.test(url) || !ALLOW.some(a => a.re.test(url))) {
        hits.push({ rel, url, context: text.slice(Math.max(0, m.index - 60), m.index + url.length + 20).replace(/\s+/g, ' ') })
      }
    }
    const host = FORBIDDEN_HOSTS.exec(text)
    if (host && !hits.some(h => h.rel === rel && h.url.includes(host[0]))) {
      hits.push({ rel, url: host[0], context: text.slice(Math.max(0, host.index - 60), host.index + 60).replace(/\s+/g, ' ') })
    }
  }
}
catch (e) {
  if (e.code === 'ENOENT') {
    console.error('check:offline: .output/public not found. Run `pnpm build` first.')
    process.exit(2)
  }
  throw e
}

if (hits.length) {
  console.error(`check:offline FAILED: ${hits.length} remote reference(s) in ${files} files`)
  for (const h of hits) console.error(`  ${h.rel}: ${h.url}\n      …${h.context}…`)
  process.exit(1)
}
console.log(`check:offline passed: ${files} files in ${relative(process.cwd(), root) || root}, no remote URLs (allowlist: ${ALLOW.map(a => a.why).join('; ')})`)
