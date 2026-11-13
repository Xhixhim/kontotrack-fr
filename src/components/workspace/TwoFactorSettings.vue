<script setup lang="ts">
import { tr } from '@/lib/tr'
import { ref } from 'vue'
import api from '@/lib/api'
import { getApiError } from '@/lib/format'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const setup = ref<{ secret: string; otpauth_uri: string } | null>(null)
const recoveryCodes = ref<string[]>([])
const code = ref('')
const disableForm = ref({ password: '', code: '' })
const showDisable = ref(false)
const saving = ref(false)
const error = ref('')

async function run(action: () => Promise<void>, fallback: string): Promise<void> {
  saving.value = true
  error.value = ''

  try {
    await action()
  } catch (caught: unknown) {
    error.value = getApiError(caught, fallback)
  } finally {
    saving.value = false
  }
}

function begin(): Promise<void> {
  return run(async () => {
    const response = await api.post<{ data: { secret: string; otpauth_uri: string } }>('/api/v1/me/two-factor')
    setup.value = response.data.data
  }, tr('We could not start two-factor setup.'))
}

function confirm(): Promise<void> {
  return run(async () => {
    const response = await api.post<{ data: { recovery_codes: string[] } }>('/api/v1/me/two-factor/confirm', { code: code.value })
    recoveryCodes.value = response.data.data.recovery_codes
    setup.value = null
    code.value = ''
    await auth.fetchUser()
  }, tr('That code is not valid.'))
}

function disable(): Promise<void> {
  return run(async () => {
    await api.delete('/api/v1/me/two-factor', { data: disableForm.value })
    disableForm.value = { password: '', code: '' }
    showDisable.value = false
    recoveryCodes.value = []
    await auth.fetchUser()
  }, tr('We could not turn off two-factor sign-in.'))
}
</script>

<template>
  <section class="two-factor-card" aria-labelledby="two-factor-heading">
    <div class="two-factor-heading">
      <div><p class="eyebrow">{{ tr('Account security') }}</p><h2 id="two-factor-heading">{{ tr('Two-factor sign-in') }}</h2></div>
      <span class="severity-chip" :class="auth.user?.two_factor_enabled ? 'ok' : 'warning'">{{ auth.user?.two_factor_enabled ? tr('On') : tr('Off') }}</span>
    </div>
    <p class="form-note">{{ tr('With two-factor sign-in, signing in also needs a code from an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password…), so a stolen password alone is not enough.') }}</p>
    <p v-if="error" class="error-text" role="alert">{{ error }}</p>

    <div v-if="recoveryCodes.length" class="recovery-codes">
      <strong>{{ tr('Save these recovery codes now.') }}</strong>
      <p class="form-note">{{ tr('Each code works once if you lose your phone. They will not be shown again.') }}</p>
      <ul><li v-for="recovery in recoveryCodes" :key="recovery"><code>{{ recovery }}</code></li></ul>
    </div>

    <template v-if="!auth.user?.two_factor_enabled">
      <button v-if="!setup" class="primary-button" type="button" :disabled="saving" @click="begin">{{ tr('Turn on') }}</button>
      <form v-else class="entry-form" @submit.prevent="confirm">
        <ol class="setup-steps">
          <li>{{ tr('In your authenticator app, add an account by entering this key:') }} <code class="secret">{{ setup.secret }}</code> <span class="form-note">{{ tr('(or open') }} <a :href="setup.otpauth_uri">{{ tr('this link') }}</a> {{ tr('on the phone with the app).') }}</span></li>
          <li>{{ tr('Enter the 6-digit code the app shows.') }}</li>
        </ol>
        <label>{{ tr('Code') }}<input v-model.trim="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" required /></label>
        <div class="form-footer"><button class="text-button" type="button" @click="setup = null">{{ tr('Cancel') }}</button><button class="primary-button" type="submit" :disabled="saving">{{ tr('Confirm') }}</button></div>
      </form>
    </template>
    <template v-else>
      <button v-if="!showDisable" class="text-button" type="button" @click="showDisable = true">{{ tr('Turn off') }}</button>
      <form v-else class="entry-form" @submit.prevent="disable">
        <label>{{ tr('Password') }}<input v-model="disableForm.password" type="password" autocomplete="current-password" required /></label>
        <label>{{ tr('Code from your app') }}<input v-model.trim="disableForm.code" inputmode="numeric" maxlength="6" required /></label>
        <div class="form-footer"><button class="text-button" type="button" @click="showDisable = false">{{ tr('Cancel') }}</button><button class="primary-button" type="submit" :disabled="saving">{{ tr('Turn off two-factor') }}</button></div>
      </form>
    </template>
  </section>
</template>

<style scoped>
.two-factor-card { margin-top: 24px; padding: 24px; border: 1px solid #e0e8df; border-radius: 18px; background: #fff; }
.two-factor-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.two-factor-heading h2 { margin: 0; font-size: 18px; }
.setup-steps { display: grid; gap: 8px; padding-left: 18px; font-size: 13px; }
.secret { padding: 2px 6px; border-radius: 6px; background: #f4f7f4; font-size: 13px; letter-spacing: .08em; word-break: break-all; }
.recovery-codes { margin: 12px 0; padding: 14px; border: 1px solid #ecd6a8; border-radius: 10px; background: #fdf9ef; }
.recovery-codes ul { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 6px; margin: 8px 0 0; padding: 0; list-style: none; }
.entry-form label { display: grid; gap: 4px; max-width: 280px; font-size: 13px; }
</style>
