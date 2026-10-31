<script setup lang="ts">
import { computed, ref } from 'vue'
import api from '@/lib/api'
import { formatDate, getApiError } from '@/lib/format'
import { useAuthStore } from '@/stores/auth'

export interface ReopenRequest {
  id: number
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  reason: string
  requested_by: { id: number; name: string } | null
  decided_by: { id: number; name: string } | null
  decided_at: string | null
  decision_note: string | null
  period_closed_at: string | null
  created_at: string | null
}

const props = defineProps<{
  businessId: number
  period: { id: number; name: string; status: 'open' | 'closed'; reopened_at?: string | null; pending_reopen_request?: ReopenRequest | null }
  role: string
}>()
const emit = defineEmits<{ changed: [] }>()

const auth = useAuthStore()
const asking = ref(false)
const reason = ref('')
const note = ref('')
const busy = ref(false)
const error = ref('')
const history = ref<ReopenRequest[] | null>(null)

const pending = computed(() => props.period.pending_reopen_request ?? null)
const canAsk = computed(() => props.role === 'owner' || props.role === 'accountant')
const isRequester = computed(() => pending.value?.requested_by?.id === auth.user?.id)
const canDecide = computed(() => !isRequester.value && (props.role === 'owner' || auth.user?.is_system_admin === true))
const STATUS: Record<ReopenRequest['status'], string> = { pending: 'Waiting for approval', approved: 'Approved, period reopened', rejected: 'Rejected', cancelled: 'Withdrawn' }

function base(): string {
  return `/api/v1/businesses/${props.businessId}/periods/${props.period.id}/reopen-requests`
}

async function run(action: () => Promise<unknown>, fallback: string): Promise<void> {
  busy.value = true
  error.value = ''
  try {
    await action()
    asking.value = false
    reason.value = ''
    note.value = ''
    if (history.value) await loadHistory()
    emit('changed')
  } catch (caught: unknown) {
    error.value = getApiError(caught, fallback)
  } finally {
    busy.value = false
  }
}

function ask(): Promise<void> {
  return run(() => api.post(base(), { reason: reason.value }), 'We could not send the request.')
}

function approve(): Promise<void> {
  if (!window.confirm(`Reopen ${props.period.name}? Entries in it can be changed again until it is closed once more. Figures already filed for this period may need a corrected return.`)) return Promise.resolve()

  return run(() => api.post(`${base()}/${pending.value?.id}/approve`, { note: note.value || null }), 'We could not approve the request.')
}

function reject(): Promise<void> {
  return run(() => api.post(`${base()}/${pending.value?.id}/reject`, { note: note.value }), 'We could not reject the request.')
}

function withdraw(): Promise<void> {
  return run(() => api.post(`${base()}/${pending.value?.id}/cancel`), 'We could not withdraw the request.')
}

async function loadHistory(): Promise<void> {
  try {
    const response = await api.get<{ data: ReopenRequest[] }>(base())
    history.value = response.data.data
  } catch (caught: unknown) {
    error.value = getApiError(caught, 'We could not load the reopening history.')
  }
}
</script>

<template>
  <section class="period-reopen">
    <p v-if="period.status === 'open' && period.reopened_at" class="form-note">Reopened on {{ formatDate(period.reopened_at.slice(0, 10)) }}. Close it again when the corrections are done.</p>

    <template v-if="period.status === 'closed'">
      <div v-if="pending" class="period-reopen-pending">
        <p><strong>Reopening requested</strong> by {{ pending.requested_by?.name ?? 'a team member' }}<template v-if="pending.created_at"> on {{ formatDate(pending.created_at.slice(0, 10)) }}</template>: “{{ pending.reason }}”</p>
        <template v-if="canDecide">
          <label>Note <span>(required to reject)</span><input v-model.trim="note" maxlength="2000" /></label>
          <div class="period-reopen-actions">
            <button class="primary-button" type="button" :disabled="busy" @click="approve">Approve and reopen</button>
            <button class="text-button" type="button" :disabled="busy || !note" @click="reject">Reject</button>
          </div>
        </template>
        <p v-else-if="isRequester" class="form-note">Waiting for the business owner to approve. <button class="text-button" type="button" :disabled="busy" @click="withdraw">Withdraw request</button></p>
        <p v-else class="form-note">Waiting for the business owner to approve.</p>
      </div>
      <template v-else-if="canAsk">
        <button v-if="!asking" class="text-button" type="button" @click="asking = true">Request reopening</button>
        <form v-else class="period-reopen-form" @submit.prevent="ask">
          <label>Why must {{ period.name }} be reopened?<textarea v-model.trim="reason" required minlength="10" maxlength="2000" rows="2" placeholder="What needs correcting, e.g. a supplier bill booked twice" /></label>
          <p class="form-note">The business owner must approve. The reason stays in the audit trail.</p>
          <div class="period-reopen-actions">
            <button class="primary-button" type="submit" :disabled="busy || reason.length < 10">{{ busy ? 'Sending…' : 'Send request' }}</button>
            <button class="text-button" type="button" @click="asking = false">Cancel</button>
          </div>
        </form>
      </template>
    </template>

    <button class="text-button" type="button" @click="history ? (history = null) : loadHistory()">{{ history ? 'Hide reopening history' : 'Reopening history' }}</button>
    <ul v-if="history" class="period-reopen-history">
      <li v-for="item in history" :key="item.id">
        <strong>{{ STATUS[item.status] }}</strong> · asked by {{ item.requested_by?.name ?? '—' }}<template v-if="item.created_at"> on {{ formatDate(item.created_at.slice(0, 10)) }}</template>: “{{ item.reason }}”
        <template v-if="item.decided_by && item.status !== 'cancelled'"> · {{ item.decided_by.name }}<template v-if="item.decided_at"> on {{ formatDate(item.decided_at.slice(0, 10)) }}</template></template><template v-if="item.decision_note">: “{{ item.decision_note }}”</template>
      </li>
      <li v-if="!history.length">No reopening requests.</li>
    </ul>
    <p v-if="error" class="error-text" role="alert">{{ error }}</p>
  </section>
</template>

<style scoped>
.period-reopen { display: grid; gap: 8px; grid-column: 1 / -1; justify-items: start; }
.period-reopen-pending { display: grid; gap: 8px; padding: 10px 12px; border-radius: 8px; background: #fdf4e3; font-size: 14px; }
.period-reopen-pending p { margin: 0; }
.period-reopen-form { display: grid; gap: 8px; }
.period-reopen-actions { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.period-reopen-history { margin: 0; padding-left: 18px; font-size: 13px; line-height: 1.6; }
</style>
