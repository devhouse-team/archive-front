# Stage 2 review — visual world and token spec

Reviewer: `reviewer` agent (Opus via `claude -p --agent reviewer`). impeccable critique CLI was not approved in its headless run; critique done by hand. Contrast recomputed independently (13 spec pairs + 20 extra).

## Round 1 — FAIL

The captured report starts at finding 6; findings 1–5 were lost to output truncation (the command kept only the last 45 lines). Round 2 re-reviews everything from scratch.

Major (6–11): scan overlays had no dual-tone outline for dark/yellowed scans; 36 px rule not wired into Nuxt UI defaults and sketch controls drawn at 28–34 px; leader line and line numbers specified only for LTR; sketch shows Администрирование to an archivist; 61 %/66 % drawn as low-confidence against the < 60 rule; `@theme` must be `@theme static`.
Minor (12–23): v3 status hexes; dimmed text fails on elevated; `secondary` mapped to civic invites civic buttons; contrast checker not in repo; contract stale (action hex, fonts); weight 700 not shipped; plate `lang="kk"` / aria-label / 9 px; «на проверке» civic vs warning; red badge on review count; «300 dpi» not in page payload; line grid vs type scale at fit-width; tracker lists DESIGN.md as Stage 2 output.

Fixes: all applied in `docs/stages/2-design-system.md` (rewritten; new "Authority" and "Sketch corrections" sections), contract synced, checkers committed to `scripts/design/`, tracker and brief updated.

## Round 2 — FAIL (0 critical · 7 major · 9 minor)

Full report: `docs/stages/.2-review-round2.txt`.
Major: semantic colours left at shade 500 (warning/error/success/secondary; soft badges failing); no visible focus on civic fields; leader line failed on dark/yellowed scans; RTL leader route undefined; @nuxt/fonts and @nuxt/icon could fetch remotely; LocatorPin had no a11y spec; page warning used an invented < 60 threshold instead of `low_conf`.
Minor: info/search-hit/meter colour roles; `--ui-text-toned`; checker didn't emit the spec table; 36 px gaps in NavigationMenu/DropdownMenu/Textarea/InputNumber/Switch/Checkbox; raw palette classes vs CLAUDE.md; neutral solid badge = bg-inverted; rail active cue; ShifrPlate double reading and aria-current; body ground and scan-pane tokens.

Fixes: spec rewritten. `scripts/design/contrast_tokens.py` now emits the spec's contrast table verbatim (40 pairs + dual-tone strokes on 4 scan grounds, 0 failing). Leader changed to gold casing + ink core (the white-halo/locator-700 version failed 2.70 on yellowed scans). New sections: Focus, Semantic aliases, Nuxt UI wiring (`ui.fonts/colorMode: false`, local icons, slot overrides), Confidence semantics, LocatorPin keyboard/ARIA. Contract synced.

## Round 3 — FAIL (0 critical · 4 major · 10 minor)

Full report: `docs/stages/.2-review-round3.txt`. All 16 round-2 findings verified fixed.
Major: on-civic focus wrongly applied to ShifrPlate (chips sit on white); word-box strokes at 40% opacity failed 3:1; text-pane low-confidence cue was colour-only; ЕАИС status colours on civic header failed AA.
Minor: Nuxt UI component wiring on civic fields; Pagination/close/stepper 36 px; RTL ←/→ and editor-only editing; stale evidence rows; error soft badge on elevated (4.49) and dimmed on scan-pane; `info: 'neutral'` vs slate; unmapped statuses; corrected-word treatment; fonts @fontsource vs public/fonts conflict; overlay precedence.

Fixes: all applied. `--ui-error` moved to red-800 (soft badge on elevated now 5.83). Checker extended to 51 pairs, 0 failing. New spec sections: Status mapping, Nuxt UI on civic fields, overlay precedence, corrected words. CLAUDE.md and designer prompt updated to @fontsource and semantic aliases.

## Round 3 — FAIL (0 critical · 4 major · 10 minor)

Full report: `docs/stages/.2-review-round3.txt`. All 16 round-2 findings verified fixed.
Major: on-civic focus wrongly applied to ShifrPlate (chips sit on white); word-box strokes at 40% opacity failed 3:1; text-pane low-confidence cue was colour-only; ЕАИС status colours on civic header failed AA.
Minor: Nuxt UI component wiring on civic fields; Pagination/close/stepper 36 px; RTL ←/→ and editor-only editing; stale evidence rows; error soft badge on elevated (4.49) and dimmed on scan-pane; `info: 'neutral'` vs slate; unmapped statuses; corrected-word treatment; fonts @fontsource vs public/fonts conflict; overlay precedence.

Fixes: all applied. `--ui-error` moved to red-800 (soft badge on elevated now 5.83). Checker extended to 51 pairs, 0 failing. New spec sections: Status mapping, Nuxt UI on civic fields, overlay precedence, corrected words. CLAUDE.md and designer prompt updated to @fontsource and semantic aliases.

## Round 4 — FAIL (0 critical · 3 major · 4 minor)

Full report: `docs/stages/.2-review-round4.txt`. All 14 round-3 findings verified fixed.
Major: Nuxt UI v4 state classes (hover/focus/active, icon colours) survive the civic overrides and drop to 1.2–2.08:1; bare custom `focus-on-rail` utility is cancelled by Nuxt UI's `focus-visible:outline-none`; control boundaries (checkbox ring slate-500, switch track slate-200) fail 3:1 on elevated/scan-pane.
Minor: leader row outside overlay table; stale "links in action-700"; corrected vs low-confidence precedence; ЕАИС dot aliases and down-state text.

Fixes: focus written as variant classes; civic overrides now cancel state classes for NavigationMenu link/icon, header UInput and ghost UButton; `--ui-border-accented` and `--ui-bg-accented` → slate-600; precedence and ЕАИС states fixed; aliases added. Checker 62 pairs, 0 failing. Rendered tab-through of rail/header added to Stage 3 exit.

## Round 5 — PASS (0 critical · 0 major · 2 minor)

Verification-only round. Full report: `docs/stages/.2-review-round5.txt`. All 7 round-4 findings fixed; no sections lost.
Minors fixed after the verdict: `UProgress`/`USlider` tracks excluded from `--ui-bg-accented` and pinned to `bg-meter-track` (indicator 3.86:1, row added to the checker); unused `--color-eais-down` alias removed.
