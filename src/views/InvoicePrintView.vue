<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import api from '@/lib/api'

interface PrintBusiness {
  id: number
  legal_name: string
  trade_name: string | null
  nui: string
  vat_status: 'unknown' | 'registered' | 'not_registered'
  address: string | null
  municipality: string | null
  email: string | null
  phone: string | null
  currency: string
}

interface PrintInvoice {
  id: number
  kind: 'sale' | 'purchase'
  document_type: 'invoice' | 'credit_note'
  invoice_number: string
  issued_on: string
  due_on: string | null
  payment_method: string | null
  status: string
  cancelled_on: string | null
  cancellation_reason: string | null
  currency: string
  net_amount: string
  tax_amount: string
  gross_amount: string
  notes: string | null
  counterparty: { name: string; nui: string | null; address: string | null; municipality: string | null; email: string | null }
  lines: Array<{
    id: number
    position: number
    description: string
    quantity: string
    unit: string | null
    unit_price: string
    discount_amount: string
    vat_code: string
    net_amount: string
    tax_amount: string
    gross_amount: string
    tax_snapshot: { label?: string; rate_percent?: string } | null
  }>
}

const route = useRoute()
const businessId = Number(route.params.businessId)
const invoiceId = Number(route.params.invoiceId)
const business = ref<PrintBusiness | null>(null)
const invoice = ref<PrintInvoice | null>(null)
const pageError = ref('')
const paymentMethodLabels: Record<string, string> = { bank_transfer: 'Transfer bankar · Bank transfer', cash: 'Para në dorë · Cash', card: 'Kartelë · Card', other: 'Tjetër · Other' }

const vatBreakdown = computed(() => {
  const groups = new Map<string, { label: string; rate: string; net: number; tax: number }>()

  for (const line of invoice.value?.lines ?? []) {
    const rate = line.tax_snapshot?.rate_percent ?? '0'
    const key = `${line.vat_code}|${rate}`
    const group = groups.get(key) ?? { label: line.tax_snapshot?.label ?? line.vat_code, rate, net: 0, tax: 0 }
    group.net += Math.round(Number(line.net_amount) * 100)
    group.tax += Math.round(Number(line.tax_amount) * 100)
    groups.set(key, group)
  }

  return [...groups.values()]
})

function formatMoney(value: string | number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: invoice.value?.currency || business.value?.currency || 'EUR' }).format(Number(value))
}

function formatQuantity(value: string): string {
  return new Intl.NumberFormat('en-GB', { maximumFractionDigits: 4 }).format(Number(value))
}

function formatRate(value: string): string {
  return `${new Intl.NumberFormat('en-GB', { maximumFractionDigits: 4 }).format(Number(value))}%`
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(new Date(`${value}T00:00:00`))
}

function printInvoice(): void {
  window.print()
}

onMounted(async () => {
  try {
    const [businessesResponse, invoiceResponse] = await Promise.all([
      api.get<{ data: PrintBusiness[] }>('/api/v1/businesses'),
      api.get<{ data: PrintInvoice }>(`/api/v1/businesses/${businessId}/invoices/${invoiceId}`),
    ])
    business.value = businessesResponse.data.data.find((item) => item.id === businessId) ?? null
    invoice.value = invoiceResponse.data.data
    document.title = `${invoice.value.document_type === 'credit_note' ? 'Credit note' : invoice.value.kind === 'sale' ? 'Invoice' : 'Purchase bill'} ${invoice.value.invoice_number}`
  } catch {
    pageError.value = 'We could not load this invoice.'
  }
})
</script>

<template>
  <main class="print-page">
    <div class="print-toolbar">
      <RouterLink :to="{ name: 'business', params: { businessId } }">← Back to workspace</RouterLink>
      <button class="primary-button" type="button" :disabled="!invoice" @click="printInvoice">Print / Save as PDF</button>
    </div>

    <p v-if="pageError" class="error-text" role="alert">{{ pageError }}</p>

    <article v-if="invoice && business" class="invoice-sheet">
      <header class="sheet-header">
        <div>
          <h1>{{ business.trade_name || business.legal_name }}</h1>
          <p v-if="business.trade_name">{{ business.legal_name }}</p>
          <p>NUI {{ business.nui }}</p>
          <p v-if="business.address || business.municipality">{{ [business.address, business.municipality].filter(Boolean).join(', ') }}</p>
          <p v-if="business.phone || business.email">{{ [business.phone, business.email].filter(Boolean).join(' · ') }}</p>
          <p v-if="business.vat_status === 'not_registered'">Not registered for VAT</p>
        </div>
        <div class="sheet-title">
          <h2>{{ invoice.document_type === 'credit_note' ? 'Notë krediti · Credit note' : invoice.kind === 'sale' ? 'Faturë · Invoice' : 'Faturë blerjeje · Purchase bill' }}</h2>
          <p class="invoice-number">{{ invoice.invoice_number }}</p>
          <span v-if="invoice.status === 'draft'" class="sheet-badge">Draft – not issued</span>
          <span v-else-if="invoice.status === 'cancelled'" class="sheet-badge cancelled">Cancelled {{ formatDate(invoice.cancelled_on) }}</span>
        </div>
      </header>

      <section class="sheet-parties">
        <div>
          <h3>{{ invoice.kind === 'sale' ? 'Blerësi · Bill to' : 'Furnitori · Supplier' }}</h3>
          <p><strong>{{ invoice.counterparty.name }}</strong></p>
          <p v-if="invoice.counterparty.nui">NUI {{ invoice.counterparty.nui }}</p>
          <p v-if="invoice.counterparty.address || invoice.counterparty.municipality">{{ [invoice.counterparty.address, invoice.counterparty.municipality].filter(Boolean).join(', ') }}</p>
          <p v-if="invoice.counterparty.email">{{ invoice.counterparty.email }}</p>
        </div>
        <dl>
          <div><dt>Data · Date</dt><dd>{{ formatDate(invoice.issued_on) }}</dd></div>
          <div><dt>Afati · Due</dt><dd>{{ formatDate(invoice.due_on) }}</dd></div>
          <div v-if="invoice.payment_method"><dt>Pagesa · Payment</dt><dd>{{ paymentMethodLabels[invoice.payment_method] ?? invoice.payment_method }}</dd></div>
          <div><dt>Valuta · Currency</dt><dd>{{ invoice.currency }}</dd></div>
        </dl>
      </section>

      <table class="sheet-lines">
        <thead>
          <tr><th>#</th><th>Përshkrimi · Description</th><th class="number">Sasia · Qty</th><th class="number">Çmimi · Price</th><th class="number">Zbritja · Discount</th><th>TVSH · VAT</th><th class="number">Pa TVSH · Net</th><th class="number">Totali · Total</th></tr>
        </thead>
        <tbody>
          <tr v-for="line in invoice.lines" :key="line.id">
            <td>{{ line.position }}</td>
            <td>{{ line.description }}</td>
            <td class="number">{{ formatQuantity(line.quantity) }}<template v-if="line.unit"> {{ line.unit }}</template></td>
            <td class="number">{{ formatMoney(line.unit_price) }}</td>
            <td class="number">{{ Number(line.discount_amount) > 0 ? formatMoney(line.discount_amount) : '—' }}</td>
            <td>{{ formatRate(line.tax_snapshot?.rate_percent ?? '0') }}</td>
            <td class="number">{{ formatMoney(line.net_amount) }}</td>
            <td class="number">{{ formatMoney(line.gross_amount) }}</td>
          </tr>
        </tbody>
      </table>

      <section class="sheet-totals">
        <table class="vat-breakdown">
          <thead><tr><th>TVSH · VAT</th><th class="number">Baza · Base</th><th class="number">TVSH · VAT</th></tr></thead>
          <tbody>
            <tr v-for="group in vatBreakdown" :key="`${group.label}-${group.rate}`"><td>{{ group.label }} · {{ formatRate(group.rate) }}</td><td class="number">{{ formatMoney(group.net / 100) }}</td><td class="number">{{ formatMoney(group.tax / 100) }}</td></tr>
          </tbody>
        </table>
        <dl class="grand-totals">
          <div><dt>Pa TVSH · Net</dt><dd>{{ formatMoney(invoice.net_amount) }}</dd></div>
          <div><dt>TVSH · VAT</dt><dd>{{ formatMoney(invoice.tax_amount) }}</dd></div>
          <div class="grand"><dt>{{ invoice.document_type === 'credit_note' ? 'Kredituar · Total credited' : 'Për pagesë · Total due' }}</dt><dd>{{ formatMoney(invoice.gross_amount) }}</dd></div>
        </dl>
      </section>

      <p v-if="invoice.notes" class="sheet-notes">{{ invoice.notes }}</p>
      <p v-if="invoice.status === 'cancelled' && invoice.cancellation_reason" class="sheet-notes">Cancellation reason: {{ invoice.cancellation_reason }}</p>
    </article>
  </main>
</template>

<style scoped>
.print-page { min-height: 100vh; padding: 24px 16px 48px; background: #eef2ee; color: #1f2d25; font-family: Inter, system-ui, sans-serif; }
.print-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; max-width: 210mm; margin: 0 auto 16px; }
.print-toolbar a { color: #2f5a41; font-size: 13px; font-weight: 600; text-decoration: none; }
.primary-button { min-height: 38px; padding: 8px 14px; border: 0; border-radius: 8px; color: #fff; background: #2f5a41; font: inherit; font-size: 13px; font-weight: 700; cursor: pointer; }
.primary-button:disabled { opacity: 0.5; cursor: default; }
.error-text { max-width: 210mm; margin: 0 auto; color: #9b352b; }
.invoice-sheet { box-sizing: border-box; width: 100%; max-width: 210mm; min-height: 297mm; margin: 0 auto; padding: 18mm 16mm; background: #fff; box-shadow: 0 4px 24px rgb(31 45 37 / 12%); font-size: 12px; line-height: 1.45; }
.sheet-header, .sheet-parties, .sheet-totals { display: flex; justify-content: space-between; gap: 24px; }
.sheet-header { padding-bottom: 14px; border-bottom: 2px solid #1f2d25; }
.sheet-header h1 { margin: 0 0 4px; font-size: 18px; }
.sheet-header p, .sheet-parties p { margin: 0; color: #4d5f55; }
.sheet-title { text-align: right; }
.sheet-title h2 { margin: 0; font-size: 15px; font-weight: 700; letter-spacing: 0.02em; }
.invoice-number { margin: 4px 0 0; font-size: 16px; font-weight: 700; }
.sheet-badge { display: inline-block; margin-top: 8px; padding: 3px 8px; border: 1px solid #b7791f; border-radius: 6px; color: #8a5a12; font-size: 11px; font-weight: 700; text-transform: uppercase; }
.sheet-badge.cancelled { border-color: #9b352b; color: #9b352b; }
.sheet-parties { margin: 18px 0; }
.sheet-parties h3 { margin: 0 0 4px; color: #77837b; font-size: 10px; letter-spacing: 0.06em; text-transform: uppercase; }
dl { margin: 0; }
dl div { display: flex; justify-content: space-between; gap: 18px; }
dt { color: #77837b; }
dd { margin: 0; font-weight: 600; font-variant-numeric: tabular-nums; }
table { width: 100%; border-collapse: collapse; }
th { padding: 6px 4px; border-bottom: 1px solid #1f2d25; color: #4d5f55; font-size: 10px; font-weight: 700; text-align: left; }
td { padding: 6px 4px; border-bottom: 1px solid #e3e8e3; vertical-align: top; }
.number { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
.sheet-totals { align-items: flex-start; margin-top: 18px; }
.vat-breakdown { max-width: 55%; }
.grand-totals { min-width: 38%; }
.grand-totals div { padding: 4px 0; }
.grand-totals .grand { margin-top: 4px; padding-top: 8px; border-top: 2px solid #1f2d25; font-size: 14px; }
.sheet-notes { margin: 18px 0 0; color: #4d5f55; white-space: pre-line; }

@media (max-width: 640px) {
  .invoice-sheet { min-height: 0; padding: 20px 16px; overflow-x: auto; }
  .sheet-header, .sheet-parties, .sheet-totals { flex-direction: column; }
  .sheet-title { text-align: left; }
  .vat-breakdown { max-width: none; }
}

@media print {
  @page { size: A4; margin: 0; }
  .print-page { padding: 0; background: #fff; }
  .print-toolbar { display: none; }
  .invoice-sheet { max-width: none; min-height: 0; box-shadow: none; }
}
</style>
