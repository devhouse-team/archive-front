---
version: 1
slug: "app-pages-search-vue"
primary_target: "app/pages/search.vue"
related_targets: ["app/components/search/", "app/stores/search.ts", "app/composables/useSearchUrl.ts"]
---

# Surface brief — Поиск (/search)

Shaped 2026-11-12 in the compressed parallel build (no interview round: the Stage 6 brief is precise). Assumptions are marked.

## Job and audience
- **Operate.** Start screen for archivist and reader; also used by operator and admin. Handoff §6 #8, §5.4.
- Reader preparing an archive certificate: types a word in Russian or Kazakh, needs to know *which case* and *which leaf* holds it, across all four scripts, then open the page with the hit boxed or put the page into a подборка. On office PCs at 1920×1080; on phones for search only.

## Outcome and proof
- Success = from a query to the right leaf in two clicks. Proof that cross-script search worked lives in the result row itself: the language badge (KK-араб, KK-лат) next to a snippet whose `<mark>` sits in RTL or Latin text.

## Selected direction (inside the «Адрес архива» world)
- **Query bar** at the top of the work area: one large field with the syntax hint under it, the submit button, then a quiet row of fuzzy (segmented, plain words), sort select and the total «Найдено N дел · M страниц · 0,007 с».
- **Two columns ≥ lg:** filter column (≈ 280 px, white panel) on the inline-start side; results on the right. Below lg, the filter column becomes a USlideover opened by «Фильтры (N)».
- **Result = one case**, never one page: compact шифр (secondary, tabular) + title (`dir="auto"`) as a link to the best page; meta line: years · lang badges · doc type · «Совпадений на N стр.»; the snippet in a `dir="auto"` block (`<mark>` = `bg-hit`); the action row: «Открыть л. N» (primary link), «Все страницы дела (N)» (expands inline list of leaf + snippet rows), «В подборку» (popover).
- 🔒 badge next to the title for editors on `access: restricted` only.
- History and saved queries live in a popover off the query bar («История и сохранённые»), so they never push results down. «Сохранить запрос» sits there too.
- Gold stays reserved for "you are here": not used on this screen. Hits use `--color-hit` only.

## Scope and boundaries
- Production screen. No header search box (deferred; the screen's own field is the search). Don't touch the shell, ShifrPlate or shared utils except additive API/type lines.

## States and ranges
- Initial (no q): syntax help card with three examples that run on click. Loading: skeleton rows; old results stay dimmed during re-query (assumption). Empty: «Ничего не найдено» + suggestions (raise fuzzy, reset filters) as buttons. Error: inline alert with retry. `{error}` 200 response: inline alert under the field.
- Ranges: 0–hundreds of cases; 20 per page; snippets up to ~300 chars; titles to ~120 chars; up to 4 lang badges.

## Interaction and layout
- Enter submits; submit disabled with a visible reason when the field is blank. All state lives in the URL (`q, fuzzy, sort, page, fond, opis, delo, year_from, year_to, lang, doc_type, creator`). Filter changes re-run immediately when a query exists (assumption) and reset page to 1.
- Mobile 375: query field full width, buttons wrap, results single column, no horizontal scroll; the snippet wraps.

## Constraints
- `v-html` only on `snippet_html`. Strings in `app/locales/ru/search.ts`. 36 px targets. Focus ring default primary.
