---
version: 1
slug: "app-pages-login-vue"
primary_target: "app/pages/login.vue"
related_targets: []
---

# Surface brief — Вход (login)

## Scope and mode

- **Target:** `app/pages/login.vue` in the `bare` layout. Handoff §6 #1.
- **Mode:** Operate. One task: get signed in and land on the role's start screen. Not a marketing page: no hero art, eyebrow, gradient or institution name.

## Job and audience

- Archive staff on office PCs at the start of a shift, and demo visitors who need to try each role in one click.
- Success: a correct login reaches the start route (or a safe `?next=`) in one action; a wrong one explains itself next to the form.

## Selected direction

- **The civic header carries over.** A 56 px civic-800 band at the top with the product mark and «Цифровой архив Астаны» in white, exactly where the shell's header will be after sign-in. Below it, the light ground with one white panel (8 px radius), max 400 px wide, centred in the upper third, not floating mid-screen.
- **Panel content:** `h1` «Вход», fields «Логин» and «Пароль» (labels, `autocomplete`, show-password toggle), full-width primary «Войти» with loading state. Server `detail` for 400/401 appears inline above the button (`role="alert"`), never only as a toast.
- **Demo access** sits below the form in the same panel, separated by a divider: a short muted line «Демо-доступ: пароль совпадает с логином» and four outline buttons, one per role (role names from `ru.ts`), in a 2×2 grid. One click fills nothing visible and signs in. Hidden entirely when `runtimeConfig.public.demoAccounts` is off (`NUXT_PUBLIC_DEMO_ACCOUNTS=0`).
- Type: Fira Sans; `h1` 22 px/600; the brand in the band 16 px/700.

## States

- Idle; validating (empty fields → field-level messages on submit; the submit button is always enabled); submitting (button loading, chips disabled); server error inline; backend unreachable → the network message inline.
- Already signed in → redirected by the middleware to the start route.

## Interaction and layout

- First focus on «Логин». Enter submits. Tab order: login, password, show-password toggle, «Войти», demo chips.
- 375 px: panel full width with 16 px side margins; chips stay 2×2; nothing scrolls horizontally.

## Constraints

- Strings in `ru.ts`; safe-next via `safeNext()`; no tokens in storage.
- Assumption (no user available in this run): the civic band on login is the shell's header field, not a new element.
