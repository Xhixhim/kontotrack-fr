<script setup lang="ts">
import axios from 'axios'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const email = ref('')
const password = ref('')
const errorMessage = ref('')
const needsCode = ref(false)
const useRecoveryCode = ref(false)
const code = ref('')
const recoveryCode = ref('')
const isSubmitting = ref(false)

async function submit(): Promise<void> {
  errorMessage.value = ''
  isSubmitting.value = true

  try {
    await auth.login(email.value, password.value, needsCode.value && !useRecoveryCode.value ? code.value : undefined, needsCode.value && useRecoveryCode.value ? recoveryCode.value : undefined)
    await router.replace({ name: 'dashboard' })
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const data = error.response?.data as { two_factor_required?: boolean; errors?: Record<string, string[]> } | undefined

      if (error.response?.status === 422 && data?.two_factor_required) {
        needsCode.value = true
        errorMessage.value = ''
      } else if (error.response?.status === 422 && needsCode.value && data?.errors?.code) {
        errorMessage.value = 'That code is not valid. Try the newest code from your app.'
      } else {
        errorMessage.value = error.response?.status === 422
          ? 'Check your email and password, then try again.'
          : 'Could not reach the KontoTrack API. Check that the backend is running.'
      }
    } else {
      errorMessage.value = 'Sign in failed. Please try again.'
    }
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <main class="auth-shell">
    <section class="auth-card" aria-labelledby="login-title">
      <div class="brand-mark" aria-hidden="true">K</div>
      <p class="eyebrow">KontoTrack workspace</p>
      <h1 id="login-title">Welcome back</h1>
      <p class="intro">Sign in to continue to your bookkeeping workspace.</p>

      <form class="login-form" @submit.prevent="submit">
        <label for="email">Email address</label>
        <input id="email" v-model="email" type="email" autocomplete="username" required />

        <label for="password">Password</label>
        <input id="password" v-model="password" type="password" autocomplete="current-password" required />

        <template v-if="needsCode">
          <label v-if="!useRecoveryCode" for="code">6-digit code from your authenticator app</label>
          <input v-if="!useRecoveryCode" id="code" v-model.trim="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" required />
          <label v-if="useRecoveryCode" for="recovery-code">Recovery code</label>
          <input v-if="useRecoveryCode" id="recovery-code" v-model.trim="recoveryCode" autocomplete="off" maxlength="20" required />
          <button class="link-button" type="button" @click="useRecoveryCode = !useRecoveryCode">{{ useRecoveryCode ? 'Use the authenticator app instead' : 'Use a recovery code instead' }}</button>
        </template>

        <p v-if="errorMessage" class="error-message" role="alert">{{ errorMessage }}</p>

        <button class="primary-button" type="submit" :disabled="isSubmitting">
          {{ isSubmitting ? 'Signing in…' : 'Sign in' }}
        </button>
      </form>
      <p class="footnote">Accounts are created by your bookkeeper.</p>
    </section>
  </main>
</template>

<style scoped>
.link-button { justify-self: start; padding: 0; border: 0; color: #2f5a41; background: none; cursor: pointer; font: inherit; font-size: 13px; text-decoration: underline; }
.auth-shell { display: grid; min-height: 100vh; place-items: center; padding: 24px; }
.auth-card { width: min(100%, 440px); padding: 40px; border: 1px solid #e2e8e2; border-radius: 20px; background: #fff; box-shadow: 0 22px 60px #24382c12; }
.brand-mark { display: grid; width: 44px; height: 44px; place-items: center; border-radius: 14px; color: #fff; background: #245c45; font-size: 20px; font-weight: 700; }
.eyebrow { margin: 26px 0 8px; color: #527360; font-size: 12px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
h1 { margin: 0; color: #18231e; font-size: 30px; letter-spacing: -.04em; }
.intro { margin: 10px 0 28px; color: #69776f; line-height: 1.55; }
.login-form { display: grid; gap: 10px; }
label { margin-top: 8px; color: #34453b; font-size: 13px; font-weight: 650; }
input { width: 100%; min-height: 46px; padding: 0 13px; border: 1px solid #d9e1da; border-radius: 10px; outline: none; }
input:focus { border-color: #39805d; box-shadow: 0 0 0 3px #39805d1a; }
.primary-button { min-height: 48px; margin-top: 12px; border: 0; border-radius: 10px; color: #fff; background: #245c45; font-weight: 700; }
.primary-button:hover { background: #194b36; }
.primary-button:disabled { cursor: wait; opacity: .7; }
.error-message { margin: 2px 0 0; color: #b42318; font-size: 13px; }
.footnote { margin: 20px 0 0; color: #849087; font-size: 12px; text-align: center; }
@media (max-width: 480px) { .auth-card { padding: 28px 22px; } }
</style>
