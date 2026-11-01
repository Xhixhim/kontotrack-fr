<script setup lang="ts">
import axios from 'axios'
import { computed, nextTick, ref, watchEffect } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import OtpInput from '@/components/auth/OtpInput.vue'
import KtIcon from '@/components/ui/KtIcon.vue'
import LocaleToggle from '@/components/ui/LocaleToggle.vue'
import { useMessages } from '@/lib/locale'
import { authMessages } from '@/locales/auth'
import { useAuthStore } from '@/stores/auth'

type Step = 'credentials' | 'code'
type Problem = 'wrong' | 'throttled' | 'offline' | null

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const m = useMessages(authMessages)

const step = ref<Step>('credentials')
const email = ref('')
const password = ref('')
const remember = ref(false)
const showPassword = ref(false)
const showForgot = ref(false)
const code = ref('')
const recoveryCode = ref('')
const useRecovery = ref(false)
const isSubmitting = ref(false)
const problem = ref<Problem>(null)
const fieldErrors = ref<{ email?: string; password?: string; code?: string }>({})

const emailInput = ref<HTMLInputElement | null>(null)
const passwordInput = ref<HTMLInputElement | null>(null)
const recoveryInput = ref<HTMLInputElement | null>(null)
const otp = ref<InstanceType<typeof OtpInput> | null>(null)

const problemText = computed(() => {
  if (problem.value === 'wrong') return { title: m.value.wrongTitle, text: m.value.wrongText }
  if (problem.value === 'throttled') return { title: m.value.throttledTitle, text: m.value.throttledText }
  if (problem.value === 'offline') return { title: m.value.offlineTitle, text: m.value.offlineText }
  return null
})

watchEffect(() => {
  document.title = `${m.value.title} · KontoTrack`
})

/** Only same-site paths are accepted as a post-login destination. */
function destination() {
  const redirect = route.query.redirect
  return typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : { name: 'dashboard' }
}

function validateCredentials(): boolean {
  const errors: typeof fieldErrors.value = {}
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim())) errors.email = m.value.emailInvalid
  if (!password.value) errors.password = m.value.passwordRequired
  fieldErrors.value = errors
  if (errors.email) emailInput.value?.focus()
  else if (errors.password) passwordInput.value?.focus()
  return !errors.email && !errors.password
}

async function attempt(withCode: boolean): Promise<void> {
  problem.value = null
  isSubmitting.value = true
  try {
    await auth.login(
      email.value.trim(),
      password.value,
      withCode && !useRecovery.value ? code.value : undefined,
      withCode && useRecovery.value ? recoveryCode.value.trim() : undefined,
      remember.value,
    )
    await router.replace(destination())
  } catch (error) {
    handleError(error, withCode)
  } finally {
    isSubmitting.value = false
  }
}

function handleError(error: unknown, withCode: boolean): void {
  if (!axios.isAxiosError(error) || !error.response) {
    problem.value = 'offline'
    return
  }
  const status = error.response.status
  const data = error.response.data as { two_factor_required?: boolean; errors?: Record<string, string[]> } | undefined

  if (status === 429) {
    problem.value = 'throttled'
  } else if (status === 422 && data?.two_factor_required) {
    step.value = 'code'
    fieldErrors.value = {}
    nextTick(() => otp.value?.focus())
  } else if (status === 422 && withCode && data?.errors?.code) {
    fieldErrors.value = { code: useRecovery.value ? m.value.recoveryInvalid : m.value.codeInvalid }
    code.value = ''
    nextTick(() => (useRecovery.value ? recoveryInput.value?.select() : otp.value?.focus()))
  } else if (status === 422) {
    step.value = 'credentials'
    problem.value = 'wrong'
    nextTick(() => passwordInput.value?.select())
  } else {
    problem.value = 'offline'
  }
}

function submitCredentials(): void {
  if (validateCredentials()) attempt(false)
}

function submitCode(): void {
  if (!useRecovery.value && code.value.length !== 6) {
    fieldErrors.value = { code: m.value.codeIncomplete }
    otp.value?.focus()
    return
  }
  if (useRecovery.value && !recoveryCode.value.trim()) {
    fieldErrors.value = { code: m.value.codeIncomplete }
    recoveryInput.value?.focus()
    return
  }
  attempt(true)
}

function onOtpComplete(): void {
  if (!isSubmitting.value) submitCode()
}

function toggleRecovery(): void {
  useRecovery.value = !useRecovery.value
  fieldErrors.value = {}
  nextTick(() => (useRecovery.value ? recoveryInput.value?.focus() : otp.value?.focus()))
}

function backToCredentials(): void {
  step.value = 'credentials'
  code.value = ''
  recoveryCode.value = ''
  useRecovery.value = false
  fieldErrors.value = {}
  problem.value = null
  nextTick(() => passwordInput.value?.focus())
}
</script>

<template>
  <div class="login">
    <section class="form-side">
      <div class="top">
        <RouterLink class="brand" :to="{ name: 'landing' }" :aria-label="m.backHome"><span class="mark">KT</span><span class="kt-title-3">KontoTrack</span></RouterLink>
        <LocaleToggle />
      </div>

      <form v-if="step === 'credentials'" class="box" novalidate @submit.prevent="submitCredentials">
        <div class="heading">
          <h1 class="kt-heading-4">{{ m.title }}</h1>
          <p class="kt-body-6 kt-second">{{ m.intro }}</p>
        </div>

        <div v-if="problemText" class="kt-banner kt-banner--error" role="alert">
          <KtIcon name="warning-octagon" />
          <div><p class="kt-body-4">{{ problemText.title }}</p><p class="kt-body-6">{{ problemText.text }}</p></div>
        </div>

        <div class="kt-field">
          <label class="kt-label" for="login-email">{{ m.email }}</label>
          <input id="login-email" ref="emailInput" v-model="email" class="kt-input" type="email" autocomplete="username" required :aria-invalid="!!fieldErrors.email" aria-describedby="login-email-error" />
          <span v-if="fieldErrors.email" id="login-email-error" class="kt-field-error"><KtIcon name="warning-circle" :size="14" />{{ fieldErrors.email }}</span>
        </div>

        <div class="kt-field">
          <div class="row">
            <label class="kt-label" for="login-password">{{ m.password }}</label>
            <button type="button" class="text-link kt-caption-1" :aria-expanded="showForgot" aria-controls="forgot-help" @click="showForgot = !showForgot">{{ m.forgot }}</button>
          </div>
          <div class="password">
            <input id="login-password" ref="passwordInput" v-model="password" class="kt-input" :type="showPassword ? 'text' : 'password'" autocomplete="current-password" required :aria-invalid="!!fieldErrors.password" aria-describedby="login-password-error forgot-help" />
            <button type="button" class="reveal" :aria-label="showPassword ? m.hidePassword : m.showPassword" :aria-pressed="showPassword" @click="showPassword = !showPassword">
              <KtIcon :name="showPassword ? 'eye-slash' : 'eye'" :size="16" />
            </button>
          </div>
          <span v-if="fieldErrors.password" id="login-password-error" class="kt-field-error"><KtIcon name="warning-circle" :size="14" />{{ fieldErrors.password }}</span>
          <p v-show="showForgot" id="forgot-help" class="kt-caption-5 kt-muted">{{ m.forgotHelp }}</p>
        </div>

        <label class="check kt-body-6"><input v-model="remember" type="checkbox" />{{ m.remember }}</label>

        <button class="kt-btn kt-btn--primary kt-btn--lg submit" type="submit" :disabled="isSubmitting">
          <span v-if="isSubmitting" class="spinner" aria-hidden="true" />{{ isSubmitting ? m.submitting : m.submit }}
        </button>
      </form>

      <form v-else class="box" novalidate @submit.prevent="submitCode">
        <button type="button" class="text-link back kt-caption-1" @click="backToCredentials"><KtIcon name="arrow-left" :size="16" />{{ m.back }}</button>
        <div class="heading">
          <h1 class="kt-heading-4">{{ useRecovery ? m.recoveryTitle : m.codeTitle }}</h1>
          <p class="kt-body-6 kt-second">{{ useRecovery ? m.recoveryIntro : m.codeIntro(email.trim()) }}</p>
        </div>

        <div v-if="problemText" class="kt-banner kt-banner--error" role="alert">
          <KtIcon name="warning-octagon" />
          <div><p class="kt-body-4">{{ problemText.title }}</p><p class="kt-body-6">{{ problemText.text }}</p></div>
        </div>

        <OtpInput v-if="!useRecovery" ref="otp" v-model="code" :invalid="!!fieldErrors.code" :group-label="m.codeGroup" :digit-label="m.codeLabel" @complete="onOtpComplete" />
        <div v-else class="kt-field">
          <label class="kt-label" for="login-recovery">{{ m.recoveryLabel }}</label>
          <input id="login-recovery" ref="recoveryInput" v-model="recoveryCode" class="kt-input kt-num" autocomplete="off" maxlength="20" :aria-invalid="!!fieldErrors.code" aria-describedby="login-code-error" />
        </div>
        <span v-if="fieldErrors.code" id="login-code-error" class="kt-field-error" role="alert"><KtIcon name="warning-circle" :size="14" />{{ fieldErrors.code }}</span>

        <button class="kt-btn kt-btn--primary kt-btn--lg submit" type="submit" :disabled="isSubmitting">
          <span v-if="isSubmitting" class="spinner" aria-hidden="true" />{{ isSubmitting ? m.verifying : m.verify }}
        </button>
        <button type="button" class="text-link kt-caption-1" @click="toggleRecovery">{{ useRecovery ? m.useApp : m.useRecovery }}</button>
      </form>

      <p class="footnote kt-caption-5 kt-muted"><KtIcon name="shield-check" :size="14" />{{ m.footnote }}</p>
    </section>

    <aside class="side" aria-hidden="true">
      <h2 class="kt-heading-3"><template v-for="(line, index) in m.sideTitle" :key="line">{{ line }}<br v-if="index < m.sideTitle.length - 1" /></template></h2>
      <div class="today">
        <p class="kt-caption-3 today-label">{{ m.sideToday }}</p>
        <div v-for="item in m.sideItems" :key="item.business" class="item">
          <span class="sev" :class="item.severity"><KtIcon :name="item.severity === 'c' ? 'warning-octagon' : item.severity === 'w' ? 'warning' : 'check-circle'" :size="16" /></span>
          <div class="grow"><p class="kt-body-5">{{ item.business }}</p><p class="kt-caption-5 sub">{{ item.text }}</p></div>
        </div>
      </div>
      <p class="kt-caption-5 sub">{{ m.sideExample }}</p>
    </aside>
  </div>
</template>

<style scoped>
.login { display: grid; min-height: 100vh; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); color: var(--kt-text); background: var(--kt-canvas); font-family: var(--kt-font); -webkit-font-smoothing: antialiased; }
.login h1, .login h2, .login p { margin: 0; }
.login h1, .login h2 { color: var(--kt-heading); text-wrap: balance; }

.form-side { display: flex; flex-direction: column; padding: var(--kt-s-400) max(24px, env(safe-area-inset-right, 0px)) var(--kt-s-400) max(24px, env(safe-area-inset-left, 0px)); background: var(--kt-surface); }
.top { display: flex; align-items: center; justify-content: space-between; gap: var(--kt-s-200); }
.brand { display: flex; align-items: center; gap: var(--kt-s-75); color: var(--kt-heading); text-decoration: none; }
.brand:focus-visible { border-radius: var(--kt-r-8); outline: 2px solid var(--kt-focus); outline-offset: 2px; }
.mark { display: grid; width: 32px; height: 32px; place-items: center; border-radius: var(--kt-r-8); color: var(--kt-on-action); background: var(--kt-action); font: 600 12px/16px var(--kt-font); }

.box { display: flex; width: 100%; max-width: 400px; flex-direction: column; gap: var(--kt-s-300); margin: auto; padding-block: var(--kt-s-600); }
.heading { display: flex; flex-direction: column; gap: var(--kt-s-75); }
.row { display: flex; align-items: center; justify-content: space-between; gap: var(--kt-s-200); }
.text-link { display: inline-flex; align-items: center; gap: var(--kt-s-50); align-self: flex-start; padding: 0; border: 0; border-radius: var(--kt-r-4); color: var(--kt-link); background: none; cursor: pointer; }
.text-link:hover { text-decoration: underline; }
.text-link:focus-visible { outline: 2px solid var(--kt-focus); outline-offset: 2px; }
.password { position: relative; }
.password .kt-input { padding-right: 44px; }
.password .kt-input:focus, .password .kt-input[aria-invalid='true'] { padding-right: 43px; }
.reveal { position: absolute; top: 4px; right: 4px; display: grid; width: 32px; height: 32px; place-items: center; border: 0; border-radius: var(--kt-r-6); color: var(--kt-text-3); background: transparent; cursor: pointer; }
.reveal:hover { background: var(--kt-ghost-hover); }
.reveal:focus-visible { outline: 2px solid var(--kt-focus); }
.check { display: flex; align-items: center; gap: var(--kt-s-75); color: var(--kt-text); cursor: pointer; }
.check input { width: 16px; height: 16px; margin: 0; accent-color: var(--kt-action); }
.submit { width: 100%; }
.submit:disabled { color: var(--kt-on-action); background: var(--kt-action); opacity: 0.8; cursor: progress; }
.spinner { width: 16px; height: 16px; border: 2px solid color-mix(in srgb, var(--kt-on-action) 40%, transparent); border-top-color: var(--kt-on-action); border-radius: 50%; animation: spin 700ms linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.footnote { display: flex; align-items: center; justify-content: center; gap: var(--kt-s-50); }

.side { display: flex; flex-direction: column; justify-content: space-between; gap: var(--kt-s-600); padding: var(--kt-s-700) var(--kt-s-600); color: var(--kt-on-sidebar); background: var(--kt-sidebar); }
.login .side h2 { max-width: 480px; color: var(--kt-on-sidebar-strong); }
.today { display: flex; flex-direction: column; gap: var(--kt-s-75); padding: var(--kt-s-200); border: 1px solid rgb(255 255 255 / 8%); border-radius: var(--kt-r-16); background: rgb(0 0 0 / 22%); }
.today-label { padding: var(--kt-s-50) var(--kt-s-100); }
.item { display: flex; align-items: center; gap: var(--kt-s-100); padding: var(--kt-s-100); border-radius: var(--kt-r-8); color: var(--kt-on-sidebar-strong); background: rgb(255 255 255 / 4%); }
.grow { flex: 1; min-width: 0; }
.sub { color: var(--kt-on-sidebar); }
.sev { display: grid; flex: none; width: 28px; height: 28px; place-items: center; border-radius: var(--kt-r-full); }
/* Fixed dark-panel tints: the sidebar stays dark in both themes, so these do not switch with the theme. */
.sev.c { color: #dd8379; background: #421713; }
.sev.w { color: #ddae55; background: #3a2709; }
.sev.o { color: #80b593; background: #15281d; }

@media (max-width: 900px) {
  .login { grid-template-columns: 1fr; }
  .side { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .spinner { animation-duration: 1.6s; }
}
</style>
