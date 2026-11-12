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
  locales/ru.ts           every user-facing string
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
- **Data** (handoff §4): word boxes scale by `displayedWidth / width`; `conf < 60` is low; group words by `line`, order by `idx`; `kk-arab` → `dir="rtl"`, mixed lists → `dir="auto"`; never display server paths; poll via `usePolling()` only, stopped on leave.
- **a11y:** AA contrast, visible focus, keyboard path, 36 px targets, `role="status"` toasts.

## Workflow

Staged build run by the `orchestrator` agent (`claude --agent orchestrator`): brief → `designer` → `reviewer` → gate. A stage is done only with a reviewer PASS saved in `docs/stages/<n>-review.md`.
Agent behaviour is gated by the eval suite in `evals/agents/` (see its README). Re-run it after changing any file in `.claude/agents/`.

## Commands

```bash
pnpm dev                      # proxy mode (needs backend on :8000)
NUXT_PUBLIC_API_MOCK=1 pnpm dev   # mock mode
pnpm typecheck && pnpm lint && pnpm test
pnpm build && pnpm check:offline
```
