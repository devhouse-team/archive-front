import { describe, expect, it, vi } from 'vitest'
import { createApiClient } from '~/composables/useApi'
import type { ApiDeps, Fetcher } from '~/composables/useApi'
import { ApiError, toApiError } from '~/utils/api-error'
import { filenameFromDisposition } from '~/utils/content-disposition'

/** A fetch error shaped like ofetch's FetchError. */
function fail(status: number | null, data?: unknown) {
  return Object.assign(new Error('fetch failed'), status === null ? {} : { status, statusCode: status, data })
}

function setup(fetcher: Fetcher, rawFetch?: typeof fetch) {
  const deps = {
    fetcher,
    rawFetch,
    onUnauthorized: vi.fn(),
    onPageError: vi.fn(),
    onToast: vi.fn(),
    saveBlob: vi.fn(),
  } satisfies ApiDeps
  return { api: createApiClient(deps), deps }
}

async function caught(p: Promise<unknown>): Promise<ApiError> {
  try {
    await p
  }
  catch (e) {
    return e as ApiError
  }
  throw new Error('expected a rejection')
}

describe('toApiError', () => {
  it('maps statuses to kinds and keeps the server detail', () => {
    expect(toApiError(401, { detail: 'Требуется вход' })).toMatchObject({ kind: 'unauthorized', message: 'Требуется вход' })
    expect(toApiError(403, { detail: 'Недостаточно прав' })).toMatchObject({ kind: 'forbidden' })
    expect(toApiError(404, { detail: 'Дело не найдено' })).toMatchObject({ kind: 'notFound', detail: 'Дело не найдено' })
    expect(toApiError(400, { detail: 'Введите название подборки' })).toMatchObject({ kind: 'validation', message: 'Введите название подборки' })
    expect(toApiError(415, { detail: 'Превью недоступно' })).toMatchObject({ kind: 'unsupported' })
    expect(toApiError(500, undefined)).toMatchObject({ kind: 'server', message: 'Ошибка 500' })
    expect(toApiError(null, undefined)).toMatchObject({ kind: 'network', message: 'Нет связи с сервером' })
  })

  it('does not show FastAPI 422 arrays as copy', () => {
    const e = toApiError(422, { detail: [{ type: 'int_parsing', loc: ['path', 'id'], msg: 'Input should be a valid integer' }] })
    expect(e.kind).toBe('validation')
    expect(e.message).toBe('Проверьте введённые данные')
    expect(e.detail).toBeNull()
  })
})

describe('createApiClient error mapping', () => {
  it('sends credentials same-origin and returns the body', async () => {
    const fetcher = vi.fn<Fetcher>().mockResolvedValue({ id: 1 })
    const { api } = setup(fetcher)
    await expect(api.dela.get(6)).resolves.toEqual({ id: 1 })
    expect(fetcher).toHaveBeenCalledWith('/api/dela/6', expect.objectContaining({ method: 'GET', credentials: 'same-origin' }))
  })

  it('401 → onUnauthorized (redirect to /login?next=), no toast', async () => {
    const { api, deps } = setup(vi.fn<Fetcher>().mockRejectedValue(fail(401, { detail: 'Требуется вход' })))
    const e = await caught(api.dela.list())
    expect(e).toBeInstanceOf(ApiError)
    expect(e.kind).toBe('unauthorized')
    expect(deps.onUnauthorized).toHaveBeenCalledOnce()
    expect(deps.onToast).not.toHaveBeenCalled()
  })

  it('401 from /api/login stays with the form (wrong password)', async () => {
    const { api, deps } = setup(vi.fn<Fetcher>().mockRejectedValue(fail(401, { detail: 'Неверный логин или пароль' })))
    const e = await caught(api.auth.login({ username: 'reader', password: 'x' }))
    expect(e.message).toBe('Неверный логин или пароль')
    expect(deps.onUnauthorized).not.toHaveBeenCalled()
    expect(deps.onToast).not.toHaveBeenCalled()
  })

  it('403 on a screen load raises «Нет доступа»', async () => {
    const { api, deps } = setup(vi.fn<Fetcher>().mockRejectedValue(fail(403, { detail: 'Недостаточно прав' })))
    const e = await caught(api.users.list())
    expect(e.kind).toBe('forbidden')
    expect(deps.onPageError).toHaveBeenCalledWith(expect.objectContaining({ kind: 'forbidden' }))
    expect(deps.onToast).not.toHaveBeenCalled()
  })

  it('404 on a screen load raises the not-found state', async () => {
    const { api, deps } = setup(vi.fn<Fetcher>().mockRejectedValue(fail(404, { detail: 'Дело не найдено' })))
    await caught(api.dela.get(5))
    expect(deps.onPageError).toHaveBeenCalledWith(expect.objectContaining({ kind: 'notFound' }))
  })

  it('400 toasts the detail', async () => {
    const { api, deps } = setup(vi.fn<Fetcher>().mockRejectedValue(fail(400, { detail: 'Введите название подборки' })))
    await caught(api.collections.create(''))
    expect(deps.onToast).toHaveBeenCalledWith('Введите название подборки')
    expect(deps.onPageError).not.toHaveBeenCalled()
  })

  it('404 from an action toasts the generic not-found copy, never the server detail', async () => {
    // «Дело не найдено» (hidden case) vs «Страница не найдена» would reveal that a restricted case exists.
    for (const detail of ['Дело не найдено', 'Страница не найдена', 'Подборка не найдена']) {
      const { api, deps } = setup(vi.fn<Fetcher>().mockRejectedValue(fail(404, { detail })))
      await caught(api.collections.addItem(999, 1))
      expect(deps.onToast).toHaveBeenCalledWith('Не найдено')
      expect(deps.onPageError).not.toHaveBeenCalled()
    }
  })

  it('5xx and network errors toast', async () => {
    const server = setup(vi.fn<Fetcher>().mockRejectedValue(fail(500)))
    await caught(server.api.dela.list())
    expect(server.deps.onToast).toHaveBeenCalledWith('Ошибка 500')

    const network = setup(vi.fn<Fetcher>().mockRejectedValue(fail(null)))
    const e = await caught(network.api.dela.list())
    expect(e.kind).toBe('network')
    expect(network.deps.onToast).toHaveBeenCalledWith('Нет связи с сервером')
  })

  it('background mode (polling) only acts on 401', async () => {
    const quiet = setup(vi.fn<Fetcher>().mockRejectedValue(fail(500)))
    await caught(quiet.api.health.get())
    expect(quiet.deps.onToast).not.toHaveBeenCalled()
    expect(quiet.deps.onPageError).not.toHaveBeenCalled()

    const expired = setup(vi.fn<Fetcher>().mockRejectedValue(fail(401, { detail: 'Требуется вход' })))
    await caught(expired.api.health.get())
    expect(expired.deps.onUnauthorized).toHaveBeenCalledOnce()
  })

  it('silent mode (session check) has no side effects', async () => {
    const { api, deps } = setup(vi.fn<Fetcher>().mockRejectedValue(fail(401, { detail: 'Требуется вход' })))
    await caught(api.auth.me())
    expect(deps.onUnauthorized).not.toHaveBeenCalled()
    expect(deps.onToast).not.toHaveBeenCalled()
  })

  it('drops empty query params', async () => {
    const fetcher = vi.fn<Fetcher>().mockResolvedValue([])
    const { api } = setup(fetcher)
    await api.m1.files({ status: '', q: 'blank' })
    expect(fetcher.mock.calls[0]![1].query).toEqual({ q: 'blank' })
  })
})

describe('download', () => {
  it('reads filename*=UTF-8 from Content-Disposition and saves the blob', async () => {
    const raw = vi.fn<typeof fetch>().mockResolvedValue(new Response('text', {
      status: 200,
      headers: { 'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent('Ф.1_Оп.1_Д.12_л1.txt')}` },
    }))
    const { api, deps } = setup(vi.fn<Fetcher>(), raw)
    await expect(api.download(api.pages.exportUrl(9, 'txt'))).resolves.toBe('Ф.1_Оп.1_Д.12_л1.txt')
    expect(raw).toHaveBeenCalledWith('/api/pages/9/export?fmt=txt', { credentials: 'same-origin' })
    expect(deps.saveBlob).toHaveBeenCalledWith(expect.any(Blob), 'Ф.1_Оп.1_Д.12_л1.txt')
  })

  it('keeps the server detail on a 404: downloads are only offered for objects already on screen', async () => {
    const raw = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ detail: 'Нет распознанных страниц' }), { status: 404 }))
    const { api, deps } = setup(vi.fn<Fetcher>(), raw)
    const e = await caught(api.download('/api/dela/1/export?fmt=txt'))
    expect(e.kind).toBe('notFound')
    expect(deps.onToast).toHaveBeenCalledWith('Нет распознанных страниц')
  })

  it('falls back to the generic copy when a 404 download has no detail', async () => {
    const raw = vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status: 404 }))
    const { api, deps } = setup(vi.fn<Fetcher>(), raw)
    await caught(api.download('/api/dela/1/export?fmt=txt'))
    expect(deps.onToast).toHaveBeenCalledWith('Не найдено')
  })

  it('still hides the 404 detail of an ordinary request in toast mode', async () => {
    const { api, deps } = setup(vi.fn<Fetcher>().mockRejectedValue(fail(404, { detail: 'Дело не найдено' })))
    await caught(api.dela.reocr(21, 'auto'))
    expect(deps.onToast).toHaveBeenCalledWith('Не найдено')
  })

  it('maps other download failures through the same rules', async () => {
    const raw = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ detail: 'Нет доступа' }), { status: 401 }))
    const { api, deps } = setup(vi.fn<Fetcher>(), raw)
    const e = await caught(api.download('/api/dela/1/export?fmt=txt'))
    expect(e.kind).toBe('unauthorized')
    expect(deps.onUnauthorized).toHaveBeenCalledTimes(1)
    expect(deps.onToast).not.toHaveBeenCalled()
  })
})

describe('filenameFromDisposition', () => {
  it('prefers filename*, falls back to filename, strips paths', () => {
    expect(filenameFromDisposition(`attachment; filename*=UTF-8''%D0%A1%D0%BF%D1%80%D0%B0%D0%B2%D0%BA%D0%B0%20%E2%84%961.xlsx`)).toBe('Справка №1.xlsx')
    expect(filenameFromDisposition('attachment; filename="report.csv"')).toBe('report.csv')
    expect(filenameFromDisposition(`attachment; filename*=UTF-8''..%2F..%2Fetc%2Fpasswd`)).toBe('.._.._etc_passwd')
    expect(filenameFromDisposition(null, 'export')).toBe('export')
  })
})
