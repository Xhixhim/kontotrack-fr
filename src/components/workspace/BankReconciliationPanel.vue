<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import api from '@/lib/api'
import { downloadFromApi } from '@/lib/download'
import { formatDate, formatMoney, getApiError, todayIsoDate } from '@/lib/format'

interface Report {
  as_of: string
  statement_from: string | null
  ledger_balance: string
  unrecorded_in: string
  unrecorded_out: string
  not_on_statement_in: string
  not_on_statement_out: string
  expected_statement_balance: string
  statement_balance: string | null
  statement_balance_source: 'statement' | 'entered' | null
  difference: string | null
  status: 'no_statement' | 'balance_unknown' | 'difference' | 'open_items' | 'reconciled'
  unrecorded: Array<{ id: number; date: string; external_id: string | null; description: string; amount: string; category_label: string | null; booked_against: string | null }>
  not_on_statement: Array<{ journal_entry_id: number; entry_date: string; reference: string | null; description: string; amount: string }>
}
interface Rule { id: number; match_text: string; direction: 'in' | 'out' | 'any'; category_label: string; is_active: boolean; account: { code: string; name: string } | null; counterparty: { name: string } | null }

const props = defineProps<{ businessId: number; bankAccountId: number; bankName: string; currency: string }>()
const emit = defineEmits<{ rulesApplied: [] }>()

const STATUS_TEXT: Record<Report['status'], string> = {
  no_statement: 'Import a bank statement to compare it with the books.',
  balance_unknown: 'The statement had no balance (Saldo) column. Enter the closing balance from the bank statement to find any difference.',
  difference: 'The books and the bank do not agree, even after the open items below. Look for a missing or wrong entry.',
  open_items: 'The books agree with the bank once the open items below are booked or cleared.',
  reconciled: 'The books agree with the bank statement and nothing is open.',
}

const asOf = ref(todayIsoDate())
const statementBalance = ref('')
const report = ref<Report | null>(null)
const rules = ref<Rule[]>([])
const loading = ref(false)
const downloading = ref('')
const applying = ref(false)
const notice = ref('')
const error = ref('')

function money(value: string | null): string {
  return value === null ? '—' : formatMoney(value, props.currency)
}

function params(): Record<string, string | number> {
  return {
    type: 'bank_reconciliation',
    bank_account_id: props.bankAccountId,
    to: asOf.value,
    ...(statementBalance.value.trim() !== '' ? { statement_balance: statementBalance.value.trim().replace(',', '.') } : {}),
  }
}

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    const response = await api.get<{ data: Report }>(`/api/v1/businesses/${props.businessId}/reports/financial`, { params: params() })
    report.value = response.data.data
  } catch (caught: unknown) {
    error.value = getApiError(caught, 'We could not build the bank reconciliation.')
  } finally {
    loading.value = false
  }
}

async function download(format: 'xlsx' | 'pdf'): Promise<void> {
  downloading.value = format
  error.value = ''
  try {
    await downloadFromApi(`/api/v1/businesses/${props.businessId}/reports/financial/export`, { ...params(), format }, `bank-reconciliation-${asOf.value}.${format}`)
  } catch (caught: unknown) {
    error.value = getApiError(caught, 'We could not download the report.')
  } finally {
    downloading.value = ''
  }
}

async function loadRules(): Promise<void> {
  try {
    const response = await api.get<{ data: Rule[] }>(`/api/v1/businesses/${props.businessId}/bank-rules`)
    rules.value = response.data.data
  } catch (caught: unknown) {
    error.value = getApiError(caught, 'We could not load the categorisation rules.')
  }
}

async function toggleRule(rule: Rule): Promise<void> {
  try {
    const response = await api.put<{ data: Rule }>(`/api/v1/businesses/${props.businessId}/bank-rules/${rule.id}`, { is_active: !rule.is_active })
    rules.value = rules.value.map((item) => item.id === rule.id ? response.data.data : item)
  } catch (caught: unknown) {
    error.value = getApiError(caught, 'We could not change this rule.')
  }
}

async function deleteRule(rule: Rule): Promise<void> {
  if (!window.confirm(`Delete the rule for "${rule.match_text}"? Lines it already categorised keep their category.`)) return
  try {
    await api.delete(`/api/v1/businesses/${props.businessId}/bank-rules/${rule.id}`)
    rules.value = rules.value.filter((item) => item.id !== rule.id)
  } catch (caught: unknown) {
    error.value = getApiError(caught, 'We could not delete this rule.')
  }
}

async function applyRules(): Promise<void> {
  applying.value = true
  notice.value = ''
  error.value = ''
  try {
    const response = await api.post<{ data: { suggested_count: number } }>(`/api/v1/businesses/${props.businessId}/bank-accounts/${props.bankAccountId}/apply-rules`)
    notice.value = `${response.data.data.suggested_count} uncategorised line(s) got a suggestion.`
    emit('rulesApplied')
  } catch (caught: unknown) {
    error.value = getApiError(caught, 'We could not apply the rules.')
  } finally {
    applying.value = false
  }
}

onMounted(loadRules)
watch(() => props.bankAccountId, () => {
  report.value = null
  statementBalance.value = ''
})
defineExpose({ reload: () => Promise.all([loadRules(), report.value ? load() : Promise.resolve()]) })
</script>

<template>
  <section class="bank-reconciliation-report">
    <h3>Differences report · {{ bankName }}</h3>
    <p class="form-note">Compares the books with the bank statement: what the bank shows that is not booked yet, and what is booked but not on the statement yet.</p>
    <form class="report-filters" @submit.prevent="load">
      <label>As of<input v-model="asOf" type="date" required /></label>
      <label>Statement balance <span>(optional)</span><input v-model.trim="statementBalance" inputmode="decimal" placeholder="From the statement" /></label>
      <button class="primary-button" type="submit" :disabled="loading">{{ loading ? 'Building…' : 'Build report' }}</button>
    </form>
    <p v-if="error" class="error-text" role="alert">{{ error }}</p>

    <template v-if="report">
      <p :class="['bank-reconciliation-status', `is-${report.status}`]" role="status">{{ STATUS_TEXT[report.status] }}</p>
      <div class="report-actions ledger-report-actions">
        <button class="text-button" type="button" :disabled="downloading !== ''" @click="download('xlsx')">{{ downloading === 'xlsx' ? 'Downloading…' : 'Excel' }}</button>
        <button class="text-button" type="button" :disabled="downloading !== ''" @click="download('pdf')">{{ downloading === 'pdf' ? 'Downloading…' : 'PDF file' }}</button>
      </div>
      <div class="report-table-wrap">
        <table class="report-table">
          <tbody>
            <tr><td>Balance in the books</td><td>{{ money(report.ledger_balance) }}</td></tr>
            <tr><td>Add: bank receipts not in the books</td><td>{{ money(report.unrecorded_in) }}</td></tr>
            <tr><td>Less: bank payments not in the books</td><td>{{ money(report.unrecorded_out === '0.00' ? '0.00' : `-${report.unrecorded_out}`) }}</td></tr>
            <tr><td>Less: receipts in the books not on the statement</td><td>{{ money(report.not_on_statement_in === '0.00' ? '0.00' : `-${report.not_on_statement_in}`) }}</td></tr>
            <tr><td>Add: payments in the books not on the statement</td><td>{{ money(report.not_on_statement_out) }}</td></tr>
            <tr class="statement-total"><td>Expected statement balance</td><td>{{ money(report.expected_statement_balance) }}</td></tr>
            <tr><td>Statement balance<template v-if="report.statement_balance_source === 'statement'"> (last imported line)</template><template v-else-if="report.statement_balance_source === 'entered'"> (entered)</template></td><td>{{ money(report.statement_balance) }}</td></tr>
            <tr class="statement-total"><td>Difference</td><td :class="{ 'negative-balance': report.difference !== null && report.difference !== '0.00' }">{{ money(report.difference) }}</td></tr>
          </tbody>
        </table>
      </div>
      <p v-if="report.statement_from" class="form-note">Book entries before {{ formatDate(report.statement_from) }}, the first imported statement line, count as part of the statement's opening balance.</p>

      <div class="report-table-wrap">
        <h4>Bank lines not in the books ({{ report.unrecorded.length }})</h4>
        <table class="report-table">
          <thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Amount</th></tr></thead>
          <tbody>
            <tr v-for="line in report.unrecorded" :key="line.id"><td>{{ formatDate(line.date) }}</td><td>{{ line.description }}<template v-if="line.external_id"> · {{ line.external_id }}</template></td><td>{{ line.category_label ?? 'Not categorised' }}<template v-if="line.booked_against"> · {{ line.booked_against }}</template></td><td>{{ money(line.amount) }}</td></tr>
            <tr v-if="!report.unrecorded.length"><td colspan="4" class="empty-message">None.</td></tr>
          </tbody>
        </table>
      </div>
      <div class="report-table-wrap">
        <h4>Book entries not on the statement ({{ report.not_on_statement.length }})</h4>
        <table class="report-table">
          <thead><tr><th>Date</th><th>Reference</th><th>Description</th><th>Amount</th></tr></thead>
          <tbody>
            <tr v-for="line in report.not_on_statement" :key="line.journal_entry_id"><td>{{ formatDate(line.entry_date) }}</td><td>{{ line.reference ?? '' }}</td><td>Journal #{{ line.journal_entry_id }} · {{ line.description }}</td><td>{{ money(line.amount) }}</td></tr>
            <tr v-if="!report.not_on_statement.length"><td colspan="4" class="empty-message">None.</td></tr>
          </tbody>
        </table>
      </div>
    </template>

    <div class="bank-rules">
      <div class="bank-reconciliation-heading">
        <div><h4>Categorisation rules ({{ rules.length }})</h4><p class="form-note">Rules are created when you tick "Use for future lines" on a bank line. They suggest a category for new statement lines.</p></div>
        <button class="text-button" type="button" :disabled="applying || !rules.length" @click="applyRules">{{ applying ? 'Applying…' : 'Apply rules to open lines' }}</button>
      </div>
      <p v-if="notice" class="form-note" role="status">{{ notice }}</p>
      <ul v-if="rules.length" class="bank-rule-list">
        <li v-for="rule in rules" :key="rule.id" :class="{ 'is-inactive': !rule.is_active }">
          <span>“{{ rule.match_text }}” · {{ rule.direction === 'in' ? 'money in' : rule.direction === 'out' ? 'money out' : 'in or out' }} → {{ rule.category_label }}<template v-if="rule.counterparty"> · {{ rule.counterparty.name }}</template><template v-if="rule.account"> · {{ rule.account.code }} {{ rule.account.name }}</template></span>
          <span class="bank-rule-actions"><button class="text-button" type="button" @click="toggleRule(rule)">{{ rule.is_active ? 'Pause' : 'Resume' }}</button><button class="text-button" type="button" @click="deleteRule(rule)">Delete</button></span>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.bank-reconciliation-report { display: grid; gap: 12px; margin-top: 18px; padding-top: 16px; border-top: 1px solid #d9dfe7; }
.bank-reconciliation-status { margin: 0; padding: 10px 12px; border-radius: 8px; font-size: 14px; background: #eef3f8; }
.bank-reconciliation-status.is-reconciled { background: #e7f5ec; color: #1d6b3a; }
.bank-reconciliation-status.is-difference { background: #fbeaea; color: #8a2a2a; }
.bank-reconciliation-status.is-open_items { background: #fdf4e3; color: #7a5212; }
.bank-rules { display: grid; gap: 8px; }
.bank-rule-list { margin: 0; padding: 0; list-style: none; display: grid; gap: 6px; font-size: 13px; }
.bank-rule-list li { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; padding: 8px 10px; border: 1px solid #e3e8ef; border-radius: 8px; }
.bank-rule-list li.is-inactive { opacity: 0.6; }
.bank-rule-actions { display: flex; gap: 10px; }
</style>
