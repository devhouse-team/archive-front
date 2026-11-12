import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, ref } from 'vue'
import { usePolling } from '~/composables/usePolling'
import { langDir, useLangDir } from '~/composables/useLangDir'
import { interpolate, translate } from '~/composables/useT'

function setHidden(hidden: boolean) {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden })
  document.dispatchEvent(new Event('visibilitychange'))
}

describe('usePolling', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    setHidden(false)
  })
  afterEach(() => {
    vi.useRealTimers()
    setHidden(false)
  })

  it('runs immediately, then every interval', async () => {
    const fn = vi.fn()
    const scope = effectScope()
    scope.run(() => usePolling(fn, 5000))
    expect(fn).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(15000)
    expect(fn).toHaveBeenCalledTimes(4)
    scope.stop()
  })

  it('stops when its scope is disposed (screen unmounts)', async () => {
    const fn = vi.fn()
    const scope = effectScope()
    const polling = scope.run(() => usePolling(fn, 1000))!
    await vi.advanceTimersByTimeAsync(2000)
    const calls = fn.mock.calls.length
    scope.stop()
    expect(polling.isActive.value).toBe(false)
    await vi.advanceTimersByTimeAsync(10000)
    expect(fn).toHaveBeenCalledTimes(calls)
  })

  it('stops while the tab is hidden and catches up once when visible', async () => {
    const fn = vi.fn()
    const scope = effectScope()
    scope.run(() => usePolling(fn, 1000))
    expect(fn).toHaveBeenCalledTimes(1)
    setHidden(true)
    await vi.advanceTimersByTimeAsync(10000)
    expect(fn).toHaveBeenCalledTimes(1)
    setHidden(false)
    expect(fn).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(1000)
    expect(fn).toHaveBeenCalledTimes(3)
    scope.stop()
  })

  it('never overlaps a slow call and survives a failing one', async () => {
    let resolve: () => void = () => {}
    const fn = vi.fn()
      .mockImplementationOnce(() => new Promise<void>((r) => {
        resolve = r
      }))
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValue(undefined)
    const scope = effectScope()
    scope.run(() => usePolling(fn, 1000))
    await vi.advanceTimersByTimeAsync(3000)
    expect(fn).toHaveBeenCalledTimes(1) // still busy with the first call
    resolve()
    await vi.advanceTimersByTimeAsync(1000)
    expect(fn).toHaveBeenCalledTimes(2) // the rejection
    await vi.advanceTimersByTimeAsync(1000)
    expect(fn).toHaveBeenCalledTimes(3) // keeps going
    scope.stop()
  })

  it('stop() halts and start() resumes', async () => {
    const fn = vi.fn()
    const scope = effectScope()
    const polling = scope.run(() => usePolling(fn, 1000))!
    polling.stop()
    await vi.advanceTimersByTimeAsync(5000)
    expect(fn).toHaveBeenCalledTimes(1)
    polling.start()
    expect(fn).toHaveBeenCalledTimes(2)
    scope.stop()
  })
})

describe('useLangDir', () => {
  it('kk-arab is rtl; other known scripts ltr; mixed and unknown auto', () => {
    expect(langDir('kk-arab')).toBe('rtl')
    expect(langDir('ru')).toBe('ltr')
    expect(langDir('kk-cyrl')).toBe('ltr')
    expect(langDir('kk-latn')).toBe('ltr')
    expect(langDir('mixed')).toBe('auto')
    expect(langDir(null)).toBe('auto')
    expect(langDir(undefined)).toBe('auto')
    expect(langDir('xx')).toBe('auto')
  })

  it('is reactive', async () => {
    const lang = ref<string | null>('ru')
    const dir = useLangDir(lang)
    expect(dir.value).toBe('ltr')
    lang.value = 'kk-arab'
    await nextTick()
    expect(dir.value).toBe('rtl')
  })
})

describe('useT', () => {
  it('reads ru.ts and fills {name} placeholders', () => {
    expect(translate('errors.forbidden')).toBe('Нет доступа')
    expect(translate('plate.aria', { fond: 1, opis: 1, delo: 15, leaf: 3 })).toBe('Шифр: фонд 1, опись 1, дело 15, лист 3')
    expect(interpolate('{a} и {b}', { a: 1 })).toBe('1 и {b}')
  })
})
