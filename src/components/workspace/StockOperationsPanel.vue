<script setup lang="ts">
import { tr, trf, trValue } from '@/lib/tr'
import { ref } from 'vue'
import api from '@/lib/api'
import { getApiError, todayIsoDate } from '@/lib/format'

const props = defineProps<{
  businessId: number
  items: Array<{ id: number; sku: string; name: string; unit: string; is_active: boolean }>
  warehouses: Array<{ id: number; name: string; is_active: boolean }>
  documents: Array<{ id: number; category: string; original_name: string }>
}>()
const emit = defineEmits<{ changed: [] }>()

const mode = ref<'transfer' | 'count'>('transfer')
const saving = ref(false)
const error = ref('')
const notice = ref('')
const transferForm = ref({ inventory_item_id: '', from_warehouse_id: '', to_warehouse_id: '', quantity: '', document_id: '', occurred_on: todayIsoDate(), notes: '' })
const countForm = ref({ inventory_item_id: '', warehouse_id: '', counted_quantity: '', document_id: '', occurred_on: todayIsoDate(), notes: '' })

async function submit(): Promise<void> {
  saving.value = true
  error.value = ''
  notice.value = ''

  try {
    if (mode.value === 'transfer') {
      const form = transferForm.value
      await api.post(`/api/v1/businesses/${props.businessId}/inventory/transfers`, { ...form, inventory_item_id: Number(form.inventory_item_id), from_warehouse_id: Number(form.from_warehouse_id), to_warehouse_id: Number(form.to_warehouse_id), document_id: Number(form.document_id) })
      notice.value = tr('Stock transferred.')
      transferForm.value = { ...form, quantity: '', notes: '' }
    } else {
      const form = countForm.value
      const response = await api.post<{ data: { difference: string; movement: unknown } }>(`/api/v1/businesses/${props.businessId}/inventory/counts`, { ...form, inventory_item_id: Number(form.inventory_item_id), warehouse_id: Number(form.warehouse_id), document_id: Number(form.document_id) })
      notice.value = response.data.data.movement === null ? tr('The count matches the recorded stock; nothing changed.') : trf('Count recorded. Difference: {0}.', [Number(response.data.data.difference)])
      countForm.value = { ...form, counted_quantity: '', notes: '' }
    }

    emit('changed')
  } catch (caught: unknown) {
    error.value = getApiError(caught, mode.value === 'transfer' ? tr('We could not transfer this stock.') : tr('We could not record this count.'))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <form class="entry-form" @submit.prevent="submit">
    <nav class="kind-tabs" :aria-label="tr('Stock operation')">
      <button type="button" :class="{ active: mode === 'transfer' }" @click="mode = 'transfer'">{{ tr('Transfer between warehouses') }}</button>
      <button type="button" :class="{ active: mode === 'count' }" @click="mode = 'count'">{{ tr('Stock count') }}</button>
    </nav>
    <p v-if="error" class="error-text" role="alert">{{ error }}</p>
    <p v-if="notice" class="form-note" role="status">{{ notice }}</p>
    <div v-if="mode === 'transfer'" class="fields-grid">
      <label>{{ tr('Item') }}<select v-model="transferForm.inventory_item_id" required><option disabled value="">{{ tr('Choose item') }}</option><option v-for="item in items.filter((entry) => entry.is_active)" :key="item.id" :value="String(item.id)">{{ item.sku }} · {{ item.name }}</option></select></label>
      <label>{{ tr('From') }}<select v-model="transferForm.from_warehouse_id" required><option disabled value="">{{ tr('Choose warehouse') }}</option><option v-for="warehouse in warehouses.filter((entry) => entry.is_active)" :key="warehouse.id" :value="String(warehouse.id)">{{ warehouse.name }}</option></select></label>
      <label>{{ tr('To') }}<select v-model="transferForm.to_warehouse_id" required><option disabled value="">{{ tr('Choose warehouse') }}</option><option v-for="warehouse in warehouses.filter((entry) => entry.is_active && String(entry.id) !== transferForm.from_warehouse_id)" :key="warehouse.id" :value="String(warehouse.id)">{{ warehouse.name }}</option></select></label>
      <label>{{ tr('Quantity') }}<input v-model="transferForm.quantity" type="number" min="0.0001" step="0.0001" required /></label>
      <label>{{ tr('Transfer note (document)') }}<select v-model="transferForm.document_id" required><option disabled value="">{{ tr('Choose document') }}</option><option v-for="document in documents" :key="document.id" :value="String(document.id)">{{ trValue(document.category) }} · {{ document.original_name }}</option></select></label>
      <label>{{ tr('Date') }}<input v-model="transferForm.occurred_on" type="date" required /></label>
      <label>{{ tr('Notes') }}<input v-model.trim="transferForm.notes" required maxlength="5000" /></label>
    </div>
    <div v-else class="fields-grid">
      <label>{{ tr('Item') }}<select v-model="countForm.inventory_item_id" required><option disabled value="">{{ tr('Choose item') }}</option><option v-for="item in items.filter((entry) => entry.is_active)" :key="item.id" :value="String(item.id)">{{ item.sku }} · {{ item.name }}</option></select></label>
      <label>{{ tr('Warehouse') }}<select v-model="countForm.warehouse_id" required><option disabled value="">{{ tr('Choose warehouse') }}</option><option v-for="warehouse in warehouses.filter((entry) => entry.is_active)" :key="warehouse.id" :value="String(warehouse.id)">{{ warehouse.name }}</option></select></label>
      <label>{{ tr('Counted quantity') }}<input v-model="countForm.counted_quantity" type="number" min="0" step="0.0001" required /></label>
      <label>{{ tr('Count sheet (document)') }}<select v-model="countForm.document_id" required><option disabled value="">{{ tr('Choose document') }}</option><option v-for="document in documents" :key="document.id" :value="String(document.id)">{{ trValue(document.category) }} · {{ document.original_name }}</option></select></label>
      <label>{{ tr('Date') }}<input v-model="countForm.occurred_on" type="date" required /></label>
      <label>{{ tr('Notes') }}<input v-model.trim="countForm.notes" required maxlength="5000" /></label>
    </div>
    <div class="form-footer"><button class="primary-button" type="submit" :disabled="saving">{{ saving ? tr('Saving…') : mode === 'transfer' ? tr('Transfer stock') : tr('Record count') }}</button></div>
  </form>
</template>
