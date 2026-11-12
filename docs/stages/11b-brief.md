# Stage 11b brief: Дела, browse and pagination

Parent: `docs/stages/11-ux-brief.md` (read «Why», «Backend contract» and «11b» in full; it is the spec). Users are archive staff aged 40–50 with little IT background: fewer things at once, plain words, one obvious next step.

## Scope

- Screen: §6 #5 Дела, list view (`app/pages/dela/index.vue`). The case card `app/pages/dela/[id].vue` only if the full «Пропуски» list needs a home there.
- Endpoints: `GET /api/dela` with `q`, `fond`, new `opis`, `page`, `per_page`; `GET /api/m1/cases` (no params → фонды; `?fond=N` → описи) to fill the Фонд and Опись selects.
- Roles: all signed-in roles (R). Restricted cases: hidden from non-editors by the backend; never hint they exist; 🔒 for editors only. `GET /api/m1/cases` is STAFF-only, so **for the reader** the Фонд/Опись options must come from another source (derive from the current page of `/api/dela` results is not enough; prefer `/api/search` facets or `/api/dela` without `page` if cheap — decide, and state the choice in your report). Never let a reader see a restricted case via the selects.

## Contract caveat

**Backend `/api/dela` pagination is not in the handoff yet** (backend stage 2 in progress; the live :8000 still returns the plain list). Build to the shape in the parent brief: with `page` → `{total, page, per_page, items}`, without → plain list. The page must work with **both** responses (if a plain list comes back, paginate client-side). Add `opis`/`page`/`per_page` support to the Nitro mock `/api/dela` (additive). Add the optional type to `app/types/api.ts` (additive).

## Requirements

- Toolbar: search, Фонд, Опись. Опись is disabled until a Фонд is chosen.
- `UPagination`, 25 per page, «Показано 1–25 из N». `page`, `fond`, `opis` (and `q`) live in the URL query; reload and back/forward restore them. Any filter change resets to page 1.
- «Пропуски» reads «нет» or «13 листов» (Russian plural via `utils/format` `plural`), full list in a tooltip (keyboard-reachable) or on the case card.
- «На проверке» is a plain number; drop the icon chip.
- No horizontal scroll at 1280 px.
- States: loading, empty («Дел не найдено» + reset filters), error (`detail`), 503 from `/api/m1/cases` (selects degrade, list still works).
- Strings in `app/locales/ru/cases.ts` only.

## Ownership (parallel with 11a and 11c)

You own `app/pages/dela/**`, `app/components/dela/**`, `app/locales/ru/cases.ts`, `test/cases*.test.ts` (new tests in `test/cases-browse.test.ts`). Shared files: additive edits only, re-read right before editing (11a also adds `/api/m1/cases` to the mock — coordinate by re-reading; if 11a's mock route isn't there yet, add it yourself additively in the same shape as handoff §5 and say so in your report). Don't touch `ShifrPlate.vue`, the shell or viewer (11c). Dev port **3040**. Rules in `docs/stages/parallel-rules.md` apply.

## Exit criteria

- New tests: pagination keeps the URL query; a filter change resets to page 1; «Пропуски» is summarised; both `/api/dela` response shapes render.
- typecheck/lint/test exit 0 for your files.
- Mock mode on :3040: screenshots `.impeccable/review/stage11b-*.png` at 1920×1080 and 1280×720 (list, filtered by fond+опись, page 2, tooltip open, reader view). Check no horizontal overflow at 1280. A reader never sees restricted Д.21. Look at the screenshots.
- Before screenshots exist: `.impeccable/review/stage11-before-dela-{1920,1280}.png`.
