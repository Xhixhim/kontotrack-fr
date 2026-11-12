<script setup lang="ts">
import { onMounted, ref } from 'vue'
import api from '@/lib/api'
import { getApiError } from '@/lib/format'
import { useMessages } from '@/lib/locale'
import { teamMessages, type TeamRestriction, type TeamRole } from '@/locales/team'

interface TeamMember {
  id: number
  name: string
  email: string
  role: TeamRole
  status: 'active' | 'invited'
  restrictions: TeamRestriction[]
}

type InvitableRole = Exclude<TeamRole, 'owner'>

const props = defineProps<{ businessId: number }>()
const m = useMessages(teamMessages)

/** What each role can do at all, so only restrictions that change something are offered. */
const restrictable: Record<InvitableRole, TeamRestriction[]> = {
  accountant: ['bookkeeping', 'documents', 'audit_trail', 'payroll'],
  assistant_accountant: ['documents'],
  auditor: ['audit_trail', 'payroll'],
}
const invitableRoles: InvitableRole[] = ['accountant', 'assistant_accountant', 'auditor']

const members = ref<TeamMember[]>([])
const form = ref<{ email: string; name: string; role: InvitableRole }>({ email: '', name: '', role: 'accountant' })
const loading = ref(true)
const saving = ref(false)
const error = ref('')

async function load(): Promise<void> {
  try {
    const response = await api.get<{ data: TeamMember[] }>(`/api/v1/businesses/${props.businessId}/team`)
    members.value = response.data.data
  } catch (caught: unknown) {
    error.value = getApiError(caught, m.value.loadFailed)
  } finally {
    loading.value = false
  }
}

async function run(action: () => Promise<void>, fallback: string): Promise<void> {
  saving.value = true
  error.value = ''
  try {
    await action()
  } catch (caught: unknown) {
    error.value = getApiError(caught, fallback)
    await load()
  } finally {
    saving.value = false
  }
}

function replace(member: TeamMember): void {
  members.value = [...members.value.filter((existing) => existing.id !== member.id), member].sort((left, right) => left.name.localeCompare(right.name))
}

function invite(): Promise<void> {
  return run(async () => {
    const response = await api.post<{ data: TeamMember }>(`/api/v1/businesses/${props.businessId}/team`, { ...form.value, name: form.value.name || null })
    replace(response.data.data)
    form.value = { email: '', name: '', role: 'accountant' }
  }, m.value.inviteFailed)
}

function changeRole(member: TeamMember, role: InvitableRole): Promise<void> {
  // Restrictions the new role never had are dropped with the change.
  const restrictions = member.restrictions.filter((restriction) => restrictable[role].includes(restriction))
  return run(async () => {
    const response = await api.put<{ data: TeamMember }>(`/api/v1/businesses/${props.businessId}/team/${member.id}`, { role, restrictions })
    replace(response.data.data)
  }, m.value.saveFailed)
}

function toggleRestriction(member: TeamMember, restriction: TeamRestriction): Promise<void> {
  const restrictions = member.restrictions.includes(restriction) ? member.restrictions.filter((existing) => existing !== restriction) : [...member.restrictions, restriction]
  return run(async () => {
    const response = await api.put<{ data: TeamMember }>(`/api/v1/businesses/${props.businessId}/team/${member.id}`, { restrictions })
    replace(response.data.data)
  }, m.value.saveFailed)
}

function remove(member: TeamMember): Promise<void> {
  if (!window.confirm(m.value.confirmRemove(member.name))) return Promise.resolve()
  return run(async () => {
    await api.delete(`/api/v1/businesses/${props.businessId}/team/${member.id}`)
    members.value = members.value.filter((existing) => existing.id !== member.id)
  }, m.value.saveFailed)
}

onMounted(load)
</script>

<template>
  <section class="content-panel">
    <div class="panel-heading"><div><p class="eyebrow">{{ m.eyebrow }}</p><h2>{{ m.title }}</h2></div><span class="status-chip">{{ m.ownerControlled }}</span></div>
    <p v-if="error" class="error-text" role="alert">{{ error }}</p>

    <form class="entry-form" @submit.prevent="invite">
      <h3>{{ m.inviteTitle }}</h3>
      <p class="form-note">{{ m.inviteNote }}</p>
      <div class="fields-grid">
        <label>{{ m.email }}<input v-model.trim="form.email" type="email" required maxlength="255" autocomplete="off" /></label>
        <label>{{ m.name }}<input v-model.trim="form.name" maxlength="255" autocomplete="off" :placeholder="m.nameHint" /></label>
        <label>{{ m.role }}<select v-model="form.role"><option v-for="role in invitableRoles" :key="role" :value="role">{{ m.roles[role] }}</option></select><small class="form-note role-help">{{ m.roleHelp[form.role] }}</small></label>
      </div>
      <div class="form-footer"><button class="primary-button" type="submit" :disabled="saving">{{ saving ? m.sending : m.send }}</button></div>
    </form>

    <div class="member-list">
      <article v-for="member in members" :key="member.id" class="member-row">
        <div class="member-main"><strong>{{ member.name }}</strong><span>{{ member.email }}</span></div>
        <span class="status-chip" :class="{ posted: member.status === 'active' }">{{ m.status[member.status] }}</span>
        <span v-if="member.role === 'owner'" class="member-role">{{ m.roles.owner }}</span>
        <template v-else>
          <label class="member-role"><span class="kt-sr-only">{{ m.role }}</span><select :value="member.role" :disabled="saving" @change="changeRole(member, ($event.target as HTMLSelectElement).value as InvitableRole)"><option v-for="role in invitableRoles" :key="role" :value="role">{{ m.roles[role] }}</option></select></label>
          <button class="text-button danger" type="button" :disabled="saving" @click="remove(member)">{{ m.remove }}</button>
          <fieldset class="member-restrictions">
            <legend>{{ m.restrictionsLabel }}</legend>
            <label v-for="restriction in restrictable[member.role]" :key="restriction"><input type="checkbox" :checked="member.restrictions.includes(restriction)" :disabled="saving" @change="toggleRestriction(member, restriction)" />{{ m.restrictions[restriction] }}</label>
          </fieldset>
        </template>
      </article>
      <p v-if="!loading && !members.length" class="empty-message">{{ m.empty }}</p>
    </div>
  </section>
</template>

<style scoped>
.fields-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.role-help { margin: 0; font-weight: 400; }
.member-list { display: grid; margin-top: 20px; }
.member-row { display: grid; grid-template-columns: minmax(0, 1fr) auto auto auto; align-items: center; gap: 10px 14px; padding: 14px 0; border-bottom: 1px solid #edf1ed; }
.member-row:last-of-type { border-bottom: 0; }
.member-main { display: grid; min-width: 0; gap: 4px; }
.member-main strong { color: #2a4033; font-size: 13px; overflow-wrap: anywhere; }
.member-main span { color: #77837b; font-size: 12px; overflow-wrap: anywhere; }
.member-role { color: #45594c; font-size: 12px; font-weight: 650; }
.member-role select { min-height: 36px; padding: 6px 8px; border: 1px solid #d8e1d9; border-radius: 8px; color: #27392f; background: #fff; font: inherit; }
.member-restrictions { display: flex; flex-wrap: wrap; grid-column: 1 / -1; gap: 6px 16px; margin: 0; padding: 0; border: 0; color: #45594c; font-size: 12px; }
.member-restrictions legend { float: left; margin-right: 16px; padding: 0; color: #77837b; }
.member-restrictions label { display: inline-flex; align-items: center; gap: 6px; }
.text-button.danger { color: #9b352b; }
.text-button:disabled { cursor: not-allowed; opacity: .55; }
@media (max-width: 720px) { .fields-grid { grid-template-columns: 1fr; } .member-row { grid-template-columns: minmax(0, 1fr) auto; } }
</style>
