# archive-frontend — «Цифровой архив Астаны»

Frontend for the Astana city archive: scan → upload (M1) → OCR (M2) → full-text search (M3).
Product, roles, API contract and data rules: **`docs/FRONTEND_HANDOFF.md`** (source of truth for product facts).
Product context: `PRODUCT.md`. Visual system: `DESIGN.md`. Stage tracker: `docs/stages/STATUS.md`.

## Stack

Nuxt 4 (SPA, `ssr: false`) · Vue 3 · TypeScript strict · Pinia · Nuxt UI v4 · Tailwind CSS v4 · pnpm · Vitest.
Backend: FastAPI, cookie session, JSON under `/api`. Dev proxies `/api` and `/mock-eais` to `http://127.0.0.1:8000`; with `NUXT_PUBLIC_API_MOCK=1` the Nitro mock in `server/mock/` answers instead.

## Layout

```
app/
  assets/css/main.css     Tailwind + Nuxt UI import, @theme tokens, @font-face
  app.config.ts           Nuxt UI colours and component defaults
  composables/            useApi, usePolling, useLangDir, ...
  stores/                 auth, health, notifications, queue (Pinia)
  middleware/             auth.global.ts (session + role gate)
  locales/ru.ts           shared strings; area strings in locales/ru/{viewer,search,ops,cases}.ts
  components/             ShifrPlate, ScriptBadge, YearChip, shell (AppRail, EaisIndicator, NotificationBell, UserMenu)
                          + per-area folders viewer/ search/ collections/ ops/ dela/ admin/
  utils/                  access (role matrix), nav, civic-ui, eais, shifr, status, format (plural, baseNames)
  types/api.ts            API types from handoff §5
  pages/                  /login /search /page/[id] /dela /collections /ops /upload /errors /journal /review /admin
server/mock/              offline mock API built from handoff §5 examples
```

## Hard rules

- **Offline / on-prem:** no CDN, Google Fonts, remote icon API or analytics. Fonts from `@fontsource` packages bundled by Vite (Cyrillic, Kazakh ә ғ қ ң ө ұ ү һ і, Yanalif Latin, Arabic); `ui.fonts: false`. Icons from local `@iconify-json/*`, never the Iconify API.
- **Nuxt UI semantic colours and project aliases only** (`text-muted`, `bg-elevated`, `primary`, `bg-rail`, `bg-locator`...). No raw palette classes. Token authority: `docs/stages/2-design-system.md`.
- **Strings** only in `app/locales/ru.ts` via `t()`. UI language is Russian; Kazakh may come later.
- **Escaping:** `v-html` only for search `snippet_html` (pre-escaped server-side, `<mark>` only).
- **Requests:** `credentials: 'same-origin'`. No tokens or session data in localStorage.
- **Roles** (handoff §2): items a role can't use are not rendered. Restricted cases: never hint they exist to non-editors; 🔒 for editors only. STAFF = admin, archivist, operator. EDITORS = admin, archivist.
- **Errors** (handoff §3): body `{"detail": "<ready Russian message>"}`. 401 → `/login?next=`; 403 «Нет доступа»; 404 = not found or hidden, same UI; 400 → show `detail`.
- **Data** (handoff §4): word boxes scale by `displayedWidth / width`; `conf < (page.low_word_conf ?? 60)` is low (60 Tesseract, 96.5 vlm); group words by `line`, order by `idx`; `kk-arab` → `dir="rtl"`, mixed lists → `dir="auto"`; never display server paths; poll via `usePolling()` only, stopped on leave.
- **a11y:** AA contrast, visible focus, keyboard path, 36 px targets, `role="status"` toasts.

## Design system

`DESIGN.md` (sidecar `.impeccable/design.json`) is written from the shipped build and is the visual reference. The token spec `docs/stages/2-design-system.md` holds the contrast evidence and the verification notes for Nuxt UI 4.12. Key conventions:
- One primary button per view or list (solid on the first row only). Re-OCR and export are neutral outline. Red appears only for errors and inside destructive confirm dialogs.
- Success is quiet (a muted check plus text); errors keep the soft red badge.
- Шифр is always a `ShifrPlate` (full on page context, compact in lists). Scripts use `ScriptBadge`, years use `YearChip`.
- Low-confidence threshold: `page.low_word_conf ?? 60` (Tesseract 60, vlm 96.5).
- Toggles are `aria-pressed` button groups, not UTabs without panels.
- Honest state: never show stale health as live. Failed polls show «нет данных».

## Workflow

Staged build run by the `orchestrator` agent (`claude --agent orchestrator`): brief → `designer` → `reviewer` → gate. A stage is done only with a reviewer PASS saved in `docs/stages/<n>-review.md`.
Agent behaviour is gated by the eval suite in `evals/agents/` (see its README). Re-run it after changing any file in `.claude/agents/`.
Parallel stages follow `docs/stages/parallel-rules.md` (one locale file per area, assigned ports, additive-only edits to shared files). Open follow-ups live in `docs/stages/9-backlog.md`.
After each stage passes review: commit and push to `origin/main`, staging only that stage's files.
Never stop, restart or kill the backend on :8000. `../astana-archive` is read-only.

## Commands

```bash
pnpm dev                      # proxy mode (needs backend on :8000)
NUXT_PUBLIC_API_MOCK=1 pnpm dev   # mock mode
pnpm typecheck && pnpm lint && pnpm test
pnpm build && pnpm check:offline
pnpm check:glyphs                 # font coverage: Kazakh, Yanalif, Töte
node scripts/smoke-roles.mjs http://localhost:3000   # role/route smoke (proxy or mock)
# env NUXT_PUBLIC_DEMO_ACCOUNTS=0 hides the login demo chips and the rail «Демо-данные» footer (see nuxt.config.ts)
```
