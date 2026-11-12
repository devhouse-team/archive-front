---
version: 1
slug: "app-pages-page-id-vue"
primary_target: "app/pages/page/[id].vue"
related_targets: []
---

# Surface brief — Страница (page viewer and correction)

## Scope and mode

- **Route:** `/page/[id]`, in view and edit modes.
- **Mode:** Operate, with some Read traits. The visitor completes a task: checking OCR text against the scan and correcting it.
- **First surface of the new visual world.** Every later screen inherits this world.

## Audience, task and constraints

- **Who:** the primary user is the archivist, in long and repetitive review sessions on 1920×1080 office monitors. Readers and operators see the view mode only. Readers also open this screen on mobile (view only).
- **Task:** read the scan and text side by side; jump between low-confidence words; correct them from the keyboard; mark the page «Проверено» and move to the next one in the review queue.
- **Data rules:** handoff §4 and §5.3. Word boxes scale by `displayedWidth / width`. `conf < 60` is low. Search hits (`highlight_word_ids`) scroll to the first box. `kk-arab` text is RTL. The page `running` state can last a long time.
- **Ruled out by the user:** museum costume and grey bureaucracy.

## Direction contract

THESIS: Every page has an address, and every word has a place on it. The archive is signed the way Astana signs its streets. This refuses the category default: a neutral admin dashboard where the scan and the text are two unrelated grey cards.

OWN-WORLD: The world is Astana's bilingual municipal wayfinding.
- **Colour fields:** civic blue `#0B3A6E` owns the rail and the header as flat committed fields. Ground `#F4F7FA`, ink `#12202E`.
- **Gold `#F2B705`:** means "you are here" and nothing else.
- **Action blue `#0B6FA7` (action-600):** used only on controls you can press. The sketch's `#1E88C8` failed AA with white text.
- **Plates:** rounded-rect enamel plates in Fira Sans / Fira Sans Condensed, carrying stacked Kazakh/Russian micro-labels (ҚОР · ФОНД).
- **Arabic script:** Töte text is set in Noto Naskh Arabic.
- **Numbers:** tabular figures.
- **Status colours:** amber and red appear only where confidence or errors mean something.

STORY: The archivist knows which page they are on before reading a word: the address plate tells them. They see where trust is low and work the low-confidence words in order. Each correction is pinned to its place on the scan. They mark the page checked and the queue moves them on.

FIRST VIEWPORT: Layout at 1440–1920 px wide:
- **Blue rail and header:** a 220 px rail (nav grouped ҚОР · ФОНД / ӨҢДЕУ · ОБРАБОТКА / ЖҮЙЕ · СИСТЕМА) and a 56 px blue header (search, ЕАИС indicator, bell, user).
  - The rail renders only the items the role can use. A group label is hidden when its group is empty.
- **Page-context band:** the address plate Ф.1 › Оп.1 › Д.15 › л.3 sits top-left, with the case title, years, script badge and status under it. Leaf navigation is top-right, and the action row ends in the primary «Проверено → следующая».
- **Confidence strip:** the mean, the share of low-confidence words, and the legend.
- **Work areas:** scan (≈45%) and text (≈55%) on one shared line grid. The edit bar is at the bottom with keyboard hints.
- **Signature interaction:** selecting a word drops a gold pin, with an ink ring, on its box on the scan. A leader line (gold casing around an ink core) joins the pin to the gutter-side edge of that word's row in the text pane. It never crosses the text, and works the same for `kk-arab` RTL. It follows as the user moves between words with ↑/↓.

FORM: A civic wayfinding system: bilingual address plates plus a location pin with a leader line. #7 on my ordered list.
- seed:67aa3ce0c89b0ec9
- **Raises:**
  - flat committed colour fields (from the guide-map lobes);
  - the action colour only on pressable controls (from the consumer cards);
  - one module grid binding scan and text (from the Crouwel grid);
  - fixed per-entry furniture: plate, years, script badge (from the character roster).
- **Chosen sketch:** `.impeccable/mocks/decision/assigned.html`.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved

- **Mobile view-only layout:** scan and text stacked, with a toggle.
- **Long-running OCR state** (`vlm`, 30–90 s cold start).

Tokens, fonts, overlay styles and the corrections to the sketch are in `docs/stages/2-design-system.md`. That spec wins over the sketch.
