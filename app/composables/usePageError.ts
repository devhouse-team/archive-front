export type PageErrorKind = 'forbidden' | 'notFound' | 'error'

export interface PageErrorState {
  kind: PageErrorKind
  /** Server detail, when the API sent one. Shown under the heading. */
  detail?: string | null
}

/**
 * The screen-level error state («Нет доступа», not found, failed load). app.vue renders it in place of
 * the page, so the shell stays and the URL keeps the address the user asked for.
 * The auth middleware clears it on every navigation.
 */
export function usePageError() {
  const state = useState<PageErrorState | null>('page-error', () => null)

  function raise(kind: PageErrorKind, detail?: string | null) {
    state.value = { kind, detail: detail ?? null }
  }

  function clear() {
    state.value = null
  }

  return { pageError: state, raise, clear }
}
