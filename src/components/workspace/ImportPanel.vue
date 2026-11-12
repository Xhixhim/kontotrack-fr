<script setup lang="ts">
import { ref } from 'vue'
import api from '@/lib/api'
import { downloadFromApi } from '@/lib/download'
import { getApiError } from '@/lib/format'
import { useMessages } from '@/lib/locale'

const props = defineProps<{ businessId: number; type: 'counterparties' | 'inventory-items' }>()
const emit = defineEmits<{ imported: [] }>()

const m = useMessages({
  sq: {
    open: 'Importo nga Excel / CSV',
    close: 'Mbyll importin',
    titles: { counterparties: 'Importo klientë dhe furnitorë', 'inventory-items': 'Importo artikuj' },
    notes: {
      counterparties: 'Rreshti i parë duhet të ketë emrat e kolonave: Emri (e detyrueshme), Lloji (klient / furnitor / të dy), NUI, Email, Telefoni, Adresa, Komuna, Shteti. Kontaktet me NUI që ekziston tashmë kalohen.',
      'inventory-items': 'Rreshti i parë duhet të ketë emrat e kolonave: Kodi dhe Emri (të detyrueshme), Barkodi, Njësia, Çmimi i blerjes, Çmimi i shitjes, Minimumi. Artikujt me kod që ekziston tashmë kalohen.',
    },
    rule: 'Nëse një rresht ka gabim, nuk importohet asgjë. Rregullo rreshtat e treguar dhe ngarko skedarin përsëri.',
    template: 'Shkarko shabllonin',
    file: 'Skedari (.xlsx ose .csv)',
    defaultType: 'Kur kolona Lloji mungon',
    customer: 'Klient',
    supplier: 'Furnitor',
    both: 'Të dy',
    submit: 'Importo',
    working: 'Po importohet…',
    done: (created: number, skipped: number) => `U importuan ${created} rreshta.${skipped ? ` ${skipped} u kaluan sepse ekzistojnë tashmë:` : ''}`,
    failed: 'Importi dështoi.',
    nothing: 'Nuk u importua asgjë.',
  },
  en: {
    open: 'Import from Excel / CSV',
    close: 'Close import',
    titles: { counterparties: 'Import customers and suppliers', 'inventory-items': 'Import items' },
    notes: {
      counterparties: 'The first row must name the columns: Name (required), Type (customer / supplier / both), NUI, Email, Phone, Address, Municipality, Country. Contacts whose NUI already exists are skipped.',
      'inventory-items': 'The first row must name the columns: Code and Name (required), Barcode, Unit, Purchase price, Sale price, Minimum. Items whose code already exists are skipped.',
    },
    rule: 'If one row has a problem, nothing is imported. Fix the rows listed and upload the file again.',
    template: 'Download the template',
    file: 'File (.xlsx or .csv)',
    defaultType: 'When the Type column is missing',
    customer: 'Customer',
    supplier: 'Supplier',
    both: 'Both',
    submit: 'Import',
    working: 'Importing…',
    done: (created: number, skipped: number) => `${created} row(s) imported.${skipped ? ` ${skipped} skipped because they already exist:` : ''}`,
    failed: 'The import failed.',
    nothing: 'Nothing was imported.',
  },
})

const open = ref(false)
const file = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const defaultType = ref<'customer' | 'supplier' | 'both'>('customer')
const working = ref(false)
const error = ref('')
const rowErrors = ref<string[]>([])
const result = ref<{ created: number; skipped: Array<{ line: number; reason: string }> } | null>(null)

async function submit(): Promise<void> {
  if (!file.value) return
  working.value = true
  error.value = ''
  rowErrors.value = []
  result.value = null
  try {
    const payload = new FormData()
    payload.append('file', file.value)
    if (props.type === 'counterparties') payload.append('default_type', defaultType.value)
    const response = await api.post<{ data: { created: number; skipped: Array<{ line: number; reason: string }> } }>(`/api/v1/businesses/${props.businessId}/imports/${props.type}`, payload)
    result.value = response.data.data
    file.value = null
    if (fileInput.value) fileInput.value.value = ''
    if (response.data.data.created > 0) emit('imported')
  } catch (caught: unknown) {
    const rows = (caught as { response?: { data?: { errors?: { rows?: string[] } } } }).response?.data?.errors?.rows
    if (rows?.length) {
      rowErrors.value = rows
      error.value = m.value.nothing
    } else {
      error.value = getApiError(caught, m.value.failed)
    }
  } finally {
    working.value = false
  }
}

async function downloadTemplate(): Promise<void> {
  try {
    await downloadFromApi(`/api/v1/businesses/${props.businessId}/imports/${props.type}/template`, {}, `${props.type}.csv`)
  } catch (caught: unknown) {
    error.value = getApiError(caught, m.value.failed)
  }
}
</script>

<template>
  <div class="import-panel">
    <button class="text-button" type="button" @click="open = !open">{{ open ? m.close : m.open }}</button>
    <form v-if="open" class="entry-form" @submit.prevent="submit">
      <h3>{{ m.titles[type] }}</h3>
      <p class="form-note">{{ m.notes[type] }} {{ m.rule }} <button class="text-button" type="button" @click="downloadTemplate">{{ m.template }}</button></p>
      <div class="fields-grid">
        <label>{{ m.file }}<input ref="fileInput" type="file" accept=".xlsx,.csv,.txt" required @change="file = ($event.target as HTMLInputElement).files?.[0] ?? null" /></label>
        <label v-if="type === 'counterparties'">{{ m.defaultType }}<select v-model="defaultType"><option value="customer">{{ m.customer }}</option><option value="supplier">{{ m.supplier }}</option><option value="both">{{ m.both }}</option></select></label>
      </div>
      <p v-if="error" class="error-text" role="alert">{{ error }}</p>
      <ul v-if="rowErrors.length" class="import-rows error-text"><li v-for="row in rowErrors" :key="row">{{ row }}</li></ul>
      <div v-if="result" role="status">
        <p class="form-note import-done">{{ m.done(result.created, result.skipped.length) }}</p>
        <ul v-if="result.skipped.length" class="import-rows form-note"><li v-for="row in result.skipped" :key="row.line">{{ row.line }}: {{ row.reason }}</li></ul>
      </div>
      <div class="form-footer"><button class="primary-button" type="submit" :disabled="working || !file">{{ working ? m.working : m.submit }}</button></div>
    </form>
  </div>
</template>

<style scoped>
.import-panel { margin-top: 10px; }
.import-rows { display: grid; gap: 4px; max-height: 220px; margin: 8px 0 0; padding-left: 18px; overflow-y: auto; }
.import-done { margin: 10px 0 0; color: #2f5a41; font-weight: 650; }
</style>
