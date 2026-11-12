# Stage 11a brief: Загрузка, the шифр picker

Parent: `docs/stages/11-ux-brief.md` (read «Why», «User decisions», «Backend contract» and «11a» in full; it is the spec). Users are archive staff aged 40–50 with little IT background: fewer things at once, plain words, one obvious next step.

## Scope

- Screens: §6 #3 Загрузка (`app/pages/upload.vue`) and the «Исправить шифр» modal on §6 #4 Ошибки (`OpsFixShifrModal.vue`), both through `app/components/ops/OpsShifrFields.vue`.
- Endpoints (handoff §5, synced 2026-11-12): `GET /api/m1/cases` (3 levels), `POST /api/m1/cases` (EDITORS), `GET /api/m1/check-case`, `POST /api/upload`.
- Roles: STAFF see the picker. EDITORS (admin, archivist) see «+ Новое дело». Operator sees the hint «Нет нужного дела? Попросите архивиста создать его в ЕАИС» instead, never the button.
- Restricted cases: listed for the operator with `title: null` → show «Д.21» with no title and **no 🔒** (🔒 is editors-only). Editors see the title and 🔒.

## States to cover

Loading per select level; empty level («В этом фонде нет описей» style, plain words); ЕАИС down (503) → show the `detail` and fall back to the three number inputs, upload still works; 400 → `detail`; 409 «Такой шифр уже есть в ЕАИС» → offer «Выбрать это дело», which selects the existing case and closes the modal; 201 → new case selected in the cascade.

## Notes and risks

- **The live backend on :8000 does not serve `/api/m1/cases` yet** (404; the running process predates the backend edit). Add both routes to the Nitro mock in `server/mock/` (additive edit, shared file), shaped exactly as handoff §5. Seed the mock so Ф.7 → Оп.2 → Д.9 «Отчёты школ Целинограда», 1962 exists, plus one restricted case Д.21 somewhere. The mock has no delete; created cases live in memory.
- The search inside each select must match the number first (typing «9» puts Д.9 at the top, before titles containing 9). Use Nuxt UI `USelectMenu`/`UInputMenu` with a custom filter; keep 36 px targets and keyboard use.
- Picking a фонд clears опись and дело; picking an опись clears дело.
- Keep `OpsCaseCheck` as the confirmation line under the selects.
- One sentence of help above the fields. The filename rule moves into a «Как назвать файл?» disclosure.
- `OpsFixShifrModal` prefill (fond/opis/delo from the file row) must still land in the cascade.
- Strings in `app/locales/ru/ops.ts` only.

## Ownership (parallel with 11b and 11c)

You own `app/pages/upload.vue`, `app/pages/errors.vue`, `app/components/ops/**`, `app/locales/ru/ops.ts`, `test/ops*.test.ts` (new tests in `test/ops-shifr-picker.test.ts`). Shared files (`app/types/api.ts`, `app/composables/useApi.ts`, `server/mock/*`, `app/utils/*`): additive edits only, re-read right before editing (11b also adds to the mock). Don't touch `ShifrPlate.vue`, the shell or `app/components/viewer/**` (11c owns them). Dev port **3030**. Rules in `docs/stages/parallel-rules.md` apply (no `pnpm build`, never touch :8000, don't commit).

## Exit criteria

- New tests: the cascade resets when the фонд changes; the create button is hidden for the operator and the hint is shown; a 409 offers the existing case; 503 falls back to number inputs.
- `pnpm typecheck`, `pnpm lint` (or eslint on your files), `pnpm test` exit 0 for your files.
- Mock mode (`NUXT_PUBLIC_API_MOCK=1 nuxt dev --port 3030`): as operator, pick Ф.7 → Оп.2 → Д.9 without typing and upload a synthetic PNG; as archivist, create a case through the modal, then upload to it. Screenshots into `.impeccable/review/stage11a-*.png` at 1920×1080 and 1280×720, including the operator hint, the create modal, the 409 state and the ЕАИС-down fallback. Look at them.
- Before screenshots already exist: `.impeccable/review/stage11-before-upload-{1920,1280}.png`.
