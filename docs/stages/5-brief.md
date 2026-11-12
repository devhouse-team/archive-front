# Stage 5 brief: M2 page viewer (§6 #6)

The parallel build follows `docs/stages/parallel-rules.md`. Read it first; it wins on ownership, ports and checks.

## Goal

`/page/[id]` is the archivist's main work surface. It shows the scan with word overlays and the recognised text side by side, with a view mode and an edit mode, low-confidence highlighting, found-word highlighting, prev/next navigation and exports. This is the signature screen of «Адрес архива».

## Sources

- **Direction contract:** `.impeccable/surfaces/app-pages-page-id-vue.md` (THESIS, FIRST VIEWPORT, FORM, FINISH line). The composition reference is `.impeccable/mocks/decision/assigned.html`.
- **Token spec:** `docs/stages/2-design-system.md`. Read these sections:
  - "Scan overlays and the locator" (dual-tone strokes)
  - "Confidence semantics"
  - "Signature components" (ShifrPlate, LocatorPin and leader line, shared line grid)
  - "Status mapping"
  - "Sketch corrections"
- **Handoff:** §2 (edit only for EDITORS in `mode=edit`), §4 (coordinates, confidence, words, highlighting, RTL), §5.3 (pages, image, words PATCH, reviewed, retry, export), §8 (`vlm`, long `running`).
- **Live contract drift:** pages carry `low_word_conf` (60 for Tesseract, 96.5 for `vlm`). The low-confidence threshold is `page.low_word_conf ?? 60`, not a hard-coded 60.

## Deliverables

1. **Route.**
   - `/page/[id]?hl=&fz=&mode=view|edit`. `mode=edit` is honoured only for admin and archivist; other roles always get view mode with no edit affordances.
   - A 404 shows the shared not-found state. A restricted page for a non-editor is a 404 with the same UI.
2. **Context bar.**
   - `ShifrPlate`: the full variant, with the лист segment current and the дело linking to `/dela/:id`.
   - Case title, language badge, page status badge (spec status mapping, plus «на проверке» / «проверено»), engine, and a confidence meter.
   - Prev/next page.
   - Export menu: txt, json, hocr, alto, pdf, through `useApi` `download()`.
   - EDITORS get «Отметить проверенной», which calls POST reviewed, then opens `next_review_id` or shows a «очередь пуста» toast. STAFF get «Распознать заново» for the page (POST retry).
3. **Scan pane.**
   - The full image, fit-to-width by default, with zoom controls (по ширине, 100 %, ±) and keyboard-reachable buttons.
   - Word boxes are scaled by `displayedWidth / width` and recomputed on resize and zoom.
   - Low-confidence boxes, hit boxes (`highlight_word_ids`) and the selected box use the spec's dual-tone strokes.
   - Scroll to the first hit on load when `hl` is set.
   - LocatorPin and leader line to the gutter-side edge of the text row, `aria-hidden`, animated 120 ms, jumping under reduced motion.
4. **Text pane.**
   - Words are grouped by `line` and ordered by `idx`. Line numbers sit on the inline-start side. `kk-arab` gets `dir="rtl"` and 30 px rows.
   - The pane is a single tab stop with a roving tabindex:
     - ↑/↓ moves to the previous/next low-confidence word;
     - ←/→ moves in **visual** order, so it is mirrored in RTL;
     - Tab leaves the pane.
   - A polite live region announces «Слово N из M · уверенность X %».
   - Clicking a word or a box selects it in both panes.
5. **Edit mode** (EDITORS only).
   - Enter opens inline edit, Enter commits, Esc cancels; focus returns to the word.
   - Corrected words are marked, and the original `ocr_text` shows in a tooltip.
   - Save PATCHes **only the changed words**, then shows a toast with `changed` and `cer`.
   - Leaving the page with unsaved edits asks for confirmation.
6. **Long recognition.** While status is `pending` or `running`, show a progress state that says recognition can take up to a minute or two with `vlm`, and poll the page through `usePolling` (about 3 s) until it is `done` or `failed`. `failed` gets a STAFF retry.
7. **States:** loading skeleton, error (PageErrorState), a page with no words («Текст не распознан»).
8. **Mobile** (< 1024 px; readers use it): stacked panes with a «Скан / Текст» toggle and no horizontal scroll at 375 px.
9. **Tests:**
   - box scaling;
   - line grouping and ordering;
   - the low-confidence threshold from `low_word_conf`;
   - the keyboard model (including mirrored ←/→ in RTL);
   - the PATCH payload contains only the changed words;
   - edit affordances absent for operator and reader.

## Exit criteria

- Your own lint and tests pass. Report the full typecheck result.
- Screenshots at 1920×1080: view mode with `hl` hits, edit mode with one word in edit, the `kk-arab` RTL page, a long-running state (mock or captured), and mobile 375 px.
- Proxy mode against the real backend: open page 9 with `?hl=мектеп`, then a `kk-arab` page and a `kk-latn` page, as archivist and as reader.
- Do **not** save real corrections to the dev backend except one round-trip edit that you revert straight after (same word back to its original text).
- After this stage passes review, the orchestrator runs the impeccable finish review and `impeccable-documenter` writes DESIGN.md.
