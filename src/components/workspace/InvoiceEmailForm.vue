<script setup lang="ts">
import { ref } from 'vue'
import api from '@/lib/api'
import { getApiError } from '@/lib/format'
import { useMessages } from '@/lib/locale'

interface EmailableInvoice {
  id: number
  invoice_number: string
  counterparty: { name: string; email?: string | null }
}

const props = defineProps<{ businessId: number; invoice: EmailableInvoice }>()
const emit = defineEmits<{ sent: [result: { last_sent_at: string | null; last_sent_to: string | null }]; cancel: [] }>()

const m = useMessages({
  sq: {
    title: (number: string) => `Dërgo faturën ${number} me email`,
    note: 'Klienti merr faturën si PDF të bashkëngjitur. Përgjigjet e tij vijnë në emailin e biznesit.',
    to: 'Email i klientit',
    cc: 'Kopje (opsionale)',
    ccHint: 'Disa adresa ndaji me presje.',
    message: 'Mesazh (opsional)',
    send: 'Dërgo',
    sending: 'Po dërgohet…',
    cancel: 'Anulo',
    failed: 'Emaili nuk u dërgua.',
  },
  en: {
    title: (number: string) => `Send invoice ${number} by email`,
    note: 'The customer receives the invoice as an attached PDF. Their replies go to the business email.',
    to: 'Customer email',
    cc: 'Copy to (optional)',
    ccHint: 'Separate several addresses with commas.',
    message: 'Message (optional)',
    send: 'Send',
    sending: 'Sending…',
    cancel: 'Cancel',
    failed: 'The email was not sent.',
  },
})

const to = ref(props.invoice.counterparty.email ?? '')
const cc = ref('')
const message = ref('')
const saving = ref(false)
const error = ref('')

async function send(): Promise<void> {
  saving.value = true
  error.value = ''
  try {
    const copies = cc.value.split(',').map((address) => address.trim()).filter(Boolean)
    const response = await api.post<{ data: { last_sent_at: string | null; last_sent_to: string | null } }>(`/api/v1/businesses/${props.businessId}/invoices/${props.invoice.id}/send`, {
      to: to.value.trim(),
      cc: copies.length ? copies : null,
      message: message.value.trim() || null,
    })
    emit('sent', { last_sent_at: response.data.data.last_sent_at, last_sent_to: response.data.data.last_sent_to })
  } catch (caught: unknown) {
    error.value = getApiError(caught, m.value.failed)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <form class="entry-form invoice-email-form" @submit.prevent="send">
    <h3>{{ m.title(invoice.invoice_number) }}</h3>
    <p class="form-note">{{ m.note }}</p>
    <p v-if="error" class="error-text" role="alert">{{ error }}</p>
    <div class="fields-grid">
      <label>{{ m.to }}<input v-model.trim="to" type="email" required maxlength="255" autocomplete="off" /></label>
      <label>{{ m.cc }}<input v-model="cc" maxlength="600" autocomplete="off" :placeholder="m.ccHint" /></label>
    </div>
    <label class="notes-field">{{ m.message }}<textarea v-model="message" rows="3" maxlength="2000"></textarea></label>
    <div class="form-footer"><button class="text-button" type="button" @click="emit('cancel')">{{ m.cancel }}</button><button class="primary-button" type="submit" :disabled="saving">{{ saving ? m.sending : m.send }}</button></div>
  </form>
</template>

<style scoped>
.invoice-email-form { grid-column: 1 / -1; margin-top: 4px; }
.notes-field { margin-top: 13px; }
.form-footer { gap: 8px; }
</style>
