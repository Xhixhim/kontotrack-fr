<script setup lang="ts">
import { ref } from 'vue'
import api from '@/lib/api'
import { getApiError } from '@/lib/format'
import { useMessages } from '@/lib/locale'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const m = useMessages({
  sq: {
    eyebrow: 'Njoftimet',
    title: 'Kujtesa me email',
    note: 'Çdo mëngjes, kur ka diçka të re: afate që afrohen ose kanë kaluar, dokumente të kërkuara dhe miratime që presin. Lista e pandryshuar përsëritet një herë në javë.',
    on: 'Më dërgo kujtesa me email',
    failed: 'Ndryshimi nuk u ruajt.',
  },
  en: {
    eyebrow: 'Notifications',
    title: 'Reminder emails',
    note: 'Each morning when something is new: deadlines that are close or overdue, requested documents and approvals that are waiting. An unchanged list is repeated once a week.',
    on: 'Send me reminder emails',
    failed: 'The change was not saved.',
  },
})
const saving = ref(false)
const error = ref('')

async function toggle(event: Event): Promise<void> {
  const enabled = (event.target as HTMLInputElement).checked
  saving.value = true
  error.value = ''
  try {
    await api.put('/api/v1/me/preferences', { email_notifications: enabled })
    if (auth.user) auth.user.email_notifications = enabled
  } catch (caught: unknown) {
    error.value = getApiError(caught, m.value.failed)
    ;(event.target as HTMLInputElement).checked = !enabled
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="reminder-card" aria-labelledby="reminder-heading">
    <p class="eyebrow">{{ m.eyebrow }}</p>
    <h2 id="reminder-heading">{{ m.title }}</h2>
    <p class="form-note">{{ m.note }}</p>
    <label class="reminder-toggle"><input type="checkbox" :checked="auth.user?.email_notifications !== false" :disabled="saving" @change="toggle" />{{ m.on }}</label>
    <p v-if="error" class="error-text" role="alert">{{ error }}</p>
  </section>
</template>

<style scoped>
.reminder-card { margin-top: 24px; padding: 24px; border: 1px solid #e0e8df; border-radius: 18px; background: #fff; }
.reminder-card h2 { margin: 0; font-size: 18px; }
.reminder-toggle { display: flex; align-items: center; gap: 8px; font-size: 13px; }
</style>
