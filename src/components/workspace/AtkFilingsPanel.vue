<script setup lang="ts">
import { ref } from 'vue'
import api from '@/lib/api'
import { downloadFromApi } from '@/lib/download'
import { formatMoney, getApiError, todayIsoDate } from '@/lib/format'

interface BookRow { date: string; invoice_number: string; name: string; identifier: string; vat_number: string; boxes: Record<string, string> }
interface Book { rows: BookRow[]; totals: Record<string, string>; declared_with_zero: boolean }
interface VatBooks { period: string; sales: Book; purchases: Book; vat_return: { output_vat: string; input_vat: string; difference: string }; problems: string[] }

const props = defineProps<{ businessId: number; currency: string; vatRegistered: boolean }>()

const SALES_BOXES: Array<[string, string]> = [
  ['9', 'Exempt sales without credit'], ['10a', 'Services supplied abroad'], ['10b', 'Domestic reverse-charge sales'], ['10c', 'Other exempt sales with credit'],
  ['11', 'Exports'], ['12', 'Taxable sales 18%'], ['16', 'Debit notes issued / credit notes received 18%'], ['28', 'Reverse-charge purchases'],
  ['K1', 'Output VAT 18%'], ['14', 'Taxable sales 8%'], ['18', 'Debit notes issued / credit notes received 8%'], ['K2', 'Output VAT 8%'], ['30', 'Total output VAT'],
]
const PURCHASE_BOXES: Array<[string, string]> = [
  ['31', 'Purchases and imports without VAT'], ['43', 'Domestic purchases 18%'], ['47', 'Domestic capital purchases 18%'], ['35', 'Imports 18%'],
  ['53', 'Debit notes received / credit notes issued 18%'], ['65', 'Reverse-charge credit'], ['K1', 'Input VAT 18%'], ['45', 'Domestic purchases 8%'],
  ['49', 'Domestic capital purchases 8%'], ['37', 'Imports 8%'], ['55', 'Debit notes received / credit notes issued 8%'], ['K2', 'Input VAT 8%'], ['67', 'Total input VAT'],
]

const lastMonth = new Date(`${todayIsoDate().slice(0, 7)}-01T00:00:00`)
lastMonth.setMonth(lastMonth.getMonth() - 1)
const period = ref(`${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`)
const books = ref<VatBooks | null>(null)
const loading = ref(false)
const downloading = ref('')
const error = ref('')

function money(value: string): string {
  return formatMoney(value, props.currency)
}

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  books.value = null

  try {
    const response = await api.get<{ data: VatBooks }>(`/api/v1/businesses/${props.businessId}/atk/vat-books`, { params: { period: period.value } })
    books.value = response.data.data
  } catch (caught: unknown) {
    error.value = getApiError(caught, 'We could not build the VAT books for this month.')
  } finally {
    loading.value = false
  }
}

async function download(book: 'sales' | 'purchases'): Promise<void> {
  downloading.value = book
  error.value = ''

  try {
    await downloadFromApi(`/api/v1/businesses/${props.businessId}/atk/vat-books/${book}.xlsx`, { period: period.value }, `${book === 'sales' ? 'Libri-i-Shitjes' : 'Libri-i-Blerjes'}-${period.value}.xlsx`)
  } catch (caught: unknown) {
    error.value = getApiError(caught, 'We could not download this book.')
  } finally {
    downloading.value = ''
  }
}
</script>

<template>
  <div>
    <p v-if="!vatRegistered" class="setup-hint">The ATK sales and purchase books apply only to VAT-registered businesses.</p>
    <template v-else>
      <p class="form-note">Monthly VAT books in the ATK template layout, ready to upload to EDI with the VAT return (due by the 20th of the next month). Review any problems first: EDI rejects rows without a valid NUI or fiscal number.</p>
      <form class="report-filters" @submit.prevent="load">
        <label>Month<input v-model="period" type="month" required /></label>
        <button class="primary-button" type="submit" :disabled="loading">{{ loading ? 'Building…' : 'Build books' }}</button>
      </form>
      <p v-if="error" class="error-text" role="alert">{{ error }}</p>

      <template v-if="books">
        <div class="report-actions ledger-report-actions">
          <button class="text-button" type="button" :disabled="downloading !== ''" @click="download('sales')">{{ downloading === 'sales' ? 'Downloading…' : 'Download sales book (.xlsx)' }}</button>
          <button class="text-button" type="button" :disabled="downloading !== ''" @click="download('purchases')">{{ downloading === 'purchases' ? 'Downloading…' : 'Download purchase book (.xlsx)' }}</button>
        </div>

        <section v-if="books.problems.length" class="report-table-wrap" role="alert">
          <h4>Fix before uploading ({{ books.problems.length }})</h4>
          <ul class="atk-problems"><li v-for="problem in books.problems" :key="problem">{{ problem }}</li></ul>
        </section>

        <section class="report-table-wrap">
          <h4>VAT return · {{ books.period }}</h4>
          <table class="report-table">
            <tbody>
              <tr><td>[30] Output VAT from the sales book</td><td>{{ money(books.vat_return.output_vat) }}</td></tr>
              <tr><td>[67] Input VAT from the purchase book</td><td>{{ money(books.vat_return.input_vat) }}</td></tr>
              <tr class="statement-total"><td>{{ Number(books.vat_return.difference) >= 0 ? 'VAT payable' : 'VAT credit' }}</td><td>{{ money(books.vat_return.difference.replace('-', '')) }}</td></tr>
            </tbody>
          </table>
        </section>

        <section v-for="book in (['sales', 'purchases'] as const)" :key="book" class="report-table-wrap">
          <h4>{{ book === 'sales' ? 'Libri i Shitjes · Sales book' : 'Libri i Blerjes · Purchase book' }} · {{ books[book].declared_with_zero ? 'no transactions, declared with 0' : `${books[book].rows.length} row(s)` }}</h4>
          <table class="report-table">
            <thead><tr><th>Box</th><th>Description</th><th>Amount</th></tr></thead>
            <tbody>
              <tr v-for="[box, label] in (book === 'sales' ? SALES_BOXES : PURCHASE_BOXES)" :key="box" :class="{ 'statement-total': box.startsWith('K') || box === '30' || box === '67' }"><td>[{{ box }}]</td><td>{{ label }}</td><td>{{ money(books[book].totals[box] ?? '0.00') }}</td></tr>
            </tbody>
          </table>
        </section>
      </template>
    </template>
  </div>
</template>

<style scoped>
.atk-problems { margin: 0; padding-left: 18px; color: #8a4b2a; font-size: 13px; line-height: 1.6; }
</style>
