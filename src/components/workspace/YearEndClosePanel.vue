<script setup lang="ts">
import { ref } from 'vue'
import api from '@/lib/api'
import { formatMoney, getApiError } from '@/lib/format'
import { useMessages } from '@/lib/locale'

interface YearEndPreview {
  year: number
  revenue: string
  expenses: string
  result: string
  closed: boolean
  closing_entry_id: number | null
  blockers: string[]
  accounts: Array<{ code: string; name: string; account_type: 'revenue' | 'expense'; balance: string }>
}

const props = defineProps<{ businessId: number; currency: string; canEdit: boolean }>()
const emit = defineEmits<{ closed: [] }>()

const m = useMessages({
  sq: {
    eyebrow: 'Mbyllja e vitit',
    title: 'Mbyll vitin',
    note: 'Mbyllja bën një regjistrim më 31 dhjetor që i kthen në zero llogaritë e të hyrave dhe shpenzimeve dhe e kalon fitimin ose humbjen e vitit te fitimi i mbajtur. Pasqyra e të ardhurave për atë vit mbetet e njëjtë. Bëje para se të mbyllësh periudhën e fundit të vitit.',
    year: 'Viti',
    check: 'Kontrollo',
    checking: 'Po kontrollohet…',
    revenue: 'Të hyrat',
    expenses: 'Shpenzimet',
    profit: 'Fitimi i vitit',
    loss: 'Humbja e vitit',
    closedChip: 'I mbyllur',
    closedNote: (entry: number) => `Viti është mbyllur me regjistrimin #${entry}. Për ta ribërë, stornoje atë regjistrim te Ditari.`,
    blockers: 'Para mbylljes duhet rregulluar:',
    account: 'Llogaria',
    balance: 'Saldo e vitit',
    close: (year: number) => `Mbyll vitin ${year}`,
    closing: 'Po mbyllet…',
    confirm: (year: number, result: string) => `Viti ${year} mbyllet me rezultat ${result}. Regjistrimi postohet menjëherë. Të vazhdohet?`,
    failed: 'Veprimi nuk u krye.',
  },
  en: {
    eyebrow: 'Year end',
    title: 'Close the year',
    note: 'Closing posts one entry on 31 December that brings the revenue and expense accounts back to zero and moves the year\'s profit or loss to retained earnings. The profit and loss report for that year stays the same. Do it before closing the last period of the year.',
    year: 'Year',
    check: 'Check',
    checking: 'Checking…',
    revenue: 'Revenue',
    expenses: 'Expenses',
    profit: 'Profit for the year',
    loss: 'Loss for the year',
    closedChip: 'Closed',
    closedNote: (entry: number) => `The year is closed with journal entry #${entry}. To redo it, reverse that entry in the Journal.`,
    blockers: 'Before closing, fix:',
    account: 'Account',
    balance: 'Balance for the year',
    close: (year: number) => `Close ${year}`,
    closing: 'Closing…',
    confirm: (year: number, result: string) => `${year} closes with a result of ${result}. The entry is posted immediately. Continue?`,
    failed: 'That did not work.',
  },
})

const year = ref(new Date().getFullYear() - 1)
const preview = ref<YearEndPreview | null>(null)
const working = ref<'' | 'check' | 'close'>('')
const error = ref('')

function money(value: string): string {
  return formatMoney(value, props.currency)
}

async function check(): Promise<void> {
  working.value = 'check'
  error.value = ''
  try {
    const response = await api.get<{ data: YearEndPreview }>(`/api/v1/businesses/${props.businessId}/year-end/${year.value}`)
    preview.value = response.data.data
  } catch (caught: unknown) {
    preview.value = null
    error.value = getApiError(caught, m.value.failed)
  } finally {
    working.value = ''
  }
}

async function close(): Promise<void> {
  if (!preview.value || !window.confirm(m.value.confirm(preview.value.year, money(preview.value.result)))) return
  working.value = 'close'
  error.value = ''
  try {
    await api.post(`/api/v1/businesses/${props.businessId}/year-end/${preview.value.year}/close`)
    emit('closed')
    await check()
  } catch (caught: unknown) {
    error.value = getApiError(caught, m.value.failed)
  } finally {
    working.value = ''
  }
}
</script>

<template>
  <section class="year-end" aria-labelledby="year-end-heading">
    <p class="eyebrow">{{ m.eyebrow }}</p>
    <h3 id="year-end-heading">{{ m.title }}</h3>
    <p class="form-note">{{ m.note }}</p>
    <form class="year-form" @submit.prevent="check">
      <label>{{ m.year }}<input v-model.number="year" type="number" min="2000" max="2099" step="1" required /></label>
      <button class="primary-button" type="submit" :disabled="working !== ''">{{ working === 'check' ? m.checking : m.check }}</button>
    </form>
    <p v-if="error" class="error-text" role="alert">{{ error }}</p>

    <template v-if="preview">
      <div class="summary-grid year-summary">
        <article class="summary-card"><span>{{ m.revenue }}</span><strong>{{ money(preview.revenue) }}</strong></article>
        <article class="summary-card"><span>{{ m.expenses }}</span><strong>{{ money(preview.expenses) }}</strong></article>
        <article class="summary-card"><span>{{ Number(preview.result) < 0 ? m.loss : m.profit }}</span><strong>{{ money(preview.result) }}</strong></article>
      </div>
      <p v-if="preview.closed && preview.closing_entry_id" class="form-note"><span class="severity-chip ok">{{ m.closedChip }}</span> {{ m.closedNote(preview.closing_entry_id) }}</p>
      <div v-else-if="preview.blockers.length" class="year-blockers" role="status">
        <strong>{{ m.blockers }}</strong>
        <ul><li v-for="blocker in preview.blockers" :key="blocker">{{ blocker }}</li></ul>
      </div>
      <table v-if="preview.accounts.length" class="report-table">
        <thead><tr><th>{{ m.account }}</th><th>{{ m.balance }}</th></tr></thead>
        <tbody><tr v-for="account in preview.accounts" :key="account.code"><td>{{ account.code }} · {{ account.name }}</td><td>{{ money(account.balance) }}</td></tr></tbody>
      </table>
      <div v-if="canEdit && !preview.closed && !preview.blockers.length" class="form-footer">
        <button class="primary-button" type="button" :disabled="working !== ''" @click="close">{{ working === 'close' ? m.closing : m.close(preview.year) }}</button>
      </div>
    </template>
  </section>
</template>

<style scoped>
.year-end { margin-top: 28px; padding-top: 22px; border-top: 1px solid #e1e8e1; }
.year-end h3 { margin: 0; color: #20382b; font-size: 17px; }
.year-form { display: flex; align-items: end; gap: 12px; }
.year-form label { display: grid; gap: 6px; color: #45594c; font-size: 12px; font-weight: 650; }
.year-form input { width: 110px; min-height: 40px; padding: 8px 10px; border: 1px solid #d8e1d9; border-radius: 8px; font: inherit; }
.year-summary { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.year-blockers { margin-top: 14px; padding: 12px 14px; border: 1px solid #ecd6a8; border-radius: 10px; color: #6b4a12; background: #fdf9ef; font-size: 13px; }
.year-blockers ul { margin: 6px 0 0; padding-left: 18px; }
.report-table { margin-top: 16px; }
.report-table td:last-child, .report-table th:last-child { text-align: right; }
.report-table td:first-child, .report-table th:first-child { text-align: left; }
@media (max-width: 640px) { .year-summary { grid-template-columns: 1fr; } }
</style>
