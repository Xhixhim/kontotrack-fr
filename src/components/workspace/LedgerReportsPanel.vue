<script setup lang="ts">
import { ref } from 'vue'
import api from '@/lib/api'
import { downloadFromApi } from '@/lib/download'
import { downloadCsv, formatDate, formatMoney, getApiError, todayIsoDate } from '@/lib/format'

interface CardLine { date: string; journal_entry_id: number; reference: string | null; description: string; counterparty_name: string | null; debit: string; credit: string; balance: string }
interface AccountCard { account_id: number; code: string; name: string; account_type: string; opening_balance: string; debit_total: string; credit_total: string; closing_balance: string; lines: CardLine[] }
interface CashBookLine { date: string; journal_entry_id: number; reference: string | null; description: string; counterparty_name: string | null; money_in: string; money_out: string; balance: string }
interface CashBook { cash_account: { id: number; name: string }; opening_balance: string; money_in: string; money_out: string; closing_balance: string; lines: CashBookLine[] }

const props = defineProps<{
  businessId: number
  businessName: string
  businessNui: string
  currency: string
  accounts: Array<{ id: number; code: string; name: string }>
  cashAccounts: Array<{ id: number; name: string }>
}>()

const reportType = ref<'general_ledger' | 'cash_book'>('general_ledger')
const accountId = ref('')
const cashAccountId = ref('')
const from = ref(`${todayIsoDate().slice(0, 4)}-01-01`)
const to = ref(todayIsoDate())
const cards = ref<AccountCard[] | null>(null)
const cashBook = ref<CashBook | null>(null)
const loading = ref(false)
const error = ref('')

function money(value: string): string {
  return formatMoney(value, props.currency)
}

async function generate(): Promise<void> {
  loading.value = true
  error.value = ''
  cards.value = null
  cashBook.value = null

  try {
    const params: Record<string, string> = { type: reportType.value, from: from.value, to: to.value }
    if (reportType.value === 'general_ledger' && accountId.value) params.account_id = accountId.value
    if (reportType.value === 'cash_book') params.cash_account_id = cashAccountId.value
    const response = await api.get<{ data: { accounts?: AccountCard[] } & Partial<CashBook> }>(`/api/v1/businesses/${props.businessId}/reports/financial`, { params })

    if (reportType.value === 'general_ledger') {
      cards.value = response.data.data.accounts ?? []
    } else {
      cashBook.value = response.data.data as CashBook
    }
  } catch (caught: unknown) {
    error.value = getApiError(caught, 'We could not generate this report.')
  } finally {
    loading.value = false
  }
}

const downloading = ref('')

async function download(format: 'xlsx' | 'pdf'): Promise<void> {
  downloading.value = format
  error.value = ''

  try {
    const params: Record<string, string> = { type: reportType.value, from: from.value, to: to.value, format }
    if (reportType.value === 'general_ledger' && accountId.value) params.account_id = accountId.value
    if (reportType.value === 'cash_book') params.cash_account_id = cashAccountId.value
    await downloadFromApi(`/api/v1/businesses/${props.businessId}/reports/financial/export`, params, `${reportType.value}.${format}`)
  } catch (caught: unknown) {
    error.value = getApiError(caught, 'We could not export this report.')
  } finally {
    downloading.value = ''
  }
}

function printReport(): void {
  window.print()
}

function exportCsv(): void {
  const rows: string[][] = [[props.businessName, `NUI ${props.businessNui}`, `${from.value} – ${to.value}`]]

  if (cards.value) {
    for (const card of cards.value) {
      rows.push([], [`${card.code} ${card.name}`], ['Date', 'Reference', 'Description', 'Debit', 'Credit', 'Balance'], ['', '', 'Opening balance', '', '', card.opening_balance])
      rows.push(...card.lines.map((line) => [line.date, line.reference ?? '', line.description, line.debit, line.credit, line.balance]))
      rows.push(['', '', 'Closing balance', card.debit_total, card.credit_total, card.closing_balance])
    }
  } else if (cashBook.value) {
    rows.push([`Cash book · ${cashBook.value.cash_account.name}`], ['Date', 'Reference', 'Description', 'In', 'Out', 'Balance'], ['', '', 'Opening balance', '', '', cashBook.value.opening_balance])
    rows.push(...cashBook.value.lines.map((line) => [line.date, line.reference ?? '', line.description, line.money_in, line.money_out, line.balance]))
    rows.push(['', '', 'Closing balance', cashBook.value.money_in, cashBook.value.money_out, cashBook.value.closing_balance])
  }

  downloadCsv(rows, `kontotrack-${reportType.value}-${to.value}.csv`, 3)
}
</script>

<template>
  <div>
    <form class="report-filters" @submit.prevent="generate">
      <label>Report<select v-model="reportType"><option value="general_ledger">Account cards (general ledger)</option><option value="cash_book">Cash book</option></select></label>
      <label v-if="reportType === 'general_ledger'">Account<select v-model="accountId"><option value="">All accounts with activity</option><option v-for="account in accounts" :key="account.id" :value="String(account.id)">{{ account.code }} · {{ account.name }}</option></select></label>
      <label v-else>Cash account<select v-model="cashAccountId" required><option disabled value="">Choose cash account</option><option v-for="cash in cashAccounts" :key="cash.id" :value="String(cash.id)">{{ cash.name }}</option></select></label>
      <label>From<input v-model="from" type="date" required /></label>
      <label>To<input v-model="to" type="date" required /></label>
      <button class="primary-button" type="submit" :disabled="loading">{{ loading ? 'Generating…' : 'Generate' }}</button>
    </form>
    <p v-if="error" class="error-text" role="alert">{{ error }}</p>
    <div v-if="cards || cashBook" class="report-actions ledger-report-actions">
      <button class="text-button" type="button" @click="printReport">Print / PDF</button>
      <button class="text-button" type="button" @click="exportCsv">Export CSV</button>
      <button class="text-button" type="button" :disabled="downloading !== ''" @click="download('xlsx')">{{ downloading === 'xlsx' ? 'Exporting…' : 'Excel' }}</button>
      <button class="text-button" type="button" :disabled="downloading !== ''" @click="download('pdf')">{{ downloading === 'pdf' ? 'Exporting…' : 'PDF file' }}</button>
    </div>
    <div v-if="cards || cashBook" class="print-only report-print-heading"><strong>{{ cards ? 'Account cards' : `Cash book · ${cashBook?.cash_account.name}` }}</strong><span>{{ businessName }} · NUI {{ businessNui }}</span><span>{{ formatDate(from) }} – {{ formatDate(to) }} · {{ currency }}</span></div>

    <template v-if="cards">
      <p v-if="!cards.length" class="empty-message">No posted activity in these dates.</p>
      <section v-for="card in cards" :key="card.account_id" class="report-table-wrap">
        <h4>{{ card.code }} · {{ card.name }}</h4>
        <table class="report-table">
          <thead><tr><th>Date</th><th>Reference</th><th>Description</th><th>Debit</th><th>Credit</th><th>Balance</th></tr></thead>
          <tbody>
            <tr><td>{{ formatDate(from) }}</td><td></td><td>Opening balance</td><td></td><td></td><td>{{ money(card.opening_balance) }}</td></tr>
            <tr v-for="(line, index) in card.lines" :key="`${line.journal_entry_id}-${index}`"><td>{{ formatDate(line.date) }}</td><td>{{ line.reference ?? '' }}</td><td>{{ line.description }}<template v-if="line.counterparty_name"> · {{ line.counterparty_name }}</template></td><td>{{ line.debit !== '0.00' ? money(line.debit) : '' }}</td><td>{{ line.credit !== '0.00' ? money(line.credit) : '' }}</td><td>{{ money(line.balance) }}</td></tr>
            <tr class="statement-total"><td>{{ formatDate(to) }}</td><td></td><td>Closing balance</td><td>{{ money(card.debit_total) }}</td><td>{{ money(card.credit_total) }}</td><td>{{ money(card.closing_balance) }}</td></tr>
          </tbody>
        </table>
      </section>
    </template>

    <template v-if="cashBook">
      <div class="summary-grid">
        <article class="summary-card"><span>Opening</span><strong>{{ money(cashBook.opening_balance) }}</strong></article>
        <article class="summary-card"><span>Money in</span><strong>{{ money(cashBook.money_in) }}</strong></article>
        <article class="summary-card"><span>Money out</span><strong>{{ money(cashBook.money_out) }}</strong></article>
        <article class="summary-card"><span>Closing</span><strong>{{ money(cashBook.closing_balance) }}</strong><small v-if="cashBook.closing_balance.startsWith('-')">Negative cash — check the entries</small></article>
      </div>
      <div class="report-table-wrap">
        <table class="report-table">
          <thead><tr><th>Date</th><th>Reference</th><th>Description</th><th>In</th><th>Out</th><th>Balance</th></tr></thead>
          <tbody>
            <tr v-for="(line, index) in cashBook.lines" :key="`${line.journal_entry_id}-${index}`"><td>{{ formatDate(line.date) }}</td><td>{{ line.reference ?? '' }}</td><td>{{ line.description }}<template v-if="line.counterparty_name"> · {{ line.counterparty_name }}</template></td><td>{{ line.money_in !== '0.00' ? money(line.money_in) : '' }}</td><td>{{ line.money_out !== '0.00' ? money(line.money_out) : '' }}</td><td>{{ money(line.balance) }}</td></tr>
            <tr v-if="!cashBook.lines.length"><td colspan="6" class="empty-message">No cash movements in these dates.</td></tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<style scoped>
.ledger-report-actions { justify-content: flex-end; margin-top: 12px; }
h4 { margin: 18px 0 6px; }
</style>
