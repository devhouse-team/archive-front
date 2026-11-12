# Stage tracker

Owner: `orchestrator` agent. Plan: stages 0–10. A stage is done only with a reviewer PASS in `docs/stages/<n>-review.md`.

| # | Stage | Screens / output | Status | Done |
|---|---|---|---|---|
| 0 | Harness, agents, project rules | `.claude/agents/{orchestrator,designer,reviewer}.md`, `CLAUDE.md`, `evals/agents/` | done (eval baseline 16/16, 0 critical) | 2026-11-12 |
| 1 | Product context (`/impeccable init`) | `PRODUCT.md` — **user approval** | done (user approved) | 2026-11-12 |
| 2 | Visual world + design system (impeccable new-work, ui-ux-pro-max) | direction contract, token spec `2-design-system.md`, fonts — **user approval** (DESIGN.md deferred to end of Stage 5) | done (user approved; review PASS round 5) | 2026-11-12 |
| 3 | Scaffold + plumbing | Nuxt 4 SPA, API layer, stores, middleware, mock API, locales | done (review PASS round 2) | 2026-11-12 |
| 4 | Shell + auth | §6 #1 Login, #12 bell, app shell, header ЕАИС indicator | done (review PASS round 1) | 2026-11-12 |
| 5 | M2 page viewer | §6 #6 Страница (finish review → Stage 9, `DESIGN.md` → Stage 10 under the compressed schedule) | done (review PASS round 2) | 2026-11-12 |
| 6 | M3 search + collections | §6 #8 Поиск, #9 Подборки | done (review PASS round 2) | 2026-11-12 |
| 7 | M1 operator | §6 #2 Панель, #3 Загрузка, #4 Ошибки, #10 Журнал | done (review PASS round 2) | 2026-11-12 |
| 8 | Cases, review, admin | §6 #5 Дела, #7 Очередь проверки, #11 Администрирование | done (review PASS round 2) | 2026-11-12 |
| 9 | Harden + finish | backlog fixes (`9-brief.md`), finish review, gate | done (review PASS round 1) | 2026-11-12 |
| 10 | Document | DESIGN.md from shipped code, CLAUDE.md, eval re-baseline | done (docs review PASS; evals 16/16) | 2026-11-12 |

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
- 2026-11-12: Committed and pushed `bb1106a` to origin/main at the user's request (author Nurzhan, no co-author). Local tool state, eval run logs and pycache are excluded via .gitignore. Stages 5–8 were mid-build at commit time.
- 2026-11-12 ~06:55: **Open, needs the user.** The Stage 5 designer's login to the real backend on :8000 was denied by the permission system ("Identity Not Given"), so the viewer was verified only with in-browser mock data. The real-backend check (page 9 `?hl=мектеп`, a kk-arab page and a kk-latn page, as archivist and as reader) and the one-word edit round-trip are pending the user's OK. Not routed to another agent.
- 2026-11-12 07:25: Stages 3–8 done and pushed (bf95260). Full gate on the whole app: typecheck 0, lint 0, test 218/218, build 0, check:offline 84 files clean, glyphs pass, `.output/public` 3.0 MB. Stage 9 started: the designer works the backlog while impeccable-finish-reviewer reviews the whole app read-only.
- 2026-11-12 08:10: Stage 9 parts A and B built: designer gate typecheck 0, lint 0, tests 223/223, build 0, offline 84 files clean, glyphs 0, mock smoke 76/0. Final reviewer gate running. Stage 10 started in parallel: impeccable-documenter writes DESIGN.md, and the full eval run (`--promote`) re-baselines after the designer.md and suite edits.
- 2026-11-12 08:10: **Open, needs the user.** The permission system also denied the Stage 9 designer's proxy-mode smoke (`node scripts/smoke-roles.mjs http://localhost:3000`) against the real backend. It passed in mock mode (76/0). Not routed to another agent. It needs the user's OK, together with the Stage 5 real-backend viewer check.
- 2026-11-12 08:30: Stage 10 done. Full eval run `stage10-rebaseline` ($9.58) first scored 15/16. The one failure (`des-build-badge`, `wrote_cyrillic_in_vue`) was a recorder false positive: Cyrillic in a JS code comment, which the project rule allows. Fixed `record.py` to strip JS comments from script fragments. Also fixed `run_suite.py --promote`, which promoted despite an `eval_diff` regression. Re-scored: 16/16, 0 critical, no regression. Promoted to `baseline.report.json`.
- 2026-11-12: **Build complete (stages 0–10).** Open items for the user: (1) real-backend role smoke and viewer check (permission-system denials blocked agents); (2) replace the Nuxt-default favicon; (3) the backlog in `9-backlog.md`.
