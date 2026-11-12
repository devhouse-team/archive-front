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
