# Stage 11 brief: UX pass for non-IT staff (Загрузка, Дела, Страница)

Written by the backend harness orchestrator (`../astana-archive`) on 2026-11-12, from the user's feedback with screenshots. The frontend orchestrator owns the execution: split this into 11a/11b/11c, run designer → reviewer, and record each in `STATUS.md`.

## Why

The users are archive staff aged 40–50 with little IT background. The user's feedback, with screenshots:
1. **Загрузка:** the шифр is three blank number boxes, so the operator must know Фонд/Опись/Дело numbers by heart. There is no list to pick from and no way to create a new шифр.
2. **Дела:** one flat table with every case and no pagination. The «Пропуски» cell lists 13 leaf numbers. There is no Фонд → Опись browse.
3. **Страница:** «looks so noisy to the eyes». Above the text there are:
   - bilingual micro-labels on the plates (ҚОР · ФОНД, ТІЗІМДЕМЕ · ОПИСЬ…);
   - year, language, status and engine chips;
   - 3 buttons;
   - a confidence meter with a bar, a threshold and a 3-item legend;
   - a scan toolbar with рамки and zoom;
   - a % on every text line;
   - a keyboard-hint footer.

Guiding rule: **fewer things on screen at once, plain words, one obvious next step.** Detail stays reachable, but is folded away.

## User decisions (2026-11-12)

- A new шифр is created **in ЕАИС through the backend** (`POST /api/m1/cases`). For now it works against the mock only; the real ЭЛАР interface is decided at the survey stage.
- **Only archivist and admin** create cases. The operator sees a hint instead.
- Frontend work runs through this repo's own pipeline (this brief). `../astana-archive` stays read-only for you.

## Backend contract

The source of truth is `../astana-archive/docs/FRONTEND_HANDOFF.md` §2 and §5. Sync your copy of the handoff first.
- `GET /api/m1/cases` (STAFF) has three levels:
  - no params → `[{fond, fond_creator, n_opisi, n_dela}]`;
  - `?fond=N` → `[{opis, n_dela}]`;
  - `?fond=N&opis=M` → `[{delo, title, year_from, year_to, access, leaves}]`.
  - Restricted cases are listed for the operator with `title: null`. Show them without a title and without 🔒 (🔒 is for editors only, per the existing rule).
  - ЕАИС down → 503 with `detail`. Show the detail and keep manual number entry working.
- `POST /api/m1/cases` (EDITORS) takes `{fond, opis, delo, title, year_from?, year_to?, fond_creator?, doc_type?, access?}` and returns 201 with the case.
  - 400: show the `detail`.
  - 409 «Такой шифр уже есть в ЕАИС»: offer to select the existing case.
  - 503: ЕАИС down.
- `GET /api/dela` takes new `opis`, `page` (1-based) and `per_page` (default 25, clamped to 1..100) params. Done and approved in the backend; page 1 takes 3 ms p50 at 5k cases.
  - With `page` it returns `{total, page, per_page, items}`. `items` have the same fields as the plain list, including `langs`, `gaps` and `low_conf`.
  - A page past the end returns `items: []` with the real total.
  - `total` never counts restricted cases for reader or operator.
  - Without `page` it returns the old plain list, which is uncapped. Always pass `page` on /dela.

## 11a: Загрузка, the шифр picker (`OpsShifrFields.vue`, also used by `OpsFixShifrModal.vue`)

- Replace the three inputs with **cascading searchable selects**:
  - **Фонд:** «Ф.7 — Акмолинский отдел народного образования».
  - **Опись:** «Оп.2 · 4 дела».
  - **Дело:** «Д.9 — Отчёты школ Целинограда, 1962 · уже 2 листа».
- Typing a number still works: search matches the number first. Picking a фонд clears опись and дело.
- Keep `OpsCaseCheck` as the confirmation line under the selects.
- **«+ Новое дело»** sits next to Дело, **EDITORS only**. It opens a modal with fond and опись prefilled from the selects, plus delo, title (required) and years (optional). After 201 the new case is selected.
- **Operator:** no create button. Under Дело, show the hint «Нет нужного дела? Попросите архивиста создать его в ЕАИС».
- **ЕАИС down:** fall back to plain number inputs and show the 503 detail.
- Simplify the help text above the fields to one sentence. The filename rule moves into a «Как назвать файл?» disclosure.

## 11b: Дела, browse and pagination (`pages/dela/index.vue`)

- Toolbar: search, Фонд, Опись. Опись is enabled after Фонд and loaded from `GET /api/m1/cases?fond=`.
- **Pagination:** `UPagination`, 25 per page, «Показано 1–25 из N». Page, fond and опись live in the URL query. A filter change resets to page 1.
- The **«Пропуски»** cell reads «нет» or «13 листов», with the full list in a tooltip or on the case card.
- The **«На проверке»** cell is a plain number. Drop the icon chip.
- No horizontal scroll at 1280 px.

## 11c: Страница, the calm viewer (`components/viewer/*`, `pages/page/[id].vue`) and the calm shell

- **Header:**
  - one line: шифр `Ф.1 Оп.1 Д.12 · л.2` as a compact ShifrPlate without the micro-labels;
  - the title;
  - the year;
  - leaf navigation as today.
- Language badge, «распознано» and «Движок: …» move under a **«Подробнее»** disclosure.
- **Actions:** one primary «Отметить проверенной». Экспорт and Распознать заново go into a neutral «Ещё ⋯» menu. The re-OCR confirmation is unchanged.
- **Confidence row:** one sentence, «Слов для проверки: N» (or «Все слова распознаны уверенно»). The mean %, the bar, the threshold and the legend show only in **Правка** mode.
- **Text pane:** the per-line % is hidden by default and shown in Правка. The keyboard-hint footer is replaced by a small «?» button that opens the hints.
- **Scan toolbar:** −, %, + and «По ширине». «Рамки слов» moves to Правка mode.
- **Shell:** rail group labels are Russian only («Фонд», «Обработка», «Система»), and the plates lose the Kazakh micro-labels. This **reverses the Stage 2 bilingual micro-label choice**. Update `DESIGN.md`, `.impeccable/design.json` and `2-design-system.md` to match. The `kk` strings may stay in `ru.ts` for a future Kazakh UI.
- Base body text is at least 16 px, and every control keeps a 36 px target and AA contrast.

## Exit criteria

- `pnpm typecheck && pnpm lint && pnpm test`, then `pnpm build && pnpm check:offline` and `pnpm check:glyphs`, all exit 0. New tests:
  - the cascade resets when the фонд changes;
  - the create button is hidden for the operator and the hint is shown;
  - a 409 offers the existing case;
  - pagination keeps the URL query;
  - «Пропуски» is summarised;
  - viewer details are hidden in Просмотр and shown in Правка.
- Proxy mode against the backend on :8000 (synthetic seed only):
  - an operator picks Ф.7 → Оп.2 → Д.9 without typing and uploads a synthetic PNG to it;
  - an archivist creates a case through the modal, then uploads to it;
  - a reader on /dela never sees restricted Д.21.
- **Before/after screenshots** at 1920×1080 and 1280×720 of /upload, /dela and /page. On /page, count the chips, labels and controls above the fold: the target is at most half of today's count.
- Don't create real cases on a shared backend beyond one test case. The mock has no delete.
