---
name: Цифровой архив Астаны
description: Civic wayfinding for an on-prem city archive. Every page has an address, and every word has a place on it.
colors:
  civic-blue: "#0B3A6E"
  civic-blue-active: "#1C508C"
  civic-label: "#BCD6F7"
  civic-field: "#042851"
  civic-field-border: "#6D9FDE"
  action-blue: "#0B6FA7"
  locator-gold: "#F2B705"
  ink: "#12202E"
  halo: "#FFFFFF"
  ground: "#F4F7FA"
  panel: "#FFFFFF"
  elevated: "#E4ECF6"
  scan-pane: "#D0DAE7"
  divider: "#D0DAE7"
  control-border: "#657182"
  text-toned: "#3D4755"
  text-muted: "#505C6B"
  text-dimmed: "#657182"
  count-inverted: "#505C6B"
  meter: "#505C6B"
  meter-track: "#D0DAE7"
  line-band: "color-mix(in srgb, #0B3A6E 7%, transparent)"
  warning: "#973C00"
  lowconf-fill: "#FEF3C6"
  error: "#9F0712"
  success: "#016630"
  eais-ok: "#00C950"
  hit: "#A2F4FD"
typography:
  headline:
    fontFamily: "Fira Sans, Noto Sans Variable, Noto Naskh Arabic Variable, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 600
    lineHeight: 1.27
  title:
    fontFamily: "Fira Sans, Noto Sans Variable, Noto Naskh Arabic Variable, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.55
  page-text:
    fontFamily: "Fira Sans, Noto Sans Variable, Noto Naskh Arabic Variable, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "24px"
  page-text-arabic:
    fontFamily: "Noto Naskh Arabic Variable, Fira Sans, serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: "30px"
  body:
    fontFamily: "Fira Sans, Noto Sans Variable, Noto Naskh Arabic Variable, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "20px"
  label:
    fontFamily: "Fira Sans, Noto Sans Variable, Noto Naskh Arabic Variable, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: "16px"
  plate-value:
    fontFamily: "Fira Sans Condensed, Fira Sans, Noto Sans Variable, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: "20px"
    letterSpacing: "0.02em"
    fontFeature: "tnum"
  plate-label:
    fontFamily: "Fira Sans Condensed, Fira Sans, Noto Sans Variable, sans-serif"
    fontSize: "10px"
    fontWeight: 500
    lineHeight: "12px"
    letterSpacing: "0.06em"
  chip:
    fontFamily: "Fira Sans Condensed, Fira Sans, Noto Sans Variable, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    lineHeight: "16px"
    letterSpacing: "0.06em"
    fontFeature: "tnum"
rounded:
  overlay: "2px"
  chip: "5px"
  md: "6px"
  lg: "8px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
  target: "36px"
  header: "56px"
  rail: "220px"
components:
  button-primary:
    backgroundColor: "{colors.action-blue}"
    textColor: "{colors.panel}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "8px 12px"
    typography: "{typography.body}"
  button-outline:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "8px 12px"
  button-destructive-confirm:
    backgroundColor: "{colors.error}"
    textColor: "{colors.panel}"
    rounded: "{rounded.md}"
    height: "36px"
  rail:
    backgroundColor: "{colors.civic-blue}"
    width: "{spacing.rail}"
  header:
    backgroundColor: "{colors.civic-blue}"
    height: "{spacing.header}"
  rail-link:
    textColor: "{colors.panel}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "0 12px"
  rail-link-active:
    backgroundColor: "{colors.civic-blue-active}"
    textColor: "{colors.panel}"
  header-search:
    backgroundColor: "{colors.civic-field}"
    textColor: "{colors.panel}"
    rounded: "{rounded.md}"
    height: "36px"
  shifr-plate:
    backgroundColor: "{colors.civic-blue}"
    textColor: "{colors.panel}"
    rounded: "{rounded.md}"
    height: "40px"
    padding: "0 12px"
    typography: "{typography.plate-value}"
  script-badge:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.panel}"
    rounded: "{rounded.chip}"
    height: "24px"
    padding: "0 8px"
    typography: "{typography.chip}"
  year-chip:
    textColor: "{colors.civic-blue}"
    rounded: "{rounded.chip}"
    height: "24px"
    padding: "0 8px"
    typography: "{typography.chip}"
  panel:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.lg}"
  count-line:
    textColor: "{colors.text-muted}"
    typography: "{typography.body}"
  low-confidence-word:
    backgroundColor: "{colors.lowconf-fill}"
    textColor: "{colors.ink}"
    rounded: "{rounded.overlay}"
  search-hit:
    backgroundColor: "{colors.hit}"
    textColor: "{colors.ink}"
    rounded: "{rounded.overlay}"
  locator-pin:
    backgroundColor: "{colors.locator-gold}"
    rounded: "{rounded.full}"
    size: "14px"
---

# Design System: Цифровой архив Астаны

> **Reversal, 2026-11-12 (Stage 11c).** The bilingual Kazakh/Russian micro-labels (ҚОР · ФОНД) are gone from the plates, and the rail group labels are Russian only («Фонд», «Обработка», «Система», 12 px). This reverses the Stage 2 choice: staff aged 40–50 found the page too noisy, and the short prefix (Ф., Оп., Д., л.) already names the level. The `kk` strings stay in `ru.ts` for a future Kazakh UI. The viewer header now uses the compact plate; detail moves under «Подробнее», «Ещё ⋯» and Правка mode. Where older text below mentions micro-labels, this note wins.

Recorded on 2026-11-12 from the shipped build (Stages 3 to 9), not from intentions. Normative sources in the code are `app/assets/css/main.css` (`@theme static` scales and aliases, Nuxt UI `--ui-*` overrides, `@font-face`), `app/assets/css/focus.css`, `app/app.config.ts`, `app/utils/civic-ui.ts` and `app/utils/status.ts`. The token spec `docs/stages/2-design-system.md` holds the reasoning and the dated corrections. Where it and the code disagree, the code is what this file records. Components use **Nuxt UI semantic colours and the project aliases only** (`text-muted`, `bg-elevated`, `bg-rail`, `bg-locator`, `bg-hit`, `bg-line-band`...). Raw palette classes are banned.

## Overview

**Creative North Star: "Адрес архива" (The Archive Address)**

The world is Astana's bilingual municipal wayfinding. The archive is signed the way the city signs its streets. Two flat civic-blue fields, a 220 px rail and a 56 px header, meet in an L. Together they read as one sign, and there is no grey chrome anywhere. Every case and leaf carries its address on rounded enamel plates (Ф.1 › Оп.1 › Д.15 › л.3), each with a stacked Kazakh/Russian micro-label (ҚОР · ФОНД). On the page viewer, selecting a word drops a gold pin on its box on the scan. A gold-and-ink leader then joins the pin to that word's row in the text. The scan is the authority, and the system's job is to show where each word lives.

Density is that of a working tool. Sessions are long and repetitive, on 1920×1080 office monitors, with a view-only mobile reader at 375 px. White panels sit on a cool ground, and controls are 36 px tall. The text is Fira Sans, a signage grotesk, with a condensed cut for the plates. Each colour has one job. Civic blue is the place, action blue is what you can press, gold is "you are here", and amber and red appear only where confidence or a failure means something.

The world was defined against two confirmed rejections. **Museum costume** is parchment, serif nostalgia or ornament standing in for the archive. **Grey bureaucracy** is a neutral admin dashboard where the scan and the text are two unrelated grey cards. The finish review's verdict on the shipped build was to keep the address plates with their gold dot, the pin and its gold-and-ink leader, and the flat civic rail and header. Spread them further; don't tone them down.

**Key Characteristics:**
- Flat civic-blue fields at region scale: the rail and header, with no borders between them.
- Address plates with bilingual micro-labels on every screen that names a case or a leaf.
- Gold appears only as "you are here", and always paired with ink.
- Two-tone overlays on the scan, so every mark holds on white, yellowed and dark paper.
- Tabular figures for every шифр, count, percentage and date.
- Every script is first-class: Kazakh Cyrillic, Latin «яналиф» and Arabic «төте» (RTL, Noto Naskh).
- Fully offline. Fonts and icons are bundled, and nothing is fetched at runtime.

## Colors

The palette is a committed civic blue with a separate action blue, a single gold locator, ink-on-white work surfaces, and status colours held back until they mean something. All four scales (civic, action, locator, slate) are defined as 11 steps in `@theme static`. Amber, red, green and cyan use the Tailwind v4 defaults.

### Primary
- **Action Blue** (action-600): the Nuxt UI `primary`. Use it for primary buttons, the active segment of a segmented control, links (`text-primary`) and the focus ring on light grounds. Only on things you can press. The sketch's `#1E88C8` measured 3.88:1 with white text and was replaced.

### Secondary
- **Civic Blue** (civic-800): the Nuxt UI `secondary`, exposed as `bg-rail` and `text-secondary`. It fills the rail, the header and the address plates, and colours the compact шифр text, the year chip's outline and the selected line number. **`UButton color="secondary"` is banned**, because civic blue is a place, not an action.
- **Civic Blue Active** (civic-700, `bg-rail-active`): the hover and active ground for rail links, header ghost buttons and linked plates.
- **Civic Label** (civic-200, `text-rail-muted`): rail group labels, plate micro-labels, idle rail icons and the header placeholder (7.64:1 on civic blue).
- **Civic Field** (civic-900, `bg-rail-field`) with **Civic Field Border** (civic-400, `ring-rail-field-border`): the header search input sunk into the civic field.

### Tertiary
- **Locator Gold** (locator-400, `bg-locator`): means "you are here" and nothing else. It is used for the pin on the scan, the leader's casing, the current-position dot on a plate and the legend's «выбранное слово» swatch. Gold on white measures 1.82:1, so gold is always paired with ink.

### Status
- **Warning** (amber-800, `--ui-warning`) with **Low-confidence Fill** (amber-100, `bg-lowconf-fill`): marks low-confidence words, lines and pages, and the «на проверке» status.
- **Error** (red-800, `--ui-error`): `invalid` files, `failed` pages, ЕАИС down, the «Ошибки» counter, error alerts and inline error reasons. It also fills the single confirming button inside a destructive confirmation dialog.
- **Success** (green-800, `--ui-success`): `uploaded`, `done` and «проверено». It is a soft badge where the status needs to stand out. In long lists where success is the normal case, success is quiet (see Components).
- **ЕАИС OK** (green-500, `bg-eais-ok`): only the 8 px online dot in the header, with a 1.5 px white ring next to white text.
- **Search Hit** (cyan-200, `bg-hit`): search hits only. Used for `<mark>` in snippets, the hit fill on scan boxes and hit words in the text pane.

### Neutral
- **Ink**: body text, highlighted text, the script badge's fill, the core of every overlay stroke, the pin's ring and the selected word's 2 px ring.
- **Ground** (slate-50, `bg-muted`): the layout ground behind panels.
- **Panel** (white, `bg-default`): work areas, cards, tables and inputs.
- **Elevated** (slate-100, `bg-elevated`): table headers, toolbars and word hover.
- **Scan Pane** (slate-200, `bg-scan-pane`): the ground around the scan image.
- **Divider** (slate-200, `--ui-border`): decorative separators only, never control boundaries.
- **Control Border** (slate-600, `--ui-border-accented` and `--ui-bg-accented`): input, checkbox and radio rings and the unchecked switch track. Holds 3:1 on white, ground, elevated and scan-pane.
- **Text Toned / Muted / Dimmed** (slate-800 / 700 / 600): muted works on every surface. Dimmed is used on white and ground **only**: it measures 4.16:1 on elevated and 3.51:1 on scan-pane.
- **Count Inverted** (slate-700, `bg-inverted`): neutral solid count badges («Очередь проверки», unread notifications).
- **Meter / Meter Track** (slate-700 on slate-200): the mean-confidence bar, and the track of progress bars and sliders.
- **Line Band** (civic blue at 7 %, `bg-line-band`): the selected line's band, drawn the same on the scan and in the text.
- **Halo** (white, `--color-halo`): the light half of every two-tone overlay, and the pin's outer keyline.

### Contrast evidence
`python3 scripts/design/contrast_tokens.py` prints the measured table. It is reproduced verbatim in the token spec under "Contrast evidence": 66 text, non-text and focus pairs, 0 failing. Highlights:
- White on civic blue: 11.38:1.
- White on action blue: 5.46:1.
- Ink on white: 16.51:1.
- Muted on elevated: 5.72:1.
- Soft status badges on white and elevated: 5.10 to 6.91:1.
- Ink on a hit: 13.28:1.
- Ink on gold: 9.08:1.

The dual-tone overlay table shows that every scan mark clears 3:1 on four paper tones, from `#F2EEE4` to `#2A2620`. Re-run the script after changing any token.

### Named Rules
**The One Job Rule.** Each colour has one job. If a new use needs civic, action, gold, amber, red or cyan for something outside its listed job, the answer is a neutral, not a new meaning.

**The Gold Means Here Rule.** Gold marks the current position (the pin, the leader and the current plate's dot) and never a button, a warning, a count or decoration. It is never shown without ink beside it.

**The Flat Field Rule.** Colour commits at region scale. The rail and header are flat civic fields with no gradients, borders or grey chrome. On them, text and icons are white or civic-label, and `text-success`, `text-error` and `text-warning` are banned on `bg-rail`.

## Typography

**UI and text font:** Fira Sans 400/500/600/700 (Noto Sans Variable, then Noto Naskh Arabic Variable, then system-ui as fallbacks)
**Plate font:** Fira Sans Condensed 500/600 (`font-plate`)
**Arabic-script font:** Noto Naskh Arabic Variable (`font-arabic`) for `kk-arab` («төте»)

**Character:** Fira Sans is a signage grotesk: humanist, open and wide-apertured, the voice of a street sign rather than a form. Its condensed cut sets the plates, micro-labels and chips, so the address furniture reads as one family.

### Hierarchy
- **Headline** (600, 22 px): the case and collection titles under the plate. The `/dela/[id]` and `/collections/[id]` titles ship at 700. The page error state's `h1` is 22 px at 600.
- **Title** (600, 18 px): empty-state headings and section titles.
- **Page text** (400, 16 px on 24 px rows): OCR text in the viewer. For `kk-arab` it is 18 px on 30 px rows in Noto Naskh, with `dir="rtl"`. RTL snippets in search take `font-arabic` at 16 px with line-height 1.9.
- **Body** (400, 14 px): the base UI size for tables, forms, count lines and secondary copy. Prose is capped at 68ch.
- **Label** (500, 13 px): the header ЕАИС status, the brand name, line numbers and dense metadata.
- **Plate value** (Condensed 600, 18 px on 20 px, 0.02em, tabular): the values on the address plates.
- **Plate label** (Condensed 500, 10 px, uppercase, 0.06em): the bilingual micro-labels on plates, the rail group labels and the rail footer «ДЕМО-ДАННЫЕ». This is the only text under 12 px.
- **Chip** (Condensed 700, 12 px, 0.06em, tabular): the script badge and the year chip.

The working scale is 10 / 12 / 13 / 14 / 16 / 18 / 22 / 28 px. Leaf captions on case thumbnails use 15 px (Condensed 600), outside the scale.

### Scripts, direction and coverage
- Kazakh text inside mixed copy is marked `lang="kk"`, for example the Kazakh half of every micro-label.
- `kk-arab` content gets `dir="rtl"`. Lists that mix scripts (titles, snippets) get `dir="auto"`. Line numbers sit on the inline-start side, which is the right in RTL.
- Glyph coverage is checked by `pnpm check:glyphs` (`scripts/design/glyph_coverage.py --check`) against the rendered stacks. `font-sans` covers Kazakh 18/18, Yanalif 17/17 and Arabic 10/10. `font-plate` covers Kazakh 18/18 and Yanalif 17/17. `font-arabic` covers Arabic 10/10. Fira lacks Yanalif Ꞑꞑ, and Noto Sans supplies them per glyph.
- Noto Sans ships only its latin-ext and cyrillic-ext subsets, and Noto Naskh only its arabic subset. Each is declared with `unicode-range` in `main.css`.

### Named Rules
**The Tabular Rule.** Every шифр, count, percentage, date, time and countdown is set with `tabular-nums`. Numbers in the archive line up like house numbers.

**The Plate Face Rule.** The condensed face is reserved for address furniture: plates, micro-labels, rail group labels, chips and leaf captions. Body copy and headings never use it.

## Layout

- **Shell.** A 220 px civic rail and a 56 px civic header, as a Nuxt UI dashboard group. The brand sits at the top of the rail inside the header's 56 px band. Below 1024 px the rail becomes a 280 px slideover (at most 85vw), opened by a 36 px toggle in the header. At 375 px nothing scrolls horizontally: the header title truncates first, then the user's name hides.
- **Main.** The content area is padded 16 px, or 24 px at `sm` and up. List and work screens cap at 1440 px and centre. Prose lines cap at 68ch. The header carries the screen title as text, and each screen owns its own `h1`, which is usually `sr-only`.
- **Spacing.** The base unit is 4 px, with working steps of 8, 12, 16, 24 and 32. Panels on a page are separated by 16 px, and the viewer's two panes by 24 px.
- **Density and targets.** Every interactive element is at least 36 px tall. `app.config.ts` defaults buttons, inputs, textareas, selects, tabs, switches and number inputs to `lg`. It sets `min-h-9` on nav links, dropdown items, and the modal, slideover and toast close buttons. Checkbox, switch and radio rows get a `::before` stretched over the whole 36 px row from the control's `base`, so a click anywhere in the row toggles the control. Links inside such a label are lifted with `relative`. Non-interactive chips (24 px) are exempt.
- **Page viewer.** At 1024 px and wider, the scan and text panes split 45/55 under a page-context band (plate, title, chips, status, actions) and a confidence strip. Below 1024 px the band stacks, a «Скан / Текст» pressed-state segmented control (a `UFieldGroup` of `aria-pressed` buttons) shows one pane at a time (the scan pane is 75svh), and the leader is hidden while the pin stays.
- **Search.** At `lg` and wider, a filter column of about 280 px sits on the inline-start side. Below `lg` the filters move into a slideover opened by «Фильтры (N)».

**The Shared Line Grid Rule.** Scan and text sit on one line grid. The selected line gets the same 7 % civic band in both panes. On the scan, its number sits on the scan's inline-start edge as a civic numeral on a white keyline. In the text pane, the line number turns civic and bold. When the scan's line pitch is too small to align rows, the text keeps its own rhythm and the band and the leader carry the link.

## Elevation & Depth

The system is flat. Depth comes from tonal layering: white panels (`rounded-lg`, no border, no shadow) sit on the slate-50 ground, and elevated slate-100 marks headers and toolbars. Shadows are not a depth device. The few that exist are rings and rules drawn with `box-shadow`:

### Shadow Vocabulary
- **Scan paper lift** (`--shadow-scan`: `0 1px 3px rgb(18 32 46 / 0.18)`): the scan image lifted off the scan pane. This is the only ambient shadow.
- **Plate inner rule** (`inset 0 0 0 3px civic-800, inset 0 0 0 4px rgb(255 255 255 / 0.55)`): the enamel plate's 1 px white rule, 3 px in from the edge.
- **Rail active bar** (`inset 3px 0 0 0 white`, mirrored in RTL): the active rail item's marker.
- **Locator rings** (`0 0 0 1.5px ink, 0 0 0 3px white`): the pin and the plate's current dot.
- **Two-tone overlay** (`1px ink border` plus `0 0 0 1px white` and `inset 0 0 0 1px white`): every word box on the scan.

Overlays and modals use Nuxt UI's defaults. Nothing else is lifted.

**The Flat-By-Default Rule.** Surfaces are flat at rest. A shadow in this system is a rule, a ring or a keyline with a job. It is never ambient decoration, except the one paper lift under the scan.

## Shapes

- **Gently rounded controls** (6 px, `--ui-radius`): buttons, inputs, plates, rail pills and the brand mark.
- **Panels** (8 px): work areas, cards, tables and the error state.
- **Chips** (5 px): the script badge and the year chip.
- **Overlays** (2 px): word boxes, the hit `<mark>` and in-text word fills. The scan line number uses 3 px.
- **Full round**: the pin, the plate's current dot, the ЕАИС dot, the meter and avatars.
- **Leader line.** Orthogonal segments only: a short drop under the box, along the line gap to the gutter, up or down the gutter, then into the text pane's left edge at the word's row. Joins are rounded and the line never crosses text.

Borders are rare. Controls get a slate-600 ring, dividers are slate-200 rules inside panels, and the dashed keyline (`border-dashed`, slate-600) marks only a missing or placeholder leaf in the thumbnail grid.

## Components

### Buttons
- **Shape:** 6 px corners, 36 px tall (`lg`), Fira Sans 14 px at 500. Icons are bundled Lucide icons at the leading edge.
- **Primary** (solid action blue, white text): **one per view, or one per list**. In the viewer that button is «Отметить проверенной →». In lists, only the first row's action is solid primary and the remaining rows use neutral outline, as in `/errors`, where action cells keep a fixed button order.
- **Secondary actions:** neutral outline, white fill with a slate-600 ring and ink text, used for Экспорт, Распознать заново, Отправить повторно and Отмена. Use neutral ghost for dismiss and reset actions («Сбросить»).
- **Re-OCR:** «Распознать заново» is a neutral outline trigger on both the case card and the viewer. It always opens a confirmation dialog. Re-OCR overwrites manual corrections, so the dialog carries a soft error alert that names the loss.
- **Destructive confirm:** inside a confirmation dialog only, the confirming button is solid error with an icon (re-OCR, delete collection, ЕАИС outage switch, role demotion), beside a neutral outline «Отмена». Red never appears on a trigger, in a toolbar or in a list row.
- **Retry inside an error alert:** an outline action in the alert's colour.
- **Focus:** a solid action-blue outline at a 2 px offset on light grounds. On civic fields, a 2 px white outline (see Focus).

### Focus
- **Light grounds:** `focus.css` sets every `:focus-visible` to a solid `--ui-primary` outline at a 2 px offset, so the ring sits on the ground and never on a solid fill. It measures 5.46:1 on white, 5.08:1 on ground, 4.58:1 on elevated and 3.86:1 on scan-pane. Viewer words use a 3 px offset.
- **Civic fields** (rail and header only): a 2 px white indicator, measuring 11.38:1 on civic-800 and 8.15:1 on civic-700. It is written as `focus-visible:` variant classes so it beats Nuxt UI's resets. Rail pills draw it at offset 0, header buttons at offset 2, and the header search as a 2 px white inset ring. The classes live in `app/utils/civic-ui.ts`.
- **Plates** sit on the white page band, not on a civic field, so linked plates take the default action-blue ring.
- **Skip link** «К содержимому» comes first in tab order. `<main>` receives focus, and page error states move focus to their heading.

### Navigation (rail and header)
- **Rail:** a plain `<nav aria-label="Основное меню">` of links in groups. The groups carry bilingual plate-face labels: «ҚОР · ФОНД», «ӨҢДЕУ · ОБРАБОТКА» and «ЖҮЙЕ · СИСТЕМА». The rail renders only the items the role can use, and an empty group loses its label.
- **Rail links:** 36 px white pills. Hover and active take civic-active, and the active link gets a 3 px white inline-start bar plus `aria-current="page"`. Idle icons are civic-label.
- **Counters:** «Ошибки» is solid error and «Очередь проверки» is solid neutral, both with white tabular text. Counters are hidden at 0.
- **Header:** the screen title on the left. On the right, the ЕАИС indicator, the bell (STAFF only) and the user menu, all as white ghost buttons whose hover and focus ground is civic-active.
- **ЕАИС indicator:** online is the green dot with a white ring next to white «ЕАИС на связи». Down is a solid error badge «ЕАИС недоступна» plus a ticking «Повтор через m:ss». It is never colour alone.
- Gold is never used in the rail.

### ShifrPlate (signature)
The archive address as enamel plates: Ф.1 › Оп.1 › Д.15 › л.3.
- **Plate:** 40 px tall, civic fill, a 1 px white inner rule 3 px from the edge and 6 px corners. Above the value sits the micro-label «ҚОР · ФОНД» in civic-label, with its Kazakh half in `<span lang="kk">`. Plates are separated by civic `›` chevrons at 20 px Condensed.
- **Links:** a segment with a target (the case links to `/dela/:id`) is a link. Its hover ground is civic-active and its focus is the action-blue ring.
- **Current:** the current segment (the leaf, in the viewer) gets `aria-current="page"` and a 10 px gold dot on its top inline-end corner, ringed in ink and white.
- **Accessibility:** the group has `role="group"` and a spoken label such as «Шифр: фонд 1, опись 1, дело 15, лист 3». The micro-labels and chevrons are `aria-hidden`.
- **Compact variant:** inline «Ф.1 Оп.1 Д.12 · л.3» in civic text with tabular figures, for tables and dense rows. It has a spoken label of its own.
- **Placement:** the same position on every screen that names a case or leaf: the viewer's context band, the case card, case lists, search results and collection items.

### LocatorPin and leader line (signature)
- **Pin:** a 14 px gold disc with a 1.5 px ink ring and a 3 px white keyline. It sits on the inline-end edge of the selected word's box on the scan.
- **Leader:** an SVG path with a 3 px gold casing around a 1 px ink core. It ends in a 3.5 px gold dot ringed in ink at the gutter-side (left) edge of the word's row in the text pane, in both LTR and RTL. It never crosses the text, and it is hidden when either end is scrolled out of its pane or below 1024 px.
- **Motion:** the pin and the leader glide between positions in 120 ms (`cubic-bezier(0.16, 1, 0.3, 1)`). With `prefers-reduced-motion` they jump.
- **Accessibility:** the pin and the leader are `aria-hidden`. A polite `role="status"` region announces «Слово 2 из 5 · уверенность 41 %».
- **Selected word in the text:** gets a 2 px ink ring and `aria-current="true"`. Selection is never shown by colour alone.

### Scan overlays
Every mark on the scan is two-tone at 100 % stroke opacity, with a 1 px white halo and a 1 px ink core. Only fills are translucent.
- **Word box:** a solid stroke.
- **Low confidence:** a dashed stroke and an amber-100 fill at 55 %.
- **Search hit:** cyan-200 fill at 50 %.
- **Selected or hit:** a 2 px stroke.
- **Corrected:** a solid stroke, which drops the low-confidence dash.

Precedence, highest first: selected, then hit, then corrected, then low confidence. Each type is told apart by fill and stroke style, never by hue alone.

### ScriptBadge and YearChip (per-entry furniture)
- **ScriptBadge:** one badge for the four scripts: RU, KK, KK-лат and KK-араб. It is an ink chip, 24 px tall, with 5 px corners and white Condensed 12 px text at 700 with 0.06em tracking. It names an attribute, never a status, so it never takes a status colour. The full language name is the accessible text.
- **YearChip:** the case's years, as a 24 px chip with a 1.5 px inset civic outline, civic Condensed 12 px text at 700 and tabular figures. Empty years render nothing.
- **Usage:** both are used everywhere a case is listed: case lists, case card, viewer, search results and collection items. Never hand-roll either.

### Status badges and confidence
- **Badges:** every status badge is `variant="soft"`, mapped in `app/utils/status.ts`.
  - Queued or pending («в очереди»): neutral.
  - Running («распознаётся»): neutral with a spinner. The long VLM run (30 to 90 s) keeps the badge, shows elapsed time and keeps polling.
  - Retry («повтор»): warning, with the countdown.
  - Uploaded or done («загружено» / «распознано»): success.
  - Invalid or failed («ошибка»): error.
  - `low_conf = 1 & reviewed = 0` («на проверке»): warning.
  - Reviewed («проверено»): success.
- **Quiet success:** where success is the normal case in a long list (journal, ops events, upload results), it is a muted check icon plus the word, not a pill. Only errors and other outcomes get a soft badge, so the red rows stand out.
- **Low-confidence threshold:** a word is low when `conf < low_word_conf` and it is uncorrected. The threshold comes from the page payload: the live API sends 60 for Tesseract and 96.5 for VLM, and the UI falls back to 60 when the field is absent (`lowThreshold()` in `useViewer.ts`). The UI never recomputes the page-level `low_conf` flag.
- **Word, line and page levels:**
  - A low word gets the amber-100 fill plus a 2 px dashed warning bottom rule, which is a non-colour cue. Under Naskh the rule is pushed below the descenders.
  - A corrected word gets a 1 px dotted slate-600 underline and a tooltip «Распознано: {ocr_text}».
  - A line whose mean is below the threshold shows its percentage in warning.
  - A line that only contains low words shows a muted «N сл.».
  - The page meter is slate-700 on slate-200 and turns warning only when the backend sets `low_conf = 1`. The number is always printed beside it.
- **Legend:** the confidence strip's legend uses the same treatments as the text, plus the gold «выбранное слово».

### Toggles
Two-way and three-way switches («Скан / Текст», «Просмотр / Правка», the scan's word-box modes, the ops «По дням / По месяцам») are pressed-state segmented controls: a `UFieldGroup` with `role="group"` and an `aria-label`, holding `UButton`s with `aria-pressed`. The active button is primary solid and the others are neutral outline, all at `min-h-9`. Never use `UTabs` with `:content="false"`, which renders tabs without panels.

### Count lines
There is one style for row counts. It sits top-left above the list, as 14 px muted text with tabular figures, and acts as a `role="status"` live line where the count changes in place. Examples are «Файлов с ошибкой: 4» and «Найдено N дел · M страниц». It reserves its height while loading (`min-h-5`) so the list does not jump. Counts in badges belong to the rail and the bell, not to lists.

### Keycaps
Keyboard hints in the viewer's edit bar are `UKbd` keycaps followed by a word: ↵ изменить, Esc отмена, ↓ следующее, ⌘S. They are never plain text.

### Cards, panels and tables
- **Panels:** white, 8 px corners, no border and no shadow, sitting on the ground.
- **Tables:** Nuxt UI tables in a panel. The header row is elevated, with 13 px toned labels at 600. Rows are separated by dividers.
- **Restricted cases:** editors see a neutral soft badge with a lock icon and «Ограниченный доступ». Other roles see nothing.

### States
- **Loading:** `USkeleton` blocks shaped like the content they replace. The container carries `aria-busy`, or a `role="status"` line. Old results stay in place while a query re-runs.
- **Empty:** inside the panel, left-aligned: a 28 to 32 px muted Lucide icon, an 18 px title, one muted line of body, and at most one neutral outline action (for example, reset the filters). A filtered-empty state says that it is filtered.
- **Inline error:** a soft error `UAlert` with an icon, the server's Russian `detail` as the title, and a retry action.
- **Page error** (403, 404, generic): one panel with a muted icon, a 22 px heading that receives focus, and a body. It offers a primary «На главную» and, for generic errors only, an outline «Повторить». A 404 and a hidden case look the same, and the header drops the screen title.
- **Toasts:** `role="status"` with a polite announcement. Error-level notifications toast once each, never on first load.

### Inputs
Inputs are 36 px tall on white, with a slate-600 ring and 6 px corners. Focus is the action-blue outline. *Specimen only, not shipped (backlog):* a header search input would sit on the civic field (civic-900 fill, civic-400 ring, civic-label placeholder) and focus with a 2 px white inset ring (`headerInputUi` in `civic-ui.ts`, used only on `/_specimen`).

## Do's and Don'ts

### Do:
- **Do** put the address on every case and leaf. Use ShifrPlate where the address is the subject and the compact variant in dense rows, in the same position on every screen.
- **Do** use the semantic aliases and Nuxt UI colours (`bg-rail`, `text-secondary`, `bg-locator`, `bg-hit`, `bg-line-band`, `text-muted`), and add an alias to `main.css` before you use a new colour role.
- **Do** keep one solid primary per view or list. Everything else is neutral outline or ghost.
- **Do** confirm destructive actions in a dialog that names the loss. The red button lives only inside that dialog.
- **Do** keep success quiet in long lists, and let errors be the only red.
- **Do** draw every scan mark two-tone (white halo plus ink core), and tell overlay types apart by stroke and fill style.
- **Do** set every number tabular, every `kk-arab` run RTL in Noto Naskh, and every mixed list `dir="auto"`.
- **Do** keep every interactive target at 36 px or more, and test focus on both light and civic grounds.
- **Do** bundle every font and icon (`@fontsource`, local `@iconify-json/lucide`), then run `pnpm check:offline` and `pnpm check:glyphs` before shipping.
- **Do** re-run `python3 scripts/design/contrast_tokens.py` after any token change.

### Don't:
- **Don't** dress the archive in **museum costume**: no parchment textures, sepia, serif nostalgia, seals or ornament standing in for "archive". The scan is the only old paper on screen.
- **Don't** fall back to **grey bureaucracy**: no neutral grey chrome around the work, and no scan and text as two unrelated grey cards. The shell is civic blue, and the panes share one line grid.
- **Don't** use gold for anything but "you are here", and never show it without ink.
- **Don't** use action blue for decoration, status, location or hits, and don't use `UButton color="secondary"`.
- **Don't** use red on a trigger, a toolbar or a list row, and don't use amber where confidence isn't the subject.
- **Don't** put `text-success`, `text-error` or `text-warning` on the civic fields, and don't signal ЕАИС state by dot colour alone.
- **Don't** use dimmed text on elevated or scan-pane grounds.
- **Don't** hand-roll script badges or year chips, and don't give the script badge a status colour.
- **Don't** add ambient shadows, gradients or borders to panels.
- **Don't** take the condensed plate face or the uppercase micro-label outside address furniture. They label plates and rail groups. They are not eyebrows above headings.
- **Don't** load anything from a CDN, Google Fonts, the Iconify API or analytics.

## Known defects carried by the build (not part of the system)

- **`public/favicon.ico` has no product provenance.** It is byte-identical (MD5 `5c1028350a39fb9e5a9bfbe280326e28`, 32×32) to the `public/favicon.ico` of the Nuxt 4 minimal starter template (`nuxi init`, "Nuxt Minimal Starter"). It came in with the scaffold in commit `bb1106a`. It shows the green Nuxt mark: framework identity, not this product's. The product's mark is the «ЦА» tile in `AppBrand`. Replace the favicon with an asset derived from that tile, and record its provenance. Do not treat Nuxt green as part of the palette.
- **Header search** from the comp is not built. The header's left slot holds the screen title (backlog).
