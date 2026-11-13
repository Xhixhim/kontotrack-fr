<script setup lang="ts">
import { tr, trf } from '@/lib/tr'
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
  no_statement: tr('Import a bank statement to compare it with the books.'),
  balance_unknown: tr('The statement had no balance (Saldo) column. Enter the closing balance from the bank statement to find any difference.'),
  difference: tr('The books and the bank do not agree, even after the open items below. Look for a missing or wrong entry.'),
  open_items: tr('The books agree with the bank once the open items below are booked or cleared.'),
  reconciled: tr('The books agree with the bank statement and nothing is open.'),
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
    error.value = getApiError(caught, tr('We could not build the bank reconciliation.'))
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
    error.value = getApiError(caught, tr('We could not download the report.'))
  } finally {
    downloading.value = ''
  }
}

async function loadRules(): Promise<void> {
  try {
    const response = await api.get<{ data: Rule[] }>(`/api/v1/businesses/${props.businessId}/bank-rules`)
    rules.value = response.data.data
  } catch (caught: unknown) {
    error.value = getApiError(caught, tr('We could not load the categorisation rules.'))
  }
}

async function toggleRule(rule: Rule): Promise<void> {
  try {
    const response = await api.put<{ data: Rule }>(`/api/v1/businesses/${props.businessId}/bank-rules/${rule.id}`, { is_active: !rule.is_active })
    rules.value = rules.value.map((item) => item.id === rule.id ? response.data.data : item)
  } catch (caught: unknown) {
    error.value = getApiError(caught, tr('We could not change this rule.'))
  }
}

async function deleteRule(rule: Rule): Promise<void> {
  if (!window.confirm(trf('Delete the rule for "{0}"? Lines it already categorised keep their category.', [rule.match_text]))) return
  try {
    await api.delete(`/api/v1/businesses/${props.businessId}/bank-rules/${rule.id}`)
    rules.value = rules.value.filter((item) => item.id !== rule.id)
  } catch (caught: unknown) {
    error.value = getApiError(caught, tr('We could not delete this rule.'))
  }
}

async function applyRules(): Promise<void> {
  applying.value = true
  notice.value = ''
  error.value = ''
  try {
    const response = await api.post<{ data: { suggested_count: number } }>(`/api/v1/businesses/${props.businessId}/bank-accounts/${props.bankAccountId}/apply-rules`)
    notice.value = trf('{0} uncategorised line(s) got a suggestion.', [response.data.data.suggested_count])
    emit('rulesApplied')
  } catch (caught: unknown) {
    error.value = getApiError(caught, tr('We could not apply the rules.'))
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
    <h3>{{ tr('Differences report ·') }} {{ bankName }}</h3>
    <p class="form-note">{{ tr('Compares the books with the bank statement: what the bank shows that is not booked yet, and what is booked but not on the statement yet.') }}</p>
    <form class="report-filters" @submit.prevent="load">
      <label>{{ tr('As of') }}<input v-model="asOf" type="date" required /></label>
      <label>{{ tr('Statement balance') }} <span>{{ tr('(optional)') }}</span><input v-model.trim="statementBalance" inputmode="decimal" :placeholder="tr('From the statement')" /></label>
      <button class="primary-button" type="submit" :disabled="loading">{{ loading ? tr('Building…') : tr('Build report') }}</button>
    </form>
    <p v-if="error" class="error-text" role="alert">{{ error }}</p>

    <template v-if="report">
      <p :class="['bank-reconciliation-status', `is-${report.status}`]" role="status">{{ STATUS_TEXT[report.status] }}</p>
      <div class="report-actions ledger-report-actions">
        <button class="text-button" type="button" :disabled="downloading !== ''" @click="download('xlsx')">{{ downloading === 'xlsx' ? tr('Downloading…') : tr('Excel') }}</button>
        <button class="text-button" type="button" :disabled="downloading !== ''" @click="download('pdf')">{{ downloading === 'pdf' ? tr('Downloading…') : tr('PDF file') }}</button>
      </div>
      <div class="report-table-wrap">
        <table class="report-table">
          <tbody>
            <tr><td>{{ tr('Balance in the books') }}</td><td>{{ money(report.ledger_balance) }}</td></tr>
            <tr><td>{{ tr('Add: bank receipts not in the books') }}</td><td>{{ money(report.unrecorded_in) }}</td></tr>
            <tr><td>{{ tr('Less: bank payments not in the books') }}</td><td>{{ money(report.unrecorded_out === '0.00' ? '0.00' : `-${report.unrecorded_out}`) }}</td></tr>
            <tr><td>{{ tr('Less: receipts in the books not on the statement') }}</td><td>{{ money(report.not_on_statement_in === '0.00' ? '0.00' : `-${report.not_on_statement_in}`) }}</td></tr>
            <tr><td>{{ tr('Add: payments in the books not on the statement') }}</td><td>{{ money(report.not_on_statement_out) }}</td></tr>
            <tr class="statement-total"><td>{{ tr('Expected statement balance') }}</td><td>{{ money(report.expected_statement_balance) }}</td></tr>
            <tr><td>{{ tr('Statement balance') }}<template v-if="report.statement_balance_source === 'statement'"> {{ tr('(last imported line)') }}</template><template v-else-if="report.statement_balance_source === 'entered'"> {{ tr('(entered)') }}</template></td><td>{{ money(report.statement_balance) }}</td></tr>
            <tr class="statement-total"><td>{{ tr('Difference') }}</td><td :class="{ 'negative-balance': report.difference !== null && report.difference !== '0.00' }">{{ money(report.difference) }}</td></tr>
          </tbody>
        </table>
      </div>
      <p v-if="report.statement_from" class="form-note">{{ tr('Book entries before') }} {{ formatDate(report.statement_from) }}{{ tr(', the first imported statement line, count as part of the statement\'s opening balance.') }}</p>

      <div class="report-table-wrap">
        <h4>{{ tr('Bank lines not in the books (') }}{{ report.unrecorded.length }})</h4>
        <table class="report-table">
          <thead><tr><th>{{ tr('Date') }}</th><th>{{ tr('Description') }}</th><th>{{ tr('Category') }}</th><th>{{ tr('Amount') }}</th></tr></thead>
          <tbody>
            <tr v-for="line in report.unrecorded" :key="line.id"><td>{{ formatDate(line.date) }}</td><td>{{ line.description }}<template v-if="line.external_id"> · {{ line.external_id }}</template></td><td>{{ line.category_label ?? tr('Not categorised') }}<template v-if="line.booked_against"> · {{ line.booked_against }}</template></td><td>{{ money(line.amount) }}</td></tr>
            <tr v-if="!report.unrecorded.length"><td colspan="4" class="empty-message">{{ tr('None.') }}</td></tr>
          </tbody>
        </table>
      </div>
      <div class="report-table-wrap">
        <h4>{{ tr('Book entries not on the statement (') }}{{ report.not_on_statement.length }})</h4>
        <table class="report-table">
          <thead><tr><th>{{ tr('Date') }}</th><th>{{ tr('Reference') }}</th><th>{{ tr('Description') }}</th><th>{{ tr('Amount') }}</th></tr></thead>
          <tbody>
            <tr v-for="line in report.not_on_statement" :key="line.journal_entry_id"><td>{{ formatDate(line.entry_date) }}</td><td>{{ line.reference ?? '' }}</td><td>{{ tr('Journal #') }}{{ line.journal_entry_id }} · {{ line.description }}</td><td>{{ money(line.amount) }}</td></tr>
            <tr v-if="!report.not_on_statement.length"><td colspan="4" class="empty-message">{{ tr('None.') }}</td></tr>
          </tbody>
        </table>
      </div>
    </template>

    <div class="bank-rules">
      <div class="bank-reconciliation-heading">
        <div><h4>{{ tr('Categorisation rules (') }}{{ rules.length }})</h4><p class="form-note">{{ tr('Rules are created when you tick "Use for future lines" on a bank line. They suggest a category for new statement lines.') }}</p></div>
        <button class="text-button" type="button" :disabled="applying || !rules.length" @click="applyRules">{{ applying ? tr('Applying…') : tr('Apply rules to open lines') }}</button>
      </div>
      <p v-if="notice" class="form-note" role="status">{{ notice }}</p>
      <ul v-if="rules.length" class="bank-rule-list">
        <li v-for="rule in rules" :key="rule.id" :class="{ 'is-inactive': !rule.is_active }">
          <span>“{{ rule.match_text }}” · {{ rule.direction === 'in' ? tr('money in') : rule.direction === 'out' ? tr('money out') : tr('in or out') }} → {{ rule.category_label }}<template v-if="rule.counterparty"> · {{ rule.counterparty.name }}</template><template v-if="rule.account"> · {{ rule.account.code }} {{ rule.account.name }}</template></span>
          <span class="bank-rule-actions"><button class="text-button" type="button" @click="toggleRule(rule)">{{ rule.is_active ? tr('Pause') : tr('Resume') }}</button><button class="text-button" type="button" @click="deleteRule(rule)">{{ tr('Delete') }}</button></span>
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
