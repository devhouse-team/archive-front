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
    // 36 px click targets (spec 2 corrections 2026-11-12, Stage 3 note). The control itself (the checkbox/radio
    // button, the switch track) gets a ::before stretched over the whole 36 px row, so a click anywhere in the row
    // lands on the control. Its containing block is the `relative` root/item (base is not positioned, so its own
    // overflow-hidden does not clip it). Stage 4 moved it off label::after, which Nuxt UI uses for the `required`
    // asterisk; links inside the label or description are lifted above it with `relative` and stay clickable.
    switch: {
      defaultVariants: { size: 'lg' },
      slots: {
        root: 'min-h-9 items-center',
        base: 'before:absolute before:inset-0 before:cursor-pointer',
        wrapper: '[&_a]:relative',
        label: 'cursor-pointer',
      },
    },
    checkbox: {
      slots: {
        root: 'min-h-9 items-center',
        base: 'before:absolute before:inset-0 before:cursor-pointer',
        wrapper: '[&_a]:relative',
        label: 'cursor-pointer',
      },
    },
    radioGroup: {
      slots: {
        item: 'relative min-h-9 items-center',
        base: 'before:absolute before:inset-0 before:cursor-pointer',
        wrapper: '[&_a]:relative',
        label: 'cursor-pointer',
      },
    },
    navigationMenu: { slots: { link: 'min-h-9' } },
    dropdownMenu: { slots: { item: 'min-h-9' } },
    // pagination: no size variant in Nuxt UI 4.12; its UButtons take button.defaultVariants.size (spec 2 correction).
    modal: { slots: { close: 'min-h-9 min-w-9' } },
    slideover: { slots: { close: 'min-h-9 min-w-9' } },
    toast: { slots: { close: 'min-h-9 min-w-9' } },
    inputNumber: { defaultVariants: { size: 'lg' }, slots: { increment: 'min-h-9 min-w-9', decrement: 'min-h-9 min-w-9' } },
  },
})
