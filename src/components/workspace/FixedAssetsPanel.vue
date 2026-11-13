<script setup lang="ts">
import { tr, trf, trValue } from '@/lib/tr'
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
    error.value = getApiError(caught, tr('We could not load fixed assets.'))
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
  }, tr('We could not register this asset.'))
}

function openAsset(asset: FixedAsset): Promise<void> {
  return run(async () => {
    const response = await api.get<{ data: FixedAsset }>(`/api/v1/businesses/${props.businessId}/fixed-assets/${asset.id}`)
    selectedAsset.value = response.data.data
    transferForm.value = { location: '', transferred_on: todayIsoDate(), note: '' }
    disposeForm.value = { disposed_on: todayIsoDate(), disposal_type: 'written_off', disposal_proceeds: '', note: '' }
  }, tr('We could not load this asset.'))
}

function replaceAsset(updated: FixedAsset): void {
  selectedAsset.value = updated
  assets.value = assets.value.map((asset) => asset.id === updated.id ? updated : asset)
}

function transferAsset(asset: FixedAsset): Promise<void> {
  return run(async () => {
    const response = await api.post<{ data: FixedAsset }>(`/api/v1/businesses/${props.businessId}/fixed-assets/${asset.id}/transfer`, { ...transferForm.value, note: nullableText(transferForm.value.note) })
    replaceAsset(response.data.data)
  }, tr('We could not transfer this asset.'))
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
  }, tr('We could not dispose of this asset.'))
}

function createRun(): Promise<void> {
  return run(async () => {
    const response = await api.post<{ data: DepreciationRun }>(`/api/v1/businesses/${props.businessId}/depreciation-runs`, runForm.value)
    runs.value = [response.data.data, ...runs.value]
    selectedRun.value = response.data.data
  }, tr('We could not calculate depreciation.'))
}

function openRun(item: DepreciationRun): Promise<void> {
  return run(async () => {
    const response = await api.get<{ data: DepreciationRun }>(`/api/v1/businesses/${props.businessId}/depreciation-runs/${item.id}`)
    selectedRun.value = response.data.data
  }, tr('We could not load this depreciation run.'))
}

function approveRun(item: DepreciationRun): Promise<void> {
  return run(async () => {
    const response = await api.post<{ data: DepreciationRun }>(`/api/v1/businesses/${props.businessId}/depreciation-runs/${item.id}/approve`)
    runs.value = runs.value.map((existing) => existing.id === item.id ? response.data.data : existing)
    selectedRun.value = response.data.data
    await load()
  }, tr('This depreciation run could not be approved.'))
}

function deleteRun(item: DepreciationRun): Promise<void> {
  return run(async () => {
    await api.delete(`/api/v1/businesses/${props.businessId}/depreciation-runs/${item.id}`)
    runs.value = runs.value.filter((existing) => existing.id !== item.id)
    selectedRun.value = null
  }, tr('This depreciation run could not be deleted.'))
}

function exportRegister(): void {
  downloadCsv([
    [tr('Code'), tr('Asset'), tr('Category'), tr('Location'), tr('Acquired'), tr('Cost'), tr('Accumulated depreciation'), tr('Book value'), tr('Method'), tr('Status')],
    ...assets.value.map((asset) => [asset.asset_code, asset.name, asset.category, asset.location ?? '', asset.acquired_on, asset.cost, asset.accumulated_depreciation, asset.book_value, asset.depreciation_method, asset.status]),
  ], `kontotrack-fixed-assets-${todayIsoDate()}.csv`, 4)
}

onMounted(load)
</script>

<template>
  <div>
    <div class="panel-heading no-print">
      <div><p class="eyebrow">{{ tr('Equipment, vehicles, buildings') }}</p><h2>{{ tr('Fixed assets') }}</h2></div>
      <div class="report-actions">
        <button class="text-button" type="button" :disabled="!assets.length" @click="exportRegister">{{ tr('Export register') }}</button>
        <button v-if="canEdit && section === 'assets'" class="primary-button" type="button" @click="showAssetForm = !showAssetForm">{{ showAssetForm ? tr('Cancel') : tr('Register asset') }}</button>
      </div>
    </div>
    <nav class="kind-tabs no-print" :aria-label="tr('Fixed assets')">
      <button :class="{ active: section === 'assets' }" @click="section = 'assets'">{{ tr('Asset register') }}</button>
      <button :class="{ active: section === 'depreciation' }" @click="section = 'depreciation'">{{ tr('Monthly depreciation') }}</button>
    </nav>
    <p v-if="error" class="error-text" role="alert">{{ error }}</p>

    <template v-if="section === 'assets'">
      <form v-if="showAssetForm" class="entry-form" @submit.prevent="saveAsset">
        <h3>{{ tr('New fixed asset') }}</h3>
        <div class="fields-grid">
          <label>{{ tr('Asset code') }}<input v-model.trim="assetForm.asset_code" required maxlength="40" /></label>
          <label>{{ tr('Name') }}<input v-model.trim="assetForm.name" required maxlength="180" /></label>
          <label>{{ tr('Category') }}<input v-model.trim="assetForm.category" required maxlength="80" :placeholder="tr('Vehicles, IT equipment…')" /></label>
          <label>{{ tr('Location') }} <span>{{ tr('(optional)') }}</span><input v-model.trim="assetForm.location" maxlength="120" /></label>
          <label>{{ tr('Acquired on') }}<input v-model="assetForm.acquired_on" type="date" required /></label>
          <label>{{ tr('Cost') }}<input v-model="assetForm.cost" type="number" min="0.01" step="0.01" required /></label>
          <label>{{ tr('Residual value') }}<input v-model="assetForm.residual_value" type="number" min="0" step="0.01" /></label>
          <label>{{ tr('Depreciation already recorded') }} <span>{{ tr('(for older assets)') }}</span><input v-model="assetForm.opening_accumulated_depreciation" type="number" min="0" step="0.01" /></label>
          <label>{{ tr('Method') }}<select v-model="assetForm.depreciation_method"><option value="straight_line">{{ tr('Straight line') }}</option><option value="declining_balance">{{ tr('Declining balance') }}</option></select></label>
          <label v-if="assetForm.depreciation_method === 'straight_line'">{{ tr('Useful life (months)') }}<input v-model="assetForm.useful_life_months" type="number" min="1" max="1200" required /></label>
          <label v-else>{{ tr('Annual rate (%)') }}<input v-model="assetForm.annual_rate_percent" type="number" min="0.0001" max="100" step="0.0001" required /></label>
        </div>
        <p class="form-note">{{ tr('Depreciation starts the month after acquisition and never takes the book value below the residual value.') }}</p>
        <div class="form-footer"><button class="primary-button" type="submit" :disabled="saving">{{ saving ? tr('Saving…') : tr('Save asset') }}</button></div>
      </form>
      <div class="report-table-wrap">
        <table class="report-table">
          <thead><tr><th>{{ tr('Code') }}</th><th>{{ tr('Asset') }}</th><th>{{ tr('Acquired') }}</th><th>{{ tr('Cost') }}</th><th>{{ tr('Depreciated') }}</th><th>{{ tr('Book value') }}</th><th>{{ tr('Status') }}</th><th></th></tr></thead>
          <tbody>
            <tr v-for="asset in assets" :key="asset.id">
              <td>{{ asset.asset_code }}</td><td>{{ asset.name }}<template v-if="asset.location"> · {{ asset.location }}</template></td><td>{{ formatDate(asset.acquired_on) }}</td>
              <td>{{ money(asset.cost) }}</td><td>{{ money(asset.accumulated_depreciation) }}</td><td>{{ money(asset.book_value) }}</td>
              <td><span class="status-chip" :class="{ posted: asset.status === 'active' }">{{ trValue(asset.status) }}</span></td>
              <td><button class="text-button" type="button" @click="openAsset(asset)">{{ tr('Open') }}</button></td>
            </tr>
            <tr v-if="!assets.length"><td colspan="8" class="empty-message">{{ tr('No fixed assets registered yet.') }}</td></tr>
          </tbody>
        </table>
      </div>
      <section v-if="selectedAsset" class="contact-card">
        <div class="contact-card-heading">
          <div><p class="eyebrow">{{ selectedAsset.asset_code }} · {{ trValue(selectedAsset.category) }}</p><h3>{{ selectedAsset.name }}</h3><p class="form-note">{{ selectedAsset.depreciation_method === 'straight_line' ? trf('Straight line over {0} months', [selectedAsset.useful_life_months]) : trf('Declining balance at {0}% a year', [selectedAsset.annual_rate_percent]) }} {{ tr('· residual') }} {{ money(selectedAsset.residual_value) }}</p></div>
          <button class="text-button" type="button" @click="selectedAsset = null">{{ tr('Close') }}</button>
        </div>
        <div class="summary-grid">
          <article class="summary-card"><span>{{ tr('Cost') }}</span><strong>{{ money(selectedAsset.cost) }}</strong></article>
          <article class="summary-card"><span>{{ tr('Accumulated depreciation') }}</span><strong>{{ money(selectedAsset.accumulated_depreciation) }}</strong></article>
          <article class="summary-card"><span>{{ tr('Book value') }}</span><strong>{{ money(selectedAsset.book_value) }}</strong></article>
        </div>
        <h4>{{ tr('History') }}</h4>
        <ul class="audit-list">
          <li v-for="event in selectedAsset.events ?? []" :key="event.id"><strong>{{ trValue(event.event_type) }}</strong> · {{ formatDate(event.occurred_on) }}<template v-if="event.user"> · {{ event.user }}</template><span v-for="(value, key) in event.details ?? {}" :key="key"><template v-if="value !== null">{{ String(key).replace('_', ' ') }}: {{ value }}</template></span></li>
          <li v-for="line in selectedAsset.depreciation ?? []" :key="line.period">{{ tr('Depreciation') }} {{ line.period }} · {{ money(line.amount) }} {{ tr('→ book value') }} {{ money(line.closing_book_value) }}</li>
        </ul>
        <div v-if="canEdit && selectedAsset.status === 'active'" class="fields-grid">
          <form class="entry-form" @submit.prevent="transferAsset(selectedAsset)">
            <h4>{{ tr('Transfer') }}</h4>
            <label>{{ tr('New location') }}<input v-model.trim="transferForm.location" required maxlength="120" /></label>
            <label>{{ tr('Date') }}<input v-model="transferForm.transferred_on" type="date" required /></label>
            <label>{{ tr('Note') }}<input v-model.trim="transferForm.note" maxlength="500" /></label>
            <div class="form-footer"><button class="text-button" type="submit" :disabled="saving">{{ tr('Record transfer') }}</button></div>
          </form>
          <form class="entry-form" @submit.prevent="disposeAsset(selectedAsset)">
            <h4>{{ tr('Sell or write off') }}</h4>
            <label>{{ tr('Type') }}<select v-model="disposeForm.disposal_type"><option value="written_off">{{ tr('Write off') }}</option><option value="sold">{{ tr('Sold') }}</option></select></label>
            <label>{{ tr('Date') }}<input v-model="disposeForm.disposed_on" type="date" required /></label>
            <label v-if="disposeForm.disposal_type === 'sold'">{{ tr('Sale proceeds') }}<input v-model="disposeForm.disposal_proceeds" type="number" min="0" step="0.01" required /></label>
            <label>{{ tr('Note') }}<input v-model.trim="disposeForm.note" maxlength="500" /></label>
            <p class="form-note">{{ tr('The remaining book value is posted as a disposal loss. Record any sale with a sales invoice.') }}</p>
            <div class="form-footer"><button class="primary-button" type="submit" :disabled="saving">{{ tr('Dispose of asset') }}</button></div>
          </form>
        </div>
      </section>
    </template>

    <template v-else>
      <form v-if="canEdit" class="report-filters no-print" @submit.prevent="createRun">
        <label>{{ tr('Year') }}<input v-model.number="runForm.period_year" type="number" min="2000" max="2100" required /></label>
        <label>{{ tr('Month') }}<select v-model.number="runForm.period_month"><option v-for="month in 12" :key="month" :value="month">{{ new Intl.DateTimeFormat('en-GB', { month: 'long' }).format(new Date(2026, month - 1, 1)) }}</option></select></label>
        <button class="primary-button" type="submit" :disabled="saving">{{ saving ? tr('Calculating…') : tr('Calculate depreciation') }}</button>
      </form>
      <p class="form-note no-print">{{ tr('Runs are made month by month in order. Approving posts depreciation expense against accumulated depreciation on the last day of the month.') }}</p>
      <div class="contact-list no-print">
        <article v-for="item in runs" :key="item.id" class="contact-row">
          <div><strong>{{ periodLabel(item.period_year, item.period_month) }}</strong><span>{{ money(item.total) }}</span></div>
          <span class="status-chip" :class="{ posted: item.status === 'approved' }">{{ trValue(item.status) }}</span>
          <div class="contact-actions"><button class="text-button" type="button" @click="openRun(item)">{{ tr('Open') }}</button></div>
        </article>
        <p v-if="!runs.length" class="empty-message">{{ tr('No depreciation calculated yet.') }}</p>
      </div>
      <section v-if="selectedRun" class="contact-card">
        <div class="contact-card-heading">
          <div><p class="eyebrow">{{ tr('Depreciation') }}</p><h3>{{ periodLabel(selectedRun.period_year, selectedRun.period_month) }} · {{ money(selectedRun.total) }}</h3></div>
          <div class="report-actions">
            <button v-if="canEdit && selectedRun.status === 'draft'" class="text-button" type="button" :disabled="saving" @click="deleteRun(selectedRun)">{{ tr('Delete draft') }}</button>
            <button v-if="canEdit && selectedRun.status === 'draft'" class="primary-button" type="button" :disabled="saving" @click="approveRun(selectedRun)">{{ tr('Approve and post') }}</button>
          </div>
        </div>
        <div class="report-table-wrap">
          <table class="report-table">
            <thead><tr><th>{{ tr('Asset') }}</th><th>{{ tr('Opening book value') }}</th><th>{{ tr('Depreciation') }}</th><th>{{ tr('Closing book value') }}</th></tr></thead>
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
