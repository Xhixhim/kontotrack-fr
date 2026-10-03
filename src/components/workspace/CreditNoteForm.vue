<script setup lang="ts">
import { onMounted, ref } from 'vue'
import api from '@/lib/api'
import { formatMoney, getApiError, nullableText, todayIsoDate } from '@/lib/format'

interface SourceInvoice {
  id: number
  kind: 'sale' | 'purchase'
  invoice_number: string
  gross_amount: string
  credited_total?: string
  currency: string
  lines: Array<{ description: string; quantity: string; unit?: string | null; unit_price: string; vat_code: string; inventory_item_id?: number | null; warehouse_id?: number | null }>
}

interface VatCode { code: string; label: string; rate_percent: string }

const props = defineProps<{ businessId: number; invoice: SourceInvoice; documents: Array<{ id: number; category: string; original_name: string }> }>()
const emit = defineEmits<{ created: [invoice: unknown]; cancel: [] }>()

const issuedOn = ref(todayIsoDate())
const reason = ref('')
const supplierNumber = ref('')
const documentId = ref('')
const vatCodes = ref<VatCode[]>([])
const lines = ref(props.invoice.lines.map((line) => ({
  description: line.description,
  quantity: String(Number(line.quantity)),
  unit: line.unit ?? '',
  unit_price: line.unit_price,
  vat_code: line.vat_code,
  inventory_item_id: line.inventory_item_id ?? null,
  warehouse_id: line.warehouse_id ?? null,
})))
const saving = ref(false)
const error = ref('')
const remaining = Number(props.invoice.gross_amount) - Number(props.invoice.credited_total ?? 0)

async function loadVatCodes(): Promise<void> {
  try {
    const response = await api.get<{ data: { codes: VatCode[] } }>(`/api/v1/businesses/${props.businessId}/vat-codes`, { params: { date: issuedOn.value } })
    vatCodes.value = response.data.data.codes
  } catch (caught: unknown) {
    error.value = getApiError(caught, 'No approved VAT rules apply to this date.')
  }
}

async function submit(): Promise<void> {
  saving.value = true
  error.value = ''

  try {
    const response = await api.post<{ data: unknown }>(`/api/v1/businesses/${props.businessId}/invoices/${props.invoice.id}/credit-notes`, {
      issued_on: issuedOn.value,
      notes: reason.value,
      invoice_number: props.invoice.kind === 'purchase' ? nullableText(supplierNumber.value) : null,
      document_id: documentId.value ? Number(documentId.value) : null,
      lines: lines.value.map((line) => ({ ...line, unit: nullableText(line.unit) })),
    })
    emit('created', response.data.data)
  } catch (caught: unknown) {
    error.value = getApiError(caught, 'We could not create this credit note.')
  } finally {
    saving.value = false
  }
}

onMounted(loadVatCodes)
</script>

<template>
  <form class="entry-form credit-note-form" @submit.prevent="submit">
    <h4>Credit note for {{ invoice.invoice_number }}</h4>
    <p class="form-note">Up to {{ formatMoney(remaining, invoice.currency) }} can still be credited. The draft is issued like an invoice and posts the reverse entry; goods on stock lines go back into stock.</p>
    <p v-if="error" class="error-text" role="alert">{{ error }}</p>
    <div class="fields-grid">
      <label>Date<input v-model="issuedOn" type="date" required @change="loadVatCodes" /></label>
      <label>Reason<input v-model.trim="reason" required maxlength="5000" placeholder="Returned goods, price correction…" /></label>
      <template v-if="invoice.kind === 'purchase'">
        <label>Supplier's credit note number<input v-model.trim="supplierNumber" required maxlength="80" /></label>
        <label>Supplier's credit note (document)<select v-model="documentId" required><option disabled value="">Choose document</option><option v-for="document in documents" :key="document.id" :value="String(document.id)">{{ document.category }} · {{ document.original_name }}</option></select></label>
      </template>
    </div>
    <div v-for="(line, index) in lines" :key="index" class="credit-line">
      <label>Description<input v-model.trim="line.description" required maxlength="255" /></label>
      <label>Quantity<input v-model="line.quantity" type="number" min="0.0001" step="0.0001" required /></label>
      <label>Unit price<input v-model="line.unit_price" type="number" min="0" step="0.0001" required /></label>
      <label>VAT<select v-model="line.vat_code" required><option v-for="code in vatCodes" :key="code.code" :value="code.code">{{ code.code }} · {{ code.rate_percent }}%</option></select></label>
      <button v-if="lines.length > 1" class="text-button" type="button" @click="lines.splice(index, 1)">Remove</button>
    </div>
    <div class="form-footer"><button class="text-button" type="button" @click="emit('cancel')">Cancel</button><button class="primary-button" type="submit" :disabled="saving">{{ saving ? 'Saving…' : 'Create credit note draft' }}</button></div>
  </form>
</template>

<style scoped>
.credit-note-form { grid-column: 1 / -1; }
.credit-line { display: grid; grid-template-columns: minmax(160px, 2fr) repeat(3, minmax(100px, 1fr)) auto; align-items: end; gap: 10px; margin-top: 10px; }
.credit-line label, .fields-grid label { display: grid; gap: 4px; font-size: 12px; }
@media (max-width: 720px) { .credit-line { grid-template-columns: 1fr 1fr; } }
</style>
