---
version: 1
slug: "app-pages-upload-vue"
primary_target: "app/pages/upload.vue"
related_targets: ["app/components/ops/OpsShifrFields.vue", "app/components/ops/OpsFilesTable.vue"]
---

# Surface brief — Загрузка и очередь (/upload)

- **Mode:** Operate. Operator feeds scans and watches them move through the queue. Handoff §6 #3.
- **Top panel:** workplace (ws1/ws2 radio), optional шифр (Фонд/Опись/Дело, digits only, inline validation), live debounced «Дело в ЕАИС: …» line with three outcomes (found = success icon + title; not found = warning; ЕАИС down = error + detail). Drop zone (keyboard-reachable button + hidden file input, accepted formats line), XHR progress bar, and the result list of `saved` names (never server paths beyond the relative inbox name — show the file name only).
- **Queue table:** status filter (URL query `status`), search `q` (debounced), columns Файл · Шифр (compact plate or «—») · Стр. · Статус badge (retry shows countdown) · Попыток · Обновлено · action («Отправить сейчас» on retry; «К ошибкам» link on invalid). Polled every 5 s.
- **States:** table loading/empty/error from ru/ops.ts. Upload error inline + toast.
- **Never** show spool_path / archive_path / error_path.

## Stage 11a shape (2026-11-12): the шифр picker

Assumptions are marked (A); no human answer round was available, the orchestrator brief `docs/stages/11a-brief.md` is the spec.

- **Job and audience.** Operators and archivists aged 40–50, little IT background. They know the case by its name on the folder, not by number. Success: pick Ф → Оп → Д in three clicks without typing, see «Дело в ЕАИС: …» confirm it, drop the scans.
- **Direction.** Inside the established «Адрес архива» world; no new tokens. The three number boxes become three stacked searchable selects in cascade order (top to bottom = Фонд → Опись → Дело), each full width so long фонд and case titles read whole. Typing a number ranks the exact number first, then numbers that start with it, then titles. Picking a фонд clears опись and дело; picking an опись clears дело. (A) A фонд with exactly one опись selects it automatically.
- **Editors** get a neutral outline «Новое дело» next to Дело that opens a modal (fond/опись prefilled and editable, дело prefilled with the next free number (A), title required, years optional). 201 selects the new case; 409 offers «Выбрать это дело»; 400/503 show `detail` inline in the modal. **Operator** sees a muted one-line hint under Дело instead, never the button. Restricted cases: operator sees «Д.21» bare; editors see title plus a lock badge.
- **ЕАИС down / list error.** Soft error alert with the server `detail`, a «Загрузить список снова» outline action, and the old three number inputs underneath; upload keeps working.
- **Copy.** One sentence above the fields. The filename rule moves into a «Как назвать файл?» disclosure. `OpsCaseCheck` stays under the selects. The same component serves the «Исправить шифр» modal; a prefilled case not in the ЕАИС list shows as «Д.99 — нет в списке ЕАИС».
