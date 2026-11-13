<script setup lang="ts">
import { onMounted, ref } from 'vue'
import api from '@/lib/api'
import { formatDate, getApiError } from '@/lib/format'
import { useMessages } from '@/lib/locale'

type Ability = 'read' | 'customers.write' | 'sales.write'
interface ApiKey {
  id: number
  name: string
  abilities: Ability[]
  created_by: string | null
  created_at: string | null
  last_used_at: string | null
  revoked_at: string | null
}

const props = defineProps<{ businessId: number }>()

const m = useMessages({
  sq: {
    eyebrow: 'Integrimet',
    title: 'Çelësat API',
    note: 'Një çelës API i lejon një sistemi tjetër (kasë, dyqan online) të dërgojë shitje dhe të lexojë artikujt e këtij biznesi. Çelësi vepron me të drejtat tuaja dhe ndalet kur ju humbni qasjen. Jepjani vetëm sistemeve që u besoni.',
    name: 'Emri i sistemit',
    namePlaceholder: 'p.sh. Kasa e dyqanit',
    abilities: { read: 'Lexon biznesin, artikujt, klientët dhe shitjet e dërguara', 'customers.write': 'Krijon klientë', 'sales.write': 'Dërgon shitje (fatura)' } as Record<Ability, string>,
    create: 'Krijo çelës',
    tokenTitle: 'Kopjo çelësin tani',
    tokenNote: 'Shfaqet vetëm këtë herë. Nëse humbet, revokoje dhe krijo një të ri.',
    copy: 'Kopjo',
    copied: 'U kopjua',
    done: 'E ruajta',
    active: 'Aktiv',
    revoked: 'I revokuar',
    lastUsed: (date: string) => `Përdorur së fundi ${date}`,
    neverUsed: 'Nuk është përdorur ende',
    revoke: 'Revoko',
    confirmRevoke: (name: string) => `Sistemi "${name}" nuk do të mund të lidhet më. Të revokohet çelësi?`,
    empty: 'Nuk ka çelësa API.',
    failed: 'Veprimi nuk u krye.',
  },
  en: {
    eyebrow: 'Integrations',
    title: 'API keys',
    note: 'An API key lets another system (a till, a web shop) send sales and read the items of this business. The key acts with your permissions and stops working when you lose access. Give it only to systems you trust.',
    name: 'Name of the system',
    namePlaceholder: 'e.g. Shop till',
    abilities: { read: 'Reads the business, items, customers and the sales it sent', 'customers.write': 'Creates customers', 'sales.write': 'Sends sales (invoices)' } as Record<Ability, string>,
    create: 'Create key',
    tokenTitle: 'Copy the key now',
    tokenNote: 'It is shown only this once. If it is lost, revoke it and create a new one.',
    copy: 'Copy',
    copied: 'Copied',
    done: 'I have saved it',
    active: 'Active',
    revoked: 'Revoked',
    lastUsed: (date: string) => `Last used ${date}`,
    neverUsed: 'Not used yet',
    revoke: 'Revoke',
    confirmRevoke: (name: string) => `The system "${name}" will no longer be able to connect. Revoke the key?`,
    empty: 'There are no API keys.',
    failed: 'That did not work.',
  },
})

const allAbilities: Ability[] = ['read', 'sales.write', 'customers.write']
const keys = ref<ApiKey[]>([])
const form = ref<{ name: string; abilities: Ability[] }>({ name: '', abilities: ['read', 'sales.write'] })
const newToken = ref('')
const copied = ref(false)
const saving = ref(false)
const error = ref('')

async function run(action: () => Promise<void>): Promise<void> {
  saving.value = true
  error.value = ''
  try {
    await action()
  } catch (caught: unknown) {
    error.value = getApiError(caught, m.value.failed)
  } finally {
    saving.value = false
  }
}

function load(): Promise<void> {
  return run(async () => {
    const response = await api.get<{ data: ApiKey[] }>(`/api/v1/businesses/${props.businessId}/api-keys`)
    keys.value = response.data.data
  })
}

function create(): Promise<void> {
  return run(async () => {
    const response = await api.post<{ data: ApiKey & { token: string } }>(`/api/v1/businesses/${props.businessId}/api-keys`, form.value)
    const { token, ...key } = response.data.data
    keys.value = [key, ...keys.value]
    newToken.value = token
    copied.value = false
    form.value = { name: '', abilities: ['read', 'sales.write'] }
  })
}

function revoke(key: ApiKey): Promise<void> {
  if (!window.confirm(m.value.confirmRevoke(key.name))) return Promise.resolve()
  return run(async () => {
    await api.delete(`/api/v1/businesses/${props.businessId}/api-keys/${key.id}`)
    await load()
  })
}

async function copyToken(): Promise<void> {
  try {
    await navigator.clipboard.writeText(newToken.value)
    copied.value = true
  } catch {
    // Clipboard access can be blocked; the key stays visible to select and copy by hand.
    copied.value = false
  }
}

onMounted(load)
</script>

<template>
  <section class="keys-panel" aria-labelledby="api-keys-heading">
    <p class="eyebrow">{{ m.eyebrow }}</p>
    <h3 id="api-keys-heading">{{ m.title }}</h3>
    <p class="form-note">{{ m.note }}</p>
    <p v-if="error" class="error-text" role="alert">{{ error }}</p>

    <div v-if="newToken" class="token-box" role="status">
      <strong>{{ m.tokenTitle }}</strong>
      <p class="form-note">{{ m.tokenNote }}</p>
      <code>{{ newToken }}</code>
      <div class="token-actions"><button class="text-button" type="button" @click="copyToken">{{ copied ? m.copied : m.copy }}</button><button class="primary-button" type="button" @click="newToken = ''">{{ m.done }}</button></div>
    </div>

    <form class="keys-form" @submit.prevent="create">
      <label>{{ m.name }}<input v-model.trim="form.name" required maxlength="120" :placeholder="m.namePlaceholder" /></label>
      <fieldset>
        <label v-for="ability in allAbilities" :key="ability"><input v-model="form.abilities" type="checkbox" :value="ability" />{{ m.abilities[ability] }}</label>
      </fieldset>
      <button class="primary-button" type="submit" :disabled="saving || !form.abilities.length">{{ m.create }}</button>
    </form>

    <article v-for="key in keys" :key="key.id" class="key-row" :class="{ revoked: key.revoked_at }">
      <div class="key-main">
        <strong>{{ key.name }}</strong>
        <span>{{ key.abilities.join(', ') }} · {{ key.created_by }} · {{ key.last_used_at ? m.lastUsed(formatDate(key.last_used_at.slice(0, 10))) : m.neverUsed }}</span>
      </div>
      <span class="status-chip" :class="{ cancelled: key.revoked_at }">{{ key.revoked_at ? m.revoked : m.active }}</span>
      <button v-if="!key.revoked_at" class="text-button danger" type="button" :disabled="saving" @click="revoke(key)">{{ m.revoke }}</button>
    </article>
    <p v-if="!keys.length" class="empty-message">{{ m.empty }}</p>
  </section>
</template>

<style scoped>
.keys-panel { margin-top: 28px; padding-top: 22px; border-top: 1px solid #e1e8e1; }
.keys-panel h3 { margin: 0; color: #20382b; font-size: 17px; }
.keys-form { display: grid; gap: 12px; margin-bottom: 14px; }
.keys-form > label { display: grid; gap: 6px; max-width: 360px; color: #45594c; font-size: 12px; font-weight: 650; }
.keys-form input:not([type='checkbox']) { min-height: 40px; padding: 8px 10px; border: 1px solid #d8e1d9; border-radius: 8px; font: inherit; }
.keys-form fieldset { display: grid; gap: 6px; margin: 0; padding: 0; border: 0; color: #45594c; font-size: 13px; }
.keys-form fieldset label { display: flex; align-items: center; gap: 8px; }
.keys-form .primary-button { justify-self: start; }
.token-box { margin: 12px 0 18px; padding: 14px; border: 1px solid #ecd6a8; border-radius: 10px; background: #fdf9ef; }
.token-box code { display: block; margin-top: 6px; padding: 8px 10px; border-radius: 6px; background: #fff; font-size: 13px; overflow-wrap: anywhere; user-select: all; }
.token-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px; }
.key-row { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; align-items: center; gap: 14px; padding: 12px 0; border-bottom: 1px solid #edf1ed; }
.key-row.revoked .key-main { opacity: .6; }
.key-main { display: grid; min-width: 0; gap: 4px; }
.key-main strong { color: #2a4033; font-size: 13px; overflow-wrap: anywhere; }
.key-main span { color: #77837b; font-size: 12px; overflow-wrap: anywhere; }
.text-button.danger { color: #9b352b; }
</style>
