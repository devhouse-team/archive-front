---
version: 1
slug: "app-pages-errors-vue"
primary_target: "app/pages/errors.vue"
related_targets: ["app/components/ops/OpsFixShifrModal.vue", "app/components/ops/OpsFilePreview.vue"]
---

# Surface brief — Ошибки (/errors)

- **Mode:** Operate; fast triage at volume. Handoff §6 #4, §9.
- **Layout:** list of invalid files as rows: preview thumbnail (lazy, 96 px; 404/415 → «Превью недоступно» placeholder) · name + reason (error colour icon + text) · шифр (compact or «не определён») · time · actions.
- **Actions:** «Исправить шифр» (primary outline) opens a modal with the larger preview, Фонд/Опись/Дело/Лист fields (prefilled), live ЕАИС check, «Сохранить и отправить». «Отправить повторно» hidden when reason starts with «Пустая», «Чёрная», «Разрешение». Toast after each, list refresh.
- **States:** loading skeleton rows, error alert, empty «Ошибок нет» with a calm success icon.
