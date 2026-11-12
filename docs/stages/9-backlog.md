# Stage 9 backlog (minors carried from the stage reviews)

## From Stage 4
- [ ] **Honest state:** `eaisView()` must return the «нет данных» view while the last `/api/health` poll failed. Today stale data keeps claiming «ЕАИС на связи» (`app/stores/health.ts:34`, `app/utils/eais.ts:50`). Highest priority among the minors (PRODUCT principle 5).
- [ ] The mobile drawer dialog's accessible name is «Открыть боковую панель». Set it to `t('nav.label')` (`app/layouts/default.vue:62`).
- [ ] ShifrPlate link focus: add an explicit `focus-visible:outline-2 focus-visible:outline-primary` (`app/components/ShifrPlate.vue:44`).
- [ ] Drop the redundant `title` on the UserMenu trigger (`app/components/UserMenu.vue:50`).
- [ ] Boot performance: about 6.5 s of long tasks before `/login` first paints and about 5 s while the shell mounts (headless; the environment inflates this). Measure on a normal desktop session.
