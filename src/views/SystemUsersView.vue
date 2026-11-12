<script setup lang="ts">
import { onMounted, ref, watchEffect } from 'vue'
import { RouterLink } from 'vue-router'
import api from '@/lib/api'
import { getApiError } from '@/lib/format'
import { useMessages } from '@/lib/locale'
import { accountMessages } from '@/locales/account'
import { useAuthStore } from '@/stores/auth'

interface SystemUser {
  id: number
  name: string
  email: string
  is_system_admin: boolean
  is_active: boolean
  has_signed_in: boolean
  two_factor_enabled: boolean
  businesses_count: number
}

const auth = useAuthStore()
const m = useMessages(accountMessages)
const users = ref<SystemUser[]>([])
const loading = ref(true)
const saving = ref(false)
const pageError = ref('')
const formError = ref('')
const form = ref({ name: '', email: '', is_system_admin: false })

watchEffect(() => {
  document.title = `${m.value.usersTitle} · KontoTrack`
})

async function load(): Promise<void> {
  try {
    const response = await api.get<{ data: SystemUser[] }>('/api/v1/admin/users')
    users.value = response.data.data
  } catch (caught: unknown) {
    pageError.value = getApiError(caught, m.value.usersLoadFailed)
  } finally {
    loading.value = false
  }
}

async function create(): Promise<void> {
  saving.value = true
  formError.value = ''
  try {
    const response = await api.post<{ data: SystemUser }>('/api/v1/admin/users', form.value)
    users.value = [...users.value, response.data.data].sort((left, right) => left.name.localeCompare(right.name))
    form.value = { name: '', email: '', is_system_admin: false }
  } catch (caught: unknown) {
    formError.value = getApiError(caught, m.value.usersSaveFailed)
  } finally {
    saving.value = false
  }
}

async function update(user: SystemUser, changes: { is_active?: boolean; is_system_admin?: boolean }): Promise<void> {
  if (changes.is_active === false && !window.confirm(m.value.usersConfirmDeactivate(user.name))) return
  saving.value = true
  pageError.value = ''
  try {
    const response = await api.put<{ data: SystemUser }>(`/api/v1/admin/users/${user.id}`, changes)
    users.value = users.value.map((existing) => (existing.id === user.id ? response.data.data : existing))
  } catch (caught: unknown) {
    pageError.value = getApiError(caught, m.value.usersSaveFailed)
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <main class="users-shell">
    <header class="topbar">
      <RouterLink class="back-link" :to="{ name: 'dashboard' }">{{ m.usersBack }}</RouterLink>
      <span class="product-label">KontoTrack</span>
    </header>

    <section class="page-heading">
      <p class="eyebrow">{{ m.usersEyebrow }}</p>
      <h1>{{ m.usersTitle }}</h1>
      <p>{{ m.usersIntro }}</p>
    </section>

    <p v-if="pageError" class="feedback error" role="alert">{{ pageError }}</p>

    <section class="content-panel">
      <h2>{{ m.usersNew }}</h2>
      <p class="form-note">{{ m.usersNewNote }}</p>
      <form class="entry-form" @submit.prevent="create">
        <div class="fields-grid">
          <label>{{ m.name }}<input v-model.trim="form.name" required maxlength="255" autocomplete="off" /></label>
          <label>{{ m.email }}<input v-model.trim="form.email" type="email" required maxlength="255" autocomplete="off" /></label>
        </div>
        <label class="check"><input v-model="form.is_system_admin" type="checkbox" />{{ m.administrator }}</label>
        <p v-if="formError" class="error-text" role="alert">{{ formError }}</p>
        <div class="form-footer"><button class="primary-button" type="submit" :disabled="saving">{{ m.usersCreate }}</button></div>
      </form>
    </section>

    <section class="content-panel">
      <p v-if="!loading && !users.length" class="empty-message">{{ m.usersEmpty }}</p>
      <article v-for="user in users" :key="user.id" class="user-row" :class="{ inactive: !user.is_active }">
        <div class="user-main">
          <strong>{{ user.name }}<span v-if="user.id === auth.user?.id" class="you"> ({{ m.usersYou }})</span></strong>
          <span>{{ user.email }} · {{ m.usersBusinesses(user.businesses_count) }}<template v-if="!user.has_signed_in"> · {{ m.usersNeverSignedIn }}</template><template v-if="user.two_factor_enabled"> · {{ m.usersTwoFactor }}</template></span>
        </div>
        <span v-if="user.is_system_admin" class="status-chip admin">{{ m.administrator }}</span>
        <span class="status-chip" :class="{ off: !user.is_active }">{{ user.is_active ? m.usersActive : m.usersDeactivated }}</span>
        <div v-if="user.id !== auth.user?.id" class="user-actions">
          <button class="text-button" type="button" :disabled="saving" @click="update(user, { is_system_admin: !user.is_system_admin })">{{ user.is_system_admin ? m.usersRemoveAdmin : m.usersMakeAdmin }}</button>
          <button class="text-button" :class="{ danger: user.is_active }" type="button" :disabled="saving" @click="update(user, { is_active: !user.is_active })">{{ user.is_active ? m.usersDeactivate : m.usersReactivate }}</button>
        </div>
      </article>
    </section>
  </main>
</template>

<style scoped>
.users-shell { width: min(100% - 32px, 980px); margin: 0 auto; padding-bottom: 60px; color: #23352b; }
.topbar { display: flex; height: 68px; align-items: center; justify-content: space-between; border-bottom: 1px solid #e1e8e1; }
.back-link { color: #42644f; font-size: 13px; font-weight: 650; text-decoration: none; }
.product-label { color: #20382b; font-size: 14px; font-weight: 750; }
.page-heading { padding: 34px 0 24px; }
.eyebrow { margin: 0 0 7px; color: #527360; font-size: 11px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
h1 { margin: 0; color: #18231e; font-size: clamp(25px, 4vw, 34px); }
.page-heading > p:last-child, .form-note { color: #6e7c72; font-size: 13px; line-height: 1.55; }
.content-panel { margin-top: 18px; padding: 22px; border: 1px solid #e0e8df; border-radius: 15px; background: #fff; }
.content-panel h2 { margin: 0; color: #20382b; font-size: 21px; }
.entry-form { margin-top: 12px; padding: 18px; border: 1px solid #dfe9df; border-radius: 12px; background: #f9fbf9; }
.fields-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
label { display: grid; gap: 6px; color: #45594c; font-size: 12px; font-weight: 650; }
label input:not([type='checkbox']) { width: 100%; min-width: 0; min-height: 40px; padding: 8px 10px; border: 1px solid #d8e1d9; border-radius: 8px; color: #27392f; background: #fff; font: inherit; font-weight: 400; }
label.check { display: flex; align-items: center; gap: 8px; margin-top: 14px; }
.form-footer { display: flex; justify-content: flex-end; margin-top: 16px; }
.primary-button { min-height: 40px; padding: 0 15px; border: 0; border-radius: 9px; color: #fff; background: #245c45; cursor: pointer; font: inherit; font-size: 13px; font-weight: 700; }
.primary-button:disabled, .text-button:disabled { cursor: not-allowed; opacity: .55; }
.text-button { padding: 6px; border: 0; color: #245c45; background: transparent; cursor: pointer; font: inherit; font-size: 12px; font-weight: 700; }
.text-button.danger { color: #9b352b; }
.error-text, .feedback.error { color: #9b352b; font-size: 12px; }
.user-row { display: grid; grid-template-columns: minmax(0, 1fr) auto auto auto; align-items: center; gap: 14px; padding: 14px 0; border-bottom: 1px solid #edf1ed; }
.user-row:last-child { border-bottom: 0; }
.user-row.inactive .user-main { opacity: .6; }
.user-main { display: grid; min-width: 0; gap: 4px; }
.user-main strong { color: #2a4033; font-size: 13px; overflow-wrap: anywhere; }
.user-main span { color: #77837b; font-size: 12px; overflow-wrap: anywhere; }
.user-main .you { font-weight: 400; }
.user-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 6px; }
.status-chip { padding: 5px 8px; border-radius: 999px; color: #42644f; background: #edf5ef; font-size: 10px; font-weight: 700; white-space: nowrap; }
.status-chip.admin { color: #334b73; background: #edf1f8; }
.status-chip.off { color: #8a4b2a; background: #fbeee6; }
.empty-message { color: #77837b; font-size: 13px; }
@media (max-width: 640px) { .content-panel { padding: 16px; } .fields-grid { grid-template-columns: 1fr; } .user-row { grid-template-columns: minmax(0, 1fr) auto; } .user-actions { grid-column: 1 / -1; justify-content: flex-start; } }
</style>
