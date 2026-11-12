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
