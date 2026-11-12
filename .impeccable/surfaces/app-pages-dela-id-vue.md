---
version: 1
slug: "app-pages-dela-id-vue"
primary_target: "app/pages/dela/[id].vue"
related_targets: ["app/components/dela/DeloThumbGrid.vue","app/components/dela/DeloReocrModal.vue"]
---

# Surface brief — Дело, карточка (/dela/[id])

- **Mode:** Operate. Handoff §6 #5. Archivist checks completeness (gaps), quality (low-confidence leaves), exports, and re-runs OCR.
- **Sequence:** ShifrPlate (full, delo current) → title (`dir="auto"`, 22 px) + meta line (years · фондообразователь · вид · 🔒 for editors) → action bar: «Карточка ЕАИС» link (same origin, new tab), Export dropdown (TXT/JSON/hOCR/ALTO/PDF via `download()`; disabled with the reason when `pages_done === 0`), «Распознать заново» (EDITORS only, error-coloured outline) → stats strip (листов N, распознано, ошибок, на проверке, пропущено) → **thumbnail grid** ordered by leaf, gaps interleaved as dashed placeholders «л. 4 — нет скана».
- **Thumbnail tile:** 200 px JPEG (`?w=200`, `loading="lazy"`, aspect 1:1.414 box on scan-pane ground), leaf «л. 3» plate-style label, status badge (page status; review status layered), low-confidence marker = warning badge «на проверке» + mean conf %. Tile is a NuxtLink to `/page/:id` with an aria-label «Лист 3, распознано, 96 %».
- **Re-OCR:** UModal: language URadioGroup (auto, ru, kk-cyrl, kk-latn, kk-arab, full labels), a warning UAlert «Ручные исправления на всех N листах будут перезаписаны», buttons «Отмена» (autofocus) + error solid «Перезаписать и распознать». After: toast «В очередь поставлено N листов», poll the case every 3 s (usePolling) until no page is pending/running, then toast done and stop.
- **States:** skeleton plate + grid; 404 → shared PageErrorState through useApi 'page' mode; empty case (0 pages) copy.
