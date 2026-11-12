<script setup lang="ts">
import axios from 'axios'
import { computed, ref, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import KtIcon from '@/components/ui/KtIcon.vue'
import LocaleToggle from '@/components/ui/LocaleToggle.vue'
import api, { initializeCsrf } from '@/lib/api'
import { useMessages } from '@/lib/locale'
import { accountMessages } from '@/locales/account'

const route = useRoute()
const m = useMessages(accountMessages)

/** `/forgot-password` asks for the link; `/reset-password?token=…&email=…` (opened from the email) sets the password. */
const mode = computed<'forgot' | 'reset'>(() => (route.name === 'reset-password' ? 'reset' : 'forgot'))
const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''))
const linkEmail = computed(() => (typeof route.query.email === 'string' ? route.query.email : ''))
const invited = computed(() => route.query.invited === '1')
const linkBroken = computed(() => mode.value === 'reset' && (!token.value || !linkEmail.value))

const email = ref(typeof route.query.email === 'string' ? route.query.email : '')
const password = ref('')
const confirmation = ref('')
const showPassword = ref(false)
const submitting = ref(false)
const done = ref(false)
const error = ref('')

const title = computed(() => (mode.value === 'forgot' ? m.value.forgotTitle : invited.value ? m.value.invitedTitle : m.value.resetTitle))

watchEffect(() => {
  document.title = `${title.value} · KontoTrack`
})

function explain(caught: unknown): string {
  if (!axios.isAxiosError(caught) || !caught.response) return m.value.failed
  if (caught.response.status === 429) return m.value.throttled
  const errors = (caught.response.data as { errors?: Record<string, string[]> } | undefined)?.errors
  if (errors?.password) return m.value.tooWeak
  return Object.values(errors ?? {})[0]?.[0] ?? m.value.failed
}

async function submit(): Promise<void> {
  error.value = ''
  if (mode.value === 'reset' && password.value !== confirmation.value) {
    error.value = m.value.mismatch
    return
  }
  submitting.value = true
  try {
    await initializeCsrf()
    if (mode.value === 'forgot') {
      await api.post('/api/v1/forgot-password', { email: email.value.trim() })
    } else {
      await api.post('/api/v1/reset-password', { email: linkEmail.value, token: token.value, password: password.value, password_confirmation: confirmation.value })
    }
    done.value = true
  } catch (caught) {
    error.value = explain(caught)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <main class="reset">
    <div class="top">
      <RouterLink class="brand" :to="{ name: 'landing' }"><span class="mark">KT</span><span class="kt-title-3">KontoTrack</span></RouterLink>
      <LocaleToggle />
    </div>

    <form class="box" novalidate @submit.prevent="submit">
      <RouterLink class="text-link kt-caption-1" :to="{ name: 'login' }"><KtIcon name="arrow-left" :size="16" />{{ m.backToSignIn }}</RouterLink>
      <div class="heading">
        <h1 class="kt-heading-4">{{ title }}</h1>
        <p v-if="!done && !linkBroken" class="kt-body-6 kt-second">{{ mode === 'forgot' ? m.forgotIntro : m.resetIntro(linkEmail) }}</p>
      </div>

      <div v-if="linkBroken" class="kt-banner kt-banner--error" role="alert">
        <KtIcon name="warning-octagon" />
        <div><p class="kt-body-6">{{ m.linkBroken }}</p></div>
      </div>
      <RouterLink v-if="linkBroken" class="kt-btn kt-btn--secondary kt-btn--lg" :to="{ name: 'forgot-password' }">{{ m.requestNewLink }}</RouterLink>

      <template v-else-if="done">
        <div class="kt-banner kt-banner--info" role="status">
          <KtIcon name="check-circle" />
          <div><p class="kt-body-6">{{ mode === 'forgot' ? m.forgotSent : m.resetDone }}</p></div>
        </div>
        <RouterLink v-if="mode === 'reset'" class="kt-btn kt-btn--primary kt-btn--lg" :to="{ name: 'login' }">{{ m.signIn }}</RouterLink>
      </template>

      <template v-else>
        <div v-if="error" class="kt-banner kt-banner--error" role="alert">
          <KtIcon name="warning-octagon" />
          <div>
            <p class="kt-body-6">{{ error }}</p>
            <RouterLink v-if="mode === 'reset'" class="text-link kt-caption-1" :to="{ name: 'forgot-password', query: { email: linkEmail } }">{{ m.requestNewLink }}</RouterLink>
          </div>
        </div>

        <div v-if="mode === 'forgot'" class="kt-field">
          <label class="kt-label" for="reset-email">{{ m.email }}</label>
          <input id="reset-email" v-model="email" class="kt-input" type="email" autocomplete="username" required />
        </div>

        <template v-else>
          <div class="kt-field">
            <label class="kt-label" for="reset-password">{{ m.newPassword }}</label>
            <div class="password">
              <input id="reset-password" v-model="password" class="kt-input" :type="showPassword ? 'text' : 'password'" autocomplete="new-password" minlength="10" required aria-describedby="reset-password-hint" />
              <button type="button" class="reveal" :aria-pressed="showPassword" :aria-label="m.newPassword" @click="showPassword = !showPassword"><KtIcon :name="showPassword ? 'eye-slash' : 'eye'" :size="16" /></button>
            </div>
            <p id="reset-password-hint" class="kt-caption-5 kt-muted">{{ m.passwordHint }}</p>
          </div>
          <div class="kt-field">
            <label class="kt-label" for="reset-confirmation">{{ m.confirmPassword }}</label>
            <input id="reset-confirmation" v-model="confirmation" class="kt-input" :type="showPassword ? 'text' : 'password'" autocomplete="new-password" required />
          </div>
        </template>

        <button class="kt-btn kt-btn--primary kt-btn--lg" type="submit" :disabled="submitting">{{ submitting ? m.sending : mode === 'forgot' ? m.forgotSubmit : m.resetSubmit }}</button>
      </template>
    </form>
  </main>
</template>

<style scoped>
.reset { display: flex; min-height: 100vh; flex-direction: column; padding: var(--kt-s-400) 24px; color: var(--kt-text); background: var(--kt-surface); font-family: var(--kt-font); -webkit-font-smoothing: antialiased; }
.reset h1, .reset p { margin: 0; }
.reset h1 { color: var(--kt-heading); text-wrap: balance; }
.top { display: flex; align-items: center; justify-content: space-between; gap: var(--kt-s-200); }
.brand { display: flex; align-items: center; gap: var(--kt-s-75); color: var(--kt-heading); text-decoration: none; }
.mark { display: grid; width: 32px; height: 32px; place-items: center; border-radius: var(--kt-r-8); color: var(--kt-on-action); background: var(--kt-action); font: 600 12px/16px var(--kt-font); }
.box { display: flex; width: 100%; max-width: 400px; flex-direction: column; gap: var(--kt-s-300); margin: auto; padding-block: var(--kt-s-600); }
.heading { display: flex; flex-direction: column; gap: var(--kt-s-75); }
.text-link { display: inline-flex; align-items: center; gap: var(--kt-s-50); align-self: flex-start; border-radius: var(--kt-r-4); color: var(--kt-link); text-decoration: none; }
.text-link:hover { text-decoration: underline; }
.text-link:focus-visible, .brand:focus-visible { outline: 2px solid var(--kt-focus); outline-offset: 2px; }
.password { position: relative; }
.password .kt-input { padding-right: 44px; }
.reveal { position: absolute; top: 4px; right: 4px; display: grid; width: 32px; height: 32px; place-items: center; border: 0; border-radius: var(--kt-r-6); color: var(--kt-text-3); background: transparent; cursor: pointer; }
.reveal:hover { background: var(--kt-ghost-hover); }
.reveal:focus-visible { outline: 2px solid var(--kt-focus); }
.kt-btn { justify-content: center; text-decoration: none; }
</style>
