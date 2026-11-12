import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { CollectionSummary } from '~/types/api'
import { useAuthStore } from '~/stores/auth'

/**
 * The user's подборки for the «В подборку» popover on /search (Stage 6). The list loads once per session
 * and refreshes after create/delete. Adding a page is idempotent on the server (handoff §5.5); the store also
 * remembers which pages it has put into which collection, so a second click neither posts nor toasts twice.
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

  /** Returns 'added' on success, 'already' when this tab added it before (no request), or throws ApiError. */
  async function addPage(collectionId: number, pageId: number): Promise<'added' | 'already'> {
    checkOwner()
    if (has(collectionId, pageId)) return 'already'
    await useApi().collections.addItem(collectionId, pageId)
    added.value = { ...added.value, [collectionId]: [...(added.value[collectionId] ?? []), pageId] }
    const row = list.value.find(c => c.id === collectionId)
    if (row) row.n += 1
    return 'added'
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

  function forgetPage(collectionId: number, pageId: number) {
    const pages = added.value[collectionId]
    if (pages) added.value = { ...added.value, [collectionId]: pages.filter(p => p !== pageId) }
  }

  function reset() {
    list.value = []
    loaded.value = false
    added.value = {}
  }

  return { list, loaded, loading, error, load, has, addPage, create, forget, forgetPage, reset }
})
