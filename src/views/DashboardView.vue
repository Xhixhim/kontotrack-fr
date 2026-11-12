<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/lib/api'
import NotificationBell from '@/components/workspace/NotificationBell.vue'
import ChangePasswordForm from '@/components/workspace/ChangePasswordForm.vue'
import TwoFactorSettings from '@/components/workspace/TwoFactorSettings.vue'

interface Business {
  id: number
  legal_name: string
  trade_name: string | null
  nui: string
  legal_form: string | null
  vat_status: string
  municipality: string | null
  currency: string
  role: string | null
}

interface BusinessResponse {
  data: Business[]
}

interface BusinessMember {
  id: number
  name: string
  role: string
}

interface BusinessInvitation {
  id: number
  legal_name: string
  trade_name: string | null
  role: string
  invited_at: string
}

interface ChatMessage {
  id: number
  body: string
  sender: { id: number; name: string }
  created_at: string
}

interface BusinessDocument {
  id: number
  category: string
  original_name: string
  mime_type: string | null
  size_bytes: number | null
  created_at: string
}

const auth = useAuthStore()
const router = useRouter()
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
const businesses = ref<Business[]>([])
const invitations = ref<BusinessInvitation[]>([])
const invitationError = ref('')
const acceptingInvitationId = ref<number | null>(null)
const loadingBusinesses = ref(true)
const businessError = ref('')
const showBusinessForm = ref(false)
const savingBusiness = ref(false)
const formError = ref('')
const uploadingBusinessId = ref<number | null>(null)
const uploadMessages = ref<Record<number, string>>({})
const businessDocuments = ref<Record<number, BusinessDocument[]>>({})
const documentsExpanded = ref<Record<number, boolean>>({})
const documentsLoading = ref<Record<number, boolean>>({})
const documentsError = ref<Record<number, string>>({})
const chatBusiness = ref<Business | null>(null)
const chatMembers = ref<BusinessMember[]>([])
const chatMemberId = ref<number | null>(null)
const chatConversationId = ref<number | null>(null)
const chatMessages = ref<ChatMessage[]>([])
const chatBody = ref('')
const chatLoading = ref(false)
const chatError = ref('')
const form = ref({ legal_name: '', trade_name: '', nui: '', municipality: '', vat_status: 'unknown' })

onMounted(async () => {
  try {
    const response = await api.get<BusinessResponse>('/api/v1/businesses')
    businesses.value = response.data.data
  } catch {
    businessError.value = 'We could not load your businesses. Please refresh the page.'
  } finally {
    loadingBusinesses.value = false
  }

  try {
    const response = await api.get<{ data: BusinessInvitation[] }>('/api/v1/me/business-invitations')
    invitations.value = response.data.data
  } catch {
    invitationError.value = 'We could not load your business invitations.'
  }
})

async function signOut(): Promise<void> {
  await auth.logout()
  await router.replace({ name: 'login' })
}

async function createBusiness(): Promise<void> {
  savingBusiness.value = true
  formError.value = ''

  try {
    const response = await api.post<{ data: Business }>('/api/v1/businesses', form.value)
    businesses.value = [...businesses.value, response.data.data]
    showBusinessForm.value = false
    form.value = { legal_name: '', trade_name: '', nui: '', municipality: '', vat_status: 'unknown' }
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'response' in error) {
      const response = error.response as { data?: { message?: string; errors?: Record<string, string[]> } }
      formError.value = Object.values(response.data?.errors ?? {})[0]?.[0] ?? response.data?.message ?? 'We could not save this business.'
    } else {
      formError.value = 'We could not save this business. Please try again.'
    }
  } finally {
    savingBusiness.value = false
  }
}

async function acceptInvitation(invitation: BusinessInvitation): Promise<void> {
  acceptingInvitationId.value = invitation.id
  invitationError.value = ''
  try {
    await api.post(`/api/v1/businesses/${invitation.id}/invitations/accept`)
    invitations.value = invitations.value.filter((item) => item.id !== invitation.id)
    const response = await api.get<BusinessResponse>('/api/v1/businesses')
    businesses.value = response.data.data
  } catch {
    invitationError.value = 'This invitation could not be accepted. Refresh and try again.'
  } finally {
    acceptingInvitationId.value = null
  }
}

async function uploadBill(event: Event, business: Business): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (!file) {
    return
  }

  uploadingBusinessId.value = business.id
  uploadMessages.value[business.id] = ''
  const payload = new FormData()
  payload.append('file', file)
  payload.append('category', 'invoice')

  try {
    const response = await api.post<{ data: BusinessDocument }>(`/api/v1/businesses/${business.id}/documents`, payload)
    businessDocuments.value[business.id] = [response.data.data, ...(businessDocuments.value[business.id] ?? [])]
    documentsExpanded.value[business.id] = true
    uploadMessages.value[business.id] = 'Bill uploaded.'
  } catch {
    uploadMessages.value[business.id] = 'Upload failed. Please try again.'
  } finally {
    uploadingBusinessId.value = null
    input.value = ''
  }
}

async function toggleDocuments(business: Business): Promise<void> {
  if (documentsExpanded.value[business.id]) {
    documentsExpanded.value[business.id] = false
    return
  }

  documentsExpanded.value[business.id] = true
  documentsError.value[business.id] = ''

  if (businessDocuments.value[business.id]) {
    return
  }

  documentsLoading.value[business.id] = true

  try {
    const response = await api.get<{ data: BusinessDocument[] }>(`/api/v1/businesses/${business.id}/documents`)
    businessDocuments.value[business.id] = response.data.data
  } catch {
    documentsError.value[business.id] = 'We could not load these files.'
  } finally {
    documentsLoading.value[business.id] = false
  }
}

async function openChat(business: Business): Promise<void> {
  chatBusiness.value = business
  chatMembers.value = []
  chatMessages.value = []
  chatMemberId.value = null
  chatConversationId.value = null
  chatError.value = ''
  chatLoading.value = true

  try {
    const response = await api.get<{ data: BusinessMember[] }>(`/api/v1/businesses/${business.id}/members`)
    chatMembers.value = response.data.data.filter((member) => member.id !== auth.user?.id)
    chatMemberId.value = chatMembers.value[0]?.id ?? null
  } catch {
    chatError.value = 'We could not load the business members.'
  } finally {
    chatLoading.value = false
  }
}

async function loadConversation(): Promise<void> {
  if (!chatBusiness.value || !chatMemberId.value) return

  chatLoading.value = true
  chatError.value = ''

  try {
    const opened = await api.post<{ data: { id: number } }>(`/api/v1/businesses/${chatBusiness.value.id}/conversations`, {
      participant_id: chatMemberId.value,
    })
    chatConversationId.value = opened.data.data.id
    const response = await api.get<{ data: ChatMessage[] }>(`/api/v1/businesses/${chatBusiness.value.id}/conversations/${chatConversationId.value}/messages`)
    chatMessages.value = response.data.data.slice().reverse()
  } catch {
    chatError.value = 'We could not open this private chat.'
  } finally {
    chatLoading.value = false
  }
}

async function sendMessage(): Promise<void> {
  if (!chatBusiness.value || !chatConversationId.value || !chatBody.value.trim()) return

  const body = chatBody.value.trim()
  chatLoading.value = true
  chatError.value = ''

  try {
    const response = await api.post<{ data: ChatMessage }>(`/api/v1/businesses/${chatBusiness.value.id}/conversations/${chatConversationId.value}/messages`, { body })
    chatMessages.value.push(response.data.data)
    chatBody.value = ''
  } catch {
    chatError.value = 'Your message could not be sent.'
  } finally {
    chatLoading.value = false
  }
}
</script>

<template>
  <main class="dashboard-shell">
    <header class="topbar">
      <a class="brand" href="/" aria-label="KontoTrack home"><span>K</span> KontoTrack</a>
      <div class="topbar-actions"><NotificationBell /><button class="sign-out" type="button" @click="signOut">Sign out</button></div>
    </header>

    <section class="welcome-card">
      <div>
        <p class="eyebrow">Bookkeeping workspace</p>
        <h1>Hello, {{ auth.user?.name }}</h1>
        <p class="email">{{ auth.user?.email }}</p>
      </div>
      <div class="connection"><span></span> Connected to the KontoTrack API</div>
      <div v-if="auth.user?.is_system_admin" class="admin-links">
        <RouterLink class="compliance-link" :to="{ name: 'compliance-settings' }">Compliance rules</RouterLink>
        <RouterLink class="compliance-link" :to="{ name: 'system-users' }">Users</RouterLink>
      </div>
    </section>

    <section v-if="invitations.length || invitationError" class="invitation-section" aria-labelledby="invitation-heading">
      <div class="section-heading"><div><p class="eyebrow">Team access</p><h2 id="invitation-heading">Business invitations</h2></div></div>
      <p v-if="invitationError" class="feedback error" role="alert">{{ invitationError }}</p>
      <article v-for="invitation in invitations" :key="invitation.id" class="invitation-card">
        <div><strong>{{ invitation.trade_name || invitation.legal_name }}</strong><span>{{ invitation.legal_name }} · {{ invitation.role.replaceAll('_', ' ') }}</span></div>
        <button class="primary-button" type="button" :disabled="acceptingInvitationId === invitation.id" @click="acceptInvitation(invitation)">{{ acceptingInvitationId === invitation.id ? 'Accepting…' : 'Accept invitation' }}</button>
      </article>
    </section>

    <TwoFactorSettings />
    <ChangePasswordForm />

    <section class="business-section" aria-labelledby="business-heading">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Your workspaces</p>
          <h2 id="business-heading">Businesses</h2>
        </div>
        <span class="business-count">{{ businesses.length }} {{ businesses.length === 1 ? 'business' : 'businesses' }}</span>
        <button class="primary-button" type="button" @click="showBusinessForm = !showBusinessForm">
          {{ showBusinessForm ? 'Cancel' : 'Add business' }}
        </button>
      </div>

      <form v-if="showBusinessForm" class="business-form" @submit.prevent="createBusiness">
        <div class="form-heading">
          <h3>Business details</h3>
          <p>Enter the registered details. You will be added as the owner.</p>
        </div>
        <p v-if="formError" class="form-error" role="alert">{{ formError }}</p>
        <div class="form-grid">
          <label>Legal business name<input v-model.trim="form.legal_name" required maxlength="255" autocomplete="organization" /></label>
          <label>NUI<input v-model.trim="form.nui" required maxlength="32" autocomplete="off" /></label>
          <label>Trade name <span>(optional)</span><input v-model.trim="form.trade_name" maxlength="255" /></label>
          <label>Municipality <span>(optional)</span><input v-model.trim="form.municipality" maxlength="100" autocomplete="address-level2" /></label>
          <label>VAT status<select v-model="form.vat_status"><option value="unknown">Not set</option><option value="registered">VAT registered</option><option value="not_registered">Not VAT registered</option></select></label>
        </div>
        <div class="form-actions"><button class="primary-button" type="submit" :disabled="savingBusiness">{{ savingBusiness ? 'Saving…' : 'Save business' }}</button></div>
      </form>

      <p v-if="businessError" class="feedback error" role="alert">{{ businessError }}</p>
      <p v-else-if="loadingBusinesses" class="feedback">Loading your businesses…</p>
      <div v-else-if="businesses.length" class="business-grid">
        <article v-for="business in businesses" :key="business.id" class="business-card">
          <div class="business-initial" aria-hidden="true">{{ business.legal_name.charAt(0).toUpperCase() }}</div>
          <div class="business-info">
            <h3>{{ business.trade_name || business.legal_name }}</h3>
            <p>{{ business.legal_name }}</p>
            <dl>
              <div><dt>NUI</dt><dd>{{ business.nui }}</dd></div>
              <div v-if="business.municipality"><dt>Municipality</dt><dd>{{ business.municipality }}</dd></div>
            </dl>
            <p v-if="uploadMessages[business.id]" class="upload-message" role="status">{{ uploadMessages[business.id] }}</p>
          </div>
          <div class="business-actions">
            <span class="role-chip">{{ business.role || 'Member' }}</span>
            <RouterLink class="chat-button" :to="{ name: 'business', params: { businessId: business.id } }">Open books</RouterLink>
            <button class="chat-button" type="button" @click="openChat(business)">Private chat</button>
            <button class="chat-button" type="button" @click="toggleDocuments(business)">{{ documentsExpanded[business.id] ? 'Hide files' : 'View files' }}</button>
            <label class="upload-button" :class="{ disabled: uploadingBusinessId === business.id }">
              {{ uploadingBusinessId === business.id ? 'Uploading…' : 'Upload bill' }}
              <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" :disabled="uploadingBusinessId === business.id" @change="uploadBill($event, business)" />
            </label>
          </div>
          <div v-if="documentsExpanded[business.id]" class="document-list">
            <p v-if="documentsLoading[business.id]" class="upload-message">Loading files…</p>
            <p v-else-if="documentsError[business.id]" class="upload-message error">{{ documentsError[business.id] }}</p>
            <p v-else-if="!businessDocuments[business.id]?.length" class="upload-message">No files uploaded yet.</p>
            <a v-for="document in businessDocuments[business.id]" :key="document.id" class="document-link" :href="`${apiBaseUrl}/api/v1/businesses/${business.id}/documents/${document.id}/download`" target="_blank" rel="noreferrer">
              <span>{{ document.original_name }}</span><small>{{ document.category.replaceAll('_', ' ') }}</small>
            </a>
          </div>
        </article>
      </div>
      <div v-else class="empty-state">
        <div class="empty-icon" aria-hidden="true">＋</div>
        <h3>No businesses yet</h3>
        <p>Add your first business to set up its bookkeeping workspace.</p>
      </div>
    </section>

    <div v-if="chatBusiness" class="chat-backdrop" @click.self="chatBusiness = null">
      <section class="chat-dialog" role="dialog" aria-modal="true" aria-labelledby="chat-title">
        <header class="chat-header">
          <div><p class="eyebrow">{{ chatBusiness.legal_name }}</p><h2 id="chat-title">Private chat</h2></div>
          <button class="chat-close" type="button" aria-label="Close chat" @click="chatBusiness = null">×</button>
        </header>
        <p v-if="chatError" class="form-error" role="alert">{{ chatError }}</p>
        <p v-if="chatLoading && !chatMembers.length" class="feedback">Loading members…</p>
        <div v-else-if="!chatConversationId" class="chat-start">
          <p v-if="!chatMembers.length">No owner or bookkeeper is available for this business chat yet.</p>
          <template v-else>
            <label>Chat with
              <select v-model.number="chatMemberId">
                <option v-for="member in chatMembers" :key="member.id" :value="member.id">{{ member.name }} · {{ member.role.replaceAll('_', ' ') }}</option>
              </select>
            </label>
            <button class="primary-button" type="button" :disabled="chatLoading || !chatMemberId" @click="loadConversation">{{ chatLoading ? 'Opening…' : 'Open conversation' }}</button>
          </template>
        </div>
        <template v-else>
          <div class="message-list" aria-live="polite">
            <p v-if="!chatMessages.length" class="chat-empty">Start the conversation with a message.</p>
            <article v-for="message in chatMessages" :key="message.id" class="chat-message" :class="{ mine: message.sender.id === auth.user?.id }">
              <strong>{{ message.sender.name }}</strong><p>{{ message.body }}</p>
            </article>
          </div>
          <form class="message-form" @submit.prevent="sendMessage">
            <textarea v-model="chatBody" rows="2" maxlength="10000" placeholder="Write a message…" aria-label="Write a message" />
            <button class="primary-button" type="submit" :disabled="chatLoading || !chatBody.trim()">Send</button>
          </form>
        </template>
      </section>
    </div>
  </main>
</template>

<style scoped>
.topbar-actions { display: flex; align-items: center; gap: 12px; }
.dashboard-shell { width: min(100% - 40px, 1120px); margin: 0 auto; padding-bottom: 64px; }
.topbar { display: flex; height: 80px; align-items: center; justify-content: space-between; border-bottom: 1px solid #e1e8e1; }
.brand { display: inline-flex; align-items: center; gap: 10px; color: #20382b; font-size: 17px; font-weight: 750; text-decoration: none; }
.brand span { display: grid; width: 34px; height: 34px; place-items: center; border-radius: 11px; color: #fff; background: #245c45; }
.sign-out { padding: 10px 15px; border: 1px solid #d7e0d8; border-radius: 9px; color: #34453b; background: #fff; font-weight: 650; }
.admin-links { display: flex; flex-wrap: wrap; gap: 16px; }
.compliance-link { color: #245c45; font-size: 13px; font-weight: 700; }
.welcome-card { display: flex; align-items: center; justify-content: space-between; gap: 24px; margin-top: 36px; padding: 30px; border: 1px solid #e0e8df; border-radius: 18px; background: #fff; }
.eyebrow { margin: 0 0 8px; color: #527360; font-size: 12px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
h1 { margin: 0; color: #18231e; font-size: clamp(26px, 4vw, 36px); letter-spacing: -.04em; }
.email { margin: 8px 0 0; color: #69776f; }
.connection { display: flex; align-items: center; gap: 8px; color: #42644f; font-size: 13px; white-space: nowrap; }
.connection span { width: 8px; height: 8px; border-radius: 50%; background: #39a66b; }
.business-section { margin-top: 44px; }
.invitation-section { margin-top: 28px; padding: 20px; border: 1px solid #dce7dc; border-radius: 15px; background: #f8fbf8; }
.invitation-card { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 14px 0; border-top: 1px solid #e4ebe4; }
.invitation-card > div { display: grid; min-width: 0; gap: 5px; }
.invitation-card strong { color: #20382b; font-size: 14px; }
.invitation-card span { color: #748077; font-size: 12px; text-transform: capitalize; }
.section-heading { display: flex; align-items: end; gap: 14px; margin-bottom: 18px; }
.section-heading > div { flex: 1; }
.section-heading .eyebrow { margin-bottom: 6px; }
.section-heading h2 { margin: 0; color: #20382b; font-size: 24px; }
.business-count { color: #748077; font-size: 13px; }
.business-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 360px), 1fr)); gap: 16px; }
.business-card { display: flex; align-items: flex-start; flex-wrap: wrap; gap: 15px; min-width: 0; padding: 20px; border: 1px solid #e0e8df; border-radius: 16px; background: #fff; }
.business-initial { display: grid; flex: 0 0 42px; width: 42px; height: 42px; place-items: center; border-radius: 13px; color: #245c45; background: #e4f3e9; font-size: 17px; font-weight: 750; }
.business-info { flex: 1; min-width: 0; }
.business-info h3 { overflow: hidden; margin: 1px 0 4px; color: #20382b; font-size: 16px; text-overflow: ellipsis; white-space: nowrap; }
.business-info > p { overflow: hidden; margin: 0; color: #748077; font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }
.business-info dl { display: flex; flex-wrap: wrap; gap: 8px 18px; margin: 15px 0 0; }
.business-info dl div { display: flex; gap: 5px; font-size: 12px; }
.business-info dt { color: #748077; }
.business-info dd { margin: 0; color: #34453b; font-weight: 650; }
.role-chip { padding: 5px 9px; border-radius: 999px; color: #42644f; background: #edf5ef; font-size: 11px; font-weight: 700; text-transform: capitalize; }
.business-actions { display: flex; align-items: flex-end; flex-direction: column; gap: 9px; }
.chat-button { padding: 5px 0; border: 0; color: #245c45; background: transparent; cursor: pointer; font-size: 12px; font-weight: 700; white-space: nowrap; }
.upload-button { display: inline-flex; min-height: 34px; align-items: center; padding: 0 10px; border: 1px solid #d7e0d8; border-radius: 8px; color: #34453b; background: #fff; cursor: pointer; font-size: 12px; font-weight: 700; white-space: nowrap; }
.upload-button.disabled { cursor: wait; opacity: .6; }
.upload-button input { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; clip-path: inset(50%); }
.upload-message { margin: 10px 0 0; color: #42644f; font-size: 12px; }
.upload-message.error { color: #9b352b; }
.document-list { display: grid; flex-basis: 100%; gap: 8px; margin-left: 57px; padding-top: 12px; border-top: 1px solid #edf1ed; }
.document-link { display: flex; justify-content: space-between; gap: 12px; color: #34453b; font-size: 12px; text-decoration: none; }
.document-link:hover span { color: #245c45; text-decoration: underline; }
.document-link span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.document-link small { flex: 0 0 auto; color: #748077; text-transform: capitalize; }
.chat-backdrop { position: fixed; z-index: 10; inset: 0; display: grid; place-items: center; padding: 16px; background: rgb(17 31 23 / 42%); }
.chat-dialog { display: flex; width: min(100%, 520px); max-height: min(90vh, 700px); flex-direction: column; gap: 16px; padding: 22px; border: 1px solid #e0e8df; border-radius: 18px; background: #fff; box-shadow: 0 24px 70px rgb(12 32 20 / 18%); }
.chat-header { display: flex; align-items: center; justify-content: space-between; }
.chat-header .eyebrow { margin-bottom: 5px; }
.chat-header h2 { margin: 0; color: #20382b; font-size: 22px; }
.chat-close { width: 36px; height: 36px; border: 1px solid #d7e0d8; border-radius: 10px; color: #34453b; background: #fff; font-size: 23px; }
.chat-start { display: grid; gap: 16px; }
.chat-start > p, .chat-empty { margin: 0; color: #748077; line-height: 1.5; }
.chat-start label { display: grid; gap: 7px; color: #34453b; font-size: 13px; font-weight: 650; }
.chat-start select, .message-form textarea { width: 100%; padding: 10px 12px; border: 1px solid #d7e0d8; border-radius: 9px; color: #24362b; background: #fff; font: inherit; }
.message-list { display: flex; min-height: 220px; max-height: 48vh; flex-direction: column; gap: 12px; overflow: auto; padding: 14px; border: 1px solid #e4ebe4; border-radius: 12px; background: #f8faf8; }
.chat-message { max-width: 88%; align-self: flex-start; padding: 10px 12px; border-radius: 12px 12px 12px 3px; background: #fff; box-shadow: 0 1px 2px rgb(0 0 0 / 5%); }
.chat-message.mine { align-self: flex-end; border-radius: 12px 12px 3px 12px; background: #e4f3e9; }
.chat-message strong { color: #42644f; font-size: 11px; }
.chat-message p { margin: 4px 0 0; color: #27392f; line-height: 1.45; white-space: pre-wrap; overflow-wrap: anywhere; }
.message-form { display: flex; align-items: flex-end; gap: 10px; }
.message-form textarea { min-height: 58px; resize: vertical; }
.feedback { padding: 18px 20px; border: 1px solid #e0e8df; border-radius: 12px; color: #69776f; background: #fff; }
.feedback.error { border-color: #f0c9c4; color: #9b352b; background: #fff8f7; }
.primary-button { min-height: 40px; padding: 0 15px; border: 0; border-radius: 9px; color: #fff; background: #245c45; font-weight: 700; }
.primary-button:disabled { cursor: wait; opacity: .65; }
.business-form { margin: 0 0 20px; padding: 22px; border: 1px solid #dce7dc; border-radius: 15px; background: #fff; }
.form-heading h3 { margin: 0; color: #20382b; font-size: 17px; }
.form-heading p { margin: 6px 0 18px; color: #748077; font-size: 13px; }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.form-grid label { display: grid; gap: 6px; color: #34453b; font-size: 13px; font-weight: 650; }
.form-grid label span { display: inline; color: #87928b; font-weight: 400; }
.form-grid input, .form-grid select { width: 100%; min-height: 42px; padding: 9px 11px; border: 1px solid #d7e0d8; border-radius: 8px; color: #24362b; background: #fff; font: inherit; font-weight: 400; }
.form-error { margin: 0 0 14px; color: #9b352b; font-size: 13px; }
.form-actions { display: flex; justify-content: flex-end; margin-top: 18px; }
.empty-state { max-width: 540px; margin: 50px auto 0; padding: 42px 24px; border: 1px dashed #d5e0d6; border-radius: 16px; text-align: center; }
.empty-icon { display: grid; width: 54px; height: 54px; margin: 0 auto 18px; place-items: center; border-radius: 17px; color: #24774c; background: #e4f3e9; font-size: 24px; font-weight: 700; }
.empty-state h3 { margin: 0; color: #20382b; font-size: 19px; }
.empty-state p { max-width: 380px; margin: 10px auto 0; color: #748077; line-height: 1.6; }
@media (max-width: 640px) { .welcome-card { align-items: flex-start; flex-direction: column; padding: 24px; } .connection { white-space: normal; } .business-section { margin-top: 32px; } .business-card { padding: 16px; } .business-actions { align-items: flex-end; } .section-heading { align-items: center; flex-wrap: wrap; } .section-heading > div { flex-basis: 100%; } .form-grid { grid-template-columns: 1fr; } .chat-dialog { padding: 17px; } .message-form { align-items: stretch; flex-direction: column; } .message-form .primary-button { align-self: flex-end; } .invitation-card { align-items: flex-start; flex-direction: column; } .invitation-card .primary-button { align-self: flex-end; } }
</style>
