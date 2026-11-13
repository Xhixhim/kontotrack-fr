<script setup lang="ts">
import { tr, trf } from '@/lib/tr'
import { computed, onMounted, ref } from 'vue'
import api from '@/lib/api'
import { formatDate, formatMoney, getApiError, nullableText, todayIsoDate } from '@/lib/format'

interface BusinessTask {
  id: number
  kind: 'task' | 'tax_filing'
  obligation_type: string | null
  period_label: string | null
  title: string
  notes: string | null
  due_on: string
  status: 'open' | 'done'
  is_overdue: boolean
  assigned_to: { id: number; name: string } | null
  completed_on: string | null
  reference: string | null
  amount: string | null
  document: { id: number; original_name: string } | null
}

interface Member {
  id: number
  name: string
}

const props = defineProps<{ businessId: number; currency: string; canEdit: boolean; canGenerate: boolean }>()

const tasks = ref<BusinessTask[]>([])
const members = ref<Member[]>([])
const statusFilter = ref<'open' | 'done' | ''>('open')
const error = ref('')
const notice = ref('')
const saving = ref(false)
const showTaskForm = ref(false)
const taskForm = ref({ title: '', due_on: todayIsoDate(), notes: '', assigned_to: '' })
const generateYear = ref(Number(todayIsoDate().slice(0, 4)))
const completingTaskId = ref<number | null>(null)
const completeForm = ref({ completed_on: todayIsoDate(), reference: '', amount: '' })
const confirmationFile = ref<File | null>(null)

const overdueCount = computed(() => tasks.value.filter((task) => task.is_overdue).length)
const dueSoonCount = computed(() => {
  const limit = new Date(`${todayIsoDate()}T00:00:00`)
  limit.setDate(limit.getDate() + 7)
  return tasks.value.filter((task) => task.status === 'open' && !task.is_overdue && new Date(`${task.due_on}T00:00:00`) <= limit).length
})

async function load(): Promise<void> {
  try {
    const [tasksResponse, membersResponse] = await Promise.all([
      api.get<{ data: BusinessTask[] }>(`/api/v1/businesses/${props.businessId}/tasks`, { params: statusFilter.value ? { status: statusFilter.value } : {} }),
      api.get<{ data: Member[] }>(`/api/v1/businesses/${props.businessId}/members`),
    ])
    tasks.value = tasksResponse.data.data
    members.value = membersResponse.data.data
  } catch (caught: unknown) {
    error.value = getApiError(caught, tr('We could not load tasks.'))
  }
}

async function run(action: () => Promise<void>, fallback: string): Promise<void> {
  saving.value = true
  error.value = ''
  notice.value = ''

  try {
    await action()
  } catch (caught: unknown) {
    error.value = getApiError(caught, fallback)
  } finally {
    saving.value = false
  }
}

function createTask(): Promise<void> {
  return run(async () => {
    await api.post(`/api/v1/businesses/${props.businessId}/tasks`, {
      title: taskForm.value.title,
      due_on: taskForm.value.due_on,
      notes: nullableText(taskForm.value.notes),
      assigned_to: taskForm.value.assigned_to ? Number(taskForm.value.assigned_to) : null,
    })
    taskForm.value = { title: '', due_on: todayIsoDate(), notes: '', assigned_to: '' }
    showTaskForm.value = false
    await load()
  }, tr('We could not create this task.'))
}

function generateCalendar(): Promise<void> {
  return run(async () => {
    const response = await api.post<{ data: { created: number; rule_version: string } }>(`/api/v1/businesses/${props.businessId}/tasks/generate-tax-calendar`, { year: generateYear.value })
    notice.value = trf('{0} deadline(s) added from tax calendar {1}.', [response.data.data.created, response.data.data.rule_version])
    await load()
  }, tr('We could not generate the tax calendar.'))
}

function startCompleting(task: BusinessTask): void {
  completingTaskId.value = completingTaskId.value === task.id ? null : task.id
  completeForm.value = { completed_on: todayIsoDate(), reference: '', amount: '' }
  confirmationFile.value = null
}

function selectConfirmation(event: Event): void {
  confirmationFile.value = (event.target as HTMLInputElement).files?.[0] ?? null
}

function completeTask(task: BusinessTask): Promise<void> {
  return run(async () => {
    let documentId: number | null = null

    if (confirmationFile.value) {
      const formData = new FormData()
      formData.append('file', confirmationFile.value)
      formData.append('category', task.kind === 'tax_filing' ? 'tax_filing' : 'other')
      formData.append('document_date', completeForm.value.completed_on)
      const upload = await api.post<{ data: { id: number } }>(`/api/v1/businesses/${props.businessId}/documents`, formData)
      documentId = upload.data.data.id
    }

    await api.post(`/api/v1/businesses/${props.businessId}/tasks/${task.id}/complete`, {
      completed_on: completeForm.value.completed_on,
      reference: nullableText(completeForm.value.reference),
      amount: completeForm.value.amount || null,
      document_id: documentId,
    })
    completingTaskId.value = null
    await load()
  }, tr('We could not complete this task.'))
}

onMounted(load)
</script>

<template>
  <div>
    <div class="panel-heading">
      <div><p class="eyebrow">{{ tr('Filings, reminders, follow-ups') }}</p><h2>{{ tr('Tasks & deadlines') }}</h2></div>
      <button v-if="canEdit" class="primary-button" type="button" @click="showTaskForm = !showTaskForm">{{ showTaskForm ? tr('Cancel') : tr('Add task') }}</button>
    </div>
    <div class="summary-grid">
      <article class="summary-card"><span>{{ tr('Overdue') }}</span><strong>{{ overdueCount }}</strong><small>{{ tr('Open tasks past their deadline') }}</small></article>
      <article class="summary-card"><span>{{ tr('Due within 7 days') }}</span><strong>{{ dueSoonCount }}</strong><small>{{ tr('Open tasks coming up') }}</small></article>
    </div>
    <p v-if="error" class="error-text" role="alert">{{ error }}</p>
    <p v-if="notice" class="form-note" role="status">{{ notice }}</p>

    <form v-if="showTaskForm" class="entry-form" @submit.prevent="createTask">
      <h3>{{ tr('New task') }}</h3>
      <div class="fields-grid">
        <label>{{ tr('Title') }}<input v-model.trim="taskForm.title" required maxlength="200" /></label>
        <label>{{ tr('Due on') }}<input v-model="taskForm.due_on" type="date" required /></label>
        <label>{{ tr('Assign to') }}<select v-model="taskForm.assigned_to"><option value="">{{ tr('Nobody') }}</option><option v-for="member in members" :key="member.id" :value="String(member.id)">{{ member.name }}</option></select></label>
        <label>{{ tr('Notes') }}<input v-model.trim="taskForm.notes" maxlength="5000" /></label>
      </div>
      <div class="form-footer"><button class="primary-button" type="submit" :disabled="saving">{{ tr('Save task') }}</button></div>
    </form>

    <form class="report-filters" @submit.prevent="load">
      <label>{{ tr('Show') }}<select v-model="statusFilter" @change="load"><option value="open">{{ tr('Open') }}</option><option value="done">{{ tr('Done') }}</option><option value="">{{ tr('All') }}</option></select></label>
      <template v-if="canGenerate">
        <label>{{ tr('Tax calendar year') }}<input v-model.number="generateYear" type="number" min="2000" max="2100" /></label>
        <button class="text-button" type="button" :disabled="saving" @click="generateCalendar">{{ tr('Add filing deadlines') }}</button>
      </template>
    </form>

    <div class="contact-list">
      <article v-for="task in tasks" :key="task.id" class="contact-row task-row" :class="{ overdue: task.is_overdue }">
        <div>
          <strong>{{ task.title }}</strong>
          <span>{{ task.kind === 'tax_filing' ? tr('Tax filing') : tr('Task') }} {{ tr('· due') }} {{ formatDate(task.due_on) }}<template v-if="task.assigned_to"> · {{ task.assigned_to.name }}</template><template v-if="task.notes"> · {{ task.notes }}</template></span>
          <span v-if="task.status === 'done'">{{ tr('Done') }} {{ formatDate(task.completed_on) }}<template v-if="task.reference"> {{ tr('· ref.') }} {{ task.reference }}</template><template v-if="task.amount"> · {{ formatMoney(task.amount, currency) }}</template><template v-if="task.document"> · {{ task.document.original_name }}</template></span>
        </div>
        <span class="severity-chip" :class="task.status === 'done' ? 'ok' : task.is_overdue ? 'critical' : 'warning'">{{ task.status === 'done' ? 'done' : task.is_overdue ? 'overdue' : 'open' }}</span>
        <div class="contact-actions"><button v-if="canEdit && task.status === 'open'" class="text-button" type="button" @click="startCompleting(task)">{{ task.kind === 'tax_filing' ? tr('Mark filed') : tr('Mark done') }}</button></div>
        <form v-if="completingTaskId === task.id" class="entry-form complete-form" @submit.prevent="completeTask(task)">
          <label>{{ tr('Completed on') }}<input v-model="completeForm.completed_on" type="date" required /></label>
          <label>{{ tr('Reference') }} <span>{{ tr('(optional)') }}</span><input v-model.trim="completeForm.reference" maxlength="120" /></label>
          <label v-if="task.kind === 'tax_filing'">{{ tr('Amount declared') }} <span>{{ tr('(optional)') }}</span><input v-model="completeForm.amount" type="number" min="0" step="0.01" /></label>
          <label>{{ task.kind === 'tax_filing' ? tr('Filing confirmation') : tr('Attachment (optional)') }}<input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" :required="task.kind === 'tax_filing'" @change="selectConfirmation" /></label>
          <div class="form-footer"><button class="primary-button" type="submit" :disabled="saving">{{ saving ? tr('Saving…') : tr('Confirm') }}</button></div>
        </form>
      </article>
      <p v-if="!tasks.length" class="empty-message">{{ tr('No tasks here.') }}</p>
    </div>
  </div>
</template>

<style scoped>
.task-row.overdue strong { color: #9b352b; }
.complete-form { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; }
.complete-form label { display: grid; gap: 4px; font-size: 12px; }
</style>
