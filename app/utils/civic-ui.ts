// Nuxt UI overrides for components on civic fields (rail and header), spec 2 §Nuxt UI on civic fields.
// Verified against .nuxt/ui/{navigation-menu,input,button}.ts for @nuxt/ui 4.12.0 on 2026-11-12; see the dated
// correction note in docs/stages/2-design-system.md. Focus is always a white indicator written as variant classes.

/** UNavigationMenu (vertical) in the rail. */
export const railNavUi = {
  root: 'gap-0',
  list: 'flex flex-col gap-0.5 px-2',
  // Group label «Қор · Фонд»: plate face, 10 px uppercase micro-label.
  label: 'text-rail-muted font-plate font-medium uppercase text-[10px] tracking-[0.06em] px-3 pt-4 pb-1',
  link: [
    'min-h-9 px-3 text-white hover:text-white',
    // Hover and active ground; Nuxt UI paints both on ::before.
    'hover:before:bg-rail-active data-active:before:bg-rail-active',
    // Active: 3 px white bar on the inline-start edge (plus aria-current="page" from Reka).
    'data-active:before:shadow-[inset_3px_0_0_0_var(--color-white)] rtl:data-active:before:shadow-[inset_-3px_0_0_0_var(--color-white)]',
    // Nuxt UI 4.12 draws link focus as a ::before outline (outline-3, primary/25); make it 2 px white.
    'focus-visible:before:outline-2 focus-visible:before:outline-white',
  ].join(' '),
  linkLeadingIcon: 'text-rail-muted group-hover:text-white group-data-active:text-white group-data-[state=open]:text-white',
  linkLabel: 'text-sm',
  linkTrailing: 'ms-auto',
}

/**
 * Rail links rendered as plain NuxtLinks (AppRail, Stage 4). Same look and states as railNavUi:
 * civic-700 ground on hover and when active, a 3 px white bar on the inline-start edge when active
 * (with aria-current="page"), a 2 px white focus outline drawn on the pill itself (11.38:1 on civic-800, 8.15:1 on civic-700).
 */
export const railLinkClass = [
  'group relative flex min-h-9 w-full items-center gap-1.5 rounded-md px-3 text-sm font-medium text-white',
  'transition-colors hover:bg-rail-active aria-[current=page]:bg-rail-active',
  'aria-[current=page]:shadow-[inset_3px_0_0_0_var(--color-white)] rtl:aria-[current=page]:shadow-[inset_-3px_0_0_0_var(--color-white)]',
  'focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-white',
].join(' ')

/** Rail group label «Фонд» (Russian only since Stage 11c): plate face, 12 px uppercase. */
export const railGroupLabelClass = 'px-3 pt-4 pb-1 font-plate text-xs/5 font-semibold uppercase tracking-[0.06em] text-rail-muted'

/** Rail counter: «Ошибки» on bg-error (8.36:1), «Очередь проверки» on bg-inverted (6.81:1), white text. */
export const railBadgeClass = 'ms-auto shrink-0 rounded-md px-2 py-0.5 text-xs font-medium text-white tabular-nums'

/** Header UInput (search). */
export const headerInputUi = {
  base: [
    'bg-rail-field text-white placeholder:text-rail-muted ring-rail-field-border',
    // A 2 px white inset ring replaces both Nuxt UI's 1 px primary ring and its 3 px primary/25 outline.
    'focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none',
  ].join(' '),
  leadingIcon: 'text-rail-muted',
}

/** Header UButton (bell, user menu): use with color="neutral" variant="ghost". */
export const headerButtonClass = [
  'text-white hover:bg-rail-active active:bg-rail-active focus-visible:bg-rail-active',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white',
].join(' ')
