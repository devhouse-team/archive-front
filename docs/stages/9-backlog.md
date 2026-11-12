# Stage 9 backlog (minors carried from the stage reviews)

## From Stage 4
- [x] **Honest state:** `eaisView()` must return the «нет данных» view while the last `/api/health` poll failed. Today stale data keeps claiming «ЕАИС на связи» (`app/stores/health.ts:34`, `app/utils/eais.ts:50`). Highest priority among the minors (PRODUCT principle 5). (Stage 9: `eaisView(…, stale)` + `health.stale`; test in shell.test.ts)
- [x] The mobile drawer dialog's accessible name is «Открыть боковую панель». Set it to `t('nav.label')` (`app/layouts/default.vue:62`). (Stage 9: `menu.title`)
- [x] ShifrPlate link focus: add an explicit `focus-visible:outline-2 focus-visible:outline-primary` (`app/components/ShifrPlate.vue:44`). (Stage 9)
- [x] Drop the redundant `title` on the UserMenu trigger (`app/components/UserMenu.vue:50`). (Stage 9)
- [ ] Boot performance: about 6.5 s of long tasks before `/login` first paints and about 5 s while the shell mounts (headless; the environment inflates this). Measure on a normal desktop session.

## From Stage 7
- [x] The «Загружено сегодня» tile links to every uploaded file, not today's (`app/components/ops/OpsStatTiles.vue:29`). Relabel it or add a date filter. (Stage 9: relabelled, «открыть все загруженные» under the label)
- [x] Journal `details` show inbox relpaths (`ws1/1/1/12/blank.png`), while /upload shows the base name (`app/pages/journal.vue:111`, `OpsRecentEvents.vue:99`). Pick one policy; the base name is safer. (Stage 9: `baseNames()` in utils/format, journal + recent events)
- [x] `checkCase` uses the `'silent'` mode, so a 401 during the live check doesn't redirect (`app/composables/useOps.ts:128`). Use `'background'` (shared `useApi`). (Stage 9)
- [ ] Ops panel: the failed OCR jobs list with «Повторить» (`POST /api/m1/jobs/{id}/retry`) is not built. (The «Отправить принудительно» action now exists on /errors, integration pass 2026-11-12.)
- [x] A cold load of /ops makes 2 queue requests at mount. Dedupe the in-flight request in `useQueueStore().refresh()` (`app/pages/ops.vue:42-45`). (Stage 9: shared in-flight promise; test)
- [ ] The dev backend holds one Stage 7 test upload (`stage7-test.png`, invalid «Шифр не определён»). Reset the seed if a clean demo is wanted.

## From Stage 8 (designer's notes)
- [x] Plurals («лист(ов)») in the re-OCR toast and the modal description. (Stage 9: `plural()` in utils/format, `plural.leaf` in ru.ts)
- [ ] The gap tile footer is slightly taller than the page tile footers.
- [x] /api/dela has no `langs`, so the Языки column fetches each case's detail. Ask the backend to add `langs` to the list. (Integration pass 2026-11-12: the list reads `langs`, the per-case fetch is gone; falls back to `lang_override`)
- [x] Full `pnpm test` timeouts under load (login and shell tests hit 5 s with four dev servers running). Re-run on a quiet machine; raise `testTimeout` if needed. (Stage 9: `testTimeout: 30_000`)

## From Stage 5 (designer's notes)
- [ ] Real-backend check of the viewer (blocked by permissions for the designer; needs the user's OK).
- [ ] Replace the native `window.confirm` (unsaved edits on leave, discard, re-OCR with corrections) with UModal.
- [ ] Not exercised in a browser: «Отметить проверенной» → `next_review_id` / empty-queue toast, export downloads, retry. The save toast is not visually proven.
- [ ] Confirm the new icons (`i-lucide-save`, `image`, `text`, `file-x`) appear in the production icon bundle (`pnpm build && pnpm check:offline`).

## From Stage 6 (designer's notes)
- [ ] Decide whether a header search box (→ `/search?q=`) is still wanted. It would mean editing the shared header.
- [ ] The delete-collection modal's name goes blank during the close animation.
- [ ] Pagination not exercised on real data (only 5 cases). The save-query and history popovers were not screenshotted.
- [x] Page-mount tests under machine load: consider a global `testTimeout` of 30 s. (Stage 9: `testTimeout: 30_000`)
- [x] Admin role change saves on select with no confirmation. Confirm when demoting an admin, or offer undo (`AdminUsers.vue:159-168`). (Stage 9: confirm modal when demoting an admin)
- [x] Viewer: floor confidence to one decimal when the threshold is fractional (vlm 96,5). (Stage 9: `confShown()`)
- [x] Viewer: the save toast covers the edit footer at 1920×1080. (Stage 9: toasts lifted to `bottom-24` on /page)
- [x] Viewer: «Скан / Текст» and «Просмотр / Правка» are UTabs without tabpanels. Use tabpanels or aria-pressed buttons. (Stage 9: aria-pressed button groups)
- [x] Collections store: «already added» only knows this tab's adds, and `n` isn't decremented on removal. Refresh from the server (`stores/collections.ts:56-63`). (Stage 9: reload on popover open, after add and after removal; «уже есть» from the server count)
- [x] Search: a `creator` from the URL can only be cleared via «Сбросить фильтры». Add its own clear button (`SearchFilters.vue:215-220`). (Stage 9: own clear button)
- [x] Search: the past-end status note flashes before the auto-redirect (`search.vue:104-107`). Optional. (Stage 9: stays loading until page 1 answers)
- [x] Viewer mobile: on the default «Скан» tab the first hl box is below the fold at 375 px. Also scroll the window (`ViewerScanPane.vue:95-111`). (Stage 9: page scroller follows the box)
- [x] Viewer: the mode-switch guard uses a 400 ms timing window. Simplify to the `modeSwitching` flag (`[id].vue:222-240`). (Stage 9: dropped with the tabs; flag only)

## After Stage 9 (open)
- [ ] ShifrPlate focus ring is white for ~150 ms (transition-colors animates outline-color). Use `transition-[background-color]` (`ShifrPlate.vue:78`).
- [ ] Scan line-number radius 3px is off the token scale (`ViewerScanPane.vue:354`).
- [ ] `revealSelected()` page scroll should apply only below `lg`; check at 1280×720 (`ViewerScanPane.vue:134-155`).
- [ ] OpsStatTiles.vue:71 uses a 28 px font size off the type scale (impeccable advisory).
- [x] Leaf-navigation address labels («← л.2 · 3 из 5 · л.4 →») need neighbouring leaf numbers from the API. (Integration pass: `prev_leaf`/`next_leaf`, labels absent on an older backend)
- [ ] **Needs the user:** run the role smoke (`scripts/smoke-roles.mjs`) and the viewer check against the real backend. Permission-system denials blocked both for agents.
- [ ] Still open from earlier stages: boot performance on a normal desktop, the failed-OCR jobs list on /ops, the header search box decision, the delete-collection modal blanking, pagination on real data, UModal instead of `window.confirm`, the gap-tile footer.

## From the Stage 10 docs review (minor)
- [ ] DESIGN.md: the empty-state rule doesn't cover the shipped «all clear» success variant (/errors, /review) or the /search fuzzy-retry primary. Record them as exceptions, or align the screens.
- [ ] DESIGN.md: reset actions are neutral ghost on /dela but neutral outline on /search. Pick one rule.
- [ ] DESIGN.md: the scan-side line band also has 1 px civic 22 % top and bottom rules; document them.
- [ ] DESIGN.md / design.json: other mentions of the header-search token and component should also be marked "specimen only".
- [ ] docs/FRONTEND_HANDOFF.md §4 still says `conf < 60`. Note the `low_word_conf` drift there, or ask the backend owner to update the handoff.

## From the Stage 2 audit (integration pass 2026-11-12)
- [x] F1 /errors actions by reason: force behind a UModal, «Исправить шифр» only for шифр reasons, resend hidden where it cannot help.
- [x] F2 `ru-old`: type, labels, filters, re-OCR options, URL, mock page, raw-key fallback (`langLabel`).
- [x] F4 + UX P0/P1 /upload: reason, `last_error` and a next-step hint in the queue; шифр first; clearer hint; scanner picker explained and remembered; confirm before sending to an unknown case; new rows highlighted; uploaded rows link to the case.
- [x] F9, F10, F13 (`SMOKE_TIMEOUT_MS`, default 90 s), F14 (health copy mentions ru-old).
- [ ] /upload «К ошибкам» opens /errors, not that file's row (the screen has no `?file=` focus yet).
- [ ] F14: the failed-OCR retry list on /ops.
