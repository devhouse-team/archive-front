# Parallel build rules (Stages 5–8, compressed schedule)

The user has a hard stop at 11:00 on 2026-11-12. They chose "all screens, faster process". Stages 5, 6, 7 and 8 are built **at the same time** by four designers. Each designer follows its own stage brief plus these rules.

## Ownership

Each stage owns only its own pages, components, locale file, tests and mock additions:

| Stage | Pages | Components dir | Locale file (namespace) | Dev port |
|---|---|---|---|---|
| 5 | `app/pages/page/[id].vue` | `app/components/viewer/` | `app/locales/ru/viewer.ts` (`viewer.*`) | 3010 |
| 6 | `app/pages/search.vue`, `app/pages/collections/**` | `app/components/search/`, `app/components/collections/` | `app/locales/ru/search.ts` (`search.*`, `collections.*`) | 3020 |
| 7 | `app/pages/{ops,upload,errors,journal}.vue` | `app/components/ops/` | `app/locales/ru/ops.ts` (`ops.*`, `upload.*`, `errors_screen.*`, `journal.*`) | 3030 |
| 8 | `app/pages/dela/**`, `app/pages/review.vue`, `app/pages/admin.vue` | `app/components/dela/`, `app/components/admin/` | `app/locales/ru/cases.ts` (`dela.*`, `review.*`, `admin.*`) | 3040 |

- The locale files are already created and merged into `app/locales/ru.ts`. Put your new strings **only in your own locale file**, under your namespaces; `t('viewer.…')` etc. type-check through `useT`. Re-use existing shared keys in `ru.ts` (status labels, errors, plate, eais) and don't edit them.
- Composables and stores that serve only your screen go in a file named after your area (e.g. `app/composables/useViewerKeys.ts`, `app/stores/search.ts`).
- Tests go in `test/<area>*.test.ts`.

## Shared files

Shared files are `app/types/api.ts`, `app/composables/useApi.ts`, `app/app.config.ts`, `app/assets/css/main.css`, `server/mock/*`, `app/utils/*` and `app/components/ShifrPlate.vue`. Another designer may be editing them right now.

- Prefer not to touch them. If a type, endpoint function or mock route is missing, make a small **additive** edit: re-read the file right before editing, and change only the lines you add. Never reformat or reorder.
- `ShifrPlate`, the shell, the nav and the auth plumbing are Stage 4's. Use them as they are; report gaps instead of editing them.

## Checks while others are building

- `pnpm typecheck`, `pnpm lint` and `pnpm test` see everyone's half-finished work.
  - If a failure is in a file you own, fix it.
  - If it is in someone else's file, note it in your report and do not edit their file.
- Use `pnpm exec eslint <your files>` and your own test files to check your own work.
- Don't run `pnpm build` (it writes the shared `.output`); the orchestrator runs it once at the end.
- Run your dev server only on your assigned port, and stop only PIDs you started. Use `nuxt dev --port <port>`.
- **Never touch port 8000**: it is the real backend, owned by the orchestrator. `../astana-archive` is read-only.
- In mock mode, `.nuxt/` is regenerated. Use proxy mode (the default) unless your brief says otherwise.

## Process (compressed)

- `/impeccable shape <screen>` once per screen, briefly. Save each as `.impeccable/surfaces/<route>.md`.
- Read `craft-floor.md` before your first UI edit. Load `nuxt-ui` (conventions, component-selection, dashboard, plus data-tables, forms or overlays as needed).
- **Time box: about 2 hours.** Working, correct and accessible beats exhaustive. Every data view needs loading, empty and error states. Role gating and the hard rules in `CLAUDE.md` are non-negotiable.
- Verify by looking at the result: screenshot each screen at 1920×1080 into `.impeccable/review/stage<n>-*.png` and actually look at them.
- One review round per stage. Only critical and major findings are fixed; minor ones go to the Stage 9 backlog.
- Don't commit or push.

## Report

Return:
- changed files;
- skills and commands run;
- an exit checklist with evidence (exit codes, screenshot paths you looked at);
- failures you saw in files you don't own;
- anything left unfinished.
