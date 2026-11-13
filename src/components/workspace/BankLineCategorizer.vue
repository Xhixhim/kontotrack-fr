<script setup lang="ts">
import { tr } from '@/lib/tr'
import { computed, ref, watch } from 'vue'
import api from '@/lib/api'
import { getApiError } from '@/lib/format'

export interface BankCategory { key: string; direction: 'in' | 'out' | 'any'; needs: 'counterparty' | 'account'; label: string }
interface Option { id: number; name: string; code?: string; type?: string; account_type?: string; is_active?: boolean; status?: string }
interface Line {
  id: number
  description: string
  amount: string
  category: string | null
  category_is_suggestion: boolean
  account: { id: number; code: string; name: string } | null
  counterparty: { id: number; name: string } | null
}

const props = defineProps<{
  businessId: number
  bankAccountId: number
  bankLedgerAccountId: number | null
  line: Line
  categories: BankCategory[]
  accounts: Option[]
  counterparties: Option[]
}>()
const emit = defineEmits<{ changed: [line: unknown]; booked: [line: unknown] }>()

const category = ref('')
const accountId = ref('')
const counterpartyId = ref('')
const remember = ref(false)
const rememberAs = ref('')
const saving = ref(false)
const booking = ref(false)
const error = ref('')

const isMoneyOut = computed(() => props.line.amount.startsWith('-'))
const availableCategories = computed(() => props.categories.filter((item) => item.direction === 'any' || item.direction === (isMoneyOut.value ? 'out' : 'in')))
const selected = computed(() => props.categories.find((item) => item.key === category.value) ?? null)
const partyType = computed(() => category.value === 'customer_receipt' ? 'customer' : 'supplier')
const parties = computed(() => props.counterparties.filter((party) => party.status !== 'inactive' && (party.type === partyType.value || party.type === 'both')))
const bookableAccounts = computed(() => props.accounts.filter((account) => account.is_active !== false && account.id !== props.bankLedgerAccountId))
const isDirty = computed(() => category.value !== (props.line.category ?? '')
  || accountId.value !== (props.line.account ? String(props.line.account.id) : '')
  || counterpartyId.value !== (props.line.counterparty ? String(props.line.counterparty.id) : ''))
const isComplete = computed(() => selected.value !== null && (selected.value.needs === 'counterparty' ? counterpartyId.value !== '' : accountId.value !== ''))
const canBook = computed(() => !isDirty.value && !props.line.category_is_suggestion && isComplete.value)

function reset(): void {
  category.value = props.line.category ?? ''
  accountId.value = props.line.account ? String(props.line.account.id) : ''
  counterpartyId.value = props.line.counterparty ? String(props.line.counterparty.id) : ''
  remember.value = false
  // A sensible default for the rule text: the first two words of the description.
  rememberAs.value = props.line.description.split(/\s+/).slice(0, 2).join(' ')
}

watch(() => props.line, reset, { immediate: true })

async function save(): Promise<void> {
  saving.value = true
  error.value = ''
  try {
    const response = await api.put<{ data: unknown }>(`/api/v1/businesses/${props.businessId}/bank-accounts/${props.bankAccountId}/transactions/${props.line.id}/category`, {
      category: category.value || null,
      account_id: selected.value?.needs === 'account' && accountId.value ? Number(accountId.value) : null,
      counterparty_id: selected.value?.needs === 'counterparty' && counterpartyId.value ? Number(counterpartyId.value) : null,
      remember_as: remember.value && category.value ? rememberAs.value : null,
    })
    emit('changed', response.data.data)
  } catch (caught: unknown) {
    error.value = getApiError(caught, tr('We could not save the category.'))
  } finally {
    saving.value = false
  }
}

async function book(): Promise<void> {
  booking.value = true
  error.value = ''
  try {
    const response = await api.post<{ data: unknown }>(`/api/v1/businesses/${props.businessId}/bank-accounts/${props.bankAccountId}/transactions/${props.line.id}/book`)
    emit('booked', response.data.data)
  } catch (caught: unknown) {
    error.value = getApiError(caught, tr('We could not book this bank line.'))
  } finally {
    booking.value = false
  }
}
</script>

<template>
  <div class="bank-categorizer">
    <div class="bank-categorizer-fields">
      <label>{{ tr('What is it for?') }}
        <select v-model="category" @change="accountId = ''; counterpartyId = ''">
          <option value="">{{ tr('Not categorised') }}</option>
          <option v-for="item in availableCategories" :key="item.key" :value="item.key">{{ item.label }}</option>
        </select>
      </label>
      <label v-if="selected?.needs === 'counterparty'">{{ partyType === 'customer' ? tr('Customer') : tr('Supplier') }}
        <select v-model="counterpartyId" required><option value="">{{ tr('Choose…') }}</option><option v-for="party in parties" :key="party.id" :value="String(party.id)">{{ party.name }}</option></select>
      </label>
      <label v-else-if="selected">{{ tr('Account') }}
        <select v-model="accountId" required><option value="">{{ tr('Choose…') }}</option><option v-for="account in bookableAccounts" :key="account.id" :value="String(account.id)">{{ account.code }} · {{ account.name }}</option></select>
      </label>
    </div>
    <label v-if="category" class="bank-categorizer-remember"><input v-model="remember" type="checkbox" /> {{ tr('Use for future lines containing') }} <input v-model.trim="rememberAs" :disabled="!remember" maxlength="120" :aria-label="tr('Text to match')" /></label>
    <div class="bank-categorizer-actions">
      <span v-if="line.category_is_suggestion && !isDirty" class="status-chip">{{ tr('Suggested, confirm to book') }}</span>
      <button class="text-button" type="button" :disabled="saving || (!isDirty && !line.category_is_suggestion && !remember)" @click="save">{{ saving ? tr('Saving…') : line.category_is_suggestion && !isDirty ? tr('Confirm category') : tr('Save category') }}</button>
      <button class="primary-button" type="button" :disabled="booking || !canBook" :title="canBook ? '' : tr('Save a complete category first')" @click="book">{{ booking ? tr('Booking…') : tr('Book in the ledger') }}</button>
    </div>
    <p v-if="selected?.needs === 'counterparty'" class="form-note">{{ tr('Booking pays this party\'s oldest open invoices first and reconciles the line.') }}</p>
    <p v-else-if="category === 'transfer'" class="form-note">{{ tr('Book a transfer once, from either account. On the other account\'s statement, reconcile the line with that entry instead of booking it again.') }}</p>
    <p v-if="error" class="error-text" role="alert">{{ error }}</p>
  </div>
</template>

<style scoped>
.bank-categorizer { display: grid; gap: 8px; padding-top: 10px; border-top: 1px dashed #d9dfe7; margin-top: 10px; }
.bank-categorizer-fields { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; }
.bank-categorizer-remember { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; font-size: 13px; }
.bank-categorizer-remember input[type='text'], .bank-categorizer-remember input:not([type]) { flex: 1 1 160px; min-width: 0; }
.bank-categorizer-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
</style>
