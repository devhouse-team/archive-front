---
version: 2
slug: "app-pages-dela-index-vue"
primary_target: "app/pages/dela/index.vue"
related_targets: ["app/components/dela/DelaGapsCell.vue", "app/composables/useDelaBrowse.ts"]
---

# Surface brief — Дела (/dela), Stage 11b: browse and pagination

- **Mode:** Operate. Archive staff aged 40–50 with little IT background. Two jobs: (1) open a case whose шифр or title word they know; (2) walk Фонд → Опись → list of дела without knowing numbers. Success = one obvious path: pick a фонд, pick an опись, read 25 rows, turn the page.
- **Toolbar (one row at 1280):** «Шифр или название» search (flex), Фонд select (searchable, «Ф.7 — Акмолинский отдел народного образования», number typed first matches first), Опись select («Оп.2»; disabled with «Сначала выберите фонд» until a фонд is chosen), ghost «Сбросить» only when something is filtered. Any filter change resets to page 1; a фонд change clears the опись.
- **URL is the state:** `q`, `fond`, `opis`, `page` in the query. Selects and page turns push history (back/forward restore), typing replaces. Page 1 and empty values are omitted.
- **Count line** (top-left, muted, tabular, `role="status"`): «Показано 1–25 из 60». **UPagination** under the table, only when there is more than one page.
- **Table, no horizontal scroll at 1280 (content ≈1012 px):** Шифр (compact plate) · Название (`dir="auto"`, creator as muted second line only when no фонд is chosen; editors get the restricted badge inside this cell, the separate Доступ column is dropped) · Годы · Языки (badges wrap in a row) · Листы «7 из 7» (+ failed soft badge) · Пропуски «нет» (dimmed) or «13 листов» — a keyboard-focusable button with a tooltip «Пропущены листы: 4, 7–8, 10–17» (ranges collapse long runs; neutral text, amber is reserved for confidence) · На проверке: plain tabular number, 0 dimmed, no chip.
- **Option sources:** editors (admin, archivist) — `GET /api/m1/cases` (ЕАИС cascade). Operator and reader — `/api/search/facets` fonds + описи derived from `/api/dela?fond=N` (plain list, access-filtered), so a restricted-only опись never appears. ЕАИС 503 for editors → same fallback, a muted note with the server detail; the list keeps working.
- **States:** skeleton rows on first load, old rows stay while re-querying; empty «Дел не найдено» + «Сбросить фильтры» (filtered) or «Дел пока нет»; error `UAlert` with the server `detail` and «Повторить»; a page past the end jumps to the last page.
- **Constraints:** strings in `locales/ru/cases.ts`; semantic colours only; 36 px targets; plain list fallback paginates client-side (and filters `opis` client-side) when an older backend ignores `page`.
