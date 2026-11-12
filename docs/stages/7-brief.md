# Stage 7 brief: M1 operator screens (§6 #2, #3, #4, #10)

The parallel build follows `docs/stages/parallel-rules.md`. Read it first.

## Sources

- **Handoff:** §2 (STAFF only; readers never see these), §4 (file statuses, polling, **never display `spool_path` / `archive_path` / `error_path`**), §5.2, §9 (invalid files with an empty шифр; hide «Отправить повторно» when `error_reason` starts with «Пустая», «Чёрная» or «Разрешение»).
- **Token spec:** `docs/stages/2-design-system.md` (status mapping).
- The ЕАИС state comes from the `health` store (Stage 3/4); don't poll health again.

## Deliverables

1. **`/ops` — Панель оператора** (the start screen for operator and admin).
   - **Tiles** from `/api/m1/queue`: in the queue, retry, uploaded today, errors, OCR pending/running. Each tile links to its filtered screen.
   - **Stats bars** from `/api/m1/stats?period=day|month` (uploaded, errors, pages), with a day/month toggle. Use a small accessible bar chart (inline SVG or CSS, no chart library) with a text table alternative. Load the dataviz skill first.
   - **Recent events:** the last 10 from the journal.
   - An ЕАИС outage banner with the countdown, from the health store.
   - Poll the queue through `usePolling` (about 5 s) while the screen is mounted.
2. **`/upload` — Загрузка и очередь.**
   - Drag & drop plus a file picker (multipart `files[]`), a workplace choice `ws1`/`ws2`, and an optional шифр (fond, opis, delo; digits only).
   - When the шифр is complete, a live, debounced «Дело в ЕАИС: <title>» check via `/api/m1/check-case`. It has three outcomes: found, not found, and ЕАИС down (`found: null` + detail).
   - Upload progress and the result list (`saved`).
   - Below it, the queue table from `/api/m1/files`: status filter, search `q`, status badges, a «Отправить сейчас» action on `retry` rows, and polling.
3. **`/errors` — Ошибки.**
   - The `status=invalid` rows: name, reason, шифр (may be empty), time.
   - A preview through `/api/m1/files/{id}/preview` (404/415 → a «Превью недоступно» placeholder).
   - «Исправить шифр»: a modal form (fond, opis, delo, leaf?) with the live case check, POST shifr, then a toast and refresh.
   - «Отправить повторно»: POST retry, hidden for the §9 reasons.
   - An empty state («Ошибок нет»).
4. **`/journal` — Журнал.**
   - A table with `result` filter (ok/error/info), search `q`, and pagination (limit 50, offset).
   - Columns: time, actor, action, file, шифр, result badge, details.
5. **Tests:**
   - the retry button is hidden for each §9 prefix;
   - server paths are never rendered (a grep or render test);
   - шифр digit validation;
   - polling stops on unmount;
   - a reader cannot reach any of these routes.

## Exit criteria

- Your own lint and tests pass. Report the full typecheck result.
- Proxy mode as operator against the real backend: every screen renders with real data.
- On the dev backend, do one «Исправить шифр» or retry on an existing invalid row **only if** it is reversible or harmless. Otherwise use mock mode on your port for the mutation demo, and run `nuxt prepare` after.
- Don't upload files to the real backend except one small test image, and say which one.
- Screenshots: ops 1920×1080, the ops ЕАИС-down banner (mock, or a toggle via an admin login that you switch back online at once), upload with the check result, errors with the preview and the open modal, and the journal.
