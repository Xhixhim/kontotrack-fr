<script setup lang="ts">
import { onMounted, ref } from 'vue'
import api from '@/lib/api'
import { downloadCsv, formatDate, formatMoney, getApiError, nullableText, todayIsoDate } from '@/lib/format'

interface FixedAsset {
  id: number
  asset_code: string
  name: string
  category: string
  location: string | null
  acquired_on: string
  cost: string
  residual_value: string
  accumulated_depreciation: string
  book_value: string
  depreciation_method: 'straight_line' | 'declining_balance'
  useful_life_months: number | null
  annual_rate_percent: string | null
  status: 'active' | 'disposed'
  disposed_on: string | null
  events?: Array<{ id: number; event_type: string; occurred_on: string; details: Record<string, unknown> | null; user: string | null }>
  depreciation?: Array<{ period: string; amount: string; closing_book_value: string }>
}

interface DepreciationRun {
  id: number
  period_year: number
  period_month: number
  status: 'draft' | 'approved'
  total: string
  lines?: Array<{ id: number; asset_code: string; asset_name: string; opening_book_value: string; amount: string; closing_book_value: string }>
}

const props = defineProps<{ businessId: number; currency: string; canEdit: boolean }>()

const section = ref<'assets' | 'depreciation'>('assets')
const assets = ref<FixedAsset[]>([])
const runs = ref<DepreciationRun[]>([])
const selectedAsset = ref<FixedAsset | null>(null)
const selectedRun = ref<DepreciationRun | null>(null)
const error = ref('')
const saving = ref(false)
const showAssetForm = ref(false)
const assetForm = ref(emptyAssetForm())
const transferForm = ref({ location: '', transferred_on: todayIsoDate(), note: '' })
const disposeForm = ref({ disposed_on: todayIsoDate(), disposal_type: 'written_off' as 'sold' | 'written_off', disposal_proceeds: '', note: '' })
const runForm = ref({ period_year: Number(todayIsoDate().slice(0, 4)), period_month: Number(todayIsoDate().slice(5, 7)) })

function emptyAssetForm() {
  return { asset_code: '', name: '', category: '', location: '', acquired_on: todayIsoDate(), cost: '', residual_value: '0', opening_accumulated_depreciation: '0', depreciation_method: 'straight_line' as FixedAsset['depreciation_method'], useful_life_months: '60', annual_rate_percent: '' }
}

function money(value: string | number | null | undefined): string {
  return formatMoney(value, props.currency)
}

function periodLabel(year: number, month: number): string {
  return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1))
}

async function load(): Promise<void> {
  try {
    const [assetsResponse, runsResponse] = await Promise.all([
      api.get<{ data: FixedAsset[] }>(`/api/v1/businesses/${props.businessId}/fixed-assets`),
      api.get<{ data: DepreciationRun[] }>(`/api/v1/businesses/${props.businessId}/depreciation-runs`),
    ])
    assets.value = assetsResponse.data.data
    runs.value = runsResponse.data.data
  } catch (caught: unknown) {
    error.value = getApiError(caught, 'We could not load fixed assets.')
  }
}

async function run(action: () => Promise<void>, fallback: string): Promise<void> {
  saving.value = true
  error.value = ''

  try {
    await action()
  } catch (caught: unknown) {
    error.value = getApiError(caught, fallback)
  } finally {
    saving.value = false
  }
}

function saveAsset(): Promise<void> {
  return run(async () => {
    const form = assetForm.value
    const response = await api.post<{ data: FixedAsset }>(`/api/v1/businesses/${props.businessId}/fixed-assets`, {
      asset_code: form.asset_code,
      name: form.name,
      category: form.category,
      location: nullableText(form.location),
      acquired_on: form.acquired_on,
      cost: form.cost,
      residual_value: form.residual_value || '0',
      opening_accumulated_depreciation: form.opening_accumulated_depreciation || '0',
      depreciation_method: form.depreciation_method,
      useful_life_months: form.depreciation_method === 'straight_line' ? Number(form.useful_life_months) : null,
      annual_rate_percent: form.depreciation_method === 'declining_balance' ? form.annual_rate_percent : null,
    })
    assets.value = [...assets.value, response.data.data].sort((left, right) => left.asset_code.localeCompare(right.asset_code))
    assetForm.value = emptyAssetForm()
    showAssetForm.value = false
  }, 'We could not register this asset.')
}

function openAsset(asset: FixedAsset): Promise<void> {
  return run(async () => {
    const response = await api.get<{ data: FixedAsset }>(`/api/v1/businesses/${props.businessId}/fixed-assets/${asset.id}`)
    selectedAsset.value = response.data.data
    transferForm.value = { location: '', transferred_on: todayIsoDate(), note: '' }
    disposeForm.value = { disposed_on: todayIsoDate(), disposal_type: 'written_off', disposal_proceeds: '', note: '' }
  }, 'We could not load this asset.')
}

function replaceAsset(updated: FixedAsset): void {
  selectedAsset.value = updated
  assets.value = assets.value.map((asset) => asset.id === updated.id ? updated : asset)
}

function transferAsset(asset: FixedAsset): Promise<void> {
  return run(async () => {
    const response = await api.post<{ data: FixedAsset }>(`/api/v1/businesses/${props.businessId}/fixed-assets/${asset.id}/transfer`, { ...transferForm.value, note: nullableText(transferForm.value.note) })
    replaceAsset(response.data.data)
  }, 'We could not transfer this asset.')
}

function disposeAsset(asset: FixedAsset): Promise<void> {
  return run(async () => {
    const form = disposeForm.value
    const response = await api.post<{ data: FixedAsset }>(`/api/v1/businesses/${props.businessId}/fixed-assets/${asset.id}/dispose`, {
      disposed_on: form.disposed_on,
      disposal_type: form.disposal_type,
      disposal_proceeds: form.disposal_type === 'sold' ? form.disposal_proceeds : null,
      note: nullableText(form.note),
    })
    replaceAsset(response.data.data)
  }, 'We could not dispose of this asset.')
}

function createRun(): Promise<void> {
  return run(async () => {
    const response = await api.post<{ data: DepreciationRun }>(`/api/v1/businesses/${props.businessId}/depreciation-runs`, runForm.value)
    runs.value = [response.data.data, ...runs.value]
    selectedRun.value = response.data.data
  }, 'We could not calculate depreciation.')
}

function openRun(item: DepreciationRun): Promise<void> {
  return run(async () => {
    const response = await api.get<{ data: DepreciationRun }>(`/api/v1/businesses/${props.businessId}/depreciation-runs/${item.id}`)
    selectedRun.value = response.data.data
  }, 'We could not load this depreciation run.')
}

function approveRun(item: DepreciationRun): Promise<void> {
  return run(async () => {
    const response = await api.post<{ data: DepreciationRun }>(`/api/v1/businesses/${props.businessId}/depreciation-runs/${item.id}/approve`)
    runs.value = runs.value.map((existing) => existing.id === item.id ? response.data.data : existing)
    selectedRun.value = response.data.data
    await load()
  }, 'This depreciation run could not be approved.')
}

function deleteRun(item: DepreciationRun): Promise<void> {
  return run(async () => {
    await api.delete(`/api/v1/businesses/${props.businessId}/depreciation-runs/${item.id}`)
    runs.value = runs.value.filter((existing) => existing.id !== item.id)
    selectedRun.value = null
  }, 'This depreciation run could not be deleted.')
}

function exportRegister(): void {
  downloadCsv([
    ['Code', 'Asset', 'Category', 'Location', 'Acquired', 'Cost', 'Accumulated depreciation', 'Book value', 'Method', 'Status'],
    ...assets.value.map((asset) => [asset.asset_code, asset.name, asset.category, asset.location ?? '', asset.acquired_on, asset.cost, asset.accumulated_depreciation, asset.book_value, asset.depreciation_method, asset.status]),
  ], `kontotrack-fixed-assets-${todayIsoDate()}.csv`, 4)
}

onMounted(load)
</script>

<template>
  <div>
    <div class="panel-heading no-print">
      <div><p class="eyebrow">Equipment, vehicles, buildings</p><h2>Fixed assets</h2></div>
      <div class="report-actions">
        <button class="text-button" type="button" :disabled="!assets.length" @click="exportRegister">Export register</button>
        <button v-if="canEdit && section === 'assets'" class="primary-button" type="button" @click="showAssetForm = !showAssetForm">{{ showAssetForm ? 'Cancel' : 'Register asset' }}</button>
      </div>
    </div>
    <nav class="kind-tabs no-print" aria-label="Fixed assets">
      <button :class="{ active: section === 'assets' }" @click="section = 'assets'">Asset register</button>
      <button :class="{ active: section === 'depreciation' }" @click="section = 'depreciation'">Monthly depreciation</button>
    </nav>
    <p v-if="error" class="error-text" role="alert">{{ error }}</p>

    <template v-if="section === 'assets'">
      <form v-if="showAssetForm" class="entry-form" @submit.prevent="saveAsset">
        <h3>New fixed asset</h3>
        <div class="fields-grid">
          <label>Asset code<input v-model.trim="assetForm.asset_code" required maxlength="40" /></label>
          <label>Name<input v-model.trim="assetForm.name" required maxlength="180" /></label>
          <label>Category<input v-model.trim="assetForm.category" required maxlength="80" placeholder="Vehicles, IT equipment…" /></label>
          <label>Location <span>(optional)</span><input v-model.trim="assetForm.location" maxlength="120" /></label>
          <label>Acquired on<input v-model="assetForm.acquired_on" type="date" required /></label>
          <label>Cost<input v-model="assetForm.cost" type="number" min="0.01" step="0.01" required /></label>
          <label>Residual value<input v-model="assetForm.residual_value" type="number" min="0" step="0.01" /></label>
          <label>Depreciation already recorded <span>(for older assets)</span><input v-model="assetForm.opening_accumulated_depreciation" type="number" min="0" step="0.01" /></label>
          <label>Method<select v-model="assetForm.depreciation_method"><option value="straight_line">Straight line</option><option value="declining_balance">Declining balance</option></select></label>
          <label v-if="assetForm.depreciation_method === 'straight_line'">Useful life (months)<input v-model="assetForm.useful_life_months" type="number" min="1" max="1200" required /></label>
          <label v-else>Annual rate (%)<input v-model="assetForm.annual_rate_percent" type="number" min="0.0001" max="100" step="0.0001" required /></label>
        </div>
        <p class="form-note">Depreciation starts the month after acquisition and never takes the book value below the residual value.</p>
        <div class="form-footer"><button class="primary-button" type="submit" :disabled="saving">{{ saving ? 'Saving…' : 'Save asset' }}</button></div>
      </form>
      <div class="report-table-wrap">
        <table class="report-table">
          <thead><tr><th>Code</th><th>Asset</th><th>Acquired</th><th>Cost</th><th>Depreciated</th><th>Book value</th><th>Status</th><th></th></tr></thead>
          <tbody>
            <tr v-for="asset in assets" :key="asset.id">
              <td>{{ asset.asset_code }}</td><td>{{ asset.name }}<template v-if="asset.location"> · {{ asset.location }}</template></td><td>{{ formatDate(asset.acquired_on) }}</td>
              <td>{{ money(asset.cost) }}</td><td>{{ money(asset.accumulated_depreciation) }}</td><td>{{ money(asset.book_value) }}</td>
              <td><span class="status-chip" :class="{ posted: asset.status === 'active' }">{{ asset.status }}</span></td>
              <td><button class="text-button" type="button" @click="openAsset(asset)">Open</button></td>
            </tr>
            <tr v-if="!assets.length"><td colspan="8" class="empty-message">No fixed assets registered yet.</td></tr>
          </tbody>
        </table>
      </div>
      <section v-if="selectedAsset" class="contact-card">
        <div class="contact-card-heading">
          <div><p class="eyebrow">{{ selectedAsset.asset_code }} · {{ selectedAsset.category }}</p><h3>{{ selectedAsset.name }}</h3><p class="form-note">{{ selectedAsset.depreciation_method === 'straight_line' ? `Straight line over ${selectedAsset.useful_life_months} months` : `Declining balance at ${selectedAsset.annual_rate_percent}% a year` }} · residual {{ money(selectedAsset.residual_value) }}</p></div>
          <button class="text-button" type="button" @click="selectedAsset = null">Close</button>
        </div>
        <div class="summary-grid">
          <article class="summary-card"><span>Cost</span><strong>{{ money(selectedAsset.cost) }}</strong></article>
          <article class="summary-card"><span>Accumulated depreciation</span><strong>{{ money(selectedAsset.accumulated_depreciation) }}</strong></article>
          <article class="summary-card"><span>Book value</span><strong>{{ money(selectedAsset.book_value) }}</strong></article>
        </div>
        <h4>History</h4>
        <ul class="audit-list">
          <li v-for="event in selectedAsset.events ?? []" :key="event.id"><strong>{{ event.event_type.replace('_', ' ') }}</strong> · {{ formatDate(event.occurred_on) }}<template v-if="event.user"> · {{ event.user }}</template><span v-for="(value, key) in event.details ?? {}" :key="key"><template v-if="value !== null">{{ String(key).replace('_', ' ') }}: {{ value }}</template></span></li>
          <li v-for="line in selectedAsset.depreciation ?? []" :key="line.period">Depreciation {{ line.period }} · {{ money(line.amount) }} → book value {{ money(line.closing_book_value) }}</li>
        </ul>
        <div v-if="canEdit && selectedAsset.status === 'active'" class="fields-grid">
          <form class="entry-form" @submit.prevent="transferAsset(selectedAsset)">
            <h4>Transfer</h4>
            <label>New location<input v-model.trim="transferForm.location" required maxlength="120" /></label>
            <label>Date<input v-model="transferForm.transferred_on" type="date" required /></label>
            <label>Note<input v-model.trim="transferForm.note" maxlength="500" /></label>
            <div class="form-footer"><button class="text-button" type="submit" :disabled="saving">Record transfer</button></div>
          </form>
          <form class="entry-form" @submit.prevent="disposeAsset(selectedAsset)">
            <h4>Sell or write off</h4>
            <label>Type<select v-model="disposeForm.disposal_type"><option value="written_off">Write off</option><option value="sold">Sold</option></select></label>
            <label>Date<input v-model="disposeForm.disposed_on" type="date" required /></label>
            <label v-if="disposeForm.disposal_type === 'sold'">Sale proceeds<input v-model="disposeForm.disposal_proceeds" type="number" min="0" step="0.01" required /></label>
            <label>Note<input v-model.trim="disposeForm.note" maxlength="500" /></label>
            <p class="form-note">The remaining book value is posted as a disposal loss. Record any sale with a sales invoice.</p>
            <div class="form-footer"><button class="primary-button" type="submit" :disabled="saving">Dispose of asset</button></div>
          </form>
        </div>
      </section>
    </template>

    <template v-else>
      <form v-if="canEdit" class="report-filters no-print" @submit.prevent="createRun">
        <label>Year<input v-model.number="runForm.period_year" type="number" min="2000" max="2100" required /></label>
        <label>Month<select v-model.number="runForm.period_month"><option v-for="month in 12" :key="month" :value="month">{{ new Intl.DateTimeFormat('en-GB', { month: 'long' }).format(new Date(2026, month - 1, 1)) }}</option></select></label>
        <button class="primary-button" type="submit" :disabled="saving">{{ saving ? 'Calculating…' : 'Calculate depreciation' }}</button>
      </form>
      <p class="form-note no-print">Runs are made month by month in order. Approving posts depreciation expense against accumulated depreciation on the last day of the month.</p>
      <div class="contact-list no-print">
        <article v-for="item in runs" :key="item.id" class="contact-row">
          <div><strong>{{ periodLabel(item.period_year, item.period_month) }}</strong><span>{{ money(item.total) }}</span></div>
          <span class="status-chip" :class="{ posted: item.status === 'approved' }">{{ item.status }}</span>
          <div class="contact-actions"><button class="text-button" type="button" @click="openRun(item)">Open</button></div>
        </article>
        <p v-if="!runs.length" class="empty-message">No depreciation calculated yet.</p>
      </div>
      <section v-if="selectedRun" class="contact-card">
        <div class="contact-card-heading">
          <div><p class="eyebrow">Depreciation</p><h3>{{ periodLabel(selectedRun.period_year, selectedRun.period_month) }} · {{ money(selectedRun.total) }}</h3></div>
          <div class="report-actions">
            <button v-if="canEdit && selectedRun.status === 'draft'" class="text-button" type="button" :disabled="saving" @click="deleteRun(selectedRun)">Delete draft</button>
            <button v-if="canEdit && selectedRun.status === 'draft'" class="primary-button" type="button" :disabled="saving" @click="approveRun(selectedRun)">Approve and post</button>
          </div>
        </div>
        <div class="report-table-wrap">
          <table class="report-table">
            <thead><tr><th>Asset</th><th>Opening book value</th><th>Depreciation</th><th>Closing book value</th></tr></thead>
            <tbody><tr v-for="line in selectedRun.lines ?? []" :key="line.id"><td>{{ line.asset_code }} · {{ line.asset_name }}</td><td>{{ money(line.opening_book_value) }}</td><td>{{ money(line.amount) }}</td><td>{{ money(line.closing_book_value) }}</td></tr></tbody>
          </table>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.contact-card-heading { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 12px; }
.contact-card h4 { margin: 18px 0 8px; }
.entry-form label { display: grid; gap: 4px; }
</style>
