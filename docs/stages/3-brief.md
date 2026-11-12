# Stage 3 brief: scaffold and core plumbing

## Goal

A running Nuxt 4 SPA with the design tokens, offline fonts and icons, the API layer, stores, role gating, locales and a mock API. It has no product screens yet. Stage 4 builds the shell and login on top of it, so Stage 3 ships only a minimal **token specimen page** at `/_specimen` (dev only) that proves the theme.

## Sources

- **Rules:** `CLAUDE.md` (hard rules).
- **Tokens, fonts and Nuxt UI wiring:** `docs/stages/2-design-system.md`. This is the authority: apply its `nuxt.config.ts`, `app.config.ts` and `main.css` sections verbatim, then verify.
- **Handoff sections:**
  - §3: auth, proxy, errors.
  - §4: data rules.
  - §5: types, endpoints and the real JSON examples.
  - §7: NFRs.
  - §9: known gaps.
- **Backend:** `../astana-archive/`, the FastAPI MVP. It is **read-only**: never edit anything in it. The reference UI is `app/static/app.js`. `docs/ARCHITECTURE.md` §8–9 covers roles and the API.
  - A dev instance runs at `http://127.0.0.1:8000`, with data in the orchestrator's scratchpad.
  - Demo logins (password = login): admin, archivist, operator, reader.
  - Its `docs/DESIGN.md` describes the **old** look. It is evidence only, never a style source: the new world replaces it.

## Deliverables

1. **Scaffold.**
   - Nuxt 4 (`app/` dir) with `pnpm`.
   - `ssr: false`, TypeScript strict.
   - Modules: `@nuxt/ui` v4, `@pinia/nuxt`, `@nuxt/eslint`, `@nuxt/test-utils`.
   - Vitest. `package.json` scripts: `dev`, `build`, `typecheck`, `lint`, `test`, `check:offline`, `check:glyphs`.
2. **Dev proxy.** `/api` and `/mock-eais` go to `http://127.0.0.1:8000`, through Nitro `devProxy` or `vite.server.proxy`, and keep cookies same-origin.
3. **Mock mode.** `NUXT_PUBLIC_API_MOCK=1` serves `server/mock/**` instead of the proxy.
   - It is stateful in memory and built from the §5 examples.
   - It covers: login, logout and me with the 4 roles; health; notifications; m1 queue and files; dela list and detail; page detail with words; review; search with `snippet_html` and `<mark>`; facets; collections.
   - It follows the access rules: restricted cases hidden from operator and reader, 404 on direct links.
   - It returns the same error shape: `{"detail": "..."}`.
   - Mock mode exists for offline work and tests. Proxy mode against the real backend is the default dev path.
4. **Types.** `app/types/api.ts`, built from §5 and the real backend responses. The responses are untyped in `openapi.json`, so derive the types from the examples and live responses.
5. **API layer.** `app/composables/useApi.ts`, a `$fetch` wrapper:
   - `credentials: 'same-origin'`.
   - On 401, navigate to `/login?next=<current>`.
   - On 403, raise the «Нет доступа» state.
   - On 404, raise the not-found state.
   - On 400 and others, show a toast with `detail`.
   - A typed function per endpoint group (auth, health, notifications, m1, dela, pages, review, search, collections, users, eais).
   - A download helper that reads `Content-Disposition` (`filename*=UTF-8''…`).
6. **Stores (Pinia).**
   - `auth`: `me`, `role`, `isStaff`, `isEditor`, `can(screen)` from the §2 matrix, login and logout.
   - `health`: polls 5 s through `usePolling`; holds the ЕАИС status and retry countdown.
   - `notifications`.
   - `queue`: menu counters from `/api/m1/queue` and `/api/review`.
7. **Composables.**
   - `usePolling(fn, ms)`: stops on scope dispose and while the tab is hidden.
   - `useLangDir(lang)`: `rtl` for `kk-arab`, `auto` for mixed.
   - `useT()`: wraps `app/locales/ru.ts`, with `{name}` interpolation.
8. **Access.** `app/middleware/auth.global.ts`:
   - The session check runs through `/api/me`.
   - Each page declares `definePageMeta({ roles })`.
   - Unknown or unauthenticated users go to `/login?next=`.
   - Each role gets its start route: archivist and reader land on `/search`; operator and admin land on `/ops`.
   - A single source for the nav model: `app/utils/nav.ts` lists the items with `roles` and group. The rail in Stage 4 renders from it.
9. **Locales.** `app/locales/ru.ts` holds every string used so far: status labels from §4, error copy, the plate micro-labels, and the ShifrPlate aria template.
10. **Placeholder pages.** Every route from CLAUDE.md, each with correct `roles` meta and a minimal heading from the locale, so routing and gating can be tested. Stage 4+ replaces them.
11. **Fonts and icons, offline.**
    - `@fontsource` packages and `@iconify-json/lucide`, per the spec.
    - `ui.fonts: false`.
    - Icons are bundled locally. Confirm the exact `@nuxt/icon` keys against the installed version.
12. **Checks.**
    - `check:offline`: after `nuxt build`, grep `.output/public` for `https://`, `fonts.googleapis`, `fonts.gstatic` and `api.iconify.design` in asset URLs (CSS, JS, HTML). Fail on any hit, with a small allowlist for license comments if needed.
    - `check:glyphs`: run `scripts/design/glyph_coverage.py`, adapted to read `node_modules/@fontsource*`. Fail if Kazakh Cyrillic or Töte coverage drops.
13. **Specimen page** `/_specimen` (dev only, admin role). It renders:
    - the semantic colours and aliases;
    - buttons and inputs at the `lg` size;
    - status badges for every status in the spec;
    - the type scale in Fira Sans, Kazakh, Yanalif and Arabic RTL samples;
    - a mini rail-and-header block, so the civic focus, hover and active states can be checked.
14. **Tests** (Vitest):
    - `useApi` error mapping;
    - `auth` store `can()` against the full §2 matrix;
    - `usePolling` stop behaviour;
    - `useLangDir`;
    - nav filtering per role, including that an empty group is hidden;
    - mock restricted filtering.

## Exit criteria

- [ ] `pnpm typecheck`, `pnpm lint` and `pnpm test` pass.
- [ ] `pnpm build && pnpm check:offline` passes. `pnpm check:glyphs` passes.
- [ ] In proxy mode against the real backend, logging in as each of the 4 demo users lands on the right start route. A forbidden route redirects or shows «Нет доступа». Logout works.
- [ ] Mock mode (`NUXT_PUBLIC_API_MOCK=1 pnpm dev`) also logs in as all 4 roles.
- [ ] The Nuxt UI class names from spec §"Nuxt UI on civic fields" and the `app.config.ts` slot names are verified against `.nuxt/ui/*.ts`. Corrections go into `docs/stages/2-design-system.md` as a dated note.
- [ ] The specimen page renders. Headless screenshots: `.impeccable/review/stage3-specimen.png`, plus focus-state captures of the mini rail and header.
- [ ] Reviewer PASS (0 critical, 0 major).

## Out of scope

- Real screens. They start in Stage 4.
- DESIGN.md. It comes at the end of Stage 5.
