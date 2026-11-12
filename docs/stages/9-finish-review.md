# Stage 9: impeccable finish review (2026-11-12, ~07:45)

Disposition: **fix**. Screenshot-based review: this reviewer role doesn't render pages.

## Persistence
- PRODUCT.md, the decision comp and the seed (`seed:67aa3ce0c89b0ec9`, verified) are in order. There is no `.impeccable/build/state.json`, because this was a staged build rather than a comp-led one. That is noted, not a finding.
- DESIGN.md is missing. That is a FINISH obligation, to be written by impeccable-documenter in Stage 10.
- `public/favicon.ico` ships without a provenance record.

## Fidelity against the comp (`assigned.html`; spec corrections win)
- **Match:** rail, header, address plates, confidence strip, the ≈45/55 pane split, pin and leader, type, material, ground, and the primary «Отметить проверенной».
- **Missing:** header search (already in the backlog), and the rail footer «ДЕМО-ДАННЫЕ».
- **Contradicted:**
  - The year chip is plain muted text.
  - The shared line grid shows its band in the text pane only, with no line numbers on the scan.
- **Uncited adaptations:**
  - Leaf navigation uses icon-only chevrons and drops the leaf address.
  - Keyboard hints are plain text, not `<kbd>`.

## Ceiling
- The world's devices are unused outside the viewer and the case card:
  - the шифр is plain link text in lists;
  - there are no `<kbd>` keycaps and no year chip;
  - there is no authored motion moment.
- The operate screens are competent Nuxt UI tables with nothing of the world beyond the rail and header.

## Material fixes
1. **major (viewer, ViewerScanPane.vue):** draw the selected line's band across the scan (civic, about 7 %) with the line number at the scan's inline-start edge. This is the shared line grid promised in FIRST VIEWPORT.
2. **major (`dela/[id].vue:263`, `:239`):** re-OCR is in the error colour here but neutral in the viewer, and Экспорт is primary here but outline in the viewer. Fix: re-OCR becomes neutral outline, and Экспорт gets one treatment on both screens.
3. **major (button hierarchy):** every row or card on /errors, /search and /collections/[id] has a solid primary button. Fix: solid on the first row and outline on the rest, or all outline. On /errors, give the action cell a fixed width and a fixed button order.
4. **major (furniture drift):** script badges are soft civic in DelaLangBadges and outlined ink elsewhere, and years are plain text. Fix: one `ScriptBadge` and one `YearChip` (civic outline, condensed face, tabular figures) used everywhere.
5. **major (/journal, /ops events, /upload):** green success pills on every row bury the errors. Fix: show success quietly and keep the red badge for errors only.
6. **minor:** the /review h1 is visible while every other screen's is sr-only, and row counts are shown four different ways. Fix: one count line style.
7. **minor:** the ops period toggle's active state is neutral solid, while the viewer's segmented control uses primary. Unify them.
8. **minor:** /collections pages use `max-w-5xl` while the other lists use `max-w-[1440px]`, so the left edge jumps.

## Keep
The address plates with the gold dot, the pin with its gold and ink leader, and the flat civic rail and header. Spread them further; don't tone them down.
