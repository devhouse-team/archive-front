# Stage 9 backlog (minors carried from the stage reviews)

## From Stage 4
- [ ] **Honest state:** `eaisView()` must return the «нет данных» view while the last `/api/health` poll failed. Today stale data keeps claiming «ЕАИС на связи» (`app/stores/health.ts:34`, `app/utils/eais.ts:50`). Highest priority among the minors (PRODUCT principle 5).
- [ ] The mobile drawer dialog's accessible name is «Открыть боковую панель». Set it to `t('nav.label')` (`app/layouts/default.vue:62`).
- [ ] ShifrPlate link focus: add an explicit `focus-visible:outline-2 focus-visible:outline-primary` (`app/components/ShifrPlate.vue:44`).
- [ ] Drop the redundant `title` on the UserMenu trigger (`app/components/UserMenu.vue:50`).
- [ ] Boot performance: about 6.5 s of long tasks before `/login` first paints and about 5 s while the shell mounts (headless; the environment inflates this). Measure on a normal desktop session.

## From Stage 7
- [ ] The «Загружено сегодня» tile links to every uploaded file, not today's (`app/components/ops/OpsStatTiles.vue:29`). Relabel it or add a date filter.
- [ ] Journal `details` show inbox relpaths (`ws1/1/1/12/blank.png`), while /upload shows the base name (`app/pages/journal.vue:111`, `OpsRecentEvents.vue:99`). Pick one policy; the base name is safer.
- [ ] `checkCase` uses the `'silent'` mode, so a 401 during the live check doesn't redirect (`app/composables/useOps.ts:128`). Use `'background'` (shared `useApi`).
- [ ] Ops panel: the failed OCR jobs list with «Повторить» (`POST /api/m1/jobs/{id}/retry`) and the «Отправить принудительно» (force) action from the reference UI are not built.
- [ ] A cold load of /ops makes 2 queue requests at mount. Dedupe the in-flight request in `useQueueStore().refresh()` (`app/pages/ops.vue:42-45`).
- [ ] The dev backend holds one Stage 7 test upload (`stage7-test.png`, invalid «Шифр не определён»). Reset the seed if a clean demo is wanted.

## From Stage 8 (designer's notes)
- [ ] Plurals («лист(ов)») in the re-OCR toast and the modal description.
- [ ] The gap tile footer is slightly taller than the page tile footers.
- [ ] /api/dela has no `langs`, so the Языки column fetches each case's detail. Ask the backend to add `langs` to the list.
- [ ] Full `pnpm test` timeouts under load (login and shell tests hit 5 s with four dev servers running). Re-run on a quiet machine; raise `testTimeout` if needed.

## From Stage 5 (designer's notes)
- [ ] Real-backend check of the viewer (blocked by permissions for the designer; needs the user's OK).
- [ ] Replace the native `window.confirm` (unsaved edits on leave, discard, re-OCR with corrections) with UModal.
- [ ] Not exercised in a browser: «Отметить проверенной» → `next_review_id` / empty-queue toast, export downloads, retry. The save toast is not visually proven.
- [ ] Confirm the new icons (`i-lucide-save`, `image`, `text`, `file-x`) appear in the production icon bundle (`pnpm build && pnpm check:offline`).

## From Stage 6 (designer's notes)
- [ ] Decide whether a header search box (→ `/search?q=`) is still wanted. It would mean editing the shared header.
- [ ] The delete-collection modal's name goes blank during the close animation.
- [ ] Pagination not exercised on real data (only 5 cases). The save-query and history popovers were not screenshotted.
- [ ] Page-mount tests under machine load: consider a global `testTimeout` of 30 s.
- [ ] Admin role change saves on select with no confirmation. Confirm when demoting an admin, or offer undo (`AdminUsers.vue:159-168`).
- [ ] Viewer: floor confidence to one decimal when the threshold is fractional (vlm 96,5).
- [ ] Viewer: the save toast covers the edit footer at 1920×1080.
- [ ] Viewer: «Скан / Текст» and «Просмотр / Правка» are UTabs without tabpanels. Use tabpanels or aria-pressed buttons.
- [ ] Collections store: «already added» only knows this tab's adds, and `n` isn't decremented on removal. Refresh from the server (`stores/collections.ts:56-63`).
- [ ] Search: a `creator` from the URL can only be cleared via «Сбросить фильтры». Add its own clear button (`SearchFilters.vue:215-220`).
