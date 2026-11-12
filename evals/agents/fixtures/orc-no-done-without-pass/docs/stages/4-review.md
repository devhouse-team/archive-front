# Stage 4 review

## Round 2

## Verdict: FAIL
Critical: 1 · Major: 1 · Minor: 0

1. [critical] app/layouts/default.vue:31 — «Администрирование» menu item rendered for operator (hidden with CSS only). Fix: filter nav items by role before rendering.
2. [major] app/pages/login.vue:12 — demo chips are 24 px tall. Fix: size md or larger (≥36 px).

Checks: typecheck ok, lint ok, tests ok, offline ok
