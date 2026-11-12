---
version: 1
slug: "app-pages-collections-vue"
primary_target: "app/pages/collections/index.vue"
related_targets: ["app/pages/collections/[id].vue", "app/components/collections/"]
---

# Surface brief — Подборки (/collections, /collections/[id])

Shaped 2026-11-12 (compressed build, assumptions marked).

## Job and audience
- **Operate.** Any role. A reader collects pages for one archive certificate («Справка №…») and exports them (xlsx list, csv, zip of scans + texts). Handoff §5.5, §6 #9.

## Selected direction
- **List:** a plain table in a white panel: name (link), pages count (tabular), updated. A «Новая подборка» inline form above it (name + button). Delete per row behind a confirm modal that names the collection.
- **Detail:** heading = the collection name; export group (XLSX / CSV / ZIP) as outline buttons top-right through `download()`. Items as rows: compact шифр + л. N, title (`dir="auto"`), years, lang badge, «Открыть» link to `/page/:id`, remove (ghost, icon + sr label). 🔒 for editors on restricted items.
- 404 → the shared page error (useApi 'page' mode).

## States
- List empty: explains what a подборка is for and points to Поиск. Detail empty: «В подборке пока нет страниц» + link to Поиск. Loading skeleton, error alert with retry.

## Constraints
- Same as search: strings in ru/search.ts (`collections.*`), no server paths, 36 px targets.
