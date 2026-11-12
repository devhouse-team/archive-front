---
version: 1
slug: "app-pages-journal-vue"
primary_target: "app/pages/journal.vue"
related_targets: []
---

# Surface brief — Журнал (/journal)

- **Mode:** Operate; audit lookup. Handoff §6 #10.
- Toolbar: result filter (Все / Успешно / Ошибка / Информация), search q (debounced). UTable: Время · Пользователь · Действие · Файл · Шифр · Итог (soft badge with icon) · Подробности. Pagination by offset (limit 50): «Назад» / «Далее», «Записи 1–50»; the API has no total, so «Далее» is enabled when a full page came back.
- States: loading, empty («Записей нет» / «Ничего не найдено» when filtered), error alert with retry.
