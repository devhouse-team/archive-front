# Stage tracker

Owner: `orchestrator` agent. Plan: stages 0–10. A stage is done only with a reviewer PASS in `docs/stages/<n>-review.md`.

| # | Stage | Screens / output | Status | Done |
|---|---|---|---|---|
| 0 | Harness, agents, project rules | `.claude/agents/{orchestrator,designer,reviewer}.md`, `CLAUDE.md`, `evals/agents/` | done (eval baseline 16/16, 0 critical) | 2026-11-12 |
| 1 | Product context (`/impeccable init`) | `PRODUCT.md` — **user approval** | done (user approved) | 2026-11-12 |
| 2 | Visual world + design system (impeccable new-work, ui-ux-pro-max) | direction contract, token spec `2-design-system.md`, fonts — **user approval** (DESIGN.md deferred to end of Stage 5) | done (user approved; review PASS round 5) | 2026-11-12 |
| 3 | Scaffold + plumbing | Nuxt 4 SPA, API layer, stores, middleware, mock API, locales | done (review PASS round 2) | 2026-11-12 |
| 4 | Shell + auth | §6 #1 Login, #12 bell, app shell, header ЕАИС indicator | built; review running | |
| 5 | M2 page viewer | §6 #6 Страница + impeccable finish review + `DESIGN.md` via impeccable-documenter | in progress (parallel) | |
| 6 | M3 search + collections | §6 #8 Поиск, #9 Подборки | in progress (parallel) | |
| 7 | M1 operator | §6 #2 Панель, #3 Загрузка, #4 Ошибки, #10 Журнал | in progress (parallel) | |
| 8 | Cases, review, admin | §6 #5 Дела, #7 Очередь проверки, #11 Администрирование | in progress (parallel) | |
| 9 | Harden + finish | impeccable harden/adapt/optimize/polish, finish review | todo | |
| 10 | Document | DESIGN.md from shipped code, CLAUDE.md | todo | |

## Notes

- 2026-11-12: Backend docs referenced by the handoff (`DESIGN.md`, `ARCHITECTURE.md`, screenshots, `app.js`) are not available. The handoff is the only product source; the visual world is new.
- 2026-11-12: Eval baseline 16/16, 0 critical ($8.46). A recorder bug (macOS /private/var paths) was fixed before promotion; it had made `wrote_ui_file` blind.
- 2026-11-12: User asked for an unattended run through all stages while they sleep.
- 2026-11-12: Backend repo found at `../astana-archive`. It runs locally on :8000 with its data in a scratch dir, so the repo is untouched and read-only for us. Stages 3+ test against the real API; the mock stays for offline work.
- 2026-11-12: Stage 3 built. Orchestrator re-ran typecheck, lint, test (108), build, check:offline, check:glyphs: all exit 0. Smoke script `scripts/smoke-roles.mjs` 39/39 in proxy and mock mode (designer's run).
- 2026-11-12: **Backend contract drift.** Someone edited `../astana-archive` during the night (VLM work). The live API now sends `low_word_conf` per page (60 Tesseract, 96.5 vlm) and health `ocr_engine` can be `"auto"`. `app/types/api.ts` and the mock carry both. The handoff's fixed "conf < 60" rule is superseded: Stage 5 must use `page.low_word_conf ?? 60`.
- 2026-11-12: Open from Stage 3: one long main-thread task delays the first toast on the heavy specimen page in headless Chrome (cause not isolated). Profile headed in Stage 4 or 9.
- 2026-11-12: Designer eval re-run after the `designer.md` fontsource edit (`runs/designer-after-fontsource-edit`, $2.81): 5/5 designer scenarios pass, 0 critical. One assertion was removed: `des-remote-font-request` required a craft-floor read, but the designer correctly refused before any UI edit, and the rule only applies before UI edits. Craft-floor reads stay asserted in `des-build-badge` and `des-semantic-colors`. Re-baseline with a full `--promote` run at Stage 10.
- 2026-11-12 05:45: **User set a hard stop at 11:00** and chose "all screens, faster process". Stages 5–8 are built in parallel under `docs/stages/parallel-rules.md`: one locale file per area, assigned ports, additive-only edits to shared files. Each stage gets one review round; criticals and majors are fixed, minors go to the Stage 9 backlog. Stage 9 shrinks to a build, offline and role smoke pass. Stage 10 = DESIGN.md via impeccable-documenter. Stage 7 started next to Stage 4; 5, 6 and 8 start when Stage 4 ships ShifrPlate and the shell.
- 2026-11-12: Stage 4 built (smoke 76/76 before Stage 7 edits; the rail moved off UNavigationMenu, which re-rendered 176× after sign-in). Boot long tasks (~6.5 s before /login paints) → Stage 9. Stage 4 review and the Stage 5, 6 and 8 designers started in parallel.
