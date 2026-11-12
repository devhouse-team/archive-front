# Stage 9 brief: harden and finish (compressed)

The user has a hard stop at 11:00 on 2026-11-12. Stages 3–8 have all passed review. Stage 9 has two parts, run in parallel:
- the **designer** works through the backlog below;
- the **impeccable-finish-reviewer** reviews the whole app, read-only.

The designer then fixes the finish review's material findings in one pass, and the reviewer gates once.

## Baseline (orchestrator, 07:25)

typecheck 0 · lint 0 · test 218/218 · build 0 · check:offline 84 files clean · check:glyphs pass.

## Part A: backlog, in priority order

Source: `docs/stages/9-backlog.md`. Tick each item there as it is done.

**P1: honesty and accessibility**
1. Header ЕАИС indicator: show the «нет данных» view while the last `/api/health` poll failed. It must never claim «ЕАИС на связи» from stale data. (`app/utils/eais.ts`, `app/stores/health.ts`, `EaisIndicator*`.) Add a test.
2. Viewer: «Скан / Текст» and «Просмотр / Правка» are UTabs without tabpanels. Use `aria-pressed` button groups like `/ops`, or real tabpanels.
3. Viewer on mobile: on the «Скан» tab the first hit is below the fold at 375 px. Scroll the window to it too.
4. Admin: changing a role saves on select with no confirmation. Confirm when demoting an admin, or offer undo.
5. Mobile drawer accessible name → `t('nav.label')`. ShifrPlate link focus → explicit 2 px outline. Remove the UserMenu `title`.
6. `checkCase` uses `'silent'`, so a 401 is never redirected. Use `'background'`.

**P2: correctness**

7. `useQueueStore().refresh()`: dedupe in-flight requests. This fixes the cold-load double request on /ops.
8. Collections store: refresh `n` and the "already added" state from the server when the popover opens or after an add or remove.
9. Journal `details` and recent events: show the base name, not the inbox relpath.
10. Viewer: floor confidence to one decimal when the threshold is fractional.
11. Viewer: the save toast covers the edit footer. Pad the footer or move the toasts.
12. Viewer: simplify the mode-switch guard by dropping the 400 ms window if the `modeSwitching` flag is enough.
13. Search: a `creator` filter needs its own clear control. The past-end status note shouldn't flash before the redirect.
14. Ops: the «Загружено сегодня» tile target label matches what it links to.
15. Plurals: use one `plural()` helper (in `app/utils/format.ts`) for «лист/листа/листов», «дело/дела/дел» and similar. Replace «лист(ов)».
16. Vitest: set a global `testTimeout` of 30 s so page-mount tests don't flake under load.

**P3, only if time allows:** replace native `window.confirm` in the viewer with UModal confirmations. Fix the gap-tile footer height.

## Part B: finish-review fixes

After Part A, the orchestrator sends the finish reviewer's material findings. Fix critical and major findings, and the cheap minor ones.

## Rules

- No parallel designers now, so all files are yours. Edit shared files with care.
- Dev server on 3000 or 3100, proxy mode. Never touch :8000. `../astana-archive` is read-only.
- You may run `pnpm build` (you are the only builder now).
- Real-backend logins: other agents logged in as the demo users through the proxy without trouble. If the permission system denies you a login, do not route around it. Use Playwright-routed fixtures and say so.
- No mutations on the dev backend: intercept POST, PATCH and DELETE, or use mock data.
- Don't commit.

## Exit

- typecheck, lint, test, build, check:offline and check:glyphs all exit 0.
- `node scripts/smoke-roles.mjs http://localhost:<port>` passes in proxy mode, or you report why it couldn't run.
- Screenshots of each P1 fix in `.impeccable/review/stage9-*.png`, which you have looked at.
- Reviewer PASS.
