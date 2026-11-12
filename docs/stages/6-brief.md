# Stage 6 brief: M3 search and collections (§6 #8, #9)

The parallel build follows `docs/stages/parallel-rules.md`. Read it first.

## Sources

- **Handoff:** §2, §4 (snippet_html, RTL `dir="auto"`), §5.4, §5.5, §9 (a filter-only search needs a query).
- **Token spec:** `docs/stages/2-design-system.md`.
- **Direction contract:** `.impeccable/surfaces/app-pages-page-id-vue.md` (the world).
- `ShifrPlate` (compact variant) on every result and collection item.

## Deliverables

1. **`/search`** (the start screen for archivist and reader).
   - **Query box:** one field with a syntax hint (`"фраза"`, И/ИЛИ/НЕ, `-слово`).
     - Submit is disabled until a query is typed (§9), with the reason shown, not a silently disabled button.
     - Enter submits.
     - The query, filters, fuzzy, sort and page are kept in the URL query, so back/forward and reload work.
   - **Filters** from `/api/search/facets`: fond with creator, opis, delo, year range, lang (badges RU / KK / KK-лат / KK-араб), doc_type. Fuzzy 0/1/2 as a segmented control with plain labels. Sort: rel/date/shifr.
   - **Results grouped by case:**
     - the case title and compact шифр, years, language badges, doc type, hit-page count;
     - the snippet via `v-html` (`snippet_html` only), in a `dir="auto"` container;
     - a link to the best page `/page/:best_page_id?hl=<q>&fz=<fuzzy>`;
     - «Все страницы дела», which expands `/api/search/delo/{id}` inline with a snippet per page;
     - «В подборку», which adds a page to a collection through a popover listing the user's collections plus «Новая подборка».
     - 🔒 badge for restricted cases, shown only to admin and archivist.
   - Pagination (20 per page) and the total.
   - **History** (last 20) and **saved queries:** save the current query with a name, run one, delete one. Show them in a side panel or popover; they must not crowd the results.
   - **States:** an initial state with syntax help, plus loading, empty («Ничего не найдено» with suggestions: fuzzy, fewer filters) and error states. The `{error: "Введите запрос"}` 200 response is shown inline.
   - **Mobile, 375 px:** the filters collapse into a slideover and there is no horizontal scroll. Readers use this screen on phones.
2. **`/collections`:**
   - A list of the user's collections (name, count, updated), create, delete with confirmation, and an empty state.
3. **`/collections/[id]`:**
   - Items with compact шифр, title (`dir="auto"`), years, and a link to the page.
   - Remove an item.
   - Export xlsx, csv and zip through `download()`.
   - A 404 shows the shared not-found state.
4. **Tests:**
   - URL ⇄ state sync for search;
   - submit disabled on an empty query;
   - only `snippet_html` uses `v-html` (a grep test over `app/`);
   - the 🔒 badge shows for editors only;
   - the collection add flow is idempotent.

## Exit criteria

- Your own lint and tests pass. Report the full typecheck result.
- Proxy mode against the real backend, as reader and as archivist, `q=мектеп`:
  - Cyrillic finds the Latin and Arabic cases;
  - the RTL snippet renders right-to-left;
  - the reader never sees restricted Д.21, while the archivist sees it with 🔒.
- Create a collection, add a page, export csv, then delete the collection, so the dev data is left clean.
- Screenshots: search results at 1920×1080, the expanded «Все страницы дела», the empty state, mobile 375 px with the filters open, and the collection detail.
