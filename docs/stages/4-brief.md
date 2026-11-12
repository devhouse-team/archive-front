# Stage 4 brief: shell and auth

## Goal

The real login screen and the civic app shell that every later screen lives in: rail, header with the ЕАИС indicator, notification bell, user menu and menu counters. Plus the `ShifrPlate` signature component, which later stages place on every screen that shows a шифр.

Stage 3's interim `app/layouts/default.vue` and `app/pages/login.vue` are replaced. Placeholder product pages stay placeholders (Stage 5+), but they now render inside the real shell.

## Sources

- **Rules:** `CLAUDE.md`.
- **Tokens and components:** `docs/stages/2-design-system.md`, including "Signature components → ShifrPlate", "Spacing, radius, density" (rail 220 px, header 56 px), "Sketch corrections" and the "Stage 3 verification note". It wins over the sketch.
- **Composition reference:** `.impeccable/mocks/decision/assigned.html` (rail, header, plate). Direction contract: `.impeccable/surfaces/app-pages-page-id-vue.md` (the shell is shared by that surface).
- **Handoff:** §2 roles, §3 errors, §5.1 auth/health/notifications, §5.2 `m1/queue` counters, §5.3 `review` count, §6 #1 and #12 plus the header paragraph under §6, §7, §8.
- **Stage 3 plumbing to reuse, not rewrite:** `app/utils/nav.ts` (`navForRole`, `isNavActive`), `app/utils/civic-ui.ts` (verified rail and header focus classes), `app/utils/access.ts`, stores `auth`, `health`, `notifications`, `queue`, `useNotify`, `usePolling`, `useT`.
- **Backend:** `../astana-archive` is read-only. The reference UI `app/static/app.js` shows current behaviour (login chips, header, bell). Live dev backend at `http://127.0.0.1:8000`: **do not start, stop or kill anything on :8000**; run your own dev server on 3000/3001.

## Deliverables

1. **`/impeccable shape`** for the shell and for login before building. Save each shape result as a surface brief in `.impeccable/surfaces/` (shell: `app-layouts-default-vue.md`; login: `app-pages-login-vue.md`). Both inherit the «Адрес архива» world; the shell must not drift from the page-viewer contract.
2. **Login (§6 #1)** in the `bare` layout.
   - Product name «Цифровой архив Астаны» from `ru.ts`; no institution name (PRODUCT.md).
   - Username and password with labels, autocomplete attributes, show-password toggle, submit with loading state; 400/401 shows the server `detail` inline, not only as a toast.
   - **One-click demo-account chips** for admin, archivist, operator and reader (role names from `ru.ts`). They are controlled by `runtimeConfig.public.demoAccounts` (default `true` for this MVP; document the env var `NUXT_PUBLIC_DEMO_ACCOUNTS=0`).
   - Honours `?next=` through the existing safe-next helper; otherwise the role's start route.
   - Already logged in → redirect to the start route.
   - Operate mode, not a marketing page: no hero art, no eyebrow, no gradient.
3. **App shell** (`app/layouts/default.vue`), built with Nuxt UI dashboard components (`UDashboardGroup`, `UDashboardSidebar`, `UDashboardPanel`/`UDashboardNavbar` as the nuxt-ui `dashboard` reference prescribes).
   - **Rail** (civic, 220 px) rendered from `navForRole()`: bilingual group labels (Kazakh · Russian, Kazakh half `lang="kk"`), empty groups not rendered, active item via `isNavActive` with `aria-current="page"`, counters: «Ошибки» = `files.invalid` (error badge), «Очередь проверки» = review count (neutral badge); counters hidden when 0 and not fetched for roles that lack the screen.
   - **Header** (56 px): page title slot, **ЕАИС indicator** (online: neutral/success; offline: «ЕАИС недоступна» plus `next_retry_in` countdown ticking every second between 5 s polls; text, not colour alone), the **bell**, the **user menu** (full name, `role_ru`, «Выйти»).
   - Also surface `disk_low` and any worker with `ok: false` in the indicator's popover for STAFF; readers see only the ЕАИС state.
   - **Mobile (< 1024 px):** the rail collapses to a drawer (`UDashboardSidebar` mobile behaviour) with a 36 px+ toggle in the header. Readers use search and page view on mobile; nothing may scroll horizontally at 375 px.
   - **Skip link** «К содержимому» as the first tab stop, targeting the main region.
   - `<main>` landmark, rail as `<nav aria-label=…>`, header as `<header>`.
4. **Notification bell (§6 #12)**, STAFF only (`/api/notifications` is S; readers get no bell and no request).
   - Unread count badge (hidden at 0, «99+» cap), popover listing the last 20 with level icon + text label, timestamp, unread marker; «Отметить все прочитанными» → `POST /api/notifications/read`, then refresh.
   - Polls through the `notifications` store at a modest interval (30 s); new `error`-level items while the app is open raise one `useNotify` toast each (`role="status"`), never a burst on first load.
   - Empty, loading and error states with locale copy.
5. **`ShifrPlate`** (`app/components/ShifrPlate.vue`) per spec: full plate variant with 10 px bilingual micro-labels, `role="group"` + `aria-label` from the `ru.ts` template, micro-labels and chevrons `aria-hidden`, segments as links where a target exists, `current` segment with `aria-current="page"` and the gold dot; **compact** inline variant `Ф.1 Оп.1 Д.12 · л.3` with `tabular-nums`. Props are typed from `app/types/api.ts`; missing parts (no лист) render without empty segments. Show it on `/_specimen` with long values (e.g. Ф.1234 Оп.12 Д.10345 л.999).
6. **Page titles:** `useHead` title per route from `ru.ts` («Поиск — Цифровой архив Астаны»).
7. **Session behaviour:** a 401 from any call while in the shell goes to `/login?next=<current>` once (no redirect loops, no parallel toasts); logout clears stores and stops all polling.
8. **Toast performance follow-up from Stage 3:** profile the first toast in the real shell (headed or headless with CPU throttle off). If the long task reproduces in the production build, find the cause; if not, record that it is environment-only.
9. **Carried from Stage 3 review** (`docs/stages/3-review.md`, `.3-review-round1.txt`, `.3-review-round2.txt`):
   - Login submit stays **enabled**; validate on submit with field-level messages (round 1 #7).
   - Don't carry the interim layout's 24 px app-name link; `PageErrorState` should not put `role="alert"` on the whole section: focus its heading on mount, or use `role="status"` (round 1 #8).
   - The checkbox/switch/radioGroup label `::after` overlay conflicts with Nuxt UI's `required` asterisk (also `::after`) and covers links in the label or description. Move the full-row hit area to a slot or pseudo-element that has no other use, keep `required` working and links clickable, re-measure the 36 px rows, and record the limits in the spec's Stage 3 note (round 2 #1, #3).
   - `download()` in `useApi` keeps the server `detail` on a 404, because it is only called for objects already on screen (e.g. «Нет распознанных страниц»). Every other 404 keeps the generic «Не найдено» (round 2 #2). Add a test.
10. **Tests (Vitest):** ShifrPlate aria-label and segment rendering (with and without лист, long values); rail renders only `navForRole` items and hides empty groups; counters not requested for roles without the screen; bell absent for reader; ЕАИС indicator countdown formatting; login safe-next redirect.

## Exit criteria

- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build && pnpm check:offline`, `pnpm check:glyphs` pass.
- [ ] `scripts/smoke-roles.mjs` extended and passing in proxy mode (and mock mode): for each role the rail shows exactly the §2 screens; bell present for STAFF only; logout works; no console errors.
- [ ] ЕАИС outage shown: toggle the demo switch as admin via `POST /mock-eais/api/status {online:false}` against the dev backend, capture the header in outage state, then switch it back `{online:true}`. Leave the backend online when done.
- [ ] Screenshots in `.impeccable/review/`: `stage4-login.png`, `stage4-shell-<role>.png` for all 4 roles at 1920×1080, `stage4-shell-eais-down.png`, `stage4-bell-open.png`, `stage4-shell-mobile-reader.png` (375×812, drawer open and closed), `stage4-shifrplate.png`, plus a keyboard tab-through capture of skip link → rail → header.
- [ ] Every interactive element ≥ 36 px; visible focus on civic and light grounds; AA contrast.
- [ ] Reviewer PASS (0 critical, 0 major).

## Out of scope

- Real product screens (search, page viewer, ops…): Stage 5+.
- LocatorPin and line grid: Stage 5.
- DESIGN.md: end of Stage 5.
