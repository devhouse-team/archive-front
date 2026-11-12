<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { AdminUser, Role } from '~/types/api'
import { ROLES } from '~/types/api'
import { useAuthStore } from '~/stores/auth'

// Users (handoff §5.6): list, create, change role, reset password. There is no delete endpoint.
const { t } = useT()
const api = useApi()
const auth = useAuthStore()
const { notify } = useNotify()

const rows = ref<AdminUser[]>([])
const loading = ref(true)
const failed = ref(false)
const savingRole = ref<number | null>(null)

async function load() {
  loading.value = true
  failed.value = false
  try {
    rows.value = await api.users.list()
  }
  catch {
    failed.value = true
  }
  finally {
    loading.value = false
  }
}
void load()

const roleItems = computed(() => ROLES.map((r: Role) => ({ value: r, label: t(`roles.${r}`) })))
const usernames = computed(() => rows.value.map(u => u.username))

// Demoting an admin takes away user management and the ЕАИС switch, so it asks first; other changes save at once.
const demotion = ref<{ user: AdminUser, role: Role } | null>(null)
const demotionOpen = computed({
  get: () => demotion.value !== null,
  set: (open: boolean) => {
    if (!open) demotion.value = null
  },
})
const demotionText = ref('')
const demoteCancel = useTemplateRef<{ $el?: HTMLElement }>('demoteCancel')
const focusCancel = {
  onOpenAutoFocus: (e: Event) => {
    const el = demoteCancel.value?.$el
    if (el instanceof HTMLElement) {
      e.preventDefault()
      el.focus()
    }
  },
}

function requestRole(user: AdminUser, role: Role) {
  if (role === user.role || savingRole.value !== null) return
  if (user.role === 'admin') {
    demotion.value = { user, role }
    // Kept after close, so the text does not go blank during the closing animation.
    demotionText.value = t('admin.users.demoteBody', { username: user.username, role: t(`roles.${role}`) })
    return
  }
  void changeRole(user, role)
}

async function confirmDemotion() {
  const d = demotion.value
  demotion.value = null
  if (d) await changeRole(d.user, d.role)
}

async function changeRole(user: AdminUser, role: Role) {
  if (role === user.role || savingRole.value !== null) return
  const before = user.role
  user.role = role
  savingRole.value = user.id
  try {
    await api.users.update(user.id, { role })
    notify(t('admin.users.roleChanged', { username: user.username, role: t(`roles.${role}`) }), 'success')
  }
  catch {
    user.role = before
  }
  finally {
    savingRole.value = null
  }
}

const createOpen = ref(false)
function onCreated(username: string) {
  notify(t('admin.form.created', { username }), 'success')
  void load()
}

const passwordOpen = ref(false)
const passwordUser = ref<AdminUser | null>(null)
function openPassword(user: AdminUser) {
  passwordUser.value = user
  passwordOpen.value = true
}
function onPasswordChanged(user: AdminUser) {
  notify(t('admin.password.done', { username: user.username }), 'success')
}

const columns = computed<TableColumn<AdminUser>[]>(() => [
  { id: 'username', header: t('admin.users.cols.username') },
  { id: 'fullName', header: t('admin.users.cols.fullName') },
  { id: 'role', header: t('admin.users.cols.role') },
  { id: 'actions', header: () => h('span', { class: 'sr-only' }, t('admin.users.cols.actions')) },
])

const tableUi = {
  root: 'overflow-x-auto',
  thead: 'bg-elevated',
  th: 'py-2.5 text-[13px] font-semibold text-toned',
  td: 'py-2.5 text-sm text-default align-middle',
}
</script>

<template>
  <section
    class="flex flex-col gap-4 rounded-lg bg-default p-5"
    aria-labelledby="admin-users"
  >
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h2
        id="admin-users"
        class="text-lg font-semibold text-highlighted"
      >
        {{ t('admin.users.title') }}
      </h2>
      <UButton
        icon="i-lucide-user-plus"
        :label="t('admin.users.add')"
        @click="createOpen = true"
      />
    </div>

    <UAlert
      v-if="failed"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      :title="t('admin.users.error')"
      :actions="[{ label: t('admin.users.retry'), color: 'error', variant: 'outline', onClick: load }]"
    />
    <div
      v-else-if="loading && rows.length === 0"
      class="flex flex-col gap-2"
      aria-busy="true"
      :aria-label="t('admin.users.loading')"
    >
      <USkeleton
        v-for="i in 4"
        :key="i"
        class="h-11 w-full"
      />
    </div>
    <p
      v-else-if="rows.length === 0"
      class="py-6 text-sm text-muted"
    >
      {{ t('admin.users.empty') }}
    </p>
    <UTable
      v-else
      :data="rows"
      :columns="columns"
      :loading="loading"
      :ui="tableUi"
      class="-mx-5"
    >
      <template #username-cell="{ row }">
        <span class="font-medium text-highlighted">{{ row.original.username }}</span>
        <UBadge
          v-if="row.original.id === auth.me?.id"
          color="neutral"
          variant="soft"
          size="md"
          class="ms-2"
          :label="t('admin.users.self')"
        />
      </template>
      <template #fullName-cell="{ row }">
        <span
          v-if="row.original.full_name"
          dir="auto"
        >{{ row.original.full_name }}</span>
        <span
          v-else
          class="text-dimmed"
        >{{ t('admin.users.noName') }}</span>
      </template>
      <template #role-cell="{ row }">
        <USelect
          :model-value="row.original.role"
          :items="roleItems"
          :aria-label="t('admin.users.roleAria', { username: row.original.username })"
          :disabled="row.original.id === auth.me?.id || savingRole !== null"
          :loading="savingRole === row.original.id"
          :title="row.original.id === auth.me?.id ? t('admin.users.selfRoleHint') : undefined"
          class="w-48"
          @update:model-value="(v) => requestRole(row.original, v as Role)"
        />
      </template>
      <template #actions-cell="{ row }">
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-key-round"
          :label="t('admin.users.resetPassword')"
          :aria-label="t('admin.users.resetPasswordAria', { username: row.original.username })"
          @click="openPassword(row.original)"
        />
      </template>
    </UTable>

    <AdminUserModal
      v-model:open="createOpen"
      :taken="usernames"
      @created="onCreated"
    />
    <AdminPasswordModal
      v-model:open="passwordOpen"
      :user="passwordUser"
      @changed="onPasswordChanged"
    />
    <UModal
      v-model:open="demotionOpen"
      :title="t('admin.users.demoteTitle')"
      :description="demotionText"
      :ui="{ footer: 'justify-end' }"
      :content="focusCancel"
    >
      <template #footer>
        <UButton
          ref="demoteCancel"
          color="neutral"
          variant="outline"
          :label="t('admin.users.demoteCancel')"
          @click="demotionOpen = false"
        />
        <UButton
          color="error"
          icon="i-lucide-user-minus"
          :label="t('admin.users.demoteConfirm')"
          @click="confirmDemotion"
        />
      </template>
    </UModal>
  </section>
</template>
