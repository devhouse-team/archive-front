<script setup lang="ts">
import type { FormError } from '@nuxt/ui'
import type { CreateUserBody, Role } from '~/types/api'
import { ROLES } from '~/types/api'
import type { UserFormState } from '~/composables/useAdmin'
import { PASSWORD_MIN, validateUserForm } from '~/composables/useAdmin'

// «Добавить пользователя» (handoff §5.6 POST /api/users). Client rules first (validateUserForm), the server's
// 400 detail still arrives as a toast from the shared client if it disagrees.
const props = defineProps<{ taken: readonly string[] }>()
const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ created: [username: string] }>()

const { t } = useT()
const api = useApi()

const blank = (): UserFormState => ({ username: '', password: '', role: undefined, full_name: '' })
const state = reactive<UserFormState>(blank())
const saving = ref(false)
const showPassword = ref(false)

watch(open, (isOpen) => {
  if (isOpen) {
    Object.assign(state, blank())
    showPassword.value = false
  }
})

const roleItems = computed(() => ROLES.map((r: Role) => ({ value: r, label: t(`roles.${r}`) })))

function validate(s: UserFormState): FormError[] {
  return validateUserForm(s, props.taken)
}

async function submit() {
  if (saving.value || !state.role) return
  saving.value = true
  const body: CreateUserBody = {
    username: state.username.trim(),
    password: state.password,
    role: state.role,
    full_name: state.full_name.trim() || undefined,
  }
  try {
    await api.users.create(body)
    open.value = false
    emit('created', body.username)
  }
  catch {
    // 400 detail (for example a taken login) is already a toast; the form stays filled for a correction.
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="t('admin.form.createTitle')"
    :description="t('admin.form.createDescription')"
    :ui="{ content: 'sm:max-w-lg', footer: 'justify-end' }"
  >
    <template #body>
      <UForm
        id="user-create-form"
        :state="state"
        :validate="validate"
        :validate-on="['blur', 'change']"
        class="flex flex-col gap-4"
        @submit="submit"
      >
        <UFormField
          name="username"
          :label="t('admin.form.username')"
          :hint="t('admin.form.usernameHint')"
          required
        >
          <UInput
            v-model="state.username"
            autocomplete="off"
            spellcheck="false"
            class="w-full"
          />
        </UFormField>
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
        <UFormField
          name="role"
          :label="t('admin.form.role')"
          required
        >
          <USelect
            v-model="state.role"
            :items="roleItems"
            :placeholder="t('admin.form.rolePlaceholder')"
            class="w-full"
          />
        </UFormField>
        <UFormField
          name="full_name"
          :label="t('admin.form.fullName')"
          :hint="t('admin.form.fullNameHint')"
        >
          <UInput
            v-model="state.full_name"
            autocomplete="off"
            class="w-full"
          />
        </UFormField>
      </UForm>
    </template>
    <template #footer>
      <UButton
        color="neutral"
        variant="outline"
        :label="t('admin.form.cancel')"
        @click="open = false"
      />
      <UButton
        type="submit"
        form="user-create-form"
        icon="i-lucide-user-plus"
        :loading="saving"
        :label="t('admin.form.create')"
      />
    </template>
  </UModal>
</template>
