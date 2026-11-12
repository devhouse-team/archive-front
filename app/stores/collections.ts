import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { CollectionSummary } from '~/types/api'
import { useAuthStore } from '~/stores/auth'

/**
 * The user's подборки for the «В подборку» popover on /search (Stage 6). The popover reloads the list from the
 * server each time it opens, and the store reloads it after every add, so `n` follows the server (other tabs,
 * removals) instead of local arithmetic. Adding a page is idempotent on the server (handoff §5.5): when `n` does
 * not grow, the page was already there and the caller says so. Known pages are remembered per collection, so a
 * second click neither posts nor toasts twice.
 */
export const useCollectionsStore = defineStore('collections', () => {
  const list = ref<CollectionSummary[]>([])
  const loaded = ref(false)
  const loading = ref(false)
  const error = ref(false)
  /** collection id → page ids added from this tab. */
  const added = ref<Record<number, number[]>>({})
  /** The user the cache belongs to: a different login (same tab) starts from scratch. */
  const owner = ref<number | null>(null)
  let pending: Promise<void> | null = null

  function checkOwner() {
    const id = useAuthStore().me?.id ?? null
    if (owner.value !== id) {
      reset()
      owner.value = id
    }
  }

  async function load(force = false): Promise<void> {
    checkOwner()
    if (loaded.value && !force) return
    if (pending) return pending
    loading.value = true
    error.value = false
    pending = useApi().request<CollectionSummary[]>('/api/collections', { errorMode: 'background' })
      .then((rows) => {
        list.value = rows
        loaded.value = true
      })
      .catch(() => {
        error.value = true
      })
      .finally(() => {
        loading.value = false
        pending = null
      })
    return pending
  }

  function has(collectionId: number, pageId: number): boolean {
    return added.value[collectionId]?.includes(pageId) ?? false
  }

  function remember(collectionId: number, pageId: number) {
    if (!has(collectionId, pageId)) added.value = { ...added.value, [collectionId]: [...(added.value[collectionId] ?? []), pageId] }
  }

  /**
   * Returns 'added' on success, 'already' when the page was in the collection before (known here, or the
   * server's count did not grow), or throws ApiError.
   */
  async function addPage(collectionId: number, pageId: number): Promise<'added' | 'already'> {
    checkOwner()
    if (has(collectionId, pageId)) return 'already'
    const before = list.value.find(c => c.id === collectionId)?.n
    await useApi().collections.addItem(collectionId, pageId)
    remember(collectionId, pageId)
    await load(true)
    const after = list.value.find(c => c.id === collectionId)?.n
    return before !== undefined && after !== undefined && after === before ? 'already' : 'added'
  }

  async function create(name: string): Promise<CollectionSummary> {
    const res = await useApi().collections.create(name)
    const row: CollectionSummary = { id: res.id, name: res.name, user_id: 0, created_at: '', n: 0, updated_at: null }
    list.value = [row, ...list.value]
    return row
  }

  /** After a delete or an item removal elsewhere, forget what we knew about that collection. */
  function forget(collectionId: number) {
    list.value = list.value.filter(c => c.id !== collectionId)
    const { [collectionId]: _drop, ...rest } = added.value
    added.value = rest
  }

  /** A page was removed on the collection screen: drop it here and take the count from the server again. */
  function forgetPage(collectionId: number, pageId: number) {
    const pages = added.value[collectionId]
    if (pages) added.value = { ...added.value, [collectionId]: pages.filter(p => p !== pageId) }
    if (loaded.value) void load(true)
  }

  function reset() {
    list.value = []
    loaded.value = false
    added.value = {}
  }

  return { list, loaded, loading, error, load, has, addPage, create, forget, forgetPage, reset }
})
