---
version: 1
slug: "app-pages-dela-index-vue"
primary_target: "app/pages/dela/index.vue"
related_targets: ["app/components/dela/DelaTable.vue"]
---

# Surface brief — Дела (/dela)

- **Mode:** Operate; finding a case by шифр or title. Handoff §6 #5, §2 (all roles open; restricted rows only reach EDITORS, marked 🔒). Stage 8.
- **Job:** archivist/reader knows a шифр fragment or a title word and wants the case card in one click; operator checks how far OCR got. Success = the right row is visible within the first screen and opens with click or Enter.
- **Direction (inside «Адрес архива»):** toolbar on `bg-default` panel: search `q` (debounced 300 ms, synced to `?q=`) + fond USelect from `/api/search/facets` fonds («Ф.1 — фондообразователь»). UTable: Шифр (compact ShifrPlate, tabular) · Название (`dir="auto"`, creator in muted 2nd line) · Годы · Языки (lang badges from page langs are not in the list payload, so this column shows `lang_override` badge or «—»; noted) · Листы `done/total` with a slim meter · Пропуски «пропущены л. 4, 7» in warning text with icon · Низкая уверенность count (warning soft badge when >0) · 🔒 badge «Ограничен» for editors only. Whole row is a link (`/dela/:id`), keyboard: the шифр cell carries a real NuxtLink so Tab/Enter work.
- **States:** skeleton rows; empty «Дел пока нет» / filtered «Ничего не найдено» + reset; error UAlert with «Повторить».
- **Constraints:** strings in `ru/cases.ts`; no raw palette; 36 px targets; no hint of restricted cases for non-editors (the backend filters; the UI only adds 🔒 when `isEditor`).
