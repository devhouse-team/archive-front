import { getCurrentScope, onScopeDispose, readonly, ref } from 'vue'

export interface PollingOptions {
  /** Run once right away (default true). */
  immediate?: boolean
  /** Pause while document.hidden and catch up with one run when the tab is visible again (default true). */
  pauseWhenHidden?: boolean
}

/**
 * The only way to poll (handoff §4: no push from the backend). Runs `fn` every `ms`:
 * - never overlaps itself (a slow request skips the next tick);
 * - clears its timer while the tab is hidden and runs once when it is visible again;
 * - stops for good when the calling effect scope (component, store setup) is disposed.
 * Errors thrown by `fn` are swallowed so one failed tick does not stop the loop; callers keep their own error state.
 */
export function usePolling(fn: () => unknown | Promise<unknown>, ms: number, options: PollingOptions = {}) {
  const { immediate = true, pauseWhenHidden = true } = options
  const isActive = ref(false)
  let timer: ReturnType<typeof setInterval> | null = null
  let busy = false
  let disposed = false
  const hasDocument = typeof document !== 'undefined'

  async function tick() {
    if (busy || disposed) return
    if (pauseWhenHidden && hasDocument && document.hidden) return
    busy = true
    try {
      await fn()
    }
    catch {
      // The caller's fn owns its error state; polling keeps going.
    }
    finally {
      busy = false
    }
  }

  function clear() {
    if (timer !== null) {
      clearInterval(timer)
      timer = null
    }
  }

  function schedule() {
    if (timer !== null) return
    timer = setInterval(tick, ms)
  }

  function start() {
    if (disposed || isActive.value) return
    isActive.value = true
    if (pauseWhenHidden && hasDocument && document.hidden) return
    schedule()
    if (immediate) void tick()
  }

  function stop() {
    clear()
    isActive.value = false
  }

  // Hidden tab: drop the timer entirely. Visible again: one catch-up run, then the normal interval.
  function onVisibility() {
    if (!isActive.value) return
    if (document.hidden) {
      clear()
    }
    else {
      schedule()
      void tick()
    }
  }

  if (pauseWhenHidden && hasDocument) document.addEventListener('visibilitychange', onVisibility)

  function dispose() {
    disposed = true
    stop()
    if (pauseWhenHidden && hasDocument) document.removeEventListener('visibilitychange', onVisibility)
  }

  if (getCurrentScope()) onScopeDispose(dispose)

  start()

  return { isActive: readonly(isActive), start, stop, dispose, trigger: tick }
}
