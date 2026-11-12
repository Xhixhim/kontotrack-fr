<script setup lang="ts">
import { computed, ref } from 'vue'
import api from '@/lib/api'
import { downloadFromApi } from '@/lib/download'
import { formatMoney, getApiError, todayIsoDate } from '@/lib/format'
import { useMessages } from '@/lib/locale'

type ReportType = 'turnover' | 'stock' | 'payroll' | 'fixed_assets'
type Cell = string | number | null
interface Section { heading: string | null; columns: Array<{ label: string; amount: boolean }>; rows: Cell[][]; totals: Cell[][] }
interface ReportTable { title: string; sections: Section[] }

const props = defineProps<{
  businessId: number
  currency: string
  counterparties: Array<{ id: number; name: string }>
  warehouses: Array<{ id: number; name: string }>
  units: Array<{ id: number; name: string }>
  canViewPayroll: boolean
}>()

const m = useMessages({
  sq: {
    report: 'Raporti',
    types: { turnover: 'Qarkullimi (shitje dhe blerje)', stock: 'Gjendja e stokut', payroll: 'Pagat', fixed_assets: 'Regjistri i aseteve fikse' } as Record<ReportType, string>,
    from: 'Nga',
    to: 'Deri',
    asOf: 'Më datë',
    groupBy: 'Grupo sipas',
    byMonth: 'Muajit',
    byCounterparty: 'Klientit / furnitorit',
    counterparty: 'Klienti / furnitori',
    all: 'Të gjithë',
    unit: 'Njësia',
    wholeBusiness: 'I gjithë biznesi',
    warehouse: 'Depoja',
    allWarehouses: 'Të gjitha depot',
    category: 'Kategoria',
    allCategories: 'Të gjitha kategoritë',
    generate: 'Gjenero',
    generating: 'Po gjenerohet…',
    print: 'Printo',
    exporting: 'Po eksportohet…',
    empty: 'Nuk ka të dhëna për këto filtra.',
    notes: {
      turnover: 'Bazohet në faturat e lëshuara; notat e kreditit dhe anulimet zbriten në muajin kur janë bërë.',
      stock: 'Vlera llogaritet me çmimin e blerjes së artikullit. ▼ tregon artikujt nën minimum.',
      payroll: 'Përfshin vetëm listat e pagave të miratuara.',
      fixed_assets: 'Amortizimi përfshin vetëm llogaritjet e miratuara deri në muajin e zgjedhur. Asetet e çregjistruara nuk hyjnë në total.',
    } as Record<ReportType, string>,
    loadFailed: 'Raporti nuk u gjenerua.',
    exportFailed: 'Raporti nuk u eksportua.',
  },
  en: {
    report: 'Report',
    types: { turnover: 'Turnover (sales and purchases)', stock: 'Stock on hand', payroll: 'Payroll', fixed_assets: 'Fixed asset register' } as Record<ReportType, string>,
    from: 'From',
    to: 'To',
    asOf: 'As of',
    groupBy: 'Group by',
    byMonth: 'Month',
    byCounterparty: 'Customer / supplier',
    counterparty: 'Customer / supplier',
    all: 'All',
    unit: 'Unit',
    wholeBusiness: 'Whole business',
    warehouse: 'Warehouse',
    allWarehouses: 'All warehouses',
    category: 'Category',
    allCategories: 'All categories',
    generate: 'Generate',
    generating: 'Generating…',
    print: 'Print',
    exporting: 'Exporting…',
    empty: 'There is no data for these filters.',
    notes: {
      turnover: 'Based on issued invoices; credit notes and cancellations are deducted in the month they were made.',
      stock: 'Value uses the purchase price of the item. ▼ marks items below their minimum.',
      payroll: 'Only approved payroll runs are included.',
      fixed_assets: 'Depreciation includes only runs approved up to the chosen month. Disposed assets are not in the total.',
    } as Record<ReportType, string>,
    loadFailed: 'The report could not be generated.',
    exportFailed: 'The report could not be exported.',
  },
})

const availableTypes = computed<ReportType[]>(() => (props.canViewPayroll ? ['turnover', 'stock', 'payroll', 'fixed_assets'] : ['turnover', 'stock', 'fixed_assets']))
const reportType = ref<ReportType>('turnover')
const from = ref(`${todayIsoDate().slice(0, 4)}-01-01`)
const to = ref(todayIsoDate())
const groupBy = ref<'month' | 'counterparty'>('month')
const counterpartyId = ref('')
const warehouseId = ref('')
const unitId = ref('')
const category = ref('')
const table = ref<ReportTable | null>(null)
const shownType = ref<ReportType | null>(null)
const loading = ref(false)
const downloading = ref('')
const error = ref('')

function params(): Record<string, string> {
  const query: Record<string, string> = { type: reportType.value, to: to.value }
  if (reportType.value !== 'fixed_assets') query.from = from.value
  if (reportType.value === 'turnover') {
    query.group_by = groupBy.value
    if (counterpartyId.value) query.counterparty_id = counterpartyId.value
    if (unitId.value) query.business_unit_id = unitId.value
  }
  if (reportType.value === 'stock' && warehouseId.value) query.warehouse_id = warehouseId.value
  if (reportType.value === 'fixed_assets' && category.value) query.category = category.value
  return query
}

async function generate(): Promise<void> {
  loading.value = true
  error.value = ''
  table.value = null
  try {
    const response = await api.get<{ data: { table: ReportTable } }>(`/api/v1/businesses/${props.businessId}/reports/financial`, { params: params() })
    table.value = response.data.data.table
    shownType.value = reportType.value
  } catch (caught: unknown) {
    error.value = getApiError(caught, m.value.loadFailed)
  } finally {
    loading.value = false
  }
}

async function download(format: 'xlsx' | 'pdf'): Promise<void> {
  downloading.value = format
  error.value = ''
  try {
    await downloadFromApi(`/api/v1/businesses/${props.businessId}/reports/financial/export`, { ...params(), format }, `${reportType.value}.${format}`)
  } catch (caught: unknown) {
    error.value = getApiError(caught, m.value.exportFailed)
  } finally {
    downloading.value = ''
  }
}

function show(cell: Cell, isAmount: boolean): string {
  if (cell === null || cell === '') return ''
  return isAmount ? formatMoney(String(cell), props.currency) : String(cell)
}

function printReport(): void {
  window.print()
}
</script>

<template>
  <div>
    <form class="report-filters operational-filters" @submit.prevent="generate">
      <label>{{ m.report }}<select v-model="reportType"><option v-for="type in availableTypes" :key="type" :value="type">{{ m.types[type] }}</option></select></label>
      <label v-if="reportType !== 'fixed_assets'">{{ m.from }}<input v-model="from" type="date" required /></label>
      <label>{{ reportType === 'fixed_assets' ? m.asOf : m.to }}<input v-model="to" type="date" required /></label>
      <template v-if="reportType === 'turnover'">
        <label>{{ m.groupBy }}<select v-model="groupBy"><option value="month">{{ m.byMonth }}</option><option value="counterparty">{{ m.byCounterparty }}</option></select></label>
        <label>{{ m.counterparty }}<select v-model="counterpartyId"><option value="">{{ m.all }}</option><option v-for="party in counterparties" :key="party.id" :value="String(party.id)">{{ party.name }}</option></select></label>
        <label v-if="units.length">{{ m.unit }}<select v-model="unitId"><option value="">{{ m.wholeBusiness }}</option><option v-for="unit in units" :key="unit.id" :value="String(unit.id)">{{ unit.name }}</option></select></label>
      </template>
      <label v-if="reportType === 'stock'">{{ m.warehouse }}<select v-model="warehouseId"><option value="">{{ m.allWarehouses }}</option><option v-for="warehouse in warehouses" :key="warehouse.id" :value="String(warehouse.id)">{{ warehouse.name }}</option></select></label>
      <label v-if="reportType === 'fixed_assets'">{{ m.category }}<input v-model.trim="category" maxlength="120" :placeholder="m.allCategories" /></label>
      <button class="primary-button" type="submit" :disabled="loading">{{ loading ? m.generating : m.generate }}</button>
    </form>
    <p v-if="error" class="error-text" role="alert">{{ error }}</p>

    <template v-if="table && shownType">
      <div class="report-actions operational-actions no-print">
        <button class="text-button" type="button" @click="printReport">{{ m.print }}</button>
        <button class="text-button" type="button" :disabled="downloading !== ''" @click="download('xlsx')">{{ downloading === 'xlsx' ? m.exporting : 'Excel' }}</button>
        <button class="text-button" type="button" :disabled="downloading !== ''" @click="download('pdf')">{{ downloading === 'pdf' ? m.exporting : 'PDF' }}</button>
      </div>
      <h3 class="operational-title">{{ table.title }}</h3>
      <div v-for="(section, index) in table.sections" :key="index" class="report-table-wrap">
        <h4 v-if="section.heading">{{ section.heading }}</h4>
        <table class="report-table operational-table">
          <thead><tr><th v-for="column in section.columns" :key="column.label" :class="{ amount: column.amount }">{{ column.label }}</th></tr></thead>
          <tbody>
            <tr v-for="(row, rowIndex) in section.rows" :key="rowIndex"><td v-for="(cell, cellIndex) in row" :key="cellIndex" :class="{ amount: section.columns[cellIndex]?.amount }">{{ show(cell, section.columns[cellIndex]?.amount ?? false) }}</td></tr>
            <tr v-if="!section.rows.length"><td :colspan="section.columns.length" class="empty-message">{{ m.empty }}</td></tr>
          </tbody>
          <tfoot v-if="section.rows.length"><tr v-for="(row, rowIndex) in section.totals" :key="rowIndex"><th v-for="(cell, cellIndex) in row" :key="cellIndex" :class="{ amount: section.columns[cellIndex]?.amount }">{{ show(cell, section.columns[cellIndex]?.amount ?? false) }}</th></tr></tfoot>
        </table>
      </div>
      <p class="form-note report-note">{{ m.notes[shownType] }}</p>
    </template>
  </div>
</template>

<style scoped>
.operational-filters { grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); }
.operational-actions { justify-content: flex-end; margin-top: 16px; }
.operational-title { margin: 8px 0 0; color: #20382b; font-size: 17px; }
.report-table-wrap h4 { margin: 0 0 8px; color: #45594c; font-size: 13px; }
/* Amount columns are flagged per column, so the shared "last two columns right-aligned" rule is replaced here. */
.operational-table td, .operational-table th { text-align: left; }
.operational-table .amount { text-align: right; font-variant-numeric: tabular-nums; }
.report-note { margin-top: 14px; }
</style>
