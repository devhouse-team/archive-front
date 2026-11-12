---
version: 1
slug: "app-pages-ops-vue"
primary_target: "app/pages/ops.vue"
related_targets: ["app/components/ops/OpsTiles.vue", "app/components/ops/OpsStatsChart.vue", "app/components/ops/OpsEaisBanner.vue", "app/components/ops/OpsRecentEvents.vue"]
---

# Surface brief — Панель оператора (/ops)

## Scope and mode
- Operate. Start screen for operator and admin (STAFF only, handoff §2). Handoff §6 #2. Stage 7.

## Job and audience
- An operator at the start of and during a shift: "is anything stuck, is ЕАИС up, what happened last". Success = in one glance know whether to go to Ошибки / Загрузка, and get there in one click.

## Selected direction (inside the approved «Адрес архива» world)
- Order: ЕАИС outage banner (only when down) → row of 6 count tiles (links) → two columns: stats (small multiples) left, recent events right.
- Tiles: white panels, big tabular number, label below. Non-zero «Ошибки» and «Повтор» carry a status badge cue (icon + colour), never colour alone. Each tile is one link to its filtered screen (`/upload?status=queued|retry|uploaded`, `/errors`, `/dela`).
- Stats: three small-multiple column charts (Загружено, Страниц распознано, Ошибки), one series each, one axis each (no dual axis), ≤24 px columns with 4 px rounded tops, value on the tallest column only, period labels under. Day/month toggle as a 2-item UTabs-like segmented control. «Таблица» toggle swaps in a real table (text alternative). Bars use `bg-meter`; errors use `bg-error` (spec: error owns the «Ошибки» count).
- Recent events: last 10 journal rows, time · actor · action · file/шифр, result as a soft badge. Link «Весь журнал».
- Banner: error UAlert «ЕАИС недоступна с HH:MM», waiting files count and the health-store countdown, «Файлы не потеряются».

## States
- Loading: skeleton tiles / chart. Error: inline UAlert with retry. Empty stats: copy pointing to Загрузка. Empty events: «Событий пока нет».

## Constraints
- Queue polled through usePolling 5 s while mounted; health from the store (no extra poll). Strings in ru/ops.ts.
