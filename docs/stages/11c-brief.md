# Stage 11c brief: the calm viewer and the calm shell

Parent: `docs/stages/11-ux-brief.md` (read «Why» and «11c» in full; it is the spec). The user called /page «so noisy to the eyes». Users are archive staff aged 40–50 with little IT background: fewer things at once, plain words, one obvious next step. Detail stays reachable but folded away.

## Scope

- Screen: §6 #6 Страница (`app/pages/page/[id].vue`, `app/components/viewer/**`).
- Shell: rail group labels Russian only («Фонд», «Обработка», «Система») and `ShifrPlate` without the Kazakh micro-labels (all usages: viewer, lists, cards, search). Keep `kk` strings in `ru.ts` for a future Kazakh UI.
- Docs: this **reverses the Stage 2 bilingual micro-label decision**. Update `DESIGN.md`, `.impeccable/design.json` and `docs/stages/2-design-system.md` to match (state the reversal and date 2026-11-12).

## Requirements (from the parent brief, summarised; the parent wins)

- Header, one line: compact ShifrPlate `Ф.1 Оп.1 Д.12 · л.2` without micro-labels; title; year; leaf navigation as today.
- Language badge, «распознано», «Движок: …» → under a «Подробнее» disclosure.
- Actions: one primary «Отметить проверенной» (editors only, as today). Экспорт and Распознать заново → neutral «Ещё ⋯» menu (UDropdownMenu). Re-OCR confirmation unchanged; export formats still reachable; role gating unchanged.
- Confidence row: one sentence «Слов для проверки: N» or «Все слова распознаны уверенно». Mean %, bar, threshold, legend only in Правка. Threshold stays `page.low_word_conf ?? 60`.
- Text pane: per-line % hidden in Просмотр, shown in Правка. Keyboard-hint footer → small «?» button that opens the hints (popover; keyboard shortcuts keep working).
- Scan toolbar: −, %, +, «По ширине». «Рамки слов» moves to Правка. Search-hit highlighting (`?hl=`) and the selected-word box still show in Просмотр.
- Base body text ≥ 16 px; every control 36 px target, AA contrast, visible focus. Toggles stay `aria-pressed` button groups.

## Ownership (parallel with 11a and 11b)

You own `app/pages/page/**`, `app/components/viewer/**`, `app/locales/ru/viewer.ts`, `test/viewer*.test.ts`, and for this stage also `app/components/ShifrPlate.vue`, `app/components/shell/**`, `app/utils/nav.ts` (rail labels), shared `plate.*`/`nav.*` keys in `app/locales/ru.ts`, `DESIGN.md`, `.impeccable/design.json`, `docs/stages/2-design-system.md`, `test/shell*.test.ts`. Keep the `ShifrPlate` props API backward compatible: 11a and 11b render it at the same time. Dev port **3010**. Rules in `docs/stages/parallel-rules.md` apply.

## Exit criteria

- New tests: viewer details (language, status, engine, mean %, legend, per-line %, «Рамки слов») hidden in Просмотр and shown in Правка; «Ещё ⋯» holds Экспорт and Распознать заново with role gating; ShifrPlate renders no `lang="kk"` micro-label.
- typecheck/lint/test exit 0 for your files; `pnpm check:glyphs` still passes.
- **Count target:** baseline measured by the orchestrator with `count-page.mjs` (chrome items in `main` above the fold, word tokens excluded, archivist, `/page/9`): **82 at 1920×1080, 70 at 1280×720**. Target ≤ 41 and ≤ 35. The orchestrator re-measures after.
- Screenshots `.impeccable/review/stage11c-*.png` at 1920×1080 and 1280×720: Просмотр, Правка, «Подробнее» open, «Ещё ⋯» open, «?» hints open, `?hl=` hit, reader view, rail. Look at them.
- Before screenshot: `.impeccable/review/stage11-before-page-{1920,1280}.png`.
