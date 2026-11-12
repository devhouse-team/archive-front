<script setup lang="ts">
import type { FormError } from '@nuxt/ui'
import type { Role } from '~/types/api'
import { ROLES } from '~/types/api'
import { useAuthStore } from '~/stores/auth'
import { safeNext } from '~/utils/access'
import { isApiError } from '~/utils/api-error'
import { isEnabled } from '~/utils/config'

// Вход (handoff §6 #1; surface brief app-pages-login-vue). The civic band is the shell's header field,
// so the place the user lands after sign-in is already in view.
definePageMeta({ layout: 'bare', public: true, title: 'pages.login' })

const { t } = useT()
const auth = useAuthStore()
const route = useRoute()
const config = useRuntimeConfig()

const demoAccounts = computed(() => isEnabled(config.public.demoAccounts))

interface LoginState { username: string, password: string }
const state = reactive<LoginState>({ username: '', password: '' })
const submitting = ref(false)
const serverError = ref<string | null>(null)
const showPassword = ref(false)

// Validated on submit (the button stays enabled, Stage 3 review round 1 #7); after a field has been left,
// typing in it re-checks only that field.
function validate(s: Partial<LoginState>): FormError[] {
  const errors: FormError[] = []
  if (!s.username?.trim()) errors.push({ name: 'username', message: t('auth.usernameRequired') })
  if (!s.password) errors.push({ name: 'password', message: t('auth.passwordRequired') })
  return errors
}

async function signIn(username: string, password: string) {
  if (submitting.value) return
  submitting.value = true
  serverError.value = null
  try {
    await auth.login(username.trim(), password)
    await navigateTo(safeNext(route.query.next) ?? auth.startPath, { replace: true })
  }
  catch (e) {
    // 400/401 carry a ready Russian detail («Неверный логин или пароль»); show it next to the form.
    serverError.value = isApiError(e) ? e.message : t('errors.generic')
  }
  finally {
    submitting.value = false
  }
}

function onSubmit() {
  void signIn(state.username, state.password)
}

function signInAs(role: Role) {
  state.username = role
  state.password = ''
  void signIn(role, role)
}

const usernameInput = useTemplateRef<{ inputRef?: HTMLInputElement | null }>('usernameField')
onMounted(() => usernameInput.value?.inputRef?.focus())
</script>

<template>
  <div class="flex min-h-dvh flex-col bg-muted">
    <header class="flex h-14 shrink-0 items-center bg-rail px-4 sm:px-6">
      <AppBrand />
    </header>

    <main class="flex flex-1 justify-center px-4 pt-[min(12vh,7rem)] pb-12">
      <section
        class="flex h-fit w-full max-w-100 flex-col gap-6 rounded-lg bg-default p-6 sm:p-8"
        aria-labelledby="login-title"
      >
        <h1
          id="login-title"
          class="text-[22px]/7 font-semibold text-highlighted"
        >
          {{ t('auth.title') }}
        </h1>

        <UForm
          :state="state"
          :validate="validate"
          :validate-on="['input']"
          class="flex flex-col gap-4"
          @submit="onSubmit"
        >
          <UFormField
            :label="t('auth.username')"
            name="username"
            required
          >
            <UInput
              ref="usernameField"
              v-model="state.username"
              autocomplete="username"
              autocapitalize="none"
              spellcheck="false"
              class="w-full"
            />
          </UFormField>

          <UFormField
            :label="t('auth.password')"
            name="password"
            required
          >
            <UInput
              id="login-password"
              v-model="state.password"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
              class="w-full"
              :ui="{ trailing: 'pe-0' }"
            >
              <template #trailing>
                <UButton
                  color="neutral"
                  variant="ghost"
                  square
                  :icon="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                  :aria-label="showPassword ? t('auth.hidePassword') : t('auth.showPassword')"
                  :aria-pressed="showPassword"
                  aria-controls="login-password"
                  class="rounded-s-none text-muted hover:text-highlighted"
                  @click="showPassword = !showPassword"
                />
              </template>
            </UInput>
          </UFormField>

          <UAlert
            v-if="serverError"
            color="error"
            variant="soft"
            icon="i-lucide-circle-alert"
            :title="serverError"
            role="alert"
          />

          <UButton
            type="submit"
            block
            :loading="submitting"
            :label="submitting ? t('auth.submitting') : t('auth.submit')"
          />
        </UForm>

        <div
          v-if="demoAccounts"
          class="flex flex-col gap-3 border-t border-default pt-5"
        >
          <div class="flex flex-col gap-0.5">
            <h2 class="text-sm font-semibold text-highlighted">
              {{ t('auth.demoTitle') }}
            </h2>
            <p class="text-[13px] text-muted">
              {{ t('auth.demoHint') }}
            </p>
          </div>
          <ul class="grid grid-cols-2 gap-2">
            <li
              v-for="role in ROLES"
              :key="role"
            >
              <UButton
                color="neutral"
                variant="outline"
                block
                :disabled="submitting"
                :label="t(`roles.${role}`)"
                :aria-label="t('auth.demoAs', { role: t(`roles.${role}`) })"
                @click="signInAs(role)"
              />
            </li>
          </ul>
        </div>
      </section>
    </main>
  </div>
</template>
