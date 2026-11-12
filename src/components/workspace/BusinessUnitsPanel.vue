<script setup lang="ts">
import { ref } from 'vue'
import api from '@/lib/api'
import { getApiError } from '@/lib/format'
import { useMessages } from '@/lib/locale'

export interface BusinessUnit {
  id: number
  name: string
  code: string | null
  is_active: boolean
}

const props = defineProps<{ businessId: number; units: BusinessUnit[]; canEdit: boolean }>()
const emit = defineEmits<{ 'update:units': [units: BusinessUnit[]] }>()

const m = useMessages({
  sq: {
    eyebrow: 'Njësitë',
    title: 'Njësitë e biznesit',
    note: 'Njësi janë degët, dyqanet ose departamentet. Kur një faturë ose regjistrim kontabël shënohet me njësi, paneli dhe raportet mund të filtrohen sipas saj.',
    name: 'Emri i njësisë',
    code: 'Kodi (opsional)',
    add: 'Shto njësi',
    active: 'Në përdorim',
    retired: 'Jashtë përdorimit',
    retire: 'Nxirre nga përdorimi',
    restore: 'Kthe në përdorim',
    empty: 'Ende nuk ka njësi. Pa njësi, gjithçka raportohet për biznesin si tërësi.',
    failed: 'Ndryshimi nuk u ruajt.',
  },
  en: {
    eyebrow: 'Units',
    title: 'Business units',
    note: 'Units are branches, shops or departments. When an invoice or journal entry is tagged with a unit, the dashboard and reports can be filtered by it.',
    name: 'Unit name',
    code: 'Code (optional)',
    add: 'Add unit',
    active: 'In use',
    retired: 'Retired',
    retire: 'Retire',
    restore: 'Put back in use',
    empty: 'There are no units yet. Without units, everything is reported for the business as a whole.',
    failed: 'The change was not saved.',
  },
})

const form = ref({ name: '', code: '' })
const saving = ref(false)
const error = ref('')

async function run(action: () => Promise<BusinessUnit[]>): Promise<void> {
  saving.value = true
  error.value = ''
  try {
    emit('update:units', (await action()).sort((left, right) => left.name.localeCompare(right.name)))
  } catch (caught: unknown) {
    error.value = getApiError(caught, m.value.failed)
  } finally {
    saving.value = false
  }
}

function add(): Promise<void> {
  return run(async () => {
    const response = await api.post<{ data: BusinessUnit }>(`/api/v1/businesses/${props.businessId}/units`, { name: form.value.name, code: form.value.code || null })
    form.value = { name: '', code: '' }
    return [...props.units, response.data.data]
  })
}

function setActive(unit: BusinessUnit, isActive: boolean): Promise<void> {
  return run(async () => {
    const response = await api.put<{ data: BusinessUnit }>(`/api/v1/businesses/${props.businessId}/units/${unit.id}`, { is_active: isActive })
    return props.units.map((existing) => (existing.id === unit.id ? response.data.data : existing))
  })
}
</script>

<template>
  <section class="units-panel" aria-labelledby="units-heading">
    <p class="eyebrow">{{ m.eyebrow }}</p>
    <h3 id="units-heading">{{ m.title }}</h3>
    <p class="form-note">{{ m.note }}</p>
    <p v-if="error" class="error-text" role="alert">{{ error }}</p>
    <form v-if="canEdit" class="units-form" @submit.prevent="add">
      <label>{{ m.name }}<input v-model.trim="form.name" required maxlength="120" /></label>
      <label>{{ m.code }}<input v-model.trim="form.code" maxlength="24" /></label>
      <button class="primary-button" type="submit" :disabled="saving">{{ m.add }}</button>
    </form>
    <article v-for="unit in units" :key="unit.id" class="unit-row">
      <strong>{{ unit.name }}<span v-if="unit.code"> · {{ unit.code }}</span></strong>
      <span class="status-chip" :class="{ cancelled: !unit.is_active }">{{ unit.is_active ? m.active : m.retired }}</span>
      <button v-if="canEdit" class="text-button" type="button" :disabled="saving" @click="setActive(unit, !unit.is_active)">{{ unit.is_active ? m.retire : m.restore }}</button>
    </article>
    <p v-if="!units.length" class="empty-message">{{ m.empty }}</p>
  </section>
</template>

<style scoped>
.units-panel { margin-top: 28px; padding-top: 22px; border-top: 1px solid #e1e8e1; }
.units-panel h3 { margin: 0; color: #20382b; font-size: 17px; }
.units-form { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) auto; align-items: end; gap: 12px; margin-bottom: 14px; }
.units-form label { display: grid; gap: 6px; color: #45594c; font-size: 12px; font-weight: 650; }
.units-form input { min-height: 40px; padding: 8px 10px; border: 1px solid #d8e1d9; border-radius: 8px; font: inherit; }
.unit-row { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; align-items: center; gap: 14px; padding: 12px 0; border-bottom: 1px solid #edf1ed; }
.unit-row strong { color: #2a4033; font-size: 13px; overflow-wrap: anywhere; }
.unit-row strong span { color: #77837b; font-weight: 400; }
@media (max-width: 640px) { .units-form { grid-template-columns: 1fr; } }
</style>
