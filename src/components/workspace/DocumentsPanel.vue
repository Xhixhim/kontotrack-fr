<script setup lang="ts">
import { tr, trValue } from '@/lib/tr'
import { onMounted, ref } from 'vue'
import api from '@/lib/api'
import { formatDate, getApiError, nullableText, todayIsoDate } from '@/lib/format'

interface ArchivedDocument {
  id: number
  category: string
  original_name: string
  document_date: string | null
  notes: string | null
  counterparty: { id: number; name: string } | null
  employee?: { id: number; name: string } | null
  payroll_run?: { id: number; period: string } | null
  review_status: 'pending' | 'reviewed'
  extracted_data: Record<string, string | null> | null
  created_at: string
}

interface DocumentRequest {
  id: number
  title: string
  description: string | null
  category: string
  due_on: string | null
  status: 'open' | 'submitted' | 'accepted'
  requested_by: string | null
  submitted_by: string | null
  review_note: string | null
  document: { id: number; original_name: string } | null
}

const props = defineProps<{ businessId: number; canManage: boolean; canUpload: boolean; canViewPayroll: boolean; counterparties: Array<{ id: number; name: string }> }>()

// Contracts and payslips can be filed with an employee or a payroll run; only members who may see payroll get these lists.
const employees = ref<Array<{ id: number; first_name: string; last_name: string }>>([])
const payrollRuns = ref<Array<{ id: number; period_year: number; period_month: number }>>([])

const categories = ['invoice', 'receipt', 'contract', 'bank_statement', 'payroll', 'tax_filing', 'certificate', 'authorization', 'lease', 'other']
const section = ref<'archive' | 'requests'>('archive')
const documents = ref<ArchivedDocument[]>([])
const requests = ref<DocumentRequest[]>([])
const filters = ref({ category: '', counterparty_id: '', employee_id: '', review_status: '', from: '', to: '' })
const error = ref('')
const saving = ref(false)
const showUpload = ref(false)
const uploadForm = ref({ category: 'invoice', counterparty_id: '', employee_id: '', payroll_run_id: '', document_date: todayIsoDate(), notes: '' })
const uploadFile = ref<File | null>(null)
const editingDocument = ref<ArchivedDocument | null>(null)
const editForm = ref({ category: 'other', counterparty_id: '', employee_id: '', payroll_run_id: '', document_date: '', notes: '' })
const reviewingDocument = ref<ArchivedDocument | null>(null)
const reviewForm = ref({ supplier_name: '', supplier_nui: '', document_number: '', document_date: '', net_amount: '', tax_amount: '', gross_amount: '' })
const showRequestForm = ref(false)
const requestForm = ref({ title: '', description: '', category: 'invoice', due_on: '' })
const submittingRequestId = ref<number | null>(null)
const requestFile = ref<File | null>(null)
const rejectingRequestId = ref<number | null>(null)
const rejectNote = ref('')

function label(value: string): string {
  return value.replaceAll('_', ' ')
}

function downloadUrl(document: ArchivedDocument): string {
  return `${api.defaults.baseURL}/api/v1/businesses/${props.businessId}/documents/${document.id}/download`
}

async function loadDocuments(): Promise<void> {
  const params = Object.fromEntries(Object.entries(filters.value).filter(([, value]) => value !== ''))
  const response = await api.get<{ data: ArchivedDocument[] }>(`/api/v1/businesses/${props.businessId}/documents`, { params })
  documents.value = response.data.data
}

async function loadPayrollLinks(): Promise<void> {
  if (!props.canViewPayroll) return
  const [employeeResponse, runResponse] = await Promise.all([
    api.get<{ data: typeof employees.value }>(`/api/v1/businesses/${props.businessId}/employees`),
    api.get<{ data: typeof payrollRuns.value }>(`/api/v1/businesses/${props.businessId}/payroll-runs`),
  ])
  employees.value = employeeResponse.data.data
  payrollRuns.value = runResponse.data.data
}

function runLabel(run: { period_year: number; period_month: number }): string {
  return `${String(run.period_month).padStart(2, '0')}.${run.period_year}`
}

// Reading invoices with AI is optional on the server; the button only shows when it is switched on.
const canReadAutomatically = ref(false)
const readingDocumentId = ref<number | null>(null)

async function loadFeatures(): Promise<void> {
  try {
    const response = await api.get<{ data: { document_reading: boolean } }>('/api/v1/features')
    canReadAutomatically.value = response.data.data.document_reading
  } catch {
    canReadAutomatically.value = false
  }
}

function readAutomatically(document: ArchivedDocument): Promise<void> {
  readingDocumentId.value = document.id
  return run(async () => {
    const response = await api.post<{ data: ArchivedDocument }>(`/api/v1/businesses/${props.businessId}/documents/${document.id}/read`)
    documents.value = documents.value.map((existing) => (existing.id === document.id ? response.data.data : existing))
    // What was read is only a suggestion: open the review form so a person checks and confirms it.
    startReview(response.data.data)
  }, tr('This document could not be read automatically.')).finally(() => {
    readingDocumentId.value = null
  })
}

async function loadRequests(): Promise<void> {
  const response = await api.get<{ data: DocumentRequest[] }>(`/api/v1/businesses/${props.businessId}/document-requests`)
  requests.value = response.data.data
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

async function upload(file: File, attributes: { category: string; counterparty_id?: string; employee_id?: string; payroll_run_id?: string; document_date?: string; notes?: string }): Promise<number> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('category', attributes.category)
  if (attributes.counterparty_id) formData.append('counterparty_id', attributes.counterparty_id)
  if (attributes.employee_id) formData.append('employee_id', attributes.employee_id)
  if (attributes.payroll_run_id) formData.append('payroll_run_id', attributes.payroll_run_id)
  if (attributes.document_date) formData.append('document_date', attributes.document_date)
  if (attributes.notes) formData.append('notes', attributes.notes)
  const response = await api.post<{ data: { id: number } }>(`/api/v1/businesses/${props.businessId}/documents`, formData)
  return response.data.data.id
}

function submitUpload(): Promise<void> {
  return run(async () => {
    if (!uploadFile.value) throw new Error(tr('Choose a file'))
    await upload(uploadFile.value, uploadForm.value)
    uploadForm.value = { category: 'invoice', counterparty_id: '', employee_id: '', payroll_run_id: '', document_date: todayIsoDate(), notes: '' }
    uploadFile.value = null
    showUpload.value = false
    await loadDocuments()
  }, tr('We could not upload this document.'))
}

function startEditing(document: ArchivedDocument): void {
  editingDocument.value = document
  reviewingDocument.value = null
  editForm.value = { category: document.category, counterparty_id: document.counterparty ? String(document.counterparty.id) : '', employee_id: document.employee ? String(document.employee.id) : '', payroll_run_id: document.payroll_run ? String(document.payroll_run.id) : '', document_date: document.document_date ?? '', notes: document.notes ?? '' }
}

function saveDetails(document: ArchivedDocument): Promise<void> {
  return run(async () => {
    await api.put(`/api/v1/businesses/${props.businessId}/documents/${document.id}`, {
      category: editForm.value.category,
      counterparty_id: editForm.value.counterparty_id ? Number(editForm.value.counterparty_id) : null,
      ...(props.canViewPayroll ? { employee_id: editForm.value.employee_id ? Number(editForm.value.employee_id) : null, payroll_run_id: editForm.value.payroll_run_id ? Number(editForm.value.payroll_run_id) : null } : {}),
      document_date: nullableText(editForm.value.document_date),
      notes: nullableText(editForm.value.notes),
    })
    editingDocument.value = null
    await loadDocuments()
  }, tr('We could not save these details.'))
}

function startReview(document: ArchivedDocument): void {
  reviewingDocument.value = document
  editingDocument.value = null
  const data = document.extracted_data ?? {}
  reviewForm.value = {
    supplier_name: data.supplier_name ?? document.counterparty?.name ?? '',
    supplier_nui: data.supplier_nui ?? '',
    document_number: data.document_number ?? '',
    document_date: data.document_date ?? document.document_date ?? '',
    net_amount: data.net_amount ?? '',
    tax_amount: data.tax_amount ?? '',
    gross_amount: data.gross_amount ?? '',
  }
}

function saveReview(document: ArchivedDocument): Promise<void> {
  return run(async () => {
    const extracted = Object.fromEntries(Object.entries(reviewForm.value).map(([key, value]) => [key, nullableText(value)]))
    await api.post(`/api/v1/businesses/${props.businessId}/documents/${document.id}/review`, { extracted_data: extracted })
    reviewingDocument.value = null
    await loadDocuments()
  }, tr('We could not save this review.'))
}

function createRequest(): Promise<void> {
  return run(async () => {
    await api.post(`/api/v1/businesses/${props.businessId}/document-requests`, {
      title: requestForm.value.title,
      description: nullableText(requestForm.value.description),
      category: requestForm.value.category,
      due_on: nullableText(requestForm.value.due_on),
    })
    requestForm.value = { title: '', description: '', category: 'invoice', due_on: '' }
    showRequestForm.value = false
    await loadRequests()
  }, tr('We could not create this request.'))
}

function submitRequest(request: DocumentRequest): Promise<void> {
  return run(async () => {
    if (!requestFile.value) throw new Error(tr('Choose a file'))
    const documentId = await upload(requestFile.value, { category: request.category })
    await api.post(`/api/v1/businesses/${props.businessId}/document-requests/${request.id}/submit`, { document_id: documentId })
    submittingRequestId.value = null
    requestFile.value = null
    await Promise.all([loadRequests(), loadDocuments()])
  }, tr('We could not send this document.'))
}

function acceptRequest(request: DocumentRequest): Promise<void> {
  return run(async () => {
    await api.post(`/api/v1/businesses/${props.businessId}/document-requests/${request.id}/accept`)
    await loadRequests()
  }, tr('We could not accept this document.'))
}

function rejectRequest(request: DocumentRequest): Promise<void> {
  return run(async () => {
    await api.post(`/api/v1/businesses/${props.businessId}/document-requests/${request.id}/reject`, { review_note: rejectNote.value })
    rejectingRequestId.value = null
    rejectNote.value = ''
    await loadRequests()
  }, tr('We could not send this document back.'))
}

onMounted(() => run(async () => { await Promise.all([loadDocuments(), loadRequests(), loadPayrollLinks(), loadFeatures()]) }, tr('We could not load documents.')))
</script>

<template>
  <div>
    <div class="panel-heading">
      <div><p class="eyebrow">{{ tr('Archive and requests') }}</p><h2>{{ tr('Documents') }}</h2></div>
      <button v-if="section === 'archive' && canUpload" class="primary-button" type="button" @click="showUpload = !showUpload">{{ showUpload ? tr('Cancel') : tr('Upload document') }}</button>
      <button v-else-if="section === 'requests' && canManage" class="primary-button" type="button" @click="showRequestForm = !showRequestForm">{{ showRequestForm ? tr('Cancel') : tr('Request a document') }}</button>
    </div>
    <nav class="kind-tabs" :aria-label="tr('Documents')">
      <button :class="{ active: section === 'archive' }" @click="section = 'archive'">{{ tr('Archive') }}</button>
      <button :class="{ active: section === 'requests' }" @click="section = 'requests'">{{ tr('Requests') }} <template v-if="requests.filter((item) => item.status !== 'accepted').length">({{ requests.filter((item) => item.status !== 'accepted').length }})</template></button>
    </nav>
    <p v-if="error" class="error-text" role="alert">{{ error }}</p>

    <template v-if="section === 'archive'">
      <form v-if="showUpload" class="entry-form" @submit.prevent="submitUpload">
        <h3>{{ tr('Upload a document') }}</h3>
        <div class="fields-grid">
          <label>{{ tr('File') }}<input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" required @change="uploadFile = ($event.target as HTMLInputElement).files?.[0] ?? null" /></label>
          <label>{{ tr('Category') }}<select v-model="uploadForm.category"><option v-for="category in categories" :key="category" :value="category">{{ label(category) }}</option></select></label>
          <label>{{ tr('Client or supplier') }} <span>{{ tr('(optional)') }}</span><select v-model="uploadForm.counterparty_id"><option value="">{{ tr('None') }}</option><option v-for="party in counterparties" :key="party.id" :value="String(party.id)">{{ party.name }}</option></select></label>
          <label v-if="canViewPayroll && employees.length">{{ tr('Employee') }} <span>{{ tr('(optional)') }}</span><select v-model="uploadForm.employee_id"><option value="">{{ tr('None') }}</option><option v-for="employee in employees" :key="employee.id" :value="String(employee.id)">{{ employee.first_name }} {{ employee.last_name }}</option></select></label>
          <label v-if="canViewPayroll && payrollRuns.length">{{ tr('Payroll month') }} <span>{{ tr('(optional)') }}</span><select v-model="uploadForm.payroll_run_id"><option value="">{{ tr('None') }}</option><option v-for="payrollRun in payrollRuns" :key="payrollRun.id" :value="String(payrollRun.id)">{{ runLabel(payrollRun) }}</option></select></label>
          <label>{{ tr('Document date') }}<input v-model="uploadForm.document_date" type="date" /></label>
          <label>{{ tr('Notes') }}<input v-model.trim="uploadForm.notes" maxlength="2000" /></label>
        </div>
        <div class="form-footer"><button class="primary-button" type="submit" :disabled="saving">{{ saving ? tr('Uploading…') : tr('Upload') }}</button></div>
      </form>
      <form class="report-filters" @submit.prevent="run(loadDocuments, tr('We could not filter documents.'))">
        <label>{{ tr('Category') }}<select v-model="filters.category"><option value="">{{ tr('All') }}</option><option v-for="category in categories" :key="category" :value="category">{{ label(category) }}</option></select></label>
        <label>{{ tr('Client or supplier') }}<select v-model="filters.counterparty_id"><option value="">{{ tr('All') }}</option><option v-for="party in counterparties" :key="party.id" :value="String(party.id)">{{ party.name }}</option></select></label>
        <label v-if="canViewPayroll && employees.length">{{ tr('Employee') }}<select v-model="filters.employee_id"><option value="">{{ tr('All') }}</option><option v-for="employee in employees" :key="employee.id" :value="String(employee.id)">{{ employee.first_name }} {{ employee.last_name }}</option></select></label>
        <label>{{ tr('Review') }}<select v-model="filters.review_status"><option value="">{{ tr('All') }}</option><option value="pending">{{ tr('Pending') }}</option><option value="reviewed">{{ tr('Reviewed') }}</option></select></label>
        <label>{{ tr('From') }}<input v-model="filters.from" type="date" /></label>
        <label>{{ tr('To') }}<input v-model="filters.to" type="date" /></label>
        <button class="text-button" type="submit">{{ tr('Filter') }}</button>
      </form>
      <div class="contact-list">
        <article v-for="document in documents" :key="document.id" class="contact-row">
          <div>
            <strong><a :href="downloadUrl(document)" target="_blank" rel="noopener">{{ document.original_name }}</a></strong>
            <span>{{ label(document.category) }} · {{ formatDate(document.document_date ?? document.created_at) }}<template v-if="document.counterparty"> · {{ document.counterparty.name }}</template><template v-if="document.employee"> · {{ document.employee.name }}</template><template v-if="document.payroll_run"> {{ tr('· Payroll') }} {{ document.payroll_run.period }}</template><template v-if="document.notes"> · {{ document.notes }}</template></span>
            <span v-if="document.extracted_data?.document_number">{{ tr('No.') }} {{ document.extracted_data.document_number }}<template v-if="document.extracted_data.gross_amount"> {{ tr('· total') }} {{ document.extracted_data.gross_amount }}</template></span>
          </div>
          <span class="severity-chip" :class="document.review_status === 'reviewed' ? 'ok' : 'info'">{{ trValue(document.review_status) }}</span>
          <div class="contact-actions">
            <button v-if="canManage" class="text-button" type="button" @click="startEditing(document)">{{ tr('Details') }}</button>
            <button v-if="canManage && canReadAutomatically && ['invoice', 'receipt'].includes(document.category)" class="text-button" type="button" :disabled="saving" :title="tr('Sends this document to the AI service to read its fields. You check the result before it is saved.')" @click="readAutomatically(document)">{{ readingDocumentId === document.id ? tr('Reading…') : tr('Read automatically') }}</button>
            <button v-if="canManage" class="text-button" type="button" @click="startReview(document)">{{ tr('Review') }}</button>
          </div>
          <form v-if="editingDocument?.id === document.id" class="entry-form inline-form" @submit.prevent="saveDetails(document)">
            <label>{{ tr('Category') }}<select v-model="editForm.category"><option v-for="category in categories" :key="category" :value="category">{{ label(category) }}</option></select></label>
            <label>{{ tr('Client or supplier') }}<select v-model="editForm.counterparty_id"><option value="">{{ tr('None') }}</option><option v-for="party in counterparties" :key="party.id" :value="String(party.id)">{{ party.name }}</option></select></label>
            <label v-if="canViewPayroll && employees.length">{{ tr('Employee') }}<select v-model="editForm.employee_id"><option value="">{{ tr('None') }}</option><option v-for="employee in employees" :key="employee.id" :value="String(employee.id)">{{ employee.first_name }} {{ employee.last_name }}</option></select></label>
            <label v-if="canViewPayroll && payrollRuns.length">{{ tr('Payroll month') }}<select v-model="editForm.payroll_run_id"><option value="">{{ tr('None') }}</option><option v-for="payrollRun in payrollRuns" :key="payrollRun.id" :value="String(payrollRun.id)">{{ runLabel(payrollRun) }}</option></select></label>
            <label>{{ tr('Date') }}<input v-model="editForm.document_date" type="date" /></label>
            <label>{{ tr('Notes') }}<input v-model.trim="editForm.notes" maxlength="2000" /></label>
            <div class="form-footer"><button class="text-button" type="button" @click="editingDocument = null">{{ tr('Cancel') }}</button><button class="primary-button" type="submit" :disabled="saving">{{ tr('Save') }}</button></div>
          </form>
          <form v-if="reviewingDocument?.id === document.id" class="entry-form inline-form" @submit.prevent="saveReview(document)">
            <p class="form-note">{{ tr('Check the details against the document. Reviewed data can be used for bookkeeping; unreviewed data never is.') }}</p>
            <label>{{ tr('Supplier') }}<input v-model.trim="reviewForm.supplier_name" maxlength="255" /></label>
            <label>{{ tr('Supplier NUI') }}<input v-model.trim="reviewForm.supplier_nui" maxlength="32" /></label>
            <label>{{ tr('Number') }}<input v-model.trim="reviewForm.document_number" maxlength="80" /></label>
            <label>{{ tr('Date') }}<input v-model="reviewForm.document_date" type="date" /></label>
            <label>{{ tr('Net') }}<input v-model="reviewForm.net_amount" type="number" step="0.01" /></label>
            <label>{{ tr('VAT') }}<input v-model="reviewForm.tax_amount" type="number" step="0.01" /></label>
            <label>{{ tr('Total') }}<input v-model="reviewForm.gross_amount" type="number" step="0.01" /></label>
            <div class="form-footer"><button class="text-button" type="button" @click="reviewingDocument = null">{{ tr('Cancel') }}</button><button class="primary-button" type="submit" :disabled="saving">{{ tr('Confirm review') }}</button></div>
          </form>
        </article>
        <p v-if="!documents.length" class="empty-message">{{ tr('No documents match.') }}</p>
      </div>
    </template>

    <template v-else>
      <form v-if="showRequestForm" class="entry-form" @submit.prevent="createRequest">
        <h3>{{ tr('Request a document from the business') }}</h3>
        <div class="fields-grid">
          <label>{{ tr('What is needed') }}<input v-model.trim="requestForm.title" required maxlength="200" :placeholder="tr('Bank statement June 2026')" /></label>
          <label>{{ tr('Category') }}<select v-model="requestForm.category"><option v-for="category in categories" :key="category" :value="category">{{ label(category) }}</option></select></label>
          <label>{{ tr('Due on') }} <span>{{ tr('(optional)') }}</span><input v-model="requestForm.due_on" type="date" /></label>
          <label>{{ tr('Details') }} <span>{{ tr('(optional)') }}</span><input v-model.trim="requestForm.description" maxlength="5000" /></label>
        </div>
        <div class="form-footer"><button class="primary-button" type="submit" :disabled="saving">{{ tr('Send request') }}</button></div>
      </form>
      <div class="contact-list">
        <article v-for="request in requests" :key="request.id" class="contact-row">
          <div>
            <strong>{{ request.title }}</strong>
            <span>{{ label(request.category) }}<template v-if="request.due_on"> {{ tr('· due') }} {{ formatDate(request.due_on) }}</template><template v-if="request.requested_by"> {{ tr('· asked by') }} {{ request.requested_by }}</template><template v-if="request.description"> · {{ request.description }}</template></span>
            <span v-if="request.document">{{ tr('Sent:') }} {{ request.document.original_name }}<template v-if="request.submitted_by"> {{ tr('by') }} {{ request.submitted_by }}</template></span>
            <span v-if="request.review_note && request.status === 'open'" class="error-text">{{ tr('Sent back:') }} {{ request.review_note }}</span>
          </div>
          <span class="severity-chip" :class="request.status === 'accepted' ? 'ok' : request.status === 'submitted' ? 'info' : 'warning'">{{ trValue(request.status) }}</span>
          <div class="contact-actions">
            <button v-if="request.status === 'open' && canUpload" class="text-button" type="button" @click="submittingRequestId = submittingRequestId === request.id ? null : request.id">{{ tr('Send document') }}</button>
            <template v-if="request.status === 'submitted' && canManage">
              <button class="text-button" type="button" @click="rejectingRequestId = rejectingRequestId === request.id ? null : request.id">{{ tr('Send back') }}</button>
              <button class="primary-button" type="button" :disabled="saving" @click="acceptRequest(request)">{{ tr('Accept') }}</button>
            </template>
          </div>
          <form v-if="submittingRequestId === request.id" class="entry-form inline-form" @submit.prevent="submitRequest(request)">
            <label>{{ tr('File') }}<input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" required @change="requestFile = ($event.target as HTMLInputElement).files?.[0] ?? null" /></label>
            <div class="form-footer"><button class="primary-button" type="submit" :disabled="saving">{{ saving ? tr('Sending…') : tr('Send to accountant') }}</button></div>
          </form>
          <form v-if="rejectingRequestId === request.id" class="entry-form inline-form" @submit.prevent="rejectRequest(request)">
            <label>{{ tr('What is wrong') }}<input v-model.trim="rejectNote" required maxlength="2000" /></label>
            <div class="form-footer"><button class="primary-button" type="submit" :disabled="saving">{{ tr('Send back') }}</button></div>
          </form>
        </article>
        <p v-if="!requests.length" class="empty-message">{{ tr('No document requests.') }}</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.inline-form { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 10px; }
.inline-form label { display: grid; gap: 4px; font-size: 12px; }
.inline-form .form-note, .inline-form .form-footer { grid-column: 1 / -1; }
.contact-row a { color: inherit; }
</style>
