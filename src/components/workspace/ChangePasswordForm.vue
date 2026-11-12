<script setup lang="ts">
import { ref } from 'vue'
import api from '@/lib/api'
import { getApiError } from '@/lib/format'
import { useMessages } from '@/lib/locale'
import { accountMessages } from '@/locales/account'

const m = useMessages(accountMessages)
const open = ref(false)
const form = ref({ current_password: '', password: '', password_confirmation: '' })
const saving = ref(false)
const error = ref('')
const done = ref(false)

async function submit(): Promise<void> {
  error.value = ''
  done.value = false
  if (form.value.password !== form.value.password_confirmation) {
    error.value = m.value.mismatch
    return
  }
  saving.value = true
  try {
    await api.put('/api/v1/me/password', form.value)
    form.value = { current_password: '', password: '', password_confirmation: '' }
    open.value = false
    done.value = true
  } catch (caught: unknown) {
    error.value = getApiError(caught, m.value.changeFailed)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="password-card" aria-labelledby="change-password-heading">
    <div class="password-heading">
      <div><p class="eyebrow">{{ m.changeEyebrow }}</p><h2 id="change-password-heading">{{ m.changeTitle }}</h2></div>
      <button v-if="!open" class="text-button" type="button" @click="((open = true), (done = false))">{{ m.changeSubmit }}</button>
    </div>
    <p v-if="done" class="form-note" role="status">{{ m.changeDone }} {{ m.changeNote }}</p>
    <form v-if="open" class="entry-form" @submit.prevent="submit">
      <p class="form-note">{{ m.changeNote }}</p>
      <p v-if="error" class="error-text" role="alert">{{ error }}</p>
      <label>{{ m.currentPassword }}<input v-model="form.current_password" type="password" autocomplete="current-password" required /></label>
      <label>{{ m.newPassword }}<input v-model="form.password" type="password" autocomplete="new-password" minlength="10" required /><small class="form-note">{{ m.passwordHint }}</small></label>
      <label>{{ m.confirmPassword }}<input v-model="form.password_confirmation" type="password" autocomplete="new-password" required /></label>
      <div class="form-footer"><button class="text-button" type="button" @click="open = false">{{ m.cancel }}</button><button class="primary-button" type="submit" :disabled="saving">{{ m.changeSubmit }}</button></div>
    </form>
  </section>
</template>

<style scoped>
.password-card { margin-top: 24px; padding: 24px; border: 1px solid #e0e8df; border-radius: 18px; background: #fff; }
.password-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.password-heading h2 { margin: 0; font-size: 18px; }
.entry-form { display: grid; gap: 12px; }
.entry-form label { display: grid; gap: 4px; max-width: 280px; font-size: 13px; }
.entry-form input { min-height: 40px; padding: 8px 10px; border: 1px solid #d8e1d9; border-radius: 8px; font: inherit; }
.entry-form .form-note { margin: 0; }
</style>
