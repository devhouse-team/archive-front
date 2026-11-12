---
version: 1
slug: "app-layouts-default-vue"
primary_target: "app/layouts/default.vue"
related_targets: ["app/components/AppBrand.vue","app/components/AppRail.vue","app/components/EaisIndicator.vue","app/components/NotificationBell.vue","app/components/UserMenu.vue"]
---

# Surface brief — App shell (rail, header, bell, user menu)

## Scope and mode

- **Target:** `app/layouts/default.vue` and its parts (`AppBrand`, `AppRail`, `EaisIndicator`, `NotificationBell`, `UserMenu`). Every signed-in screen lives inside it.
- **Mode:** Operate. The shell is furniture: it tells the user where they are, whether ЕАИС is reachable, and what needs attention, then gets out of the way.
- **Extends** the «Адрес архива» world defined in `.impeccable/surfaces/app-pages-page-id-vue.md`. No new visual decisions; tokens per `docs/stages/2-design-system.md`.

## Job and audience

- All four roles, all day. Archivists and operators on 1920×1080 office monitors; readers sometimes on a 375 px phone (search and page view only).
- Primary questions the shell answers at a glance: *Where am I?* (active rail item, header title), *Is ЕАИС up, and when is the next retry?* (indicator), *Is anything broken?* (Ошибки count, bell, worker/disk warnings for STAFF), *Who am I signed in as?* (user menu).

## Selected direction (inherits the contract)

- **Two flat civic fields:** a 220 px rail and a 56 px header in civic-800, no grey chrome, no borders between them. The brand sits at the top of the rail in the header's 56 px band, so the two fields read as one L-shaped sign.
- **Rail:** a plain `<nav>` of links (not `UNavigationMenu`; see the Stage 4 note in the token spec), groups with bilingual plate-face micro-labels «ҚОР · ФОНД», «ӨҢДЕУ · ОБРАБОТКА», «ЖҮЙЕ · СИСТЕМА» (Kazakh half `lang="kk"`). Only `navForRole()` items; empty groups vanish. Active item: civic-700 ground, 3 px white inline-start bar, `aria-current="page"`. Gold is **not** used in the rail (gold = locator only).
- **Counters:** «Ошибки» = solid error badge; «Очередь проверки» = solid neutral badge; hidden at 0; never requested for roles without the screen.
- **Header:** screen title (text, not a heading: each screen owns its `h1` in `<main>`), then right-aligned ЕАИС indicator, bell (STAFF), user menu.
- **ЕАИС indicator:** online = green dot with white ring + white text «ЕАИС на связи». Down = solid error badge «ЕАИС недоступна» + «Повтор через m:ss» ticking each second between 5 s polls. Never colour alone. For STAFF it is a button opening a popover with ЕАИС state, down-since, retry countdown, worker heartbeats with `ok: false`, and `disk_low`; a white warning icon plus count appears on the indicator when any worker or disk problem exists. Readers get a static status, no popover.
- **Bell:** STAFF only. Neutral count badge (99+ cap). Popover lists the last 20 with level icon + text label, time, unread marker; «Отметить все прочитанными». New error-level items toast once each (never on first load).
- **User menu:** initials avatar + full name (name hidden < sm) → dropdown with full name, role, «Выйти».

## States and ranges

- Health not loaded yet: indicator shows nothing rather than a guess. Health failing: «Нет данных о ЕАИС» muted text (never pretend online).
- Bell: loading, error (with retry), empty, 1–20 items, unread 0 to 999 (shows 99+).
- Rail: reader 3 items/1 group; operator 7/2; archivist 8/2; admin 9/3. Counters 0 to 4 digits.
- Page error (403/404): header title is hidden so a forbidden screen's name is not echoed.

## Interaction and layout

- Tab order: skip link «К содержимому» → rail links → header (indicator, bell, user) → main.
- Landmarks: rail `<nav aria-label="Основное меню">`, header `<header>`, `<main id="main" tabindex="-1">`.
- < 1024 px: rail becomes a left slideover (Nuxt UI `UDashboardSidebar` mobile menu) opened by a 36 px header toggle; closes on navigation. At 375 px nothing scrolls horizontally: the title truncates first, the user's name hides, the indicator keeps its text.
- Session: a 401 while signed in clears the session once, shows one toast, and goes to `/login?next=<current>`. Logout clears stores; polling dies with the layout.

## Constraints and open decisions

- **Header search box** from the sketch is deferred to Stage 6 with the search screen (its query syntax and history belong there). The header's left slot holds the screen title until then.
- Assumption (no user available in this run): header title is plain text; screens own their `h1`.
