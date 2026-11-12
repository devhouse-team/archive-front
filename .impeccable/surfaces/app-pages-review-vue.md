---
version: 1
slug: "app-pages-review-vue"
primary_target: "app/pages/review.vue"
related_targets: []
---

# Surface brief — Очередь проверки (/review)

- **Mode:** Operate, EDITORS only. Handoff §6 #7. The archivist works worst-first through pages with low OCR confidence.
- **Layout:** header row with h1-equivalent count «На проверке: N листов». UTable keeps server order (worst first): # · Шифр (compact plate with лист) · Название (`dir="auto"`, muted) · Язык badge · Уверенность: number + meter (warning colour; every row is low_conf) · Слов с низкой уверенностью «31 %» from `low_share` · «Открыть» button → `/page/:id?mode=edit`. The first row's button is primary solid; the rest outline, so the next action is obvious.
- **States:** skeleton; empty «Очередь пуста» with a quiet success icon and a link to Дела; error alert with retry.
- **No polling** (the shell queue store already counts); a «Обновить» ghost button refreshes.
