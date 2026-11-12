---
version: 1
slug: "app-pages-admin-vue"
primary_target: "app/pages/admin.vue"
related_targets: ["app/components/admin/AdminUsers.vue","app/components/admin/AdminEais.vue","app/components/admin/AdminHealth.vue"]
---

# Surface brief — Администрирование (/admin)

- **Mode:** Operate, admin only. Handoff §6 #11, §5.6.
- **Layout:** two columns at ≥1280 px: left = Пользователи (wide); right = ЕАИС switch card on top, Service health card below. Single column below xl.
- **ЕАИС (demo outage switch):** card titled «ЕАИС — имитация сбоя (демо)», USwitch «ЕАИС на связи» bound to `/mock-eais/api/status`. Turning off asks a UModal confirm (error button «Отключить ЕАИС»); turning on applies immediately. Shows counts cases/files from the status. After switching, refresh the health store once.
- **Users:** UTable username (tabular mono-ish), ФИО, role USelect inline (PATCH on change with toast), «Сменить пароль» opens modal (min 4 chars, note «Пользователь будет разлогинен»). «Добавить пользователя» primary button → modal UForm with `validate`: username required, `^[a-z0-9._-]{3,32}$`; password ≥ 4; role required; full name optional ≤ 100.
- **Health:** definition list from the health store (no extra poll): workers with age + ok badge, disk free with the low-disk warning badge, OCR engine (tesseract/vlm/auto label), tesseract version, last backup («нет данных» when null), server time formatted.
- **States:** users loading/empty/error; health «нет данных» until the first poll; ЕАИС status error alert with retry.
