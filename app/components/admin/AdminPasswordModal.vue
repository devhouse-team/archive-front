<script setup lang="ts">
import type { FormError } from '@nuxt/ui'
import type { AdminUser } from '~/types/api'
import { PASSWORD_MIN, validatePassword } from '~/composables/useAdmin'

// Password reset (handoff §5.6 PATCH /api/users/{id} {password}). The backend ends that user's sessions, and the
// modal says so before the admin confirms.
const props = defineProps<{ user: AdminUser | null }>()
const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ changed: [user: AdminUser] }>()

const { t } = useT()
const api = useApi()

const state = reactive({ password: '' })
const saving = ref(false)
const showPassword = ref(false)

watch(open, (isOpen) => {
  if (isOpen) {
    state.password = ''
    showPassword.value = false
  }
})

function validate(s: { password: string }): FormError[] {
  const message = validatePassword(s.password)
  return message ? [{ name: 'password', message }] : []
}

async function submit() {
  if (!props.user || saving.value) return
  saving.value = true
  try {
    await api.users.update(props.user.id, { password: state.password })
    open.value = false
    emit('changed', props.user)
  }
  catch {
    // Toast from the shared client.
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="t('admin.password.title')"
    :description="user ? t('admin.password.description', { username: user.username }) : undefined"
    :ui="{ content: 'sm:max-w-md', footer: 'justify-end' }"
  >
    <template #body>
      <UForm
        id="user-password-form"
        :state="state"
        :validate="validate"
        :validate-on="['blur']"
        class="flex flex-col gap-4"
        @submit="submit"
      >
        <UAlert
          color="warning"
          variant="soft"
          icon="i-lucide-log-out"
          :description="t('admin.password.note')"
        />
        <UFormField
          name="password"
          :label="t('admin.form.password')"
          :hint="t('admin.form.passwordHint', { min: PASSWORD_MIN })"
          required
        >
          <UInput
            v-model="state.password"
            :type="showPassword ? 'text' : 'password'"
            autocomplete="new-password"
            class="w-full"
            :ui="{ trailing: 'pe-1' }"
          >
            <template #trailing>
              <UButton
                color="neutral"
                variant="ghost"
                :icon="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                :aria-label="showPassword ? t('admin.form.hidePassword') : t('admin.form.showPassword')"
                :aria-pressed="showPassword"
                @click="showPassword = !showPassword"
              />
            </template>
          </UInput>
        </UFormField>
      </UForm>
    </template>
    <template #footer>
      <UButton
        color="neutral"
        variant="outline"
        :label="t('admin.password.cancel')"
        @click="open = false"
      />
      <UButton
        type="submit"
        form="user-password-form"
        icon="i-lucide-key-round"
        :loading="saving"
        :label="t('admin.password.submit')"
      />
    </template>
  </UModal>
</template>
