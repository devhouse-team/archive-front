import type { Role } from '~/types/api'
import type { MessageKey } from '~/composables/useT'

declare module '#app' {
  interface PageMeta {
    /** Roles allowed on this page (handoff §2). Pages without `roles` (and not `public`) are closed. */
    roles?: readonly Role[]
    /** Reachable without a session (login only). */
    public?: boolean
    /** Screen name from ru.ts: the header title and the document title («Поиск — Цифровой архив Астаны»). */
    title?: MessageKey
  }
}

export {}
