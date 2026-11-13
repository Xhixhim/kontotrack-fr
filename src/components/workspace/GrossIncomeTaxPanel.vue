<script setup lang="ts">
import { ref } from 'vue'
import api from '@/lib/api'
import { formatDate, formatMoney, getApiError } from '@/lib/format'
import { useMessages } from '@/lib/locale'

interface Worksheet {
  year: number
  quarter: number
  from: string
  to: string
  rule_set: { version: string; source_title: string; source_url: string | null }
  activities: Array<{ key: string; label: string; rate_percent: string; gross_income: string; tax: string }>
  accounts: Array<{ id: number; code: string; name: string; gross_income: string; activity: string | null }>
  unassigned_gross_income: string
  complete: boolean
  gross_income: string
  calculated_tax: string
  minimum_per_quarter: string
  tax_due: string
  minimum_applied: boolean
  year_to_date_gross_income: string
  threshold_amount: string
  over_threshold: boolean
}

const props = defineProps<{ businessId: number; currency: string; canEdit: boolean }>()

const m = useMessages({
  sq: {
    intro: 'Për bizneset e vogla që paguajnë tatim tremujor mbi të hyrat bruto në vend të tatimit mbi fitimin. Normat, minimumi dhe kufiri merren nga rregullat e miratuara tatimore; kjo është fletë pune për kontroll, jo deklaratë.',
    year: 'Viti',
    quarter: 'Tremujori',
    quarters: ['Janar – Mars', 'Prill – Qershor', 'Korrik – Shtator', 'Tetor – Dhjetor'],
    calculate: 'Llogarit',
    calculating: 'Po llogaritet…',
    period: (from: string, to: string) => `Periudha ${from} – ${to}`,
    activity: 'Aktiviteti',
    rate: 'Norma',
    income: 'Të hyrat bruto',
    tax: 'Tatimi',
    total: 'Gjithsej',
    due: 'Tatimi për pagesë',
    minimumNote: (minimum: string) => `Tatimi i llogaritur është më i ulët se minimumi tremujor, prandaj paguhet minimumi prej ${minimum}.`,
    incompleteNote: (amount: string) => `${amount} të hyra janë në llogari pa aktivitet të caktuar dhe nuk janë tatuar. Cakto aktivitetin më poshtë.`,
    thresholdNote: (income: string, limit: string) => `Të hyrat bruto nga fillimi i vitit (${income}) e kanë kaluar kufirin prej ${limit}. Mbi këtë kufi biznesi tatohet mbi fitimin; kontrollo me ATK-në kur ndryshon regjimi.`,
    yearToDate: (income: string, limit: string) => `Të hyrat bruto nga fillimi i vitit: ${income} nga kufiri prej ${limit}.`,
    accountsTitle: 'Llogaritë e të hyrave',
    accountsNote: 'Çdo llogari të hyrash i takon një aktiviteti, sepse normat ndryshojnë sipas aktivitetit.',
    account: 'Llogaria',
    notSet: 'Pa caktuar',
    basisNote: 'Llogaritet nga të hyrat e postuara në kontabilitet për tremujorin (faturat e lëshuara, pas notave të kreditit). Nëse deklaroni sipas arkëtimeve, korrigjoni për faturat e papaguara.',
    source: 'Rregullat',
    print: 'Printo',
    failed: 'Fleta e punës nuk u llogarit.',
    saveFailed: 'Aktiviteti nuk u ruajt.',
  },
  en: {
    intro: 'For small businesses that pay a quarterly tax on gross income instead of tax on profit. Rates, the minimum and the limit come from the approved tax rules; this is a worksheet to check, not a filing.',
    year: 'Year',
    quarter: 'Quarter',
    quarters: ['January – March', 'April – June', 'July – September', 'October – December'],
    calculate: 'Calculate',
    calculating: 'Calculating…',
    period: (from: string, to: string) => `Period ${from} – ${to}`,
    activity: 'Activity',
    rate: 'Rate',
    income: 'Gross income',
    tax: 'Tax',
    total: 'Total',
    due: 'Tax to pay',
    minimumNote: (minimum: string) => `The calculated tax is below the quarterly minimum, so the minimum of ${minimum} is due.`,
    incompleteNote: (amount: string) => `${amount} of income sits in accounts without an activity and was not taxed. Choose the activity below.`,
    thresholdNote: (income: string, limit: string) => `Gross income since the start of the year (${income}) has passed the limit of ${limit}. Above it the business is taxed on profit; check with ATK when the regime changes.`,
    yearToDate: (income: string, limit: string) => `Gross income since the start of the year: ${income} of the ${limit} limit.`,
    accountsTitle: 'Revenue accounts',
    accountsNote: 'Each revenue account belongs to one activity, because the rates differ by activity.',
    account: 'Account',
    notSet: 'Not set',
    basisNote: 'Calculated from revenue posted in the ledger for the quarter (issued invoices, after credit notes). If you declare on receipts, adjust for unpaid invoices.',
    source: 'Rules',
    print: 'Print',
    failed: 'The worksheet could not be calculated.',
    saveFailed: 'The activity was not saved.',
  },
})

const today = new Date()
// Default to the quarter that has just ended, which is the one being declared.
const lastQuarter = Math.floor(today.getMonth() / 3)
const year = ref(lastQuarter === 0 ? today.getFullYear() - 1 : today.getFullYear())
const quarter = ref(lastQuarter === 0 ? 4 : lastQuarter)
const worksheet = ref<Worksheet | null>(null)
const loading = ref(false)
const saving = ref(false)
const error = ref('')

function money(value: string): string {
  return formatMoney(value, props.currency)
}

async function calculate(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    const response = await api.get<{ data: Worksheet }>(`/api/v1/businesses/${props.businessId}/tax/gross-income`, { params: { year: year.value, quarter: quarter.value } })
    worksheet.value = response.data.data
  } catch (caught: unknown) {
    worksheet.value = null
    error.value = getApiError(caught, m.value.failed)
  } finally {
    loading.value = false
  }
}

async function assign(accountId: number, activity: string): Promise<void> {
  saving.value = true
  error.value = ''
  try {
    await api.put(`/api/v1/businesses/${props.businessId}/accounts/${accountId}/tax-activity`, { activity: activity || null })
    await calculate()
  } catch (caught: unknown) {
    error.value = getApiError(caught, m.value.saveFailed)
  } finally {
    saving.value = false
  }
}

function printWorksheet(): void {
  window.print()
}
</script>

<template>
  <div>
    <p class="form-note gross-intro no-print">{{ m.intro }}</p>
    <form class="report-filters gross-filters no-print" @submit.prevent="calculate">
      <label>{{ m.year }}<input v-model.number="year" type="number" min="2000" max="2099" step="1" required /></label>
      <label>{{ m.quarter }}<select v-model.number="quarter"><option v-for="(label, index) in m.quarters" :key="label" :value="index + 1">{{ index + 1 }} · {{ label }}</option></select></label>
      <button class="primary-button" type="submit" :disabled="loading">{{ loading ? m.calculating : m.calculate }}</button>
    </form>
    <p v-if="error" class="error-text" role="alert">{{ error }}</p>

    <template v-if="worksheet">
      <div class="report-actions gross-actions no-print"><button class="text-button" type="button" @click="printWorksheet">{{ m.print }}</button></div>
      <p class="form-note">{{ m.period(formatDate(worksheet.from), formatDate(worksheet.to)) }}</p>

      <div class="report-table-wrap">
        <table class="report-table gross-table">
          <thead><tr><th>{{ m.activity }}</th><th class="amount">{{ m.rate }}</th><th class="amount">{{ m.income }}</th><th class="amount">{{ m.tax }}</th></tr></thead>
          <tbody><tr v-for="activity in worksheet.activities" :key="activity.key"><td>{{ activity.label }}</td><td class="amount">{{ Number(activity.rate_percent) }}%</td><td class="amount">{{ money(activity.gross_income) }}</td><td class="amount">{{ money(activity.tax) }}</td></tr></tbody>
          <tfoot>
            <tr><th>{{ m.total }}</th><th></th><th class="amount">{{ money(worksheet.gross_income) }}</th><th class="amount">{{ money(worksheet.calculated_tax) }}</th></tr>
            <tr><th>{{ m.due }}</th><th></th><th></th><th class="amount">{{ money(worksheet.tax_due) }}</th></tr>
          </tfoot>
        </table>
      </div>

      <p v-if="!worksheet.complete" class="gross-warning" role="status">{{ m.incompleteNote(money(worksheet.unassigned_gross_income)) }}</p>
      <p v-if="worksheet.minimum_applied" class="form-note" role="status">{{ m.minimumNote(money(worksheet.minimum_per_quarter)) }}</p>
      <p v-if="worksheet.over_threshold" class="gross-warning" role="status">{{ m.thresholdNote(money(worksheet.year_to_date_gross_income), money(worksheet.threshold_amount)) }}</p>
      <p v-else class="form-note">{{ m.yearToDate(money(worksheet.year_to_date_gross_income), money(worksheet.threshold_amount)) }}</p>

      <h3 class="gross-heading">{{ m.accountsTitle }}</h3>
      <p class="form-note">{{ m.accountsNote }}</p>
      <div class="report-table-wrap">
        <table class="report-table gross-table">
          <thead><tr><th>{{ m.account }}</th><th>{{ m.activity }}</th><th class="amount">{{ m.income }}</th></tr></thead>
          <tbody>
            <tr v-for="account in worksheet.accounts" :key="account.id">
              <td>{{ account.code }} · {{ account.name }}</td>
              <td>
                <select v-if="canEdit" :value="account.activity ?? ''" :disabled="saving" :aria-label="`${m.activity}: ${account.name}`" @change="assign(account.id, ($event.target as HTMLSelectElement).value)">
                  <option value="">{{ m.notSet }}</option>
                  <option v-for="activity in worksheet.activities" :key="activity.key" :value="activity.key">{{ activity.label }}</option>
                </select>
                <template v-else>{{ worksheet.activities.find((activity) => activity.key === account.activity)?.label ?? m.notSet }}</template>
              </td>
              <td class="amount">{{ money(account.gross_income) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p class="form-note gross-basis">{{ m.basisNote }}</p>
      <p class="form-note">{{ m.source }}: {{ worksheet.rule_set.source_title }} · {{ worksheet.rule_set.version }}</p>
    </template>
  </div>
</template>

<style scoped>
.gross-intro { margin-top: 18px; }
.gross-filters { grid-template-columns: minmax(110px, 160px) minmax(200px, 1fr) auto; }
.gross-actions { justify-content: flex-end; margin-top: 12px; }
.gross-table td, .gross-table th { text-align: left; white-space: normal; }
.gross-table .amount { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
.gross-table select { min-height: 36px; max-width: 100%; padding: 6px 8px; border: 1px solid #d8e1d9; border-radius: 8px; background: #fff; font: inherit; }
.gross-warning { margin: 12px 0; padding: 10px 12px; border: 1px solid #ecd6a8; border-radius: 10px; color: #6b4a12; background: #fdf9ef; font-size: 13px; }
.gross-heading { margin: 22px 0 0; color: #20382b; font-size: 16px; }
.gross-basis { margin-top: 16px; }
@media (max-width: 640px) { .gross-filters { grid-template-columns: 1fr; } }
</style>
