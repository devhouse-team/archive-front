# Stage 2: visual world and design-system tokens

## Chosen direction

**«Адрес архива»**, civic wayfinding.
- The user picked and approved it on the impeccable decision page on 2026-11-12.
- Code-led build. Seed `seed:67aa3ce0c89b0ec9`.
- Direction contract: `.impeccable/surfaces/app-pages-page-id-vue.md`.
- Composition reference: `.impeccable/mocks/decision/assigned.html`.

## Authority

**This spec wins over the sketch.** The sketch fixes composition: arrangement, palette, density and the signature move. Where its sizes, colours or content disagree with this spec or the handoff, the spec and the handoff win. The known deviations are listed in "Sketch corrections".

This file is not DESIGN.md:
- Stage 3 applies it in `nuxt.config.ts`, `app/app.config.ts` and `app/assets/css/main.css`.
- `impeccable-documenter` writes `DESIGN.md` from the shipped page viewer at the end of Stage 5.

## Colour roles

Each colour has one job. Colour commits at region scale: the rail and header are flat civic fields, with no grey chrome. Status palettes use Tailwind v4 values. Components use **semantic aliases only** (see "Semantic aliases"); raw palette classes stay banned (CLAUDE.md).

| Role | Alias / Nuxt UI var | Value | Used for | Never for |
|---|---|---|---|---|
| Rail and header field | `--color-rail` | civic-800 `#0B3A6E` | Rail, header, address-plate fill | Buttons, status, body text |
| Rail hover / active ground | `--color-rail-active` | civic-700 `#1C508C` | Rail hover and active ground. The active item also gets a 3 px white inset bar on the inline-start side and `aria-current="page"` | — |
| Rail labels | `--color-rail-muted` | civic-200 `#BCD6F7` | Rail group labels, header placeholder | — |
| On-civic field | `--color-rail-field` | civic-900 `#042851` | Header search fill (border civic-400) | — |
| Plate colour | `--ui-secondary` (civic-800) | `#0B3A6E` | ShifrPlate, compact шифр text, plate badges | UButton `color="secondary"` (banned) |
| Action | `--ui-primary` (action-600) | `#0B6FA7` | Primary buttons, active tab, focus ring on light grounds, links (`text-primary`) | Decoration, status, location, search hits |
| Locator | `--color-locator` | locator-400 `#F2B705` | "You are here" only: the pin, the leader casing, the current-position dot. Always paired with ink | Buttons, warnings, low confidence, counts |
| Warning / low confidence | `--ui-warning` (amber-800) | `#973C00`; fill amber-100 `#FEF3C6` | `conf < 60` words; lines with mean < 60; pages with `low_conf = 1`; «на проверке» | Location, counts |
| Error | `--ui-error` (red-800) | `#9F0712` | `invalid`, `failed`, ЕАИС down, the «Ошибки» count | Other counts |
| Success | `--ui-success` (green-800) | `#016630` | `uploaded`, `done`, «проверено», ЕАИС online | Text on civic fields |
| Info | `--ui-info` (slate-700) | `#505C6B` | Info alerts, `level: info` notifications | — |
| Search hit | `--color-hit` | cyan-200 `#A2F4FD` | Search hits: `<mark>` in snippets and the hit fill on the scan | Anything else |
| Count badge | `color="neutral" variant="solid"` → `--ui-bg-inverted` = slate-700 | `#505C6B` | Queue counts, unread notifications | — |
| App ground | `bg-muted` (`--ui-bg-muted` = slate-50) | `#F4F7FA` | Layout ground behind panels | — |
| Panels | `bg-default` (`--ui-bg` = white) | `#FFFFFF` | Work areas, cards, inputs | — |
| Elevated | `bg-elevated` (slate-100) | `#E4ECF6` | Toolbars, table headers | Dimmed text on it |
| Scan pane | `--color-scan-pane` | slate-200 `#D0DAE7` | Ground around the scan image | — |
| Text | `--ui-text` / highlighted | ink `#12202E` | Body | — |
| Toned | `--ui-text-toned` | slate-800 | Emphasised secondary | — |
| Muted | `--ui-text-muted` | slate-700 | Secondary; works on every surface | — |
| Dimmed | `--ui-text-dimmed` | slate-600 | Tertiary, on white and ground **only** | Elevated (4.16) and scan-pane (3.51). Scan line numbers use `text-muted` (4.82) |
| Control border | `--ui-border-accented` | slate-600 | Input, checkbox and radio rings; must hold 3:1 on white, ground, elevated and scan-pane | — |
| Accented fill | `--ui-bg-accented` | slate-600 | Unchecked switch track (4.96 on white, 4.16 on elevated) | Large decorative fills; `UProgress` and `USlider` tracks. Those override their track to `bg-meter-track` (slate-200), where the action-600 indicator measures 3.86:1 |
| Divider | `--ui-border` | slate-200 | Decorative separators | Control boundaries |
| Confidence meter | `--color-meter` on `--color-meter-track` | slate-700 on slate-200 | Mean-confidence bar; the bar turns warning only when the page has `low_conf = 1` | — |

### Focus

- **On light grounds:** a solid `--ui-primary` outline **at a 2 px offset**, so it sits on the ground, never on a solid fill: 5.46:1 on white, 5.08:1 on ground, 4.58:1 on elevated, 3.86:1 on scan-pane. *(Corrected 2026-11-12, Stage 3, review round 1: Nuxt UI 4.12's default is a 3 px outline in `<color>/25` at offset 0, about 1.4:1, and a same-colour ring at offset 0 vanishes on a solid primary button; `app/assets/css/focus.css` makes it solid and offset. See the Stage 3 note.)*
- **On civic fields** (rail and header only): a 2 px **white** focus indicator (11.38:1 on civic-800, 8.15:1 on civic-700). It is written as **variant classes**, never a bare custom utility. Tailwind v4 emits un-prefixed utilities before variant utilities, so Nuxt UI's `focus:outline-none` and `focus-visible:outline-none` would cancel a bare one.
  - Buttons and links: `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white`.
  - Rail `UNavigationMenu` links (Nuxt UI 4.12 draws their focus as an **outline** on `::before`): `focus-visible:before:outline-2 focus-visible:before:outline-white`. *(Corrected 2026-11-12: `before:ring-white` drew nothing.)*
  - Header `UInput` (ring drawn on the input base): `focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none`. *(Corrected 2026-11-12: the base also carries an `outline-primary/25` halo.)*
  - ShifrPlate is **not** on a civic field: its chips sit on the white page band, so plate links use the default `--ui-primary` ring (5.46:1).

#### Nuxt UI on civic fields

Rail and header components get explicit `:ui` overrides built from the rail aliases. The overrides must cancel Nuxt UI v4's **state** classes as well as the resting ones:
- **`UNavigationMenu` in the rail:**
  - `link`: `min-h-9 px-3 text-white hover:text-white focus-visible:before:outline-2 focus-visible:before:outline-white` *(corrected 2026-11-12)*
  - `linkLeadingIcon`: `text-rail-muted group-hover:text-white group-data-active:text-white group-data-[state=open]:text-white`
  - active link: `data-active:before:bg-rail-active` plus an inset 3 px white bar (`data-active:before:shadow-[inset_3px_0_0_0_var(--color-white)]`) and `aria-current="page"` (both set by Reka). `ui.link` applies to every link, so active-only classes use the `data-active:` variant. Its active icon is `text-white` (Nuxt UI's default `text-primary` would be 1.49:1 here)
  - inactive link: `hover:before:bg-rail-active`
  - group label: `text-rail-muted font-plate font-medium uppercase text-[10px] tracking-[0.06em]`; list `px-2` so pills, bar and focus outline sit inside the rail
- **Header `UInput`:** base `bg-rail-field text-white placeholder:text-rail-muted ring-rail-field-border focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none`; `leadingIcon` `text-rail-muted`.
- **Header `UButton`** (bell, user menu): `color="neutral" variant="ghost"`, with `ui.base` set to `text-white hover:bg-rail-active active:bg-rail-active focus-visible:bg-rail-active focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white`. This replaces the compound variant's `hover:bg-elevated active:bg-elevated` (Nuxt UI 4.12 has no `focus-visible:bg-elevated` there; corrected 2026-11-12), under which a white icon would measure about 1.2:1.
- **Stage 3 exit check:** confirm every class above against `.nuxt/ui/navigation-menu.ts`, `.nuxt/ui/button.ts` and `.nuxt/ui/input.ts`. Then render and Tab through the rail and header, screenshot each hover, focus and active state, and confirm the ring and icon are visible.

### Scan overlays and the locator

Real scans run from near-white to dark, yellowed paper. Every mark drawn on a scan uses two tones, so one of them always clears 3:1. Types are told apart by fill and stroke style, never by hue alone.

| Overlay | Stroke | Fill |
|---|---|---|
| Word box (toggle «Рамки слов») | 1 px white halo + 1 px ink core, **100% opacity** | none |
| Low confidence (`conf < 60`) | Same dual tone, **dashed** | amber-100 at 55% |
| Search hit (`highlight_word_ids`) | Dual tone, 2 px | `--color-hit` at 50% |
| Selected word | Dual tone, 2 px | none, plus the pin |
| Locator pin | locator-400 fill with a 1.5 px ink ring | — |
| Leader line | 3 px locator-400 casing around a 1 px ink core | — |
| Corrected word (`corrected = 1`) | Dual tone, solid 1 px. A corrected word drops the low-confidence dash | none |

- **Every overlay stroke is drawn at 100% opacity.** Only fills are translucent.
- **Precedence when a word has several states**, highest first:
  1. selected (adds pin and 2 px stroke)
  2. search hit (hit fill)
  3. corrected (solid stroke; **replaces** low-confidence, because the two are exclusive)
  4. low-confidence (dashed stroke), only when `corrected = 0`

  States combine: a low-confidence search hit is a dashed 2 px stroke with the hit fill. A selected hit keeps the hit fill and gets the 2 px stroke and the pin.

### Contrast evidence

Generated by `python3 scripts/design/contrast_tokens.py`. The table below is its verbatim output for this spec.

| Pair | Ratio | Needs | Result |
|---|---|---|---|
| White text on rail/header (civic-800) | 11.38 | 4.5 | pass |
| White text on rail active/hover (civic-700) | 8.15 | 4.5 | pass |
| Rail group labels civic-200 on civic-800 | 7.64 | 4.5 | pass |
| Focus ring on civic: white outline on civic-800 | 11.38 | 3 | pass |
| Focus ring on civic: white outline on civic-700 | 8.15 | 3 | pass |
| Header search field: fill civic-900, text white | 14.71 | 4.5 | pass |
| Header search placeholder civic-200 on civic-900 | 9.88 | 4.5 | pass |
| Header search field border civic-400 vs civic-800 | 4.15 | 3 | pass |
| Focus ring action-600 on white | 5.46 | 3 | pass |
| Focus ring action-600 on ground | 5.08 | 3 | pass |
| White on primary button (action-600) | 5.46 | 4.5 | pass |
| Links text-primary (action-600) on ground | 5.08 | 4.5 | pass |
| Links text-primary (action-600) on white | 5.46 | 4.5 | pass |
| Body ink on ground | 15.36 | 4.5 | pass |
| Body ink on white | 16.51 | 4.5 | pass |
| Plate-colour text civic-800 on ground | 10.59 | 4.5 | pass |
| Toned slate-800 on elevated | 7.90 | 4.5 | pass |
| Muted slate-700 on elevated | 5.72 | 4.5 | pass |
| Muted slate-700 on white | 6.81 | 4.5 | pass |
| Dimmed slate-600 on ground | 4.61 | 4.5 | pass |
| Dimmed slate-600 on white | 4.96 | 4.5 | pass |
| Control border (--ui-border-accented slate-600) on white | 4.96 | 3 | pass |
| Control border slate-600 on ground | 4.61 | 3 | pass |
| Control border slate-600 on elevated | 4.16 | 3 | pass |
| Control border slate-600 on scan-pane | 3.51 | 3 | pass |
| Switch track off (--ui-bg-accented slate-600) on white | 4.96 | 3 | pass |
| Switch track off slate-600 on elevated | 4.16 | 3 | pass |
| Rail link hover: white on civic-700 | 8.15 | 4.5 | pass |
| Rail link icon idle: civic-200 on civic-800 | 7.64 | 3 | pass |
| Rail link icon active/hover: white on civic-700 | 8.15 | 3 | pass |
| Rail link focus ring: white on civic-800 | 11.38 | 3 | pass |
| Header ghost button focus/active: white icon on civic-700 | 8.15 | 3 | pass |
| ЕАИС down text: white on civic-800 | 11.38 | 4.5 | pass |
| Progress/slider indicator action-600 on meter-track slate-200 | 3.86 | 3 | pass |
| Inverted badge: white on slate-700 | 6.81 | 4.5 | pass |
| --ui-warning amber-800 text on white | 7.09 | 4.5 | pass |
| Warning soft badge: amber-800 on amber-800/10 over white | 6.08 | 4.5 | pass |
| Warning solid badge: white on amber-800 | 7.09 | 4.5 | pass |
| Low-conf word fill: ink on amber-100 | 14.82 | 4.5 | pass |
| --ui-error red-800 text on white | 8.36 | 4.5 | pass |
| Error soft badge: red-800 on red-800/10 over white | 6.91 | 4.5 | pass |
| Error solid badge: white on red-800 | 8.36 | 4.5 | pass |
| --ui-success green-800 text on white | 7.13 | 4.5 | pass |
| Success soft badge: green-800 on green-800/10 over white | 6.12 | 4.5 | pass |
| Success solid badge: white on green-800 | 7.13 | 4.5 | pass |
| Secondary (plate) badge: white on civic-800 | 11.38 | 4.5 | pass |
| Secondary soft: civic-800 on civic-800/10 over white | 9.51 | 4.5 | pass |
| Search hit <mark>: ink on cyan-200 | 13.28 | 4.5 | pass |
| Ink on locator-400 (text on gold) | 9.08 | 4.5 | pass |
| Pin ink ring vs white | 16.51 | 3 | pass |
| Confidence meter fill slate-700 on slate-200 track | 4.82 | 3 | pass |
| Rail active marker: white bar on civic-700 | 8.15 | 3 | pass |
| Status on civic: ЕАИС text white on civic-800 | 11.38 | 4.5 | pass |
| Status on civic: solid error badge white on red-800 | 8.36 | 4.5 | pass |
| Status dot white ring on civic-800 | 11.38 | 3 | pass |
| Plate focus ring action-600 on white band | 5.46 | 3 | pass |
| Low-conf text cue: amber-800 dashed underline on white | 7.09 | 3 | pass |
| Low-conf text cue: amber-800 underline on amber-100 fill | 6.36 | 3 | pass |
| Corrected marker: slate-600 dotted underline on white | 4.96 | 3 | pass |
| Scan line numbers text-muted (slate-700) on scan-pane | 4.82 | 4.5 | pass |
| Error soft badge on elevated: red-800 on red/10 over slate-100 | 5.83 | 4.5 | pass |
| Warning soft badge on elevated: amber-800 on amber/10 over slate-100 | 5.10 | 4.5 | pass |
| Neutral soft badge (queued/pending): slate-700 on slate/10 over white | 5.91 | 4.5 | pass |

| Dual-tone stroke | light scan #F2EEE4 | yellowed scan #C9B98F | dark scan #6B5E45 | very dark scan #2A2620 |
|---|---|---|---|---|
| Overlay outline (white halo + ink core) | 14.25 | 8.51 | 6.34 | 15.04 |
| Leader line (locator-400 casing + ink core) | 14.25 | 8.51 | 3.49 | 8.27 |
| Locator pin (locator-400 fill + ink ring) | 14.25 | 8.51 | 3.49 | 8.27 |

0 failing pair(s)

These sketch colours failed and were replaced:

| Sketch colour | Ratio | Replacement |
|---|---|---|
| Button `#1E88C8` with white text | 3.88 | action-600 |
| slate-500 as text | 3.51 | slate-600 is the floor |
| Gold on white | 1.82 | Always paired with ink |
| Single-tone leader line in locator-700 | fails on yellowed and dark scans | Gold casing around an ink core |

### Scales

`@theme static` in `main.css`, all 11 shades. `static` is required: without it, Tailwind v4 drops unused variables and Nuxt UI's `var(--color-…)` chain resolves to nothing. Anchors are marked *.

```
civic   50 #EDF5FE 100 #DAE8FB 200 #BCD6F7 300 #95BDEF 400 #6D9FDE 500 #4A82C6 600 #3067A9 700 #1C508C 800 #0B3A6E* 900 #042851 950 #011735
action  50 #E9F4FC 100 #D3E9FA 200 #B1D8F7 300 #83C1F0 400 #51A5E0 500 #1E88C8* 600 #0B6FA7 700 #085A88 800 #03456B 900 #00324F 950 #011F34
locator 50 #FFFBEA 100 #FFF4CC 200 #FEE9A8 300 #FFD67E 400 #F2B705* 500 #CB9A13 600 #A77F12 700 #89670F 800 #6C5007 900 #503B03 950 #362600
slate   50 #F4F7FA* 100 #E4ECF6 200 #D0DAE7 300 #B7C2D1 400 #99A6B6 500 #7D8A9B 600 #657182 700 #505C6B 800 #3D4755 900 #2A343F 950 #19212B
```

amber, red, green and cyan use the Tailwind v4 defaults.

### Semantic aliases

These are the only custom colour utilities components may use. They are defined in `@theme static`:

```css
--color-rail: var(--color-civic-800);
--color-rail-active: var(--color-civic-700);
--color-rail-muted: var(--color-civic-200);
--color-rail-field: var(--color-civic-900);
--color-rail-field-border: var(--color-civic-400);
--color-locator: var(--color-locator-400);
--color-ink: #12202E;
--color-hit: var(--color-cyan-200);
--color-scan-pane: var(--color-slate-200);
--color-meter: var(--color-slate-700);
--color-meter-track: var(--color-slate-200);
--color-lowconf-fill: var(--color-amber-100);
--color-eais-ok: var(--color-green-500);
```

Classes such as `bg-rail`, `text-rail-muted`, `bg-locator` and `bg-hit` are allowed. Raw `bg-civic-800`, `text-gray-500` and the like are not.

### Nuxt UI wiring

`nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  ssr: false,
  modules: ['@nuxt/ui', '@pinia/nuxt', '@nuxt/eslint', '@nuxt/test-utils/module'],
  css: ['~/assets/css/main.css'],
  ui: { fonts: false, colorMode: false },
  // Corrected 2026-11-12 (Stage 3), verified against @nuxt/icon 2.6.2: see the Stage 3 note.
  icon: {
    provider: 'none', fallbackToApi: false, serverBundle: false, iconifyApiEndpoint: '/_offline-no-icon-api',
    clientBundle: { scan: { globInclude: ['app/**/*.{vue,ts}'] }, includeCustomCollections: true },
  },
})
```

What each key does:
- **`fonts: false`** stops `@nuxt/fonts` from resolving families through remote providers. Fonts come only from `@fontsource` imports in `main.css`.
- **`colorMode: false`:** light only.
- **Icons:** bundled from the installed `@iconify-json/lucide`. The remote Iconify API is never used. Stage 3 confirms the exact `@nuxt/icon` keys against the installed version, and an offline build check (grep `.output/public` for `api.iconify.design` / `https://`) proves it.

`app.config.ts`:

```ts
export default defineAppConfig({
  ui: {
    colors: { primary: 'action', secondary: 'civic', neutral: 'slate', warning: 'amber', error: 'red', success: 'green', info: 'slate' },
    // 36 px minimum targets (handoff §7)
    button: { defaultVariants: { size: 'lg' } },
    input: { defaultVariants: { size: 'lg' } },
    textarea: { defaultVariants: { size: 'lg' } },
    select: { defaultVariants: { size: 'lg' } },
    selectMenu: { defaultVariants: { size: 'lg' } },
    tabs: { defaultVariants: { size: 'lg' } },
    // Corrected 2026-11-12 (Stage 3 review): the label's ::after spans the 36 px row, so the whole row is clickable.
    switch: { defaultVariants: { size: 'lg' }, slots: { root: 'min-h-9 items-center', label: 'after:absolute after:inset-0 cursor-pointer' } },
    checkbox: { slots: { root: 'min-h-9 items-center', label: 'after:absolute after:inset-0 cursor-pointer' } },
    radioGroup: { slots: { item: 'relative min-h-9 items-center', label: 'after:absolute after:inset-0 cursor-pointer' } },
    navigationMenu: { slots: { link: 'min-h-9' } },
    dropdownMenu: { slots: { item: 'min-h-9' } },
    // pagination: removed 2026-11-12. Nuxt UI 4.12 has no size variant for it (TS2353); its UButtons take button's 'lg'.
    modal: { slots: { close: 'min-h-9 min-w-9' } },
    slideover: { slots: { close: 'min-h-9 min-w-9' } },
    toast: { slots: { close: 'min-h-9 min-w-9' } },
    inputNumber: { defaultVariants: { size: 'lg' }, slots: { increment: 'min-h-9 min-w-9', decrement: 'min-h-9 min-w-9' } },
  },
})
```

Slot names are verified against `.nuxt/ui/<component>.ts` in Stage 3, and corrected there if any differ.

`main.css`, after `@import "tailwindcss"; @import "@nuxt/ui";`:

```css
:root {
  --ui-primary: var(--ui-color-primary-600);
  --ui-secondary: var(--ui-color-secondary-800);
  --ui-warning: var(--ui-color-warning-800);
  --ui-error: var(--ui-color-error-800);
  --ui-success: var(--ui-color-success-800);
  --ui-info: var(--ui-color-neutral-700);
  --ui-text: var(--color-ink);
  --ui-text-highlighted: var(--color-ink);
  --ui-text-toned: var(--ui-color-neutral-800);
  --ui-text-muted: var(--ui-color-neutral-700);
  --ui-text-dimmed: var(--ui-color-neutral-600);
  --ui-bg: #FFFFFF;
  --ui-bg-muted: var(--ui-color-neutral-50);
  --ui-bg-elevated: var(--ui-color-neutral-100);
  --ui-bg-inverted: var(--ui-color-neutral-700);
  --ui-border: var(--ui-color-neutral-200);
  --ui-border-accented: var(--ui-color-neutral-600);
  --ui-bg-accented: var(--ui-color-neutral-600);
  --ui-radius: 0.375rem;
}
```

Layout: `UApp` wraps a body with the `bg-muted` ground. Panels are `bg-default`.

## Type

All fonts are self-hosted through `@fontsource` npm packages, imported in `main.css`. Vite bundles their woff2 files into the build. There is no `public/fonts/` and nothing is fetched at runtime. CLAUDE.md and the agent prompts say the same.

Coverage was checked by `scripts/design/glyph_coverage.py` on the packages' 400 woff2 files. Stage 3 re-runs it against `node_modules`.

| Use | Face | Weights | Package | Coverage |
|---|---|---|---|---|
| UI and text (signage grotesk) | **Fira Sans** | 400 500 600 700 | `@fontsource/fira-sans` | Kazakh 18/18; Yanalif 15/17 (no Ꞑꞑ) |
| Plates, rail labels | **Fira Sans Condensed** | 500 600 | `@fontsource/fira-sans-condensed` | Same family |
| Fallback for glyphs Fira lacks | **Noto Sans** | variable | `@fontsource-variable/noto-sans`, latin-ext and cyrillic-ext only | Kazakh 18/18; Yanalif 17/17 |
| Arabic script (`kk-arab`, Töte) | **Noto Naskh Arabic** | variable | `@fontsource-variable/noto-naskh-arabic`, arabic only | Töte 10/10 |

```
glyph_coverage.py, 2026-11-12:
fira-sans          KK 18/18  YAN 15/17 (miss Ꞑꞑ)  ARB 0/10
golos-text         KK 18/18  YAN 5/17             ARB 0/10
onest              KK 18/18  YAN 7/17             ARB 0/10
pt-sans            KK 18/18  YAN 5/17             ARB 0/10
manrope            KK 8/18   YAN 6/17             ARB 0/10
noto-sans          KK 18/18  YAN 17/17            ARB 0/10
noto-naskh-arabic  KK 0/18   YAN 5/17             ARB 10/10
```

Font stacks:

```css
@theme static {
  --font-sans: "Fira Sans", "Noto Sans Variable", "Noto Naskh Arabic Variable", system-ui, sans-serif;
  --font-plate: "Fira Sans Condensed", "Fira Sans", "Noto Sans Variable", sans-serif;
  --font-arabic: "Noto Naskh Arabic Variable", "Fira Sans", serif;
}
```

- **Numbers:** `tabular-nums` on шифр, counts, percentages and dates.
- **`kk-arab` text:** `--font-arabic`, `dir="rtl"`, line-height 1.9.
- **Scale:** 12 / 13 / 14 (base UI) / 16 (page text) / 18 / 22 (page title) / 28.
- **Weight 700:** titles and brand only.
- **10 px minimum.** The only text under 12 px is plate micro-labels at 10 px, uppercase, 0.06em.

## Status mapping (handoff §4)

| Status | Label | Badge |
|---|---|---|
| `files.queued` / `pages.pending` | «в очереди» | `neutral` soft |
| `pages.running` | «распознаётся» | `neutral` soft plus a spinner icon. The long `vlm` run (30–90 s+) keeps the badge, shows elapsed time, and keeps polling |
| `files.retry` | «повтор» | `warning` soft, plus the retry countdown from health |
| `files.uploaded` / `pages.done` | «загружено» / «распознано» | `success` soft |
| `files.invalid` / `pages.failed` | «ошибка» | `error` soft |
| `low_conf=1 & reviewed=0` | «на проверке» | `warning` soft |
| `reviewed=1` | «проверено» | `success` soft |

- Soft status badges are measured on white, ground and elevated (all pass).
- **On civic fields** (header ЕАИС indicator), text is always white. **Online:** a `bg-eais-ok` dot with a 1.5 px white ring next to the white text «ЕАИС на связи». **Down:** a solid error badge with the text «ЕАИС недоступна» (white on red-800, 8.36:1), plus the retry countdown. Down is never signalled by dot colour alone.
- `text-success`, `text-error` and `text-warning` are banned on `bg-rail`.

## Confidence semantics

These follow handoff §4.

| Level | Warning shown when | Display |
|---|---|---|
| Word | `conf < 60` and `corrected = 0` | Scan: dashed overlay plus amber-100 fill. Text: amber-100 background **plus a 2 px dashed `--ui-warning` bottom border** (7.09:1; a non-colour cue). For `kk-arab` the border is offset below the Naskh descenders. The legend uses the same treatment |
| Word, corrected | `corrected = 1` | Text: 1 px dotted slate-600 underline (4.96:1). Tooltip «Распознано: {ocr_text}». The low-confidence highlight is dropped, because the archivist's correction resolves it |
| Line | Line mean < 60 | Percentage in warning colour |
| Line with some low words | Mean ≥ 60, but contains words with `conf < 60` | Neutral marker «N сл.» in muted |
| Page | `low_conf === 1` (mean < 75, or > 15% low words, computed by the backend) | Meter turns warning |
| Page status | `low_conf = 1 & reviewed = 0` | «на проверке» warning badge |
| Page status | `reviewed = 1` | «проверено» success badge |

The UI never recomputes the page threshold.

## Signature components

`ShifrPlate` is built in Stage 4. The pin, leader and line grid are built in Stage 5.

### ShifrPlate

- **Shape:** civic plates Ф.1 › Оп.1 › Д.15 › л.3, each with a 10 px bilingual micro-label. The Kazakh half is in `<span lang="kk">`.
- **Accessibility:**
  - The group has `role="group"` and an `aria-label` built from a `ru.ts` template: «Шифр: фонд 1, опись 1, дело 15, лист 3».
  - The micro-labels and the chevrons are `aria-hidden="true"`, so nothing is read twice. Each segment's visible value stays readable inside the group.
  - Segments are links where a target exists (the дело links to `/dela/:id`). The current segment (л. on the page viewer) carries `aria-current="page"` and the gold position dot.
- **Placement:** same position on every screen (page context, case cards, search results, collection items).
- **Compact variant:** inline `Ф.1 Оп.1 Д.12 · л.3` in `text-secondary` with `tabular-nums`.

### LocatorPin and leader line

- **Visuals:**
  - The pin sits on the selected word's box on the scan.
  - The leader runs from the pin to the **gutter-side edge of the word's row band** in the text pane. That's the left edge of the text pane in both directions, because the scan is always on the left. It never crosses the text.
  - Line numbers sit on the inline-start side: left for LTR, right for `kk-arab`.
  - Pin and leader are `aria-hidden="true"`.
- **Selection in the text:**
  - The selected word gets `aria-current="true"`, a 2 px ink outline and the amber-100 fill when it is low confidence. Selection is never shown by colour alone.
- **Keyboard:**
  - The text pane is one tab stop. Inside it, a roving tabindex moves between words: ↑/↓ for the previous/next low-confidence word, ←/→ for the previous/next word **in visual order** (in `kk-arab` RTL, → moves to the previous word).
  - **Editing is EDITORS-only (admin, archivist) in `mode=edit`** (handoff §2). In edit mode, Enter opens inline editing, Enter commits, Esc cancels, and focus returns to the word. Operators and readers get view-mode navigation only, with no edit affordances or hints.
  - **Tab leaves the pane** in DOM order, and Shift+Tab leaves it backwards. No trap and no wrap.
  - The sketch's «Tab следующее» hint is replaced by «↓ следующее».
- **Announcements:** a polite live region (`role="status"`) reads «Слово 2 из 5 · уверенность 41 %» on each selection change. The strings live in `ru.ts`.
- **Motion:** the leader animates between positions in 120 ms. With `prefers-reduced-motion`, it jumps.

### Shared line grid

- **When the scan line pitch at the current zoom is at least the text row height:** text line N is aligned to scan line N's row band, using the words' `line` and `y`.
- **Otherwise** (the usual case at «По ширине», 20–30 px pitch): the text keeps its own rhythm (24 px rows, 30 px for Arabic), the leader alone carries the link, and the selected line is scrolled into view in both panes. The sketch's 48 px pitch is idealised.

## Spacing, radius, density

- **Spacing:** 4 px base; working steps 8 / 12 / 16 / 24 / 32.
- **Radius:** 6 px for controls and plates; 8 px for panels.
- **36 px minimum:** every interactive element is at least 36 px tall. That covers nav items, search, the bell, toolbar buttons, menu items, checkboxes and switches with their labels. The `app.config.ts` defaults and slot overrides above enforce it.
- **Shell:** rail 220 px, header 56 px.

## Sketch corrections

Build these as written here, not as drawn in the sketch.

| Sketch | Build |
|---|---|
| Nav, search, bell and buttons at 34 px; toolbar buttons 28 px; checkbox 14 px | 36 px everywhere |
| «ЖҮЙЕ · СИСТЕМА / Администрирование» shown to an archivist | Admin-only (handoff §2). Items a role can't use aren't rendered, and **an empty group's label isn't rendered** |
| Red badge on «Очередь проверки» | Neutral count badge; red only for «Ошибки» |
| 61 % and 66 % shown in warning style | Warning only when mean < 60; otherwise «N сл.» |
| «на проверке» chip in civic | Warning soft badge |
| Confidence meter in civic | `--color-meter`; turns warning when `low_conf = 1` |
| «300 dpi» in the scan toolbar | Removed (not in the page payload) |
| Micro-labels at 9 px | 10 px |
| Weight 700 on chips and badges | 500 or 600 |
| Selected word box in civic-800 | Dual-tone overlay plus pin |
| Leader drawn in gold only | Gold casing around an ink core |
| «Tab следующее» hint | «↓ следующее»; Tab leaves the pane |

## Still open

- **Mobile reader layout** of the page viewer: stacked panes with a toggle. Resolved in Stage 5 with `/impeccable adapt`.
- **Ꞑꞑ (Yanalif):** fall back to Noto Sans per glyph.

## Stage 3 verification note (2026-11-12)

Applied in `nuxt.config.ts`, `app/app.config.ts`, `app/assets/css/main.css` (+ `focus.css`) and checked against the installed
`@nuxt/ui` 4.12.0 (`.nuxt/ui/*.ts`), `@nuxt/icon` 2.6.2 and `reka-ui` 2.11.0. Rendered evidence: `.impeccable/review/stage3-*.png`,
numbers from `node scripts/capture-specimen.mjs`.

**`app.config.ts` slots and variants.** Every slot named above exists: `switch.root`, `checkbox.root`, `radioGroup.item`,
`navigationMenu.link`, `dropdownMenu.item`, `modal.close`, `slideover.close`, `toast.close`, `inputNumber.increment/decrement`.
`size: 'lg'` exists for button, input, textarea, select, selectMenu, tabs, switch and inputNumber. **Correction:**
`pagination` has no `size` variant and `defaultVariants` is not in its config type (TS2353), so the line is removed; UPagination
passes `size` through to its UButtons, which default to `lg`.

**36 px click targets for checkbox, switch and radio. Correction (review round 1).** The first version of this note claimed
no target was under 36 px, but it measured the layout root. `min-h-9` on `checkbox.root`, `switch.root` and `radioGroup.item`
does not make anything clickable: the real targets were the 16 x 16 checkbox box with a 20 px label, and the 40 x 22 switch
track with a 20 px label. Fix in `app.config.ts`: each `label` (a `<label for>` in all three components) gets
`after:absolute after:inset-0`, and the root or item is `relative`, so the label's `::after` covers the whole 36 px row and a
click anywhere in it toggles the control. Measured by clicking at the top-left, bottom-left and far end of each row
(`scripts/capture-specimen.mjs`): checkbox row 180 x 36, switch row 123 x 36, radio item rows 156 x 36; every click toggled or
selected the control. A checkbox without a label (e.g. table row selection) has no label to stretch; Stage 8 must size it.

**Stage 4 correction (Stage 3 review round 2 #1, #3).** The label `::after` overlay collided with Nuxt UI: the `required`
asterisk is also drawn as `label::after` (it landed in the row's top-left corner), and the overlay sat on top of links in
the label or description, so clicking a link toggled the control instead of navigating. The hit area now lives on the
control itself: `base` (the checkbox/radio button, the switch track) gets `before:absolute before:inset-0
before:cursor-pointer`. `base` is not positioned, so the `::before` is sized by the `relative` root (checkbox, switch) or
item (radio) and a click anywhere in the row lands on the button; `base`'s own `overflow-hidden` does not clip it, because
its containing block is the root. `wrapper` gets `[&_a]:relative`, so links in the label or description paint above the
overlay and stay clickable. `label::after` is free again for the asterisk. Measured on `/_specimen`
(`node scripts/capture-shell.mjs --only=shifr`): checkbox row 180 x 36, switch row 123 x 36; a click at the far bottom
corner toggled both; a click at the far top corner of the last radio item selected it; the required checkbox shows
`label::after` content `"*"` after its label, a click at its far top corner toggles it, and a click on the link in its
description navigates (`#sp-shifr`) without toggling. **Limits:** (1) only `<a>` elements are lifted; another interactive
element inside a label or description (a button, a tooltip trigger) needs `relative` itself; (2) the row's description
text is under the overlay, so it cannot be selected with the mouse; (3) a control without a label still has no row to
stretch (see above).

**Focus on light grounds. Correction.** Nuxt UI 4.12 no longer draws a solid primary ring: buttons, links, tabs, switches and
nav links get `outline-<color>/25 focus-visible:outline-3` (a 3 px outline at 25 % alpha, about 1.4:1 on white); inputs add a
1 px `ring-primary`. `app/assets/css/focus.css` sets `:focus-visible { outline-color: var(--ui-primary) }` (and the same for nav
`::before`) inside the native `utilities` layer, after Tailwind: it beats the un-prefixed `/25` colour by order and loses to
variant classes such as `focus-visible:outline-white`, so civic overrides still win. It is plain CSS because Tailwind v4
rewrites element selectors inside `@layer utilities` in `main.css` into an invalid `:is() :focus-visible`.
**Second correction (review round 1):** the first version left the outline at offset 0. On a solid primary button the ring is
the same colour as the fill (action-600 on action-600) and focus disappears; the same holds for an active tab and a checked
switch. `focus.css` now also sets `outline-offset: 2px`, so the ring always sits on the page ground: 5.46:1 on white, 5.08:1 on
ground, 4.58:1 on elevated, 3.86:1 on scan-pane. Variant classes such as `focus-visible:outline-offset-*` still win.
Measured: solid primary and solid error buttons both show a solid 3 px `rgb(11,111,167)` outline at a 2 px offset
(`.impeccable/review/stage3-focus-light.png`).

**Civic fields. Corrections** (classes now live in `app/utils/civic-ui.ts` for Stage 4):
- `UNavigationMenu` link focus is a `::before` **outline**, not a ring: `focus-visible:before:outline-2 focus-visible:before:outline-white`.
  Measured: `::before` outline solid 2 px white on civic-800 (11.38:1) and civic-700 (8.15:1).
- Active vs inactive classes cannot be split through `ui.link` (it applies to all links); Reka sets `data-active` and
  `aria-current="page"` on the active link, so active classes use `data-active:` / `group-data-active:`.
- Header `UInput`: `focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none`. Measured: 2 px white inset ring, no outline.
- Header ghost `UButton`: the spec's class string is right; the 4.12 compound has `hover:bg-elevated active:bg-elevated`
  but no `focus-visible:bg-elevated`. Measured: 2 px white outline, 2 px offset.

**Offline icons. Correction.** With `ssr: false` the `@nuxt/icon` default provider is the remote Iconify API. `provider: 'none'`
stops the plugin from adding endpoints, but `@iconify/vue` keeps its built-in default provider (`api.iconify.design`,
`api2.iconify.design`), so an icon missing from the bundle would still be fetched remotely; and the default scan glob skips
`.ts`, so icons named in `app/utils/nav.ts` would be missed. Shipped config: `provider: 'none'`, `fallbackToApi: false`,
`serverBundle: false`, `clientBundle.scan.globInclude: ['app/**/*.{vue,ts}']`, plus a Vite transform in `nuxt.config.ts` that
rewrites every built-in Iconify endpoint to the dead same-origin path `/_offline-no-icon-api`. `pnpm check:offline` passes.
Dev note: the dev icon bundle is computed when the dev server starts; restart it after adding a new icon name.

**Fonts.** The shipped Noto Sans subsets (latin-ext, cyrillic-ext) cover Kazakh 14/18 and Yanalif 14/17 on their own (the
18/18 and 17/17 above are for the whole package); the stacks are what render, and `pnpm check:glyphs` measures them:
`--font-sans` KK 18/18, YAN 17/17, ARB 10/10; `--font-plate` KK 18/18, YAN 17/17; `--font-arabic` ARB 10/10.

**Toasts.** Nuxt UI's toast element has no role; Reka announces it through a hidden region with `role="alert"`.
`useNotify()` sets `role="status"` on the toast and `type: 'background'` (polite announcement). Measured in the DOM.

**`nuxt.config.ts`** carries more than the spec's minimal block (proxy, mock handlers, runtime config, the icon transform,
`focus.css`, the dev-only specimen hook); the spec's keys are unchanged apart from `icon`.

## Stage 4 note (2026-11-12): shell rail and the first-toast profile

**Rail links. Correction.** The shipped rail (`app/components/AppRail.vue`) is a plain `<nav aria-label="Основное меню">`
of `NuxtLink`s, not `UNavigationMenu`. Reason, measured in the dev build with a devtools hook: the vertical
`UNavigationMenu` (accordion mode) re-rendered 176 times in the 12 s after sign-in while its parent rendered 8 times;
the re-renders were not triggered by its own reactive state (a `renderTriggered` probe logged none), and they went on
with static, non-reactive items, so the cost is in the component's internals, not in our data. A flat list needs none of
that machinery. The look and states are unchanged and live in `app/utils/civic-ui.ts` as `railLinkClass`,
`railGroupLabelClass` and `railBadgeClass`: civic-700 ground on hover and when active, the 3 px white inline-start bar
plus `aria-current="page"` when active, a 2 px white focus outline on the pill at offset 0 (11.38:1 on civic-800, 8.15:1
on civic-700; measured white on every rail stop by `scripts/capture-shell.mjs`), counters as `bg-error` (8.36:1) and
`bg-inverted` (6.81:1) with white text. `railNavUi` stays for the Stage 3 civic preview on `/_specimen`.

**First toast (Stage 3 follow-up).** Profiled with `scripts/profile-toast.mjs` (sign in as archivist, open the bell,
«Отметить все прочитанными» answered with a 400, which useApi turns into the session's first toast), no CPU throttling,
against a production build (`NUXT_PUBLIC_API_MOCK=1 pnpm build`, `node .output/server/index.mjs`).
- **It reproduces in the production build**, headless and headed, so it is not headless-only. Before the rail change:
  click to toast 4.3–6.8 s (Playwright-measured; 1.3–1.9 s to the toast's DOM node measured in-page), with 1.6–2.3 s
  long tasks in that window. After it: 3.6–3.8 s (1.03–1.16 s in-page), largest task in the window 1.1–1.3 s.
- **Environment share.** This machine runs Playwright's Chrome slowly: the same 5·10⁷-iteration loop takes 292 ms in
  the page and 86–124 ms in node, and node itself takes 728 ms at background QoS (`taskpolicy -b`). Every absolute number
  above is inflated by that factor; the relative improvement is the reliable part.
- **Still open for Stage 9 (`/impeccable optimize`):** multi-second tasks at boot remain (about 6.5 s before `/login`
  first paints and about 5 s while the shell mounts, in this environment). Vue mount work dominates the CPU profile; the
  login page itself does not loop (6 component updates while it sits idle), and the steady-state shell is quiet
  (2 component updates in 10 s, from the health poll). Re-measure on a normal desktop session before optimising.
