<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import api from '@/lib/api'
import CreditNoteForm from '@/components/workspace/CreditNoteForm.vue'
import DocumentsPanel from '@/components/workspace/DocumentsPanel.vue'
import FixedAssetsPanel from '@/components/workspace/FixedAssetsPanel.vue'
import LedgerReportsPanel from '@/components/workspace/LedgerReportsPanel.vue'
import AtkFilingsPanel from '@/components/workspace/AtkFilingsPanel.vue'
import { downloadFromApi } from '@/lib/download'
import NotificationBell from '@/components/workspace/NotificationBell.vue'
import StockOperationsPanel from '@/components/workspace/StockOperationsPanel.vue'
import TasksPanel from '@/components/workspace/TasksPanel.vue'

interface Business {
  id: number
  legal_name: string
  trade_name: string | null
  nui: string
  legal_form: string | null
  owner_name: string | null
  vat_status: 'unknown' | 'registered' | 'not_registered'
  municipality: string | null
  address: string | null
  activity_code: string | null
  registered_at: string | null
  email: string | null
  phone: string | null
  currency: string
  role: string | null
}

interface Employee {
  id: number
  first_name: string
  last_name: string
  personal_number: string | null
  position: string | null
  contract_type: 'indefinite' | 'fixed_term' | 'part_time' | 'seasonal'
  employment_start: string
  employment_end: string | null
  gross_salary: string
  is_primary_employment: boolean
  iban: string | null
  bank_name: string | null
  status: 'active' | 'inactive'
}

interface PayrollRun {
  id: number
  period_year: number
  period_month: number
  pay_date: string
  status: 'draft' | 'approved'
  rule_version: string | null
  rule_source_title: string | null
  gross_total: string
  employee_contribution_total: string
  employer_contribution_total: string
  income_tax_total: string
  net_total: string
  journal_entry_id: number | null
  approved_at: string | null
  lines?: Array<{ id: number; employee_id: number; employee_name: string; is_primary_employment: boolean; worked_days: number | null; days_in_month: number | null; base_salary: string; additions: string; additions_note: string | null; gross_salary: string; employee_contribution: string; employer_contribution: string; taxable_income: string; income_tax: string; net_salary: string }>
}

interface StatementSection {
  kind: 'sale' | 'purchase'
  opening_balance: string
  closing_balance: string
  outstanding_amount: string
  overdue_amount: string
  oldest_days_overdue: number
  lines: Array<{ date: string; type: 'invoice' | 'credit_note' | 'payment' | 'cancellation'; invoice_id: number; invoice_number: string; payment_id: number | null; reference: string | null; increase: string; decrease: string; balance: string }>
  open_invoices: Array<{ id: number; invoice_number: string; issued_on: string; due_on: string | null; status: string; gross_amount: string; outstanding_amount: string; days_overdue: number }>
}

interface CounterpartyStatement {
  counterparty: Counterparty
  from: string
  to: string
  currency: string
  sections: StatementSection[]
}

interface ControlCheck {
  key: string
  label: string
  severity: 'critical' | 'warning' | 'ok' | 'info'
  detail: string
  items: Array<Record<string, unknown>>
}

interface ControlReport {
  as_of: string
  summary: Record<ControlCheck['severity'], number>
  checks: ControlCheck[]
}

interface AuditEntry {
  id: number
  action: string
  subject: string | null
  subject_id: number | null
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  user: { id: number; name: string } | null
  created_at: string
}

interface BusinessTeamMember {
  id: number
  name: string
  email: string
  role: string
  status: 'active' | 'invited' | 'inactive'
}

interface Counterparty {
  id: number
  type: 'customer' | 'supplier' | 'both'
  name: string
  nui: string | null
  email: string | null
  phone: string | null
  address: string | null
  municipality: string | null
  status: 'active' | 'inactive'
}

interface BusinessDocument {
  id: number
  category: string
  original_name: string
  mime_type: string | null
  size_bytes: number
  review_status: string
}

interface InvoiceLineDraft {
  description: string
  quantity: string
  unit: string
  unit_price: string
  discount_amount: string
  vat_code: string
  inventory_item_id: string
  warehouse_id: string
}

interface InventoryItem {
  id: number
  sku: string
  barcode: string | null
  name: string
  unit: string
  purchase_price: string
  sale_price: string
  minimum_quantity: string
  is_active: boolean
  on_hand_quantity: string
  is_below_minimum: boolean
  preferred_supplier: { id: number; name: string } | null
}

interface Warehouse {
  id: number
  name: string
  address: string | null
  is_default: boolean
  is_active: boolean
}

interface StockMovement {
  id: number
  movement_type: string
  quantity_delta: string
  unit_cost: string | null
  occurred_on: string
  notes: string | null
  inventory_item: { id: number; sku: string; name: string; unit: string }
  warehouse: { id: number; name: string }
  document: { id: number; original_name: string } | null
  invoice: { id: number; invoice_number: string; kind: 'sale' | 'purchase' } | null
  created_by_name: string | null
}

interface VatCode {
  code: string
  label: string
  rate_percent: string
  treatment: 'taxable' | 'exempt' | 'zero_rated' | 'non_vat'
}

interface Invoice {
  id: number
  kind: 'sale' | 'purchase'
  document_type: 'invoice' | 'credit_note'
  credited_invoice_id: number | null
  credited_total: string
  invoice_number: string
  issued_on: string
  due_on: string | null
  status: string
  currency: string
  net_amount: string
  tax_amount: string
  gross_amount: string
  paid_amount: string
  outstanding_amount: string
  journal_entry_id: number | null
  compliance_rule_set_id: number
  issued_at: string | null
  cancelled_on: string | null
  cancellation_reason: string | null
  cancellation_journal_entry_id: number | null
  counterparty: { id: number; name: string; type: string }
  document: { id: number; original_name: string; mime_type: string | null; size_bytes: number } | null
  lines: Array<{ id: number; description: string; quantity: string; unit?: string | null; inventory_item_id?: number | null; warehouse_id?: number | null; unit_price: string; discount_amount: string; vat_code: string; net_amount: string; tax_amount: string }>
}

interface Account {
  id: number
  code: string
  name: string
  account_type: string
  normal_balance: 'debit' | 'credit'
  is_active: boolean
}

interface PostingAccount {
  purpose: string
  label: string
  account_types: string[]
  account: { id: number; code: string; name: string; account_type: string } | null
}

interface CashAccount {
  id: number
  name: string
  currency: string
  is_active: boolean
  balance: string
  negative_balance: boolean
  account: { id: number; code: string; name: string } | null
}

interface BankAccount {
  id: number
  bank_name: string
  account_name: string | null
  iban: string | null
  currency: string
  is_active: boolean
  balance: string
  unreconciled_transactions_count: number
  account: { id: number; code: string; name: string } | null
}

interface BankTransaction {
  id: number
  transaction_date: string
  external_id: string | null
  description: string
  amount: string
  currency: string
  is_reconciled: boolean
  reconciled_at: string | null
  journal_entry: { id: number; reference: string | null; description: string; entry_date: string } | null
  document: { id: number; original_name: string } | null
}

interface Payment {
  id: number
  paid_on: string
  direction: 'in' | 'out'
  reference: string | null
  amount: string
  currency: string
  notes: string | null
  document: { id: number; category: string; original_name: string } | null
  cash_account: { id: number; name: string; account: { id: number; code: string; name: string } } | null
  bank_account: { id: number; bank_name: string; account_name: string | null; account: { id: number; code: string; name: string } } | null
  journal_entry: { id: number; entry_date: string; reference: string | null; description: string; status: string }
  invoices: Array<{ id: number; invoice_number: string; kind: 'sale' | 'purchase'; status: string; allocated_amount: string }>
}

interface BusinessDashboardSummary {
  from: string
  to: string
  revenue: string
  expenses: string
  result: string
  sales_vat: string
  purchase_vat: string
  net_vat: string
  cash_balance: string
  bank_balance: string
  receivables: string
  overdue_receivables: string
  receivable_invoices: number
  payables: string
  overdue_payables: string
  payable_invoices: number
}

interface LedgerFinancialReport {
  type: 'trial_balance' | 'profit_loss' | 'balance_sheet'
  from: string
  to: string
  rows: Array<{ code: string; name: string; account_type: string; debit: string; credit: string }>
  totals: { debit: string; credit: string; result: string }
}

interface InvoiceAgingReport {
  type: 'receivable_aging' | 'payable_aging'
  as_of: string
  rows: Array<{
    counterparty_id: number
    counterparty_name: string
    invoice_count: number
    current: string
    days_1_30: string
    days_31_60: string
    days_61_90: string
    days_over_90: string
    total: string
    invoices: Array<{ id: number; invoice_number: string; due_on: string | null; outstanding_amount: string; bucket: string }>
  }>
  totals: { invoice_count: number; current: string; days_1_30: string; days_31_60: string; days_61_90: string; days_over_90: string; total: string }
}

interface VatSummaryRow {
  invoice_id: number
  kind: 'sale' | 'purchase'
  invoice_number: string
  issued_on: string
  entry_type: 'invoice' | 'credit_note' | 'cancellation'
  reported_on: string
  counterparty_name: string
  counterparty_nui: string | null
  vat_code: string
  vat_label: string
  rate_percent: string
  treatment: string
  net_amount: string
  tax_amount: string
  gross_amount: string
}

interface VatSummaryReport {
  type: 'vat_summary'
  from: string
  to: string
  currency: string
  rows: VatSummaryRow[]
  summary: Array<{
    kind: 'sale' | 'purchase'
    vat_code: string
    vat_label: string
    rate_percent: string
    treatment: string
    net_amount: string
    tax_amount: string
    gross_amount: string
  }>
  totals: {
    sales: { net_amount: string; tax_amount: string; gross_amount: string }
    purchases: { net_amount: string; tax_amount: string; gross_amount: string }
    invoice_vat_difference: string
    invoice_count: number
    missing_counterparty_nui_count: number
  }
}

type FinancialReport = LedgerFinancialReport | InvoiceAgingReport | VatSummaryReport

interface AccountingPeriod {
  id: number
  name: string
  starts_on: string
  ends_on: string
  status: 'open' | 'closed'
}

interface ClosingCheck {
  key: string
  label: string
  status: 'passed' | 'warning' | 'blocked' | 'not_implemented'
  detail: string
}

interface PeriodClosingReview {
  period_id: number
  name: string
  starts_on: string
  ends_on: string
  can_close: boolean
  checks: ClosingCheck[]
}

interface JournalLineDraft {
  account_id: string
  debit: string
  credit: string
  description: string
}

interface JournalEntry {
  id: number
  accounting_period_id: number
  entry_date: string
  reference: string | null
  description: string
  status: 'draft' | 'posted'
  reversal_of_id: number | null
  accounting_period: { id: number; name: string; status: string }
  lines: Array<{ id: number; account: { id: number; code: string; name: string }; debit: string; credit: string }>
}

const route = useRoute()
const businessId = Number(route.params.businessId)
const business = ref<Business | null>(null)
const counterparties = ref<Counterparty[]>([])
const invoices = ref<Invoice[]>([])
const documents = ref<BusinessDocument[]>([])
const vatCodes = ref<VatCode[]>([])
const vatRuleVersion = ref('')
const accounts = ref<Account[]>([])
const postingAccounts = ref<PostingAccount[]>([])
const postingAccountForm = ref<Record<string, string>>({})
const periods = ref<AccountingPeriod[]>([])
const closingReview = ref<PeriodClosingReview | null>(null)
const closingReviewLoading = ref(false)
const journalEntries = ref<JournalEntry[]>([])
const cashAccounts = ref<CashAccount[]>([])
const bankAccounts = ref<BankAccount[]>([])
const selectedBankAccountId = ref('')
const bankTransactions = ref<BankTransaction[]>([])
const bankStatementFile = ref<File | null>(null)
const importingBankStatement = ref(false)
const reconcilingTransactionId = ref<number | null>(null)
const reconciliationSelections = ref<Record<number, string>>({})
const payments = ref<Payment[]>([])
const inventoryItems = ref<InventoryItem[]>([])
const warehouses = ref<Warehouse[]>([])
const stockMovements = ref<StockMovement[]>([])
const showInventoryItemForm = ref(false)
const showWarehouseForm = ref(false)
const showStockMovementForm = ref(false)
const stockMovementFile = ref<File | null>(null)
const stockMovementFileInput = ref<HTMLInputElement | null>(null)
const inventoryItemForm = ref({ sku: '', barcode: '', name: '', description: '', unit: 'piece', purchase_price: '0.0000', sale_price: '0.0000', minimum_quantity: '0.0000', supplier_counterparty_id: '' })
const warehouseForm = ref({ name: '', address: '', is_default: false })
const stockMovementForm = ref({ inventory_item_id: '', warehouse_id: '', direction: 'in' as 'in' | 'out', movement_type: 'opening' as 'opening' | 'adjustment', quantity: '', unit_cost: '', document_id: '', occurred_on: todayIsoDate(), notes: '' })
const teamMembers = ref<BusinessTeamMember[]>([])
const teamForm = ref({ email: '', role: 'accountant' })
const dashboardSummary = ref<BusinessDashboardSummary | null>(null)
const dashboardLoading = ref(false)
const controlReport = ref<ControlReport | null>(null)
const showPassedControls = ref(false)
const visibleControlChecks = computed(() => {
  const order = { critical: 0, warning: 1, info: 2, ok: 3 }
  const checks = [...(controlReport.value?.checks ?? [])].sort((left, right) => order[left.severity] - order[right.severity])
  return showPassedControls.value ? checks : checks.filter((check) => check.severity === 'critical' || check.severity === 'warning')
})
const dashboardError = ref('')
const dashboardFrom = ref(`${todayIsoDate().slice(0, 7)}-01`)
const dashboardTo = ref(todayIsoDate())
const financialReport = ref<FinancialReport | null>(null)
const reportType = ref<FinancialReport['type']>('trial_balance')
const reportsView = ref<'statements' | 'ledger' | 'atk'>('statements')
const reportTypeLabels: Record<FinancialReport['type'], string> = {
  trial_balance: 'Trial balance',
  profit_loss: 'Profit and loss',
  balance_sheet: 'Balance sheet',
  vat_summary: 'VAT summary',
  receivable_aging: 'Receivables ageing',
  payable_aging: 'Payables ageing',
}

const reportPeriodLabel = computed(() => {
  const report = financialReport.value
  if (!report) return ''
  return 'as_of' in report ? `As of ${formatDate(report.as_of)}` : `${formatDate(report.from)} – ${formatDate(report.to)}`
})

function printFinancialReport(): void {
  window.print()
}
const agingFinancialReport = computed(() => financialReport.value && isInvoiceAgingReport(financialReport.value) ? financialReport.value : null)
const vatFinancialReport = computed(() => financialReport.value && isVatSummaryReport(financialReport.value) ? financialReport.value : null)
const ledgerFinancialReport = computed(() => financialReport.value && isLedgerFinancialReport(financialReport.value) ? financialReport.value : null)
const reportFrom = ref(`${todayIsoDate().slice(0, 7)}-01`)
const reportTo = ref(todayIsoDate())
const reportLoading = ref(false)
const reportError = ref('')
const activeSection = ref<'overview' | 'profile' | 'invoices' | 'inventory' | 'counterparties' | 'money' | 'payroll' | 'assets' | 'documents' | 'tasks' | 'ledger' | 'reports' | 'team'>('overview')
const activePayrollSection = ref<'employees' | 'runs'>('employees')
const employees = ref<Employee[]>([])
const payrollRuns = ref<PayrollRun[]>([])
const selectedPayrollRun = ref<PayrollRun | null>(null)
const showEmployeeForm = ref(false)
const editingEmployeeId = ref<number | null>(null)
const employeeForm = ref({ first_name: '', last_name: '', personal_number: '', position: '', contract_type: 'indefinite' as Employee['contract_type'], employment_start: todayIsoDate(), employment_end: '', gross_salary: '', is_primary_employment: true, iban: '', bank_name: '', status: 'active' as Employee['status'] })
const payrollRunForm = ref({ period_year: Number(todayIsoDate().slice(0, 4)), period_month: Number(todayIsoDate().slice(5, 7)), pay_date: todayIsoDate() })
const showPayrollAdditions = ref(false)
const payrollAdditions = ref<Record<number, { amount: string; note: string }>>({})
const activeLedgerSection = ref<'journal' | 'accounts' | 'posting' | 'periods'>('journal')
const activeMoneySection = ref<'cash' | 'bank' | 'payments'>('cash')
const invoiceKind = ref<'sale' | 'purchase'>('sale')
const loading = ref(true)
const saving = ref(false)
const pageError = ref('')
const formError = ref('')
const showInvoiceForm = ref(false)
const issueSelections = ref<Record<number, string>>({})
const cancellingInvoiceId = ref<number | null>(null)
const creditingInvoiceId = ref<number | null>(null)
const cancelForm = ref({ cancelled_on: todayIsoDate(), cancellation_reason: '' })
const showCounterpartyForm = ref(false)
const showAccountForm = ref(false)
const chartTemplateNotice = ref('')
const showPeriodForm = ref(false)
const showJournalForm = ref(false)
const showCashAccountForm = ref(false)
const showBankAccountForm = ref(false)
const showPaymentForm = ref(false)
const billFile = ref<File | null>(null)
const billFileInput = ref<HTMLInputElement | null>(null)
const paymentSourceFile = ref<File | null>(null)
const paymentSourceFileInput = ref<HTMLInputElement | null>(null)
const counterpartyForm = ref({ type: 'customer' as Counterparty['type'], name: '', nui: '', email: '', phone: '', address: '', municipality: '', status: 'active' as Counterparty['status'] })
const editingCounterpartyId = ref<number | null>(null)
const historyCounterpartyId = ref<number | null>(null)
const counterpartyStatement = ref<CounterpartyStatement | null>(null)
const statementFrom = ref(`${todayIsoDate().slice(0, 4)}-01-01`)
const statementTo = ref(todayIsoDate())
const statementLoading = ref(false)
const counterpartyHistory = ref<AuditEntry[]>([])
const businessForm = ref({ legal_name: '', trade_name: '', nui: '', legal_form: '', owner_name: '', vat_status: 'unknown' as Business['vat_status'], municipality: '', address: '', activity_code: '', registered_at: '', email: '', phone: '' })
const businessHistory = ref<AuditEntry[]>([])
const canEditBookkeeping = computed(() => business.value?.role === 'owner' || business.value?.role === 'accountant')
const canViewHistory = computed(() => ['owner', 'accountant', 'auditor'].includes(business.value?.role ?? ''))
const invoiceForm = ref({
  kind: 'sale' as 'sale' | 'purchase',
  counterparty_id: '',
  invoice_number: '',
  issued_on: todayIsoDate(),
  due_on: '',
  payment_method: '',
  document_id: '',
  notes: '',
})
const lineDrafts = ref<InvoiceLineDraft[]>([{ description: '', quantity: '1', unit: '', unit_price: '0.00', discount_amount: '0.00', vat_code: '', inventory_item_id: '', warehouse_id: '' }])
const accountForm = ref({ code: '', name: '', account_type: 'asset', normal_balance: 'debit', parent_id: '' })
const periodForm = ref({ name: '', starts_on: '', ends_on: '' })
const journalForm = ref({ accounting_period_id: '', entry_date: todayIsoDate(), reference: '', description: '' })
const journalLineDrafts = ref<JournalLineDraft[]>([
  { account_id: '', debit: '0.00', credit: '0.00', description: '' },
  { account_id: '', debit: '0.00', credit: '0.00', description: '' },
])
const cashAccountForm = ref({ name: '', account_id: '' })
const bankAccountForm = ref({ bank_name: '', account_name: '', iban: '', account_id: '' })
const paymentForm = ref({ source: 'cash' as 'cash' | 'bank', cash_account_id: '', bank_account_id: '', journal_entry_id: '', document_id: '', paid_on: todayIsoDate(), direction: 'in' as 'in' | 'out', amount: '', invoice_id: '', allocation_amount: '', offset_account_id: '', reference: '', notes: '' })

const eligibleCounterparties = computed(() => counterparties.value.filter((party) =>
  party.type === 'both' || (invoiceForm.value.kind === 'sale' ? party.type === 'customer' : party.type === 'supplier'),
))
const availableBillDocuments = computed(() => documents.value.filter((document) =>
  document.category === 'invoice' && !invoices.value.some((invoice) => invoice.document?.id === document.id),
))
const previewNet = computed(() => lineDrafts.value.reduce((sum, line) => sum + invoiceLineNetCents(line), 0) / 100)
const previewTax = computed(() => lineDrafts.value.reduce((sum, line) => {
  const code = vatCodes.value.find((item) => item.code === line.vat_code)
  const lineNetCents = invoiceLineNetCents(line)
  const lineTaxCents = code?.treatment === 'taxable' ? Math.round(lineNetCents * Number(code.rate_percent) / 100) : 0

  return sum + lineTaxCents / 100
}, 0))
const lineDiscountsValid = computed(() => lineDrafts.value.every((line) =>
  Number(line.discount_amount) >= 0 && Math.round(Number(line.discount_amount) * 100) <= Math.round((Number(line.quantity) || 0) * (Number(line.unit_price) || 0) * 100),
))
const journalDebitTotal = computed(() => journalLineDrafts.value.reduce((sum, line) => sum + (Number(line.debit) || 0), 0))
const journalCreditTotal = computed(() => journalLineDrafts.value.reduce((sum, line) => sum + (Number(line.credit) || 0), 0))
const journalIsBalanced = computed(() => Math.round(journalDebitTotal.value * 100) === Math.round(journalCreditTotal.value * 100))
const journalLinesValid = computed(() => journalLineDrafts.value.every((line) =>
  Boolean(line.account_id) && ((Number(line.debit) > 0) !== (Number(line.credit) > 0)),
))
const openPeriods = computed(() => periods.value.filter((period) => period.status === 'open'))
const activeAssetAccounts = computed(() => accounts.value.filter((account) => account.is_active && account.account_type === 'asset'))
const availablePaymentJournalEntries = computed(() => journalEntries.value.filter((entry) =>
  entry.status === 'posted' && !payments.value.some((payment) => payment.journal_entry.id === entry.id),
))
const selectedBankAccount = computed(() => bankAccounts.value.find((item) => item.id === Number(selectedBankAccountId.value)) ?? null)
const allocatableInvoices = computed(() => invoices.value.filter((invoice) =>
  invoice.document_type !== 'credit_note'
  && ['issued', 'partially_paid'].includes(invoice.status)
  && Number(invoice.outstanding_amount) > 0
  && (invoice.kind === 'sale' ? 'in' : 'out') === paymentForm.value.direction,
))
const activeInventoryItems = computed(() => inventoryItems.value.filter((item) => item.is_active))
const activeWarehouses = computed(() => warehouses.value.filter((warehouse) => warehouse.is_active))
const lowStockItems = computed(() => inventoryItems.value.filter((item) => item.is_below_minimum))

onMounted(loadWorkspace)

function todayIsoDate(): string {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10)
}

async function loadWorkspace(): Promise<void> {
  loading.value = true
  pageError.value = ''

  try {
    const [businessesResponse, partiesResponse, invoicesResponse, documentsResponse, accountsResponse, periodsResponse, journalsResponse, cashAccountsResponse, bankAccountsResponse, paymentsResponse, inventoryResponse, postingAccountsResponse] = await Promise.all([
      api.get<{ data: Business[] }>('/api/v1/businesses'),
      api.get<{ data: Counterparty[] }>(`/api/v1/businesses/${businessId}/counterparties`),
      api.get<{ data: Invoice[] }>(`/api/v1/businesses/${businessId}/invoices`),
      api.get<{ data: BusinessDocument[] }>(`/api/v1/businesses/${businessId}/documents`),
      api.get<{ data: Account[] }>(`/api/v1/businesses/${businessId}/accounts`),
      api.get<{ data: AccountingPeriod[] }>(`/api/v1/businesses/${businessId}/periods`),
      api.get<{ data: JournalEntry[] }>(`/api/v1/businesses/${businessId}/journal-entries`),
      api.get<{ data: CashAccount[] }>(`/api/v1/businesses/${businessId}/cash-accounts`),
      api.get<{ data: BankAccount[] }>(`/api/v1/businesses/${businessId}/bank-accounts`),
      api.get<{ data: Payment[] }>(`/api/v1/businesses/${businessId}/payments`),
      api.get<{ data: { items: InventoryItem[]; warehouses: Warehouse[]; movements: StockMovement[] } }>(`/api/v1/businesses/${businessId}/inventory`),
      api.get<{ data: PostingAccount[] }>(`/api/v1/businesses/${businessId}/posting-accounts`),
    ])

    business.value = businessesResponse.data.data.find((item) => item.id === businessId) ?? null
    counterparties.value = partiesResponse.data.data
    invoices.value = invoicesResponse.data.data
    documents.value = documentsResponse.data.data
    accounts.value = accountsResponse.data.data
    periods.value = periodsResponse.data.data
    journalEntries.value = journalsResponse.data.data
    cashAccounts.value = cashAccountsResponse.data.data
    bankAccounts.value = bankAccountsResponse.data.data
    payments.value = paymentsResponse.data.data
    inventoryItems.value = inventoryResponse.data.data.items
    warehouses.value = inventoryResponse.data.data.warehouses
    stockMovements.value = inventoryResponse.data.data.movements
    setPostingAccounts(postingAccountsResponse.data.data)
    if (business.value?.role === 'owner') {
      const teamResponse = await api.get<{ data: BusinessTeamMember[] }>(`/api/v1/businesses/${businessId}/team`)
      teamMembers.value = teamResponse.data.data
    }
    await loadDashboardSummary()

    if (!business.value) {
      pageError.value = 'This business is not available in your workspace.'
    }
  } catch {
    pageError.value = 'We could not load this business workspace.'
  } finally {
    loading.value = false
  }
}

async function inviteTeamMember(): Promise<void> {
  saving.value = true
  formError.value = ''
  try {
    const response = await api.post<{ data: BusinessTeamMember }>(`/api/v1/businesses/${businessId}/team`, teamForm.value)
    teamMembers.value = [...teamMembers.value.filter((member) => member.id !== response.data.data.id), response.data.data]
    teamForm.value = { email: '', role: 'accountant' }
  } catch (error: unknown) {
    formError.value = getApiError(error, 'We could not invite this user.')
  } finally {
    saving.value = false
  }
}

async function loadDashboardSummary(): Promise<void> {
  dashboardLoading.value = true
  dashboardError.value = ''

  try {
    const response = await api.get<{ data: BusinessDashboardSummary }>(`/api/v1/businesses/${businessId}/dashboard`, {
      params: { from: dashboardFrom.value, to: dashboardTo.value },
    })
    dashboardSummary.value = response.data.data
    const controlsResponse = await api.get<{ data: ControlReport }>(`/api/v1/businesses/${businessId}/controls`)
    controlReport.value = controlsResponse.data.data
  } catch (error: unknown) {
    dashboardError.value = getApiError(error, 'We could not load the financial overview.')
  } finally {
    dashboardLoading.value = false
  }
}

const reportDownloading = ref('')

async function downloadFinancialReport(format: 'xlsx' | 'pdf'): Promise<void> {
  reportDownloading.value = format
  reportError.value = ''

  try {
    await downloadFromApi(`/api/v1/businesses/${businessId}/reports/financial/export`, { type: reportType.value, from: reportFrom.value, to: reportTo.value, format }, `${reportType.value}.${format}`)
  } catch (error: unknown) {
    reportError.value = getApiError(error, 'We could not export this report.')
  } finally {
    reportDownloading.value = ''
  }
}

async function loadFinancialReport(): Promise<void> {
  reportLoading.value = true
  reportError.value = ''

  try {
    const response = await api.get<{ data: FinancialReport }>(`/api/v1/businesses/${businessId}/reports/financial`, {
      params: { type: reportType.value, from: reportFrom.value, to: reportTo.value },
    })
    financialReport.value = response.data.data
  } catch (error: unknown) {
    reportError.value = getApiError(error, 'We could not generate this report.')
  } finally {
    reportLoading.value = false
  }
}

function exportFinancialReport(): void {
  const report = financialReport.value
  if (!report) return

  let csvRows: string[][]
  if (isInvoiceAgingReport(report)) {
    csvRows = [
      ['Counterparty', 'Invoice', 'Due date', 'Aging bucket', 'Outstanding'],
      ...report.rows.flatMap((row) => row.invoices.map((invoice) => [
        row.counterparty_name,
        invoice.invoice_number,
        invoice.due_on ?? '',
        invoice.bucket.replaceAll('_', ' '),
        invoice.outstanding_amount,
      ])),
      ['Totals', `${report.totals.invoice_count} invoices`, '', '', report.totals.total],
    ]
  } else if (isVatSummaryReport(report)) {
    csvRows = [
      ['Direction', 'Entry', 'Invoice', 'Date', 'Counterparty', 'NUI / Fiscal number', 'VAT code', 'VAT treatment', 'Rate', 'Taxable base', 'VAT', 'Gross'],
      ...report.rows.map((row) => [
        row.kind === 'sale' ? 'Sales' : 'Purchase',
        row.entry_type === 'cancellation' ? 'Cancellation' : row.entry_type === 'credit_note' ? 'Credit note' : 'Invoice',
        row.invoice_number,
        row.reported_on,
        row.counterparty_name,
        row.counterparty_nui ?? '',
        row.vat_code,
        row.treatment,
        row.rate_percent,
        row.net_amount,
        row.tax_amount,
        row.gross_amount,
      ]),
      [],
      ['VAT code summary'],
      ['Direction', 'VAT code', 'Label', 'Treatment', 'Rate', 'Taxable base', 'VAT', 'Gross'],
      ...report.summary.map((row) => [
        row.kind === 'sale' ? 'Sales' : 'Purchase',
        row.vat_code,
        row.vat_label,
        row.treatment,
        row.rate_percent,
        row.net_amount,
        row.tax_amount,
        row.gross_amount,
      ]),
      ['Totals', '', '', '', '', report.totals.sales.net_amount, report.totals.sales.tax_amount, report.totals.sales.gross_amount],
      ['Purchase totals', '', '', '', '', report.totals.purchases.net_amount, report.totals.purchases.tax_amount, report.totals.purchases.gross_amount],
      ['Invoice VAT difference', '', '', '', '', '', report.totals.invoice_vat_difference, ''],
    ]
  } else {
    csvRows = [
      ['Code', 'Account', 'Type', 'Debit', 'Credit'],
      ...report.rows.map((row) => [row.code, row.name, row.account_type, row.debit, row.credit]),
    ]

    if (report.type === 'profit_loss' && report.totals.result !== '0.00') {
      const result = report.totals.result
      const isLoss = result.startsWith('-')
      csvRows.push(['', 'Net result', '', isLoss ? result.slice(1) : '0.00', isLoss ? '0.00' : result])
    }

    csvRows.push(['', 'Totals', '', report.totals.debit, report.totals.credit])
  }
  const csv = csvRows.map((row) => row.map((value, index) => csvCell(value, index < 3)).join(',')).join('\r\n')
  const downloadUrl = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = downloadUrl
  const reportDate = isInvoiceAgingReport(report) ? report.as_of : report.to
  link.download = `kontotrack-${report.type}-${reportDate}.csv`
  link.click()
  URL.revokeObjectURL(downloadUrl)
}

function isInvoiceAgingReport(report: FinancialReport): report is InvoiceAgingReport {
  return report.type === 'receivable_aging' || report.type === 'payable_aging'
}

function isVatSummaryReport(report: FinancialReport): report is VatSummaryReport {
  return report.type === 'vat_summary'
}

function isLedgerFinancialReport(report: FinancialReport): report is LedgerFinancialReport {
  return report.type === 'trial_balance' || report.type === 'profit_loss' || report.type === 'balance_sheet'
}

function csvCell(value: string, protectSpreadsheetFormula: boolean): string {
  const safeValue = protectSpreadsheetFormula && /^[\s]*[=+\-@\t\r]/.test(value) ? `'${value}` : value

  return `"${safeValue.replaceAll('"', '""')}"`
}

function formatMoney(value: string | number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: business.value?.currency || 'EUR' }).format(Number(value))
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(new Date(`${value}T00:00:00`))
}

function addLine(): void {
  lineDrafts.value.push({ description: '', quantity: '1', unit: '', unit_price: '0.00', discount_amount: '0.00', vat_code: '', inventory_item_id: '', warehouse_id: '' })
}

function selectInventoryItem(index: number): void {
  const line = lineDrafts.value[index]
  const item = inventoryItems.value.find((inventoryItem) => inventoryItem.id === Number(line?.inventory_item_id))

  if (!line) return
  if (!item) {
    line.warehouse_id = ''
    return
  }

  line.unit = item.unit
  line.unit_price = invoiceKind.value === 'sale' ? item.sale_price : item.purchase_price
  line.warehouse_id = String(warehouses.value.find((warehouse) => warehouse.is_default && warehouse.is_active)?.id ?? activeWarehouses.value[0]?.id ?? '')
}

function invoiceLineNetCents(line: InvoiceLineDraft): number {
  const baseNetCents = Math.round((Number(line.quantity) || 0) * (Number(line.unit_price) || 0) * 100)
  const discountCents = Math.round((Number(line.discount_amount) || 0) * 100)

  return baseNetCents - discountCents
}

function selectBillFile(event: Event): void {
  billFile.value = (event.target as HTMLInputElement).files?.[0] ?? null

  if (billFile.value) {
    invoiceForm.value.document_id = ''
  }
}

function selectPaymentSourceFile(event: Event): void {
  paymentSourceFile.value = (event.target as HTMLInputElement).files?.[0] ?? null
  if (paymentSourceFile.value) {
    paymentForm.value.document_id = ''
  }
}

function selectPaymentSourceDocument(): void {
  if (paymentForm.value.document_id) {
    paymentSourceFile.value = null
    if (paymentSourceFileInput.value) paymentSourceFileInput.value.value = ''
  }
}

function selectInvoiceAllocation(): void {
  const invoice = invoices.value.find((item) => item.id === Number(paymentForm.value.invoice_id))
  if (!invoice) {
    paymentForm.value.allocation_amount = ''
    return
  }

  paymentForm.value.direction = invoice.kind === 'sale' ? 'in' : 'out'
  paymentForm.value.allocation_amount = invoice.outstanding_amount
  paymentForm.value.amount = invoice.outstanding_amount
}

async function toggleInvoiceForm(): Promise<void> {
  showInvoiceForm.value = !showInvoiceForm.value
  formError.value = ''

  if (showInvoiceForm.value) {
    await loadVatCodes()
  }
}

async function loadVatCodes(): Promise<void> {
  formError.value = ''

  try {
    const response = await api.get<{ data: { version: string; codes: VatCode[] } }>(`/api/v1/businesses/${businessId}/vat-codes`, {
      params: { date: invoiceForm.value.issued_on },
    })
    vatCodes.value = response.data.data.codes
    vatRuleVersion.value = response.data.data.version
    lineDrafts.value = lineDrafts.value.map((line) => ({ ...line, vat_code: vatCodes.value.some((item) => item.code === line.vat_code) ? line.vat_code : '' }))
  } catch (error: unknown) {
    vatCodes.value = []
    vatRuleVersion.value = ''
    formError.value = getApiError(error, 'No approved VAT codes are available for this invoice date.')
  }
}

function setInvoiceKind(kind: 'sale' | 'purchase'): void {
  invoiceKind.value = kind
  invoiceForm.value.kind = kind
  invoiceForm.value.counterparty_id = ''
  lineDrafts.value.forEach((line, index) => {
    if (line.inventory_item_id) selectInventoryItem(index)
  })
}

function addJournalLine(): void {
  journalLineDrafts.value.push({ account_id: '', debit: '0.00', credit: '0.00', description: '' })
}

function setJournalSide(index: number, side: 'debit' | 'credit', value: string): void {
  const line = journalLineDrafts.value[index]

  if (!line) return

  line[side] = value
  line[side === 'debit' ? 'credit' : 'debit'] = '0.00'
}

async function createCashAccount(): Promise<void> {
  saving.value = true
  formError.value = ''

  try {
    const response = await api.post<{ data: CashAccount }>(`/api/v1/businesses/${businessId}/cash-accounts`, {
      ...cashAccountForm.value,
      account_id: Number(cashAccountForm.value.account_id),
    })
    cashAccounts.value.push(response.data.data)
    cashAccountForm.value = { name: '', account_id: '' }
    showCashAccountForm.value = false
  } catch (error: unknown) {
    formError.value = getApiError(error, 'We could not save this cash account.')
  } finally {
    saving.value = false
  }
}

async function createBankAccount(): Promise<void> {
  saving.value = true
  formError.value = ''

  try {
    const response = await api.post<{ data: BankAccount }>(`/api/v1/businesses/${businessId}/bank-accounts`, {
      ...bankAccountForm.value,
      account_name: bankAccountForm.value.account_name || null,
      iban: bankAccountForm.value.iban || null,
      account_id: Number(bankAccountForm.value.account_id),
    })
    bankAccounts.value.push(response.data.data)
    bankAccountForm.value = { bank_name: '', account_name: '', iban: '', account_id: '' }
    showBankAccountForm.value = false
  } catch (error: unknown) {
    formError.value = getApiError(error, 'We could not save this bank account.')
  } finally {
    saving.value = false
  }
}

async function loadBankTransactions(account: BankAccount): Promise<void> {
  selectedBankAccountId.value = String(account.id)
  bankTransactions.value = []
  formError.value = ''

  try {
    const response = await api.get<{ data: BankTransaction[] }>(`/api/v1/businesses/${businessId}/bank-accounts/${account.id}/transactions`)
    bankTransactions.value = response.data.data
  } catch (error: unknown) {
    formError.value = getApiError(error, 'We could not load this bank statement activity.')
  }
}

function selectBankStatement(event: Event): void {
  bankStatementFile.value = (event.target as HTMLInputElement).files?.[0] ?? null
}

async function importBankStatement(): Promise<void> {
  if (!selectedBankAccount.value || !bankStatementFile.value) return

  importingBankStatement.value = true
  formError.value = ''
  try {
    const form = new FormData()
    form.append('file', bankStatementFile.value)
    const response = await api.post<{ data: BankTransaction[] }>(`/api/v1/businesses/${businessId}/bank-accounts/${selectedBankAccount.value.id}/statement-import`, form)
    bankTransactions.value = [...response.data.data, ...bankTransactions.value]
    bankStatementFile.value = null
    const accountsResponse = await api.get<{ data: BankAccount[] }>(`/api/v1/businesses/${businessId}/bank-accounts`)
    bankAccounts.value = accountsResponse.data.data
  } catch (error: unknown) {
    formError.value = getApiError(error, 'We could not import this bank statement.')
  } finally {
    importingBankStatement.value = false
  }
}

function bankTransactionCandidates(transaction: BankTransaction): JournalEntry[] {
  const accountId = selectedBankAccount.value?.account?.id
  if (!accountId) return []
  const amountCents = Math.round(Number(transaction.amount) * 100)

  return journalEntries.value.filter((entry) => {
    if (entry.status !== 'posted' || entry.entry_date !== transaction.transaction_date) return false
    const bankMovementCents = entry.lines
      .filter((line) => line.account.id === accountId)
      .reduce((sum, line) => sum + Math.round((Number(line.debit) - Number(line.credit)) * 100), 0)

    return bankMovementCents === amountCents
  })
}

async function reconcileBankTransaction(transaction: BankTransaction): Promise<void> {
  if (!selectedBankAccount.value) return
  reconcilingTransactionId.value = transaction.id
  formError.value = ''
  try {
    const entryId = reconciliationSelections.value[transaction.id]
    const response = await api.post<{ data: BankTransaction }>(`/api/v1/businesses/${businessId}/bank-accounts/${selectedBankAccount.value.id}/transactions/${transaction.id}/reconcile`, {
      journal_entry_id: entryId ? Number(entryId) : transaction.journal_entry?.id,
    })
    bankTransactions.value = bankTransactions.value.map((item) => item.id === transaction.id ? response.data.data : item)
    const accountsResponse = await api.get<{ data: BankAccount[] }>(`/api/v1/businesses/${businessId}/bank-accounts`)
    bankAccounts.value = accountsResponse.data.data
    delete reconciliationSelections.value[transaction.id]
  } catch (error: unknown) {
    formError.value = getApiError(error, 'We could not reconcile this bank transaction.')
  } finally {
    reconcilingTransactionId.value = null
  }
}

async function createPayment(): Promise<void> {
  saving.value = true
  formError.value = ''

  try {
    let documentId = Number(paymentForm.value.document_id)
    if (paymentSourceFile.value) {
      const formData = new FormData()
      formData.append('file', paymentSourceFile.value)
      formData.append('category', 'receipt')
      const documentResponse = await api.post<{ data: BusinessDocument }>(`/api/v1/businesses/${businessId}/documents`, formData)
      documents.value = [documentResponse.data.data, ...documents.value]
      documentId = documentResponse.data.data.id
      paymentSourceFile.value = null
      if (paymentSourceFileInput.value) paymentSourceFileInput.value.value = ''
    }
    const response = await api.post<{ data: Payment }>(`/api/v1/businesses/${businessId}/payments`, {
      cash_account_id: paymentForm.value.source === 'cash' ? Number(paymentForm.value.cash_account_id) : null,
      bank_account_id: paymentForm.value.source === 'bank' ? Number(paymentForm.value.bank_account_id) : null,
      journal_entry_id: Number(paymentForm.value.journal_entry_id) || null,
      document_id: documentId,
      paid_on: paymentForm.value.paid_on,
      direction: paymentForm.value.direction,
      amount: paymentForm.value.amount,
      allocations: paymentForm.value.invoice_id ? [{ invoice_id: Number(paymentForm.value.invoice_id), amount: paymentForm.value.allocation_amount }] : undefined,
      offset_account_id: !paymentForm.value.invoice_id && !paymentForm.value.journal_entry_id && paymentForm.value.offset_account_id ? Number(paymentForm.value.offset_account_id) : undefined,
      reference: paymentForm.value.reference || null,
      notes: paymentForm.value.notes || null,
    })
    payments.value = [response.data.data, ...payments.value]
    const postedAutomatically = !paymentForm.value.journal_entry_id
    paymentForm.value = { source: paymentForm.value.source, cash_account_id: '', bank_account_id: '', journal_entry_id: '', document_id: '', paid_on: todayIsoDate(), direction: 'in', amount: '', invoice_id: '', allocation_amount: '', offset_account_id: '', reference: '', notes: '' }
    showPaymentForm.value = false
    try {
      const updatedInvoices = await api.get<{ data: Invoice[] }>(`/api/v1/businesses/${businessId}/invoices`)
      invoices.value = updatedInvoices.data.data
      if (postedAutomatically) {
        const journalsResponse = await api.get<{ data: JournalEntry[] }>(`/api/v1/businesses/${businessId}/journal-entries`)
        journalEntries.value = journalsResponse.data.data
      }
    } catch {
      formError.value = 'Payment saved. Reload the workspace to refresh invoice balances and journals.'
    }
  } catch (error: unknown) {
    formError.value = getApiError(error, 'We could not record this payment.')
  } finally {
    saving.value = false
  }
}

async function createAccount(): Promise<void> {
  saving.value = true
  formError.value = ''

  try {
    const response = await api.post<{ data: Account }>(`/api/v1/businesses/${businessId}/accounts`, {
      ...accountForm.value,
      parent_id: accountForm.value.parent_id ? Number(accountForm.value.parent_id) : null,
    })
    accounts.value.push(response.data.data)
    accounts.value.sort((left, right) => left.code.localeCompare(right.code))
    accountForm.value = { code: '', name: '', account_type: 'asset', normal_balance: 'debit', parent_id: '' }
    showAccountForm.value = false
  } catch (error: unknown) {
    formError.value = getApiError(error, 'We could not save this account.')
  } finally {
    saving.value = false
  }
}

async function applyKosovoChartTemplate(): Promise<void> {
  saving.value = true
  formError.value = ''
  chartTemplateNotice.value = ''

  try {
    const response = await api.post<{ data: { created: string[]; skipped: string[]; mapped: string[] } }>(`/api/v1/businesses/${businessId}/accounts/kosovo-template`)
    const [accountsResponse, postingAccountsResponse] = await Promise.all([
      api.get<{ data: Account[] }>(`/api/v1/businesses/${businessId}/accounts`),
      api.get<{ data: PostingAccount[] }>(`/api/v1/businesses/${businessId}/posting-accounts`),
    ])
    accounts.value = accountsResponse.data.data
    setPostingAccounts(postingAccountsResponse.data.data)
    const { created, skipped, mapped } = response.data.data
    chartTemplateNotice.value = created.length
      ? `Added ${created.length} account(s) and mapped ${mapped.length} posting account(s).${skipped.length ? ` ${skipped.length} code(s) already existed and were left unchanged.` : ''}`
      : 'Every account in the Kosovo standard chart already exists in this business.'
  } catch (error: unknown) {
    formError.value = getApiError(error, 'We could not add the Kosovo standard chart.')
  } finally {
    saving.value = false
  }
}

function setPostingAccounts(rows: PostingAccount[]): void {
  postingAccounts.value = rows
  postingAccountForm.value = Object.fromEntries(rows.map((row) => [row.purpose, row.account ? String(row.account.id) : '']))
}

function accountsForPostingPurpose(row: PostingAccount): Account[] {
  return accounts.value.filter((account) => account.is_active && row.account_types.includes(account.account_type))
}

async function savePostingAccounts(): Promise<void> {
  saving.value = true
  formError.value = ''

  try {
    const response = await api.put<{ data: PostingAccount[] }>(`/api/v1/businesses/${businessId}/posting-accounts`, {
      accounts: Object.fromEntries(Object.entries(postingAccountForm.value).map(([purpose, accountId]) => [purpose, accountId ? Number(accountId) : null])),
    })
    setPostingAccounts(response.data.data)
  } catch (error: unknown) {
    formError.value = getApiError(error, 'We could not save the posting accounts.')
  } finally {
    saving.value = false
  }
}

async function createPeriod(): Promise<void> {
  saving.value = true
  formError.value = ''

  try {
    const response = await api.post<{ data: AccountingPeriod }>(`/api/v1/businesses/${businessId}/periods`, periodForm.value)
    periods.value = [...periods.value, response.data.data].sort((left, right) => left.starts_on.localeCompare(right.starts_on))
    periodForm.value = { name: '', starts_on: '', ends_on: '' }
    showPeriodForm.value = false
  } catch (error: unknown) {
    formError.value = getApiError(error, 'We could not save this accounting period.')
  } finally {
    saving.value = false
  }
}

async function createJournalDraft(): Promise<void> {
  saving.value = true
  formError.value = ''

  try {
    const response = await api.post<{ data: JournalEntry }>(`/api/v1/businesses/${businessId}/journal-entries`, {
      ...journalForm.value,
      accounting_period_id: Number(journalForm.value.accounting_period_id),
      lines: journalLineDrafts.value.map((line) => ({
        ...line,
        account_id: Number(line.account_id),
        debit: line.debit || '0.00',
        credit: line.credit || '0.00',
      })),
    })
    journalEntries.value = [response.data.data, ...journalEntries.value]
    journalForm.value = { accounting_period_id: '', entry_date: todayIsoDate(), reference: '', description: '' }
    journalLineDrafts.value = [
      { account_id: '', debit: '0.00', credit: '0.00', description: '' },
      { account_id: '', debit: '0.00', credit: '0.00', description: '' },
    ]
    showJournalForm.value = false
  } catch (error: unknown) {
    formError.value = getApiError(error, 'We could not save this journal draft.')
  } finally {
    saving.value = false
  }
}

async function postJournal(entry: JournalEntry): Promise<void> {
  if (!window.confirm('Post this journal entry? Posted entries are locked.')) return

  saving.value = true
  formError.value = ''

  try {
    const response = await api.post<{ data: JournalEntry }>(`/api/v1/businesses/${businessId}/journal-entries/${entry.id}/post`)
    journalEntries.value = journalEntries.value.map((item) => item.id === entry.id ? response.data.data : item)
  } catch (error: unknown) {
    formError.value = getApiError(error, 'This journal entry could not be posted.')
  } finally {
    saving.value = false
  }
}

async function removeJournalDraft(entry: JournalEntry): Promise<void> {
  if (!window.confirm('Remove this draft journal entry?')) return

  saving.value = true
  formError.value = ''

  try {
    await api.delete(`/api/v1/businesses/${businessId}/journal-entries/${entry.id}`)
    journalEntries.value = journalEntries.value.filter((item) => item.id !== entry.id)
  } catch (error: unknown) {
    formError.value = getApiError(error, 'This draft could not be removed.')
  } finally {
    saving.value = false
  }
}

async function reverseJournal(entry: JournalEntry): Promise<void> {
  if (entry.status !== 'posted' || entry.reversal_of_id !== null) return
  if (!window.confirm(`Create a reversing draft for “${entry.description}”?`)) return

  const reversalDate = todayIsoDate()
  const period = openPeriods.value.find((item) => item.starts_on <= reversalDate && item.ends_on >= reversalDate)

  if (!period) {
    formError.value = 'Create or open an accounting period that contains today before reversing this entry.'
    return
  }

  saving.value = true
  formError.value = ''

  try {
    const response = await api.post<{ data: JournalEntry }>(`/api/v1/businesses/${businessId}/journal-entries/${entry.id}/reverse`, {
      accounting_period_id: period.id,
      entry_date: reversalDate,
    })
    journalEntries.value = [response.data.data, ...journalEntries.value]
  } catch (error: unknown) {
    formError.value = getApiError(error, 'A reversal draft could not be created.')
  } finally {
    saving.value = false
  }
}

async function reviewPeriodClosing(period: AccountingPeriod): Promise<void> {
  closingReviewLoading.value = true
  formError.value = ''

  try {
    const response = await api.get<{ data: PeriodClosingReview }>(`/api/v1/businesses/${businessId}/periods/${period.id}/closing-checks`)
    closingReview.value = response.data.data
  } catch (error: unknown) {
    formError.value = getApiError(error, 'The period close review could not be loaded.')
  } finally {
    closingReviewLoading.value = false
  }
}

async function closePeriod(period: AccountingPeriod): Promise<void> {
  if (!closingReview.value?.can_close || closingReview.value.period_id !== period.id) return
  if (!window.confirm(`Close ${period.name}? New journal entries can no longer be posted to it.`)) return

  saving.value = true
  formError.value = ''

  try {
    const response = await api.post<{ data: AccountingPeriod }>(`/api/v1/businesses/${businessId}/periods/${period.id}/close`)
    periods.value = periods.value.map((item) => item.id === period.id ? response.data.data : item)
    closingReview.value = null
  } catch (error: unknown) {
    formError.value = getApiError(error, 'This period could not be closed.')
  } finally {
    saving.value = false
  }
}

async function closeReviewedPeriod(): Promise<void> {
  const period = periods.value.find((item) => item.id === closingReview.value?.period_id)
  if (period) await closePeriod(period)
}

function emptyCounterpartyForm(): typeof counterpartyForm.value {
  return { type: 'customer', name: '', nui: '', email: '', phone: '', address: '', municipality: '', status: 'active' }
}

function toggleCounterpartyForm(): void {
  showCounterpartyForm.value = !showCounterpartyForm.value
  editingCounterpartyId.value = null
  counterpartyForm.value = emptyCounterpartyForm()
}

function editCounterparty(party: Counterparty): void {
  editingCounterpartyId.value = party.id
  showCounterpartyForm.value = true
  formError.value = ''
  counterpartyForm.value = {
    type: party.type,
    name: party.name,
    nui: party.nui ?? '',
    email: party.email ?? '',
    phone: party.phone ?? '',
    address: party.address ?? '',
    municipality: party.municipality ?? '',
    status: party.status,
  }
}

async function openCounterpartyCard(party: Counterparty): Promise<void> {
  statementLoading.value = true
  formError.value = ''

  try {
    const response = await api.get<{ data: CounterpartyStatement }>(`/api/v1/businesses/${businessId}/counterparties/${party.id}/statement`, {
      params: { from: statementFrom.value, to: statementTo.value },
    })
    counterpartyStatement.value = response.data.data
  } catch (error: unknown) {
    formError.value = getApiError(error, 'We could not load this contact card.')
  } finally {
    statementLoading.value = false
  }
}

function statementSideLabel(section: StatementSection): string {
  return section.kind === 'sale' ? 'Receivable (they owe you)' : 'Payable (you owe them)'
}

function statementLineLabel(line: StatementSection['lines'][number]): string {
  if (line.type === 'invoice') return `Invoice ${line.invoice_number}`
  if (line.type === 'cancellation') return `Cancelled ${line.invoice_number}`
  if (line.type === 'credit_note') return `Credit note ${line.invoice_number}`
  return `Payment for ${line.invoice_number}${line.reference ? ` · ${line.reference}` : ''}`
}

function exportCounterpartyStatement(): void {
  const statement = counterpartyStatement.value
  if (!statement) return

  const rows: string[][] = [[statement.counterparty.name, statement.counterparty.nui ?? ''], [`${statement.from} – ${statement.to}`, statement.currency]]

  for (const section of statement.sections) {
    rows.push([], [statementSideLabel(section)], ['Date', 'Entry', 'Increase', 'Decrease', 'Balance'], ['', 'Opening balance', '', '', section.opening_balance])
    rows.push(...section.lines.map((line) => [line.date, statementLineLabel(line), line.increase, line.decrease, line.balance]))
    rows.push(['', 'Closing balance', '', '', section.closing_balance])
  }

  const csv = rows.map((row) => row.map((value, index) => csvCell(value, index < 2)).join(',')).join('\r\n')
  const downloadUrl = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = downloadUrl
  link.download = `kontotrack-statement-${statement.counterparty.id}-${statement.to}.csv`
  link.click()
  URL.revokeObjectURL(downloadUrl)
}

async function toggleCounterpartyHistory(party: Counterparty): Promise<void> {
  if (historyCounterpartyId.value === party.id) {
    historyCounterpartyId.value = null
    return
  }

  historyCounterpartyId.value = party.id
  counterpartyHistory.value = await loadAuditTrail('counterparty', party.id)
}

async function loadAuditTrail(subject: 'business' | 'counterparty', subjectId: number): Promise<AuditEntry[]> {
  try {
    const response = await api.get<{ data: AuditEntry[] }>(`/api/v1/businesses/${businessId}/audit-logs`, { params: { subject, subject_id: subjectId } })
    return response.data.data
  } catch (error: unknown) {
    formError.value = getApiError(error, 'We could not load the change history.')
    return []
  }
}

function describeAuditChanges(entry: AuditEntry): string[] {
  const newValues = entry.new_values ?? {}
  const oldValues = entry.old_values ?? {}

  return Object.keys(newValues).map((field) => `${field.replaceAll('_', ' ')}: ${oldValues[field] ?? '—'} → ${newValues[field] ?? '—'}`)
}

function nullableText(value: string): string | null {
  return value === '' ? null : value
}

function openBusinessProfile(): void {
  activeSection.value = 'profile'
  formError.value = ''

  if (business.value) {
    const current = business.value
    businessForm.value = {
      legal_name: current.legal_name,
      trade_name: current.trade_name ?? '',
      nui: current.nui,
      legal_form: current.legal_form ?? '',
      owner_name: current.owner_name ?? '',
      vat_status: current.vat_status,
      municipality: current.municipality ?? '',
      address: current.address ?? '',
      activity_code: current.activity_code ?? '',
      registered_at: current.registered_at ?? '',
      email: current.email ?? '',
      phone: current.phone ?? '',
    }
  }

  if (canViewHistory.value) {
    void loadAuditTrail('business', businessId).then((entries) => { businessHistory.value = entries })
  }
}

async function saveBusinessProfile(): Promise<void> {
  saving.value = true
  formError.value = ''

  try {
    const form = businessForm.value
    const response = await api.put<{ data: Business }>(`/api/v1/businesses/${businessId}`, {
      legal_name: form.legal_name,
      trade_name: nullableText(form.trade_name),
      nui: form.nui,
      legal_form: nullableText(form.legal_form),
      owner_name: nullableText(form.owner_name),
      vat_status: form.vat_status,
      municipality: nullableText(form.municipality),
      address: nullableText(form.address),
      activity_code: nullableText(form.activity_code),
      registered_at: nullableText(form.registered_at),
      email: nullableText(form.email),
      phone: nullableText(form.phone),
    })
    business.value = { ...response.data.data, role: business.value?.role ?? null }
    if (canViewHistory.value) businessHistory.value = await loadAuditTrail('business', businessId)
  } catch (error: unknown) {
    formError.value = getApiError(error, 'We could not save the business details.')
  } finally {
    saving.value = false
  }
}

async function createCounterparty(): Promise<void> {
  saving.value = true
  formError.value = ''

  try {
    const form = counterpartyForm.value
    const payload = {
      type: form.type,
      name: form.name,
      nui: nullableText(form.nui),
      email: nullableText(form.email),
      phone: nullableText(form.phone),
      address: nullableText(form.address),
      municipality: nullableText(form.municipality),
    }

    if (editingCounterpartyId.value !== null) {
      const editedId = editingCounterpartyId.value
      const response = await api.put<{ data: Counterparty }>(`/api/v1/businesses/${businessId}/counterparties/${editedId}`, { ...payload, status: form.status })
      counterparties.value = counterparties.value.map((party) => party.id === editedId ? response.data.data : party)
      if (historyCounterpartyId.value === editedId) counterpartyHistory.value = await loadAuditTrail('counterparty', editedId)
    } else {
      const response = await api.post<{ data: Counterparty }>(`/api/v1/businesses/${businessId}/counterparties`, payload)
      counterparties.value.push(response.data.data)
    }

    counterpartyForm.value = emptyCounterpartyForm()
    editingCounterpartyId.value = null
    showCounterpartyForm.value = false
  } catch (error: unknown) {
    formError.value = getApiError(error, 'We could not save this contact.')
  } finally {
    saving.value = false
  }
}

async function refreshInventoryOverview(): Promise<void> {
  const response = await api.get<{ data: { items: InventoryItem[]; warehouses: Warehouse[]; movements: StockMovement[] } }>(`/api/v1/businesses/${businessId}/inventory`)
  inventoryItems.value = response.data.data.items
  warehouses.value = response.data.data.warehouses
  stockMovements.value = response.data.data.movements
}

async function createInventoryItem(): Promise<void> {
  saving.value = true
  formError.value = ''

  try {
    await api.post(`/api/v1/businesses/${businessId}/inventory/items`, {
      ...inventoryItemForm.value,
      supplier_counterparty_id: inventoryItemForm.value.supplier_counterparty_id ? Number(inventoryItemForm.value.supplier_counterparty_id) : null,
    })
    await refreshInventoryOverview()
    inventoryItemForm.value = { sku: '', barcode: '', name: '', description: '', unit: 'piece', purchase_price: '0.0000', sale_price: '0.0000', minimum_quantity: '0.0000', supplier_counterparty_id: '' }
    showInventoryItemForm.value = false
  } catch (error: unknown) {
    formError.value = getApiError(error, 'We could not save this inventory item.')
  } finally {
    saving.value = false
  }
}

async function createWarehouse(): Promise<void> {
  saving.value = true
  formError.value = ''

  try {
    await api.post(`/api/v1/businesses/${businessId}/inventory/warehouses`, warehouseForm.value)
    await refreshInventoryOverview()
    warehouseForm.value = { name: '', address: '', is_default: false }
    showWarehouseForm.value = false
  } catch (error: unknown) {
    formError.value = getApiError(error, 'We could not save this warehouse.')
  } finally {
    saving.value = false
  }
}

async function createStockMovement(): Promise<void> {
  saving.value = true
  formError.value = ''

  try {
    if (stockMovementFile.value) {
      const formData = new FormData()
      formData.append('file', stockMovementFile.value)
      formData.append('category', 'other')
      const response = await api.post<{ data: BusinessDocument }>(`/api/v1/businesses/${businessId}/documents`, formData)
      documents.value = [response.data.data, ...documents.value]
      stockMovementForm.value.document_id = String(response.data.data.id)
    }

    await api.post(`/api/v1/businesses/${businessId}/inventory/movements`, {
      ...stockMovementForm.value,
      inventory_item_id: Number(stockMovementForm.value.inventory_item_id),
      warehouse_id: Number(stockMovementForm.value.warehouse_id),
      document_id: Number(stockMovementForm.value.document_id),
      unit_cost: stockMovementForm.value.unit_cost || null,
    })
    await refreshInventoryOverview()
    stockMovementForm.value = { inventory_item_id: '', warehouse_id: '', direction: 'in', movement_type: 'opening', quantity: '', unit_cost: '', document_id: '', occurred_on: todayIsoDate(), notes: '' }
    stockMovementFile.value = null
    if (stockMovementFileInput.value) stockMovementFileInput.value.value = ''
    showStockMovementForm.value = false
  } catch (error: unknown) {
    formError.value = getApiError(error, 'We could not record this stock movement.')
  } finally {
    saving.value = false
  }
}

async function createInvoiceDraft(): Promise<void> {
  saving.value = true
  formError.value = ''

  try {
    if (invoiceKind.value === 'purchase' && billFile.value) {
      const formData = new FormData()
      formData.append('file', billFile.value)
      formData.append('category', 'invoice')

      const documentResponse = await api.post<{ data: BusinessDocument }>(`/api/v1/businesses/${businessId}/documents`, formData)
      invoiceForm.value.document_id = String(documentResponse.data.data.id)
      documents.value = [documentResponse.data.data, ...documents.value]
      billFile.value = null
      if (billFileInput.value) billFileInput.value.value = ''
    }

    const { invoice_number, ...invoicePayload } = invoiceForm.value
    const response = await api.post<{ data: Invoice }>(`/api/v1/businesses/${businessId}/invoices`, {
      ...invoicePayload,
      ...(invoiceKind.value === 'purchase' ? { invoice_number } : {}),
      due_on: invoiceForm.value.due_on || null,
      payment_method: invoiceForm.value.payment_method || null,
      counterparty_id: Number(invoiceForm.value.counterparty_id),
      document_id: invoiceForm.value.document_id ? Number(invoiceForm.value.document_id) : null,
      lines: lineDrafts.value.map((line) => ({
        ...line,
        inventory_item_id: line.inventory_item_id ? Number(line.inventory_item_id) : null,
        warehouse_id: line.warehouse_id ? Number(line.warehouse_id) : null,
      })),
    })
    invoices.value = [response.data.data, ...invoices.value]
    showInvoiceForm.value = false
    invoiceForm.value = {
      kind: invoiceKind.value,
      counterparty_id: '',
      invoice_number: '',
      issued_on: todayIsoDate(),
      due_on: '',
      payment_method: '',
      document_id: '',
      notes: '',
    }
    billFile.value = null
    if (billFileInput.value) billFileInput.value.value = ''
    lineDrafts.value = [{ description: '', quantity: '1', unit: '', unit_price: '0.00', discount_amount: '0.00', vat_code: '', inventory_item_id: '', warehouse_id: '' }]
  } catch (error: unknown) {
    formError.value = getApiError(error, 'We could not save this draft.')
  } finally {
    saving.value = false
  }
}

async function issueInvoice(invoice: Invoice): Promise<void> {
  const journalEntryId = Number(issueSelections.value[invoice.id]) || null

  saving.value = true
  formError.value = ''

  try {
    const response = await api.post<{ data: Invoice }>(`/api/v1/businesses/${businessId}/invoices/${invoice.id}/issue`, { journal_entry_id: journalEntryId })
    invoices.value = invoices.value.map((item) => item.id === invoice.id ? response.data.data : item)
    delete issueSelections.value[invoice.id]
    if (invoice.document_type === 'credit_note') await reloadInvoices()

    if (journalEntryId === null) {
      const journalsResponse = await api.get<{ data: JournalEntry[] }>(`/api/v1/businesses/${businessId}/journal-entries`)
      journalEntries.value = journalsResponse.data.data
    }
  } catch (error: unknown) {
    formError.value = getApiError(error, 'This invoice could not be issued.')
  } finally {
    saving.value = false
  }
}

async function reloadInvoices(): Promise<void> {
  const response = await api.get<{ data: Invoice[] }>(`/api/v1/businesses/${businessId}/invoices`)
  invoices.value = response.data.data
}

async function onCreditNoteCreated(): Promise<void> {
  creditingInvoiceId.value = null
  await reloadInvoices()
}

async function deleteDraftInvoice(invoice: Invoice): Promise<void> {
  saving.value = true
  formError.value = ''

  try {
    await api.delete(`/api/v1/businesses/${businessId}/invoices/${invoice.id}`)
    invoices.value = invoices.value.filter((item) => item.id !== invoice.id)
  } catch (error: unknown) {
    formError.value = getApiError(error, 'This draft could not be deleted.')
  } finally {
    saving.value = false
  }
}

function startInvoiceCancellation(invoice: Invoice): void {
  cancellingInvoiceId.value = cancellingInvoiceId.value === invoice.id ? null : invoice.id
  cancelForm.value = { cancelled_on: todayIsoDate(), cancellation_reason: '' }
}

async function cancelInvoice(invoice: Invoice): Promise<void> {
  saving.value = true
  formError.value = ''

  try {
    const response = await api.post<{ data: Invoice }>(`/api/v1/businesses/${businessId}/invoices/${invoice.id}/cancel`, cancelForm.value)
    invoices.value = invoices.value.map((item) => item.id === invoice.id ? response.data.data : item)
    cancellingInvoiceId.value = null
    const journalsResponse = await api.get<{ data: JournalEntry[] }>(`/api/v1/businesses/${businessId}/journal-entries`)
    journalEntries.value = journalsResponse.data.data
  } catch (error: unknown) {
    formError.value = getApiError(error, 'This invoice could not be cancelled.')
  } finally {
    saving.value = false
  }
}

async function openPayroll(): Promise<void> {
  activeSection.value = 'payroll'
  formError.value = ''

  try {
    const [employeesResponse, runsResponse] = await Promise.all([
      api.get<{ data: Employee[] }>(`/api/v1/businesses/${businessId}/employees`),
      api.get<{ data: PayrollRun[] }>(`/api/v1/businesses/${businessId}/payroll-runs`),
    ])
    employees.value = employeesResponse.data.data
    payrollRuns.value = runsResponse.data.data
  } catch (error: unknown) {
    formError.value = getApiError(error, 'We could not load payroll.')
  }
}

function emptyEmployeeForm(): typeof employeeForm.value {
  return { first_name: '', last_name: '', personal_number: '', position: '', contract_type: 'indefinite', employment_start: todayIsoDate(), employment_end: '', gross_salary: '', is_primary_employment: true, iban: '', bank_name: '', status: 'active' }
}

function toggleEmployeeForm(): void {
  showEmployeeForm.value = !showEmployeeForm.value
  editingEmployeeId.value = null
  employeeForm.value = emptyEmployeeForm()
}

function editEmployee(employee: Employee): void {
  showEmployeeForm.value = true
  editingEmployeeId.value = employee.id
  employeeForm.value = {
    first_name: employee.first_name,
    last_name: employee.last_name,
    personal_number: employee.personal_number ?? '',
    position: employee.position ?? '',
    contract_type: employee.contract_type,
    employment_start: employee.employment_start,
    employment_end: employee.employment_end ?? '',
    gross_salary: employee.gross_salary,
    is_primary_employment: employee.is_primary_employment,
    iban: employee.iban ?? '',
    bank_name: employee.bank_name ?? '',
    status: employee.status,
  }
}

async function saveEmployee(): Promise<void> {
  saving.value = true
  formError.value = ''

  try {
    const form = employeeForm.value
    const payload = {
      first_name: form.first_name,
      last_name: form.last_name,
      personal_number: nullableText(form.personal_number),
      position: nullableText(form.position),
      contract_type: form.contract_type,
      employment_start: form.employment_start,
      employment_end: nullableText(form.employment_end),
      gross_salary: form.gross_salary,
      is_primary_employment: form.is_primary_employment,
      iban: nullableText(form.iban),
      bank_name: nullableText(form.bank_name),
    }

    if (editingEmployeeId.value !== null) {
      const editedId = editingEmployeeId.value
      const response = await api.put<{ data: Employee }>(`/api/v1/businesses/${businessId}/employees/${editedId}`, { ...payload, status: form.status })
      employees.value = employees.value.map((employee) => employee.id === editedId ? response.data.data : employee)
    } else {
      const response = await api.post<{ data: Employee }>(`/api/v1/businesses/${businessId}/employees`, payload)
      employees.value = [...employees.value, response.data.data].sort((left, right) => `${left.last_name} ${left.first_name}`.localeCompare(`${right.last_name} ${right.first_name}`))
    }

    showEmployeeForm.value = false
    editingEmployeeId.value = null
    employeeForm.value = emptyEmployeeForm()
  } catch (error: unknown) {
    formError.value = getApiError(error, 'We could not save this employee.')
  } finally {
    saving.value = false
  }
}

function payrollPeriodLabel(run: PayrollRun): string {
  return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(new Date(run.period_year, run.period_month - 1, 1))
}

async function createPayrollRun(): Promise<void> {
  saving.value = true
  formError.value = ''

  try {
    const additions = Object.entries(payrollAdditions.value)
      .filter(([, addition]) => Number(addition.amount) > 0)
      .map(([employeeId, addition]) => ({ employee_id: Number(employeeId), amount: addition.amount, note: addition.note || null }))
    const response = await api.post<{ data: PayrollRun }>(`/api/v1/businesses/${businessId}/payroll-runs`, { ...payrollRunForm.value, additions })
    payrollAdditions.value = {}
    payrollRuns.value = [response.data.data, ...payrollRuns.value]
    selectedPayrollRun.value = response.data.data
  } catch (error: unknown) {
    formError.value = getApiError(error, 'We could not calculate this payroll.')
  } finally {
    saving.value = false
  }
}

async function openPayrollRun(run: PayrollRun): Promise<void> {
  formError.value = ''

  try {
    const response = await api.get<{ data: PayrollRun }>(`/api/v1/businesses/${businessId}/payroll-runs/${run.id}`)
    selectedPayrollRun.value = response.data.data
  } catch (error: unknown) {
    formError.value = getApiError(error, 'We could not load this payroll.')
  }
}

async function approvePayrollRun(run: PayrollRun): Promise<void> {
  saving.value = true
  formError.value = ''

  try {
    const response = await api.post<{ data: PayrollRun }>(`/api/v1/businesses/${businessId}/payroll-runs/${run.id}/approve`)
    payrollRuns.value = payrollRuns.value.map((item) => item.id === run.id ? response.data.data : item)
    selectedPayrollRun.value = response.data.data
    const journalsResponse = await api.get<{ data: JournalEntry[] }>(`/api/v1/businesses/${businessId}/journal-entries`)
    journalEntries.value = journalsResponse.data.data
  } catch (error: unknown) {
    formError.value = getApiError(error, 'This payroll could not be approved.')
  } finally {
    saving.value = false
  }
}

async function deletePayrollRun(run: PayrollRun): Promise<void> {
  saving.value = true
  formError.value = ''

  try {
    await api.delete(`/api/v1/businesses/${businessId}/payroll-runs/${run.id}`)
    payrollRuns.value = payrollRuns.value.filter((item) => item.id !== run.id)
    selectedPayrollRun.value = null
  } catch (error: unknown) {
    formError.value = getApiError(error, 'This payroll could not be deleted.')
  } finally {
    saving.value = false
  }
}

async function downloadPayrollWmList(run: PayrollRun): Promise<void> {
  saving.value = true
  formError.value = ''

  try {
    const check = await api.get<{ data: { problems: string[] } }>(`/api/v1/businesses/${businessId}/payroll-runs/${run.id}/atk-wm`)

    if (check.data.data.problems.length) {
      formError.value = `Fix before declaring in EDI: ${check.data.data.problems.join(' ')}`
      return
    }

    await downloadFromApi(`/api/v1/businesses/${businessId}/payroll-runs/${run.id}/atk-wm`, { download: 1 }, `Lista-e-pagave-WM-${run.period_year}-${String(run.period_month).padStart(2, '0')}.xlsx`)
  } catch (error: unknown) {
    formError.value = getApiError(error, 'We could not export the WM wage list.')
  } finally {
    saving.value = false
  }
}

function exportPayrollRun(run: PayrollRun): void {
  const rows: string[][] = [
    [`Payroll ${payrollPeriodLabel(run)}`, `Pay date ${run.pay_date}`, `Rules ${run.rule_version ?? ''}`],
    ['Employee', 'Employment', 'Days worked', 'Base', 'Additions', 'Gross', 'Employee pension', 'Employer pension', 'Taxable income', 'Income tax', 'Net'],
    ...(run.lines ?? []).map((line) => [line.employee_name, line.is_primary_employment ? 'Primary' : 'Secondary', `${line.worked_days ?? ''}/${line.days_in_month ?? ''}`, line.base_salary, line.additions, line.gross_salary, line.employee_contribution, line.employer_contribution, line.taxable_income, line.income_tax, line.net_salary]),
    ['Totals', '', '', '', '', run.gross_total, run.employee_contribution_total, run.employer_contribution_total, '', run.income_tax_total, run.net_total],
  ]
  const csv = rows.map((row) => row.map((value, index) => csvCell(value, index < 2)).join(',')).join('\r\n')
  const downloadUrl = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = downloadUrl
  link.download = `kontotrack-payroll-${run.period_year}-${String(run.period_month).padStart(2, '0')}.csv`
  link.click()
  URL.revokeObjectURL(downloadUrl)
}

function getApiError(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = error.response as { data?: { message?: string; errors?: Record<string, string[]> } }
    return Object.values(response.data?.errors ?? {})[0]?.[0] ?? response.data?.message ?? fallback
  }

  return fallback
}
</script>

<template>
  <main class="workspace-shell">
    <header class="workspace-topbar">
      <RouterLink class="back-link" :to="{ name: 'dashboard' }">← All businesses</RouterLink>
      <div class="topbar-actions"><NotificationBell /><span class="product-label">KontoTrack</span></div>
    </header>

    <p v-if="loading" class="notice">Loading business workspace…</p>
    <p v-else-if="pageError" class="notice error" role="alert">{{ pageError }}</p>

    <template v-else-if="business">
      <section class="workspace-title">
        <p class="eyebrow">Business workspace</p>
        <h1>{{ business.trade_name || business.legal_name }}</h1>
        <p class="legal-name">{{ business.legal_name }}</p>
      </section>

      <nav class="section-tabs" aria-label="Business bookkeeping">
        <button :class="{ active: activeSection === 'overview' }" @click="activeSection = 'overview'">Overview</button>
        <button :class="{ active: activeSection === 'profile' }" @click="openBusinessProfile">Business details</button>
        <button :class="{ active: activeSection === 'invoices' }" @click="activeSection = 'invoices'">Sales & purchases</button>
        <button :class="{ active: activeSection === 'inventory' }" @click="activeSection = 'inventory'">Inventory</button>
        <button :class="{ active: activeSection === 'counterparties' }" @click="activeSection = 'counterparties'">Clients & suppliers</button>
        <button :class="{ active: activeSection === 'money' }" @click="activeSection = 'money'">Cash & bank</button>
        <button v-if="canViewHistory" :class="{ active: activeSection === 'payroll' }" @click="openPayroll">Employees & payroll</button>
        <button :class="{ active: activeSection === 'assets' }" @click="activeSection = 'assets'">Fixed assets</button>
        <button :class="{ active: activeSection === 'documents' }" @click="activeSection = 'documents'">Documents</button>
        <button :class="{ active: activeSection === 'tasks' }" @click="activeSection = 'tasks'">Tasks & deadlines</button>
        <button :class="{ active: activeSection === 'ledger' }" @click="activeSection = 'ledger'">Ledger</button>
        <button :class="{ active: activeSection === 'reports' }" @click="activeSection = 'reports'">Reports</button>
        <button v-if="business.role === 'owner'" :class="{ active: activeSection === 'team' }" @click="activeSection = 'team'">Team</button>
      </nav>

      <section v-if="activeSection === 'overview'" class="content-panel">
        <div class="panel-heading">
          <div><p class="eyebrow">Business dashboard</p><h2>Financial overview</h2></div>
          <form class="dashboard-period" @submit.prevent="loadDashboardSummary">
            <label>From<input v-model="dashboardFrom" type="date" required /></label>
            <label>To<input v-model="dashboardTo" type="date" required /></label>
            <button class="primary-button" type="submit" :disabled="dashboardLoading">{{ dashboardLoading ? 'Loading…' : 'Apply' }}</button>
          </form>
        </div>
        <p v-if="dashboardError" class="error-text" role="alert">{{ dashboardError }}</p>
        <div v-if="dashboardSummary" class="summary-grid">
          <article class="summary-card"><span>Revenue</span><strong>{{ formatMoney(dashboardSummary.revenue) }}</strong><small>Posted journal entries</small></article>
          <article class="summary-card"><span>Expenses</span><strong>{{ formatMoney(dashboardSummary.expenses) }}</strong><small>Posted journal entries</small></article>
          <article class="summary-card"><span>Net result</span><strong>{{ formatMoney(dashboardSummary.result) }}</strong><small>Revenue minus expenses</small></article>
          <article class="summary-card"><span>Cash balance</span><strong>{{ formatMoney(dashboardSummary.cash_balance) }}</strong><small>As of {{ formatDate(dashboardSummary.to) }}</small></article>
          <article class="summary-card"><span>Bank balance</span><strong>{{ formatMoney(dashboardSummary.bank_balance) }}</strong><small>As of {{ formatDate(dashboardSummary.to) }}</small></article>
          <article class="summary-card"><span>Customer balances</span><strong>{{ formatMoney(dashboardSummary.receivables) }}</strong><small>{{ dashboardSummary.receivable_invoices }} open · {{ formatMoney(dashboardSummary.overdue_receivables) }} overdue</small></article>
          <article class="summary-card"><span>Supplier balances</span><strong>{{ formatMoney(dashboardSummary.payables) }}</strong><small>{{ dashboardSummary.payable_invoices }} open · {{ formatMoney(dashboardSummary.overdue_payables) }} overdue</small></article>
          <article class="summary-card"><span>Net invoice VAT</span><strong>{{ formatMoney(dashboardSummary.net_vat) }}</strong><small>Sales {{ formatMoney(dashboardSummary.sales_vat) }} · purchases {{ formatMoney(dashboardSummary.purchase_vat) }}</small></article>
        </div>
        <div v-if="lowStockItems.length" class="form-note report-note"><strong>{{ lowStockItems.length }} inventory item(s) are below their minimum quantity.</strong> Review Inventory for details.</div>
        <section v-if="controlReport" class="controls-panel" aria-labelledby="controls-heading">
          <div class="controls-heading">
            <h3 id="controls-heading">Automatic checks</h3>
            <div class="controls-summary">
              <span class="severity-chip critical">{{ controlReport.summary.critical }} critical</span>
              <span class="severity-chip warning">{{ controlReport.summary.warning }} warnings</span>
              <span class="severity-chip ok">{{ controlReport.summary.ok }} passed</span>
              <button class="text-button" type="button" @click="showPassedControls = !showPassedControls">{{ showPassedControls ? 'Hide passed' : 'Show all' }}</button>
            </div>
          </div>
          <ul class="controls-list">
            <li v-for="check in visibleControlChecks" :key="check.key" :class="`control-${check.severity}`">
              <span class="severity-chip" :class="check.severity">{{ check.severity }}</span>
              <div><strong>{{ check.label }}</strong><p>{{ check.detail }}</p></div>
            </li>
            <li v-if="!visibleControlChecks.length" class="control-ok"><span class="severity-chip ok">ok</span><div><strong>All checks passed</strong><p>No critical issues or warnings right now.</p></div></li>
          </ul>
        </section>
        <p class="form-note dashboard-note">Revenue and expense totals use posted ledger entries. VAT is a summary of posted invoices for the selected dates, not a tax declaration.</p>
      </section>

      <section v-if="activeSection === 'reports'" class="content-panel">
        <div class="panel-heading">
          <div><p class="eyebrow">Accounting reports</p><h2>Financial reports</h2></div>
          <div v-if="reportsView === 'statements'" class="report-actions">
            <button class="text-button" type="button" :disabled="!financialReport" @click="printFinancialReport">Print / PDF</button>
            <button class="text-button" type="button" :disabled="!financialReport" @click="exportFinancialReport">Export CSV</button>
            <button class="text-button" type="button" :disabled="!financialReport || reportDownloading !== ''" @click="downloadFinancialReport('xlsx')">{{ reportDownloading === 'xlsx' ? 'Exporting…' : 'Excel' }}</button>
            <button class="text-button" type="button" :disabled="!financialReport || reportDownloading !== ''" @click="downloadFinancialReport('pdf')">{{ reportDownloading === 'pdf' ? 'Exporting…' : 'PDF file' }}</button>
          </div>
        </div>
        <nav class="kind-tabs no-print" aria-label="Report groups">
          <button :class="{ active: reportsView === 'statements' }" @click="reportsView = 'statements'">Statements</button>
          <button :class="{ active: reportsView === 'ledger' }" @click="reportsView = 'ledger'">Account cards & cash book</button>
          <button :class="{ active: reportsView === 'atk' }" @click="reportsView = 'atk'">ATK · VAT books</button>
        </nav>
        <AtkFilingsPanel v-if="reportsView === 'atk'" :business-id="businessId" :currency="business.currency" :vat-registered="business.vat_status === 'registered'" />
        <LedgerReportsPanel v-if="reportsView === 'ledger'" :business-id="businessId" :business-name="business.legal_name" :business-nui="business.nui" :currency="business.currency" :accounts="accounts" :cash-accounts="cashAccounts" />
        <div v-show="reportsView === 'statements'">
        <div v-if="financialReport" class="print-only report-print-heading">
          <strong>{{ reportTypeLabels[financialReport.type] }}</strong>
          <span>{{ business.legal_name }} · NUI {{ business.nui }}</span>
          <span>{{ reportPeriodLabel }} · {{ business.currency }}</span>
        </div>
        <form class="report-filters" @submit.prevent="loadFinancialReport">
          <label>Report<select v-model="reportType"><option value="trial_balance">Trial balance</option><option value="profit_loss">Profit and loss</option><option value="balance_sheet">Balance sheet</option><option value="vat_summary">VAT summary</option><option value="receivable_aging">Customer aging</option><option value="payable_aging">Supplier aging</option></select></label>
          <label v-if="reportType !== 'receivable_aging' && reportType !== 'payable_aging'">From<input v-model="reportFrom" type="date" required /></label>
          <label>{{ reportType === 'receivable_aging' || reportType === 'payable_aging' ? 'As of' : 'To' }}<input v-model="reportTo" type="date" required /></label>
          <button class="primary-button" type="submit" :disabled="reportLoading">{{ reportLoading ? 'Generating…' : 'Generate report' }}</button>
        </form>
        <p v-if="reportError" class="error-text" role="alert">{{ reportError }}</p>
        <div v-if="financialReport" class="report-table-wrap">
          <template v-if="vatFinancialReport">
            <div class="summary-grid vat-summary-grid">
              <article class="summary-card"><span>Sales VAT</span><strong>{{ formatMoney(vatFinancialReport.totals.sales.tax_amount) }}</strong><small>{{ formatMoney(vatFinancialReport.totals.sales.net_amount) }} taxable base</small></article>
              <article class="summary-card"><span>Purchase VAT</span><strong>{{ formatMoney(vatFinancialReport.totals.purchases.tax_amount) }}</strong><small>{{ formatMoney(vatFinancialReport.totals.purchases.net_amount) }} taxable base</small></article>
              <article class="summary-card"><span>Invoice VAT difference</span><strong>{{ formatMoney(vatFinancialReport.totals.invoice_vat_difference) }}</strong><small>Sales VAT minus purchase VAT</small></article>
              <article class="summary-card"><span>Invoices</span><strong>{{ vatFinancialReport.totals.invoice_count }}</strong><small>{{ formatDate(vatFinancialReport.from) }} to {{ formatDate(vatFinancialReport.to) }}</small></article>
            </div>
            <p v-if="vatFinancialReport.totals.missing_counterparty_nui_count" class="form-note report-note">{{ vatFinancialReport.totals.missing_counterparty_nui_count }} invoice(s) have no counterparty NUI/fiscal number. Review identifiers before preparing the TAK purchase or sales book.</p>
            <h3>Totals by VAT code</h3>
            <table class="report-table">
              <thead><tr><th>Direction</th><th>Code</th><th>Treatment</th><th>Rate</th><th>Taxable base</th><th>VAT</th><th>Gross</th></tr></thead>
              <tbody><tr v-for="(row, index) in vatFinancialReport.summary" :key="`${row.kind}-${row.vat_code}-${index}`"><td>{{ row.kind === 'sale' ? 'Sales' : 'Purchase' }}</td><td>{{ row.vat_code }} · {{ row.vat_label }}</td><td>{{ row.treatment.replaceAll('_', ' ') }}</td><td>{{ row.rate_percent }}%</td><td>{{ formatMoney(row.net_amount) }}</td><td>{{ formatMoney(row.tax_amount) }}</td><td>{{ formatMoney(row.gross_amount) }}</td></tr></tbody>
            </table>
            <h3>Invoice details</h3>
            <table class="report-table">
              <thead><tr><th>Direction</th><th>Invoice</th><th>Date</th><th>Customer / supplier</th><th>NUI / fiscal number</th><th>VAT code</th><th>Base</th><th>VAT</th><th>Total</th></tr></thead>
              <tbody><tr v-for="(row, index) in vatFinancialReport.rows" :key="`${row.invoice_id}-${row.vat_code}-${index}`"><td>{{ row.kind === 'sale' ? 'Sales' : 'Purchase' }}</td><td>{{ row.invoice_number }}<template v-if="row.entry_type !== 'invoice'"> · {{ row.entry_type.replace('_', ' ') }}</template></td><td>{{ formatDate(row.reported_on) }}</td><td>{{ row.counterparty_name }}</td><td>{{ row.counterparty_nui || 'Missing' }}</td><td>{{ row.vat_code }} · {{ row.rate_percent }}%</td><td>{{ formatMoney(row.net_amount) }}</td><td>{{ formatMoney(row.tax_amount) }}</td><td>{{ formatMoney(row.gross_amount) }}</td></tr></tbody>
            </table>
            <p class="form-note report-note">Based on issued invoices and their saved VAT rule snapshots. This review report does not account for VAT adjustments, import/reverse-charge entries, or deductible-input-tax limits; it is not a TAK filing or an EDI upload file.</p>
          </template>
          <table v-if="agingFinancialReport" class="report-table aging-report-table">
            <thead><tr><th>{{ agingFinancialReport.type === 'receivable_aging' ? 'Customer' : 'Supplier' }}</th><th>Current</th><th>1–30 days</th><th>31–60 days</th><th>61–90 days</th><th>Over 90 days</th><th>Total</th></tr></thead>
            <tbody>
              <tr v-for="row in agingFinancialReport.rows" :key="row.counterparty_id">
                <td><details class="aging-invoices"><summary>{{ row.counterparty_name }} · {{ row.invoice_count }} invoices</summary><ul><li v-for="invoice in row.invoices" :key="invoice.id">{{ invoice.invoice_number }} · due {{ formatDate(invoice.due_on) }} · {{ invoice.bucket.replaceAll('_', ' ') }} · {{ formatMoney(invoice.outstanding_amount) }}</li></ul></details></td>
                <td>{{ formatMoney(row.current) }}</td><td>{{ formatMoney(row.days_1_30) }}</td><td>{{ formatMoney(row.days_31_60) }}</td><td>{{ formatMoney(row.days_61_90) }}</td><td>{{ formatMoney(row.days_over_90) }}</td><td><strong>{{ formatMoney(row.total) }}</strong></td>
              </tr>
            </tbody>
            <tfoot><tr><th>{{ agingFinancialReport.totals.invoice_count }} open invoices</th><th>{{ formatMoney(agingFinancialReport.totals.current) }}</th><th>{{ formatMoney(agingFinancialReport.totals.days_1_30) }}</th><th>{{ formatMoney(agingFinancialReport.totals.days_31_60) }}</th><th>{{ formatMoney(agingFinancialReport.totals.days_61_90) }}</th><th>{{ formatMoney(agingFinancialReport.totals.days_over_90) }}</th><th>{{ formatMoney(agingFinancialReport.totals.total) }}</th></tr></tfoot>
          </table>
          <table v-else-if="ledgerFinancialReport" class="report-table">
            <thead><tr><th>Code</th><th>Account</th><th>Type</th><th>Debit</th><th>Credit</th></tr></thead>
            <tbody>
              <tr v-for="(row, index) in ledgerFinancialReport.rows" :key="`${row.code}-${index}`"><td>{{ row.code || '—' }}</td><td>{{ row.name }}</td><td>{{ row.account_type.replace('_', ' ') }}</td><td>{{ formatMoney(row.debit) }}</td><td>{{ formatMoney(row.credit) }}</td></tr>
            </tbody>
            <tfoot><tr><th colspan="3">Totals</th><th>{{ formatMoney(ledgerFinancialReport.totals.debit) }}</th><th>{{ formatMoney(ledgerFinancialReport.totals.credit) }}</th></tr></tfoot>
          </table>
          <p v-if="agingFinancialReport" class="form-note report-note">Outstanding balances are calculated from invoice allocations recorded on or before {{ formatDate(agingFinancialReport.as_of) }}. Invoices without a due date are shown as current.</p>
          <p v-else-if="ledgerFinancialReport" class="form-note report-note">{{ ledgerFinancialReport.type === 'trial_balance' ? `Account balances through ${formatDate(ledgerFinancialReport.to)}.` : ledgerFinancialReport.type === 'balance_sheet' ? `Assets, liabilities and equity as of ${formatDate(ledgerFinancialReport.to)}.` : `Posted revenue and expense movements from ${formatDate(ledgerFinancialReport.from)} to ${formatDate(ledgerFinancialReport.to)}. Net result: ${formatMoney(ledgerFinancialReport.totals.result)}.` }}</p>
        </div>
        <p v-else-if="!reportLoading" class="empty-message">Choose a report and date range, then generate it.</p>
        </div>
      </section>

      <section v-if="activeSection === 'invoices'" class="content-panel">
        <div class="panel-heading">
          <div><p class="eyebrow">Documents and amounts</p><h2>Invoices</h2></div>
          <button class="primary-button" @click="toggleInvoiceForm">{{ showInvoiceForm ? 'Cancel' : 'New draft' }}</button>
        </div>
        <div class="kind-tabs" aria-label="Invoice type">
          <button :class="{ active: invoiceKind === 'sale' }" @click="setInvoiceKind('sale')">Sales</button>
          <button :class="{ active: invoiceKind === 'purchase' }" @click="setInvoiceKind('purchase')">Purchases</button>
        </div>
        <p v-if="formError" class="error-text invoice-error" role="alert">{{ formError }}</p>

        <form v-if="showInvoiceForm" class="entry-form" @submit.prevent="createInvoiceDraft">
          <h3>{{ invoiceKind === 'sale' ? 'Sales invoice' : 'Purchase bill' }} draft</h3>
          <p class="form-note">VAT amounts use approved Kosovo VAT codes effective on the invoice date. Rule version {{ vatRuleVersion || 'not available' }}. The invoice remains a draft until linked to a matching posted journal entry.</p>
          <div class="fields-grid">
            <label v-if="invoiceKind === 'sale'">Invoice number<span>Assigned automatically when you create this sales invoice (year-based sequence).</span></label>
            <label v-else>Supplier invoice number<input v-model.trim="invoiceForm.invoice_number" required maxlength="80" /><span>Enter the number shown on the supplier’s bill.</span></label>
            <label>{{ invoiceKind === 'sale' ? 'Customer' : 'Supplier' }}
              <select v-model="invoiceForm.counterparty_id" required>
                <option disabled value="">Choose a contact</option>
                <option v-for="party in eligibleCounterparties" :key="party.id" :value="String(party.id)">{{ party.name }}</option>
              </select>
            </label>
            <label>Invoice date<input v-model="invoiceForm.issued_on" type="date" required @change="loadVatCodes" /></label>
            <label>Due date<input v-model="invoiceForm.due_on" type="date" /></label>
            <label>Payment method <span>(optional)</span><select v-model="invoiceForm.payment_method"><option value="">Not set</option><option value="bank_transfer">Bank transfer</option><option value="cash">Cash</option><option value="card">Card</option><option value="other">Other</option></select></label>
            <label v-if="invoiceKind === 'purchase'">Supplier bill file<input ref="billFileInput" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" @change="billFile = ($event.target as HTMLInputElement).files?.[0] ?? null" /><span>PDF or photo, up to 20 MB</span></label>
            <label v-if="invoiceKind === 'purchase'">Upload the supplier bill<input ref="billFileInput" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" @change="selectBillFile" /></label>
            <label v-if="invoiceKind === 'purchase'">Attach an uploaded bill<select v-model="invoiceForm.document_id"><option value="">Choose later or select a file above</option><option v-for="document in availableBillDocuments" :key="document.id" :value="String(document.id)">{{ document.original_name }}</option></select></label>
          </div>

          <div class="lines-heading"><h4>Line items</h4><button class="text-button" type="button" @click="addLine">＋ Add line</button></div>
          <div v-for="(line, index) in lineDrafts" :key="index" class="line-row">
            <label>Description<input v-model.trim="line.description" required maxlength="255" /></label>
            <label>Qty<input v-model="line.quantity" type="number" min="0.0001" step="0.0001" required /></label>
            <label>Unit<input v-model.trim="line.unit" maxlength="24" placeholder="Optional" /></label>
            <label>Unit price<input v-model="line.unit_price" type="number" min="0" step="0.0001" required /></label>
            <label>Discount ({{ business.currency }})<input v-model="line.discount_amount" type="number" min="0" step="0.01" required /></label>
            <label>VAT treatment<select v-model="line.vat_code" required><option disabled value="">Choose approved code</option><option v-for="code in vatCodes" :key="code.code" :value="code.code">{{ code.label }} · {{ code.rate_percent }}% · {{ code.treatment.replace('_', ' ') }}</option></select></label>
            <label>Inventory item <span>(optional)</span><select v-model="line.inventory_item_id" @change="selectInventoryItem(index)"><option value="">Not stock-tracked</option><option v-for="item in activeInventoryItems" :key="item.id" :value="String(item.id)">{{ item.sku }} · {{ item.name }}</option></select></label>
            <label v-if="line.inventory_item_id">Warehouse<select v-model="line.warehouse_id" required><option disabled value="">Choose warehouse</option><option v-for="warehouse in activeWarehouses" :key="warehouse.id" :value="String(warehouse.id)">{{ warehouse.name }}</option></select></label>
            <button v-if="lineDrafts.length > 1" class="remove-line" type="button" aria-label="Remove line" @click="lineDrafts.splice(index, 1)">×</button>
          </div>
          <p v-if="!lineDiscountsValid" class="error-text">A line discount cannot be greater than that line's amount before VAT.</p>
          <div class="totals-preview"><span>Net {{ formatMoney(previewNet) }}</span><span>Tax {{ formatMoney(previewTax) }}</span><strong>Total {{ formatMoney(previewNet + previewTax) }}</strong></div>
          <label class="notes-field">Notes <textarea v-model="invoiceForm.notes" rows="2" maxlength="5000" /></label>
          <div class="form-footer"><button class="primary-button" type="submit" :disabled="saving || eligibleCounterparties.length === 0 || !vatCodes.length || !lineDiscountsValid">{{ saving ? 'Saving…' : 'Save draft' }}</button></div>
          <p v-if="!eligibleCounterparties.length" class="error-text">Add a {{ invoiceKind === 'sale' ? 'customer' : 'supplier' }} before creating this draft.</p>
          <p v-if="!vatCodes.length" class="error-text">An administrator must approve VAT codes effective on this date before you can create an invoice.</p>
        </form>

        <div v-if="invoiceKind === 'sale'" class="invoice-list">
          <article v-for="invoice in invoices.filter((item) => item.kind === 'sale')" :key="invoice.id" class="invoice-row">
            <div class="invoice-main"><strong>{{ invoice.invoice_number }}</strong><span>{{ invoice.counterparty.name }}</span><span v-if="invoice.document">Bill attached · {{ invoice.document.original_name }}</span></div>
            <span class="invoice-date">{{ formatDate(invoice.issued_on) }}</span>
            <span class="status-chip" :class="{ cancelled: invoice.status === 'cancelled' }">{{ invoice.status.replace('_', ' ') }}</span>
            <strong class="invoice-total">{{ formatMoney(invoice.gross_amount) }}</strong>
            <RouterLink class="text-button invoice-print-link" :to="{ name: 'invoice-print', params: { businessId, invoiceId: invoice.id } }" target="_blank">Print / PDF</RouterLink>
            <p v-if="invoice.status === 'cancelled'" class="invoice-cancellation-note">Cancelled {{ formatDate(invoice.cancelled_on ?? '') }} · {{ invoice.cancellation_reason }}</p>
            <span v-if="invoice.document_type === 'credit_note'" class="severity-chip info invoice-credit-badge">Credit note</span>
            <div v-if="cancellingInvoiceId !== invoice.id && creditingInvoiceId !== invoice.id" class="invoice-issue-actions">
              <button v-if="invoice.status === 'draft' && canEditBookkeeping" class="text-button" type="button" :disabled="saving" @click="deleteDraftInvoice(invoice)">Delete draft</button>
              <button v-if="invoice.document_type !== 'credit_note' && ['issued', 'partially_paid', 'paid'].includes(invoice.status) && canEditBookkeeping" class="text-button" type="button" @click="creditingInvoiceId = invoice.id">Credit note</button>
              <button v-if="invoice.status === 'issued' && invoice.document_type !== 'credit_note' && Number(invoice.credited_total) === 0" class="text-button" type="button" :disabled="saving" @click="startInvoiceCancellation(invoice)">Cancel invoice</button>
            </div>
            <CreditNoteForm v-if="creditingInvoiceId === invoice.id" :business-id="businessId" :invoice="invoice" :documents="documents" @cancel="creditingInvoiceId = null" @created="onCreditNoteCreated" />
            <form v-if="cancellingInvoiceId === invoice.id" class="invoice-cancel-form" @submit.prevent="cancelInvoice(invoice)">
              <label>Cancellation date<input v-model="cancelForm.cancelled_on" type="date" :min="invoice.issued_on" required /></label>
              <label>Reason<input v-model.trim="cancelForm.cancellation_reason" maxlength="500" required /></label>
              <button class="text-button" type="button" @click="cancellingInvoiceId = null">Keep invoice</button>
              <button class="primary-button" type="submit" :disabled="saving">{{ saving ? 'Cancelling…' : 'Confirm cancellation' }}</button>
            </form>
            <div v-if="invoice.status === 'draft'" class="invoice-issue-actions"><select v-model="issueSelections[invoice.id]" aria-label="Journal entry for this invoice"><option value="">Post journal automatically</option><option v-for="entry in journalEntries.filter((item) => item.status === 'posted')" :key="entry.id" :value="String(entry.id)">{{ formatDate(entry.entry_date) }} · {{ entry.description }}</option></select><button class="text-button" type="button" :disabled="saving" @click="issueInvoice(invoice)">Issue</button></div>
          </article>
          <p v-if="!invoices.some((item) => item.kind === 'sale')" class="empty-message">No sales invoices yet.</p>
        </div>
        <div v-else class="invoice-list">
          <article v-for="invoice in invoices.filter((item) => item.kind === 'purchase')" :key="invoice.id" class="invoice-row">
            <div class="invoice-main"><strong>{{ invoice.invoice_number }}</strong><span>{{ invoice.counterparty.name }}</span><span v-if="invoice.document">Bill attached · {{ invoice.document.original_name }}</span></div>
            <span class="invoice-date">{{ formatDate(invoice.issued_on) }}</span>
            <span class="status-chip" :class="{ cancelled: invoice.status === 'cancelled' }">{{ invoice.status.replace('_', ' ') }}</span>
            <strong class="invoice-total">{{ formatMoney(invoice.gross_amount) }}</strong>
            <RouterLink class="text-button invoice-print-link" :to="{ name: 'invoice-print', params: { businessId, invoiceId: invoice.id } }" target="_blank">Print / PDF</RouterLink>
            <p v-if="invoice.status === 'cancelled'" class="invoice-cancellation-note">Cancelled {{ formatDate(invoice.cancelled_on ?? '') }} · {{ invoice.cancellation_reason }}</p>
            <span v-if="invoice.document_type === 'credit_note'" class="severity-chip info invoice-credit-badge">Credit note</span>
            <div v-if="cancellingInvoiceId !== invoice.id && creditingInvoiceId !== invoice.id" class="invoice-issue-actions">
              <button v-if="invoice.status === 'draft' && canEditBookkeeping" class="text-button" type="button" :disabled="saving" @click="deleteDraftInvoice(invoice)">Delete draft</button>
              <button v-if="invoice.document_type !== 'credit_note' && ['issued', 'partially_paid', 'paid'].includes(invoice.status) && canEditBookkeeping" class="text-button" type="button" @click="creditingInvoiceId = invoice.id">Credit note</button>
              <button v-if="invoice.status === 'issued' && invoice.document_type !== 'credit_note' && Number(invoice.credited_total) === 0" class="text-button" type="button" :disabled="saving" @click="startInvoiceCancellation(invoice)">Cancel invoice</button>
            </div>
            <CreditNoteForm v-if="creditingInvoiceId === invoice.id" :business-id="businessId" :invoice="invoice" :documents="documents" @cancel="creditingInvoiceId = null" @created="onCreditNoteCreated" />
            <form v-if="cancellingInvoiceId === invoice.id" class="invoice-cancel-form" @submit.prevent="cancelInvoice(invoice)">
              <label>Cancellation date<input v-model="cancelForm.cancelled_on" type="date" :min="invoice.issued_on" required /></label>
              <label>Reason<input v-model.trim="cancelForm.cancellation_reason" maxlength="500" required /></label>
              <button class="text-button" type="button" @click="cancellingInvoiceId = null">Keep invoice</button>
              <button class="primary-button" type="submit" :disabled="saving">{{ saving ? 'Cancelling…' : 'Confirm cancellation' }}</button>
            </form>
            <div v-if="invoice.status === 'draft'" class="invoice-issue-actions"><select v-model="issueSelections[invoice.id]" aria-label="Journal entry for this invoice"><option value="">Post journal automatically</option><option v-for="entry in journalEntries.filter((item) => item.status === 'posted')" :key="entry.id" :value="String(entry.id)">{{ formatDate(entry.entry_date) }} · {{ entry.description }}</option></select><button class="text-button" type="button" :disabled="saving" @click="issueInvoice(invoice)">Issue</button></div>
          </article>
          <p v-if="!invoices.some((item) => item.kind === 'purchase')" class="empty-message">No purchase bills yet.</p>
        </div>
      </section>

      <section v-else-if="activeSection === 'inventory'" class="content-panel">
        <div class="panel-heading">
          <div><p class="eyebrow">Stock and products</p><h2>Inventory</h2></div>
          <span class="ledger-currency">{{ inventoryItems.length }} items · {{ warehouses.length }} warehouses</span>
        </div>
        <p v-if="formError" class="error-text ledger-error" role="alert">{{ formError }}</p>
        <p class="form-note">Record an opening balance before selecting an item on an invoice. Issued purchase invoices increase stock; issued sales invoices reduce it. Manual movements require a source document and an open accounting period.</p>
        <div class="ledger-actions">
          <span v-if="lowStockItems.length" class="negative-balance">{{ lowStockItems.length }} item(s) below minimum</span>
          <div class="inventory-actions">
            <button class="text-button" type="button" @click="showWarehouseForm = !showWarehouseForm">{{ showWarehouseForm ? 'Cancel warehouse' : 'Add warehouse' }}</button>
            <button class="text-button" type="button" :disabled="!activeWarehouses.length" @click="showStockMovementForm = !showStockMovementForm">{{ showStockMovementForm ? 'Cancel movement' : 'Record movement' }}</button>
            <button class="primary-button" type="button" @click="showInventoryItemForm = !showInventoryItemForm">{{ showInventoryItemForm ? 'Cancel item' : 'Add item' }}</button>
          </div>
        </div>
        <form v-if="showInventoryItemForm" class="entry-form compact-form" @submit.prevent="createInventoryItem">
          <h3>New inventory item</h3>
          <div class="fields-grid">
            <label>SKU<input v-model.trim="inventoryItemForm.sku" required maxlength="80" /></label>
            <label>Barcode <span>(optional)</span><input v-model.trim="inventoryItemForm.barcode" maxlength="80" /></label>
            <label>Name<input v-model.trim="inventoryItemForm.name" required maxlength="180" /></label>
            <label>Unit<input v-model.trim="inventoryItemForm.unit" required maxlength="24" /></label>
            <label>Purchase price<input v-model="inventoryItemForm.purchase_price" type="number" min="0" step="0.0001" required /></label>
            <label>Sale price<input v-model="inventoryItemForm.sale_price" type="number" min="0" step="0.0001" required /></label>
            <label>Minimum stock<input v-model="inventoryItemForm.minimum_quantity" type="number" min="0" step="0.0001" required /></label>
            <label>Preferred supplier <span>(optional)</span><select v-model="inventoryItemForm.supplier_counterparty_id"><option value="">None</option><option v-for="party in counterparties.filter((item) => item.type === 'supplier' || item.type === 'both')" :key="party.id" :value="String(party.id)">{{ party.name }}</option></select></label>
            <label class="wide-field">Description <span>(optional)</span><input v-model.trim="inventoryItemForm.description" maxlength="1000" /></label>
          </div>
          <div class="form-footer"><button class="primary-button" type="submit" :disabled="saving">{{ saving ? 'Saving…' : 'Save item' }}</button></div>
        </form>
        <form v-if="showWarehouseForm" class="entry-form compact-form" @submit.prevent="createWarehouse">
          <h3>New warehouse</h3>
          <div class="fields-grid"><label>Name<input v-model.trim="warehouseForm.name" required maxlength="120" /></label><label>Address <span>(optional)</span><input v-model.trim="warehouseForm.address" maxlength="255" /></label><label class="checkbox-field"><input v-model="warehouseForm.is_default" type="checkbox" /> Make this the default warehouse</label></div>
          <div class="form-footer"><button class="primary-button" type="submit" :disabled="saving">{{ saving ? 'Saving…' : 'Save warehouse' }}</button></div>
        </form>
        <form v-if="showStockMovementForm" class="entry-form compact-form" @submit.prevent="createStockMovement">
          <h3>Record stock movement</h3>
          <div class="fields-grid">
            <label>Item<select v-model="stockMovementForm.inventory_item_id" required><option disabled value="">Choose item</option><option v-for="item in activeInventoryItems" :key="item.id" :value="String(item.id)">{{ item.sku }} · {{ item.name }}</option></select></label>
            <label>Warehouse<select v-model="stockMovementForm.warehouse_id" required><option disabled value="">Choose warehouse</option><option v-for="warehouse in activeWarehouses" :key="warehouse.id" :value="String(warehouse.id)">{{ warehouse.name }}</option></select></label>
            <label>Movement<select v-model="stockMovementForm.movement_type"><option value="opening">Opening balance</option><option value="adjustment">Stock adjustment</option></select></label>
            <label>Direction<select v-model="stockMovementForm.direction"><option value="in">Increase</option><option value="out" :disabled="stockMovementForm.movement_type === 'opening'">Decrease</option></select></label>
            <label>Quantity<input v-model="stockMovementForm.quantity" type="number" min="0.0001" step="0.0001" required /></label>
            <label>Unit cost <span>(optional)</span><input v-model="stockMovementForm.unit_cost" type="number" min="0" step="0.0001" /></label>
            <label>Date<input v-model="stockMovementForm.occurred_on" type="date" required /></label>
            <label>Upload source document<input ref="stockMovementFileInput" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" @change="stockMovementFile = ($event.target as HTMLInputElement).files?.[0] ?? null" /><span>PDF/photo, up to 20 MB.</span></label>
            <label>Or select a document<select v-model="stockMovementForm.document_id"><option value="">Choose a document</option><option v-for="document in documents" :key="document.id" :value="String(document.id)">{{ document.original_name }}</option></select></label>
            <label class="wide-field">Reason / notes<textarea v-model.trim="stockMovementForm.notes" rows="2" required maxlength="5000" /></label>
          </div>
          <div class="form-footer"><button class="primary-button" type="submit" :disabled="saving || !activeInventoryItems.length">{{ saving ? 'Saving…' : 'Record movement' }}</button></div>
        </form>
        <StockOperationsPanel v-if="canEditBookkeeping && warehouses.length" :business-id="businessId" :items="inventoryItems" :warehouses="warehouses" :documents="documents" @changed="refreshInventoryOverview" />
        <h3>Items and stock on hand</h3>
        <div class="report-table-wrap">
          <table class="report-table">
            <thead><tr><th>SKU</th><th>Item</th><th>Supplier</th><th>On hand</th><th>Minimum</th><th>Purchase price</th><th>Sale price</th><th>Status</th></tr></thead>
            <tbody><tr v-for="item in inventoryItems" :key="item.id"><td>{{ item.sku }}</td><td>{{ item.name }}<small class="table-subtext">{{ item.barcode || item.unit }}</small></td><td>{{ item.preferred_supplier?.name || '—' }}</td><td>{{ item.on_hand_quantity }} {{ item.unit }}</td><td>{{ item.minimum_quantity }} {{ item.unit }}</td><td>{{ formatMoney(item.purchase_price) }}</td><td>{{ formatMoney(item.sale_price) }}</td><td><span class="status-chip" :class="{ 'stock-low': item.is_below_minimum }">{{ item.is_below_minimum ? 'Below minimum' : item.is_active ? 'In stock' : 'Inactive' }}</span></td></tr></tbody>
          </table>
          <p v-if="!inventoryItems.length" class="empty-message">No inventory items yet. Add an item to start tracking stock.</p>
        </div>
        <h3>Warehouses</h3>
        <div class="contact-list"><article v-for="warehouse in warehouses" :key="warehouse.id" class="contact-row"><div><strong>{{ warehouse.name }} <span v-if="warehouse.is_default" class="status-chip">Default</span></strong><span>{{ warehouse.address || 'No address' }}</span></div><span class="status-chip">{{ warehouse.is_active ? 'Active' : 'Inactive' }}</span></article><p v-if="!warehouses.length" class="empty-message">Add a warehouse before recording stock.</p></div>
        <h3>Recent stock movements</h3>
        <div class="contact-list"><article v-for="movement in stockMovements" :key="movement.id" class="contact-row"><div><strong>{{ movement.inventory_item.sku }} · {{ movement.inventory_item.name }} · {{ movement.quantity_delta }} {{ movement.inventory_item.unit }}</strong><span>{{ formatDate(movement.occurred_on) }} · {{ movement.warehouse.name }} · {{ movement.invoice?.invoice_number || movement.document?.original_name || 'Source not set' }}</span><span>{{ movement.notes }}<template v-if="movement.created_by_name"> · {{ movement.created_by_name }}</template></span></div><span class="status-chip">{{ movement.movement_type.replace('_', ' ') }}</span></article><p v-if="!stockMovements.length" class="empty-message">Stock movements will appear here.</p></div>
      </section>

      <section v-else-if="activeSection === 'profile'" class="content-panel">
        <div class="panel-heading"><div><p class="eyebrow">Registration and contact</p><h2>Business details</h2></div></div>
        <form class="entry-form" @submit.prevent="saveBusinessProfile">
          <p v-if="formError" class="error-text" role="alert">{{ formError }}</p>
          <fieldset class="plain-fieldset" :disabled="!canEditBookkeeping">
            <div class="fields-grid">
              <label>Legal name<input v-model.trim="businessForm.legal_name" required maxlength="255" /></label>
              <label>Trade name <span>(optional)</span><input v-model.trim="businessForm.trade_name" maxlength="255" /></label>
              <label>NUI / fiscal number<input v-model.trim="businessForm.nui" required maxlength="32" /></label>
              <label>Legal form<input v-model.trim="businessForm.legal_form" maxlength="40" placeholder="B.I., SH.P.K., …" /></label>
              <label>Owner<input v-model.trim="businessForm.owner_name" maxlength="255" /></label>
              <label>VAT status<select v-model="businessForm.vat_status"><option value="unknown">Not set</option><option value="registered">VAT registered</option><option value="not_registered">Not VAT registered</option></select></label>
              <label>Activity code<input v-model.trim="businessForm.activity_code" maxlength="32" /></label>
              <label>Registered on<input v-model="businessForm.registered_at" type="date" /></label>
              <label>Municipality<input v-model.trim="businessForm.municipality" maxlength="100" /></label>
              <label>Address<input v-model.trim="businessForm.address" maxlength="255" /></label>
              <label>Email<input v-model.trim="businessForm.email" type="email" maxlength="255" /></label>
              <label>Phone<input v-model.trim="businessForm.phone" maxlength="40" /></label>
            </div>
          </fieldset>
          <div v-if="canEditBookkeeping" class="form-footer"><button class="primary-button" type="submit" :disabled="saving">{{ saving ? 'Saving…' : 'Save details' }}</button></div>
        </form>
        <section v-if="canViewHistory" class="history-panel">
          <h3>Change history</h3>
          <ul class="audit-list">
            <li v-for="entry in businessHistory" :key="entry.id"><strong>{{ entry.action.replace('business.', '').replace('_', ' ') }}</strong> · {{ formatDate(entry.created_at.slice(0, 10)) }} · {{ entry.user?.name ?? 'System' }}<span v-for="change in describeAuditChanges(entry)" :key="change">{{ change }}</span></li>
            <li v-if="!businessHistory.length">No changes recorded yet.</li>
          </ul>
        </section>
      </section>

      <section v-else-if="activeSection === 'assets'" class="content-panel">
        <FixedAssetsPanel :business-id="businessId" :currency="business.currency" :can-edit="canEditBookkeeping" />
      </section>

      <section v-else-if="activeSection === 'documents'" class="content-panel">
        <DocumentsPanel :business-id="businessId" :can-manage="canEditBookkeeping" :can-upload="canEditBookkeeping || business.role === 'assistant_accountant'" :counterparties="counterparties" />
      </section>

      <section v-else-if="activeSection === 'tasks'" class="content-panel">
        <TasksPanel :business-id="businessId" :currency="business.currency" :can-edit="canEditBookkeeping" :can-generate="canEditBookkeeping" />
      </section>

      <section v-else-if="activeSection === 'payroll'" class="content-panel">
        <div class="panel-heading no-print">
          <div><p class="eyebrow">People and salaries</p><h2>Employees & payroll</h2></div>
          <button v-if="canEditBookkeeping && activePayrollSection === 'employees'" class="primary-button" @click="toggleEmployeeForm">{{ showEmployeeForm ? 'Cancel' : 'Add employee' }}</button>
        </div>
        <nav class="kind-tabs ledger-tabs no-print" aria-label="Payroll">
          <button :class="{ active: activePayrollSection === 'employees' }" @click="activePayrollSection = 'employees'">Employees</button>
          <button :class="{ active: activePayrollSection === 'runs' }" @click="activePayrollSection = 'runs'">Monthly payroll</button>
        </nav>
        <p v-if="formError" class="error-text" role="alert">{{ formError }}</p>

        <template v-if="activePayrollSection === 'employees'">
          <form v-if="showEmployeeForm" class="entry-form" @submit.prevent="saveEmployee">
            <h3>{{ editingEmployeeId === null ? 'New employee' : 'Edit employee' }}</h3>
            <div class="fields-grid">
              <label>First name<input v-model.trim="employeeForm.first_name" required maxlength="100" /></label>
              <label>Last name<input v-model.trim="employeeForm.last_name" required maxlength="100" /></label>
              <label>Personal number<input v-model.trim="employeeForm.personal_number" maxlength="20" /></label>
              <label>Position<input v-model.trim="employeeForm.position" maxlength="120" /></label>
              <label>Contract<select v-model="employeeForm.contract_type"><option value="indefinite">Indefinite</option><option value="fixed_term">Fixed term</option><option value="part_time">Part time</option><option value="seasonal">Seasonal</option></select></label>
              <label>Employment<select v-model="employeeForm.is_primary_employment"><option :value="true">Primary employer</option><option :value="false">Secondary employer</option></select></label>
              <label>Start date<input v-model="employeeForm.employment_start" type="date" required /></label>
              <label>End date <span>(optional)</span><input v-model="employeeForm.employment_end" type="date" :min="employeeForm.employment_start" /></label>
              <label>Monthly gross salary<input v-model="employeeForm.gross_salary" type="number" min="0.01" step="0.01" required /></label>
              <label>Bank<input v-model.trim="employeeForm.bank_name" maxlength="150" /></label>
              <label>IBAN<input v-model.trim="employeeForm.iban" maxlength="34" /></label>
              <label v-if="editingEmployeeId !== null">Status<select v-model="employeeForm.status"><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
            </div>
            <div class="form-footer"><button class="primary-button" type="submit" :disabled="saving">{{ saving ? 'Saving…' : 'Save employee' }}</button></div>
          </form>
          <div class="contact-list">
            <article v-for="employee in employees" :key="employee.id" class="contact-row">
              <div><strong>{{ employee.first_name }} {{ employee.last_name }}</strong><span>{{ [employee.position, employee.is_primary_employment ? 'Primary employer' : 'Secondary employer', `since ${formatDate(employee.employment_start)}`].filter(Boolean).join(' · ') }}</span></div>
              <span class="status-chip">{{ formatMoney(employee.gross_salary) }}<template v-if="employee.status === 'inactive'"> · inactive</template></span>
              <div class="contact-actions"><button v-if="canEditBookkeeping" class="text-button" type="button" @click="editEmployee(employee)">Edit</button></div>
            </article>
            <p v-if="!employees.length" class="empty-message">No employees yet.</p>
          </div>
        </template>

        <template v-else>
          <form v-if="canEditBookkeeping" class="report-filters no-print" @submit.prevent="createPayrollRun">
            <label>Year<input v-model.number="payrollRunForm.period_year" type="number" min="2000" max="2100" required /></label>
            <label>Month<select v-model.number="payrollRunForm.period_month"><option v-for="month in 12" :key="month" :value="month">{{ new Intl.DateTimeFormat('en-GB', { month: 'long' }).format(new Date(2026, month - 1, 1)) }}</option></select></label>
            <label>Pay date<input v-model="payrollRunForm.pay_date" type="date" required /></label>
            <button class="text-button" type="button" @click="showPayrollAdditions = !showPayrollAdditions">{{ showPayrollAdditions ? 'Hide bonuses' : 'Bonuses / overtime' }}</button>
            <button class="primary-button" type="submit" :disabled="saving">{{ saving ? 'Calculating…' : 'Calculate payroll' }}</button>
          </form>
          <div v-if="canEditBookkeeping && showPayrollAdditions" class="payroll-additions no-print">
            <p class="form-note">Taxable additions for this month only, added to gross before contributions and tax.</p>
            <div v-for="employee in employees.filter((item) => item.status === 'active')" :key="employee.id" class="payroll-addition-row">
              <span>{{ employee.first_name }} {{ employee.last_name }}</span>
              <input :value="payrollAdditions[employee.id]?.amount ?? ''" type="number" min="0" step="0.01" placeholder="Amount" @input="payrollAdditions[employee.id] = { amount: ($event.target as HTMLInputElement).value, note: payrollAdditions[employee.id]?.note ?? '' }" />
              <input :value="payrollAdditions[employee.id]?.note ?? ''" maxlength="120" placeholder="Bonus, overtime…" @input="payrollAdditions[employee.id] = { amount: payrollAdditions[employee.id]?.amount ?? '', note: ($event.target as HTMLInputElement).value }" />
            </div>
          </div>
          <p class="form-note no-print">Contributions and income tax come from the approved payroll rules for the month. Salaries are pro-rated by calendar days for anyone who starts or leaves during the month; approving posts the payroll to the ledger on the last day of the month.</p>
          <div class="contact-list no-print">
            <article v-for="run in payrollRuns" :key="run.id" class="contact-row">
              <div><strong>{{ payrollPeriodLabel(run) }}</strong><span>Gross {{ formatMoney(run.gross_total) }} · net {{ formatMoney(run.net_total) }} · paid {{ formatDate(run.pay_date) }}</span></div>
              <span class="status-chip" :class="{ posted: run.status === 'approved' }">{{ run.status }}</span>
              <div class="contact-actions"><button class="text-button" type="button" @click="openPayrollRun(run)">Open</button></div>
            </article>
            <p v-if="!payrollRuns.length" class="empty-message">No payrolls calculated yet.</p>
          </div>
          <section v-if="selectedPayrollRun" class="contact-card">
            <div class="contact-card-heading">
              <div><p class="eyebrow">Payroll · rules {{ selectedPayrollRun.rule_version }}</p><h3>{{ payrollPeriodLabel(selectedPayrollRun) }}</h3><p class="form-note">{{ business.legal_name }} · NUI {{ business.nui }} · pay date {{ formatDate(selectedPayrollRun.pay_date) }}</p></div>
              <div class="report-actions">
                <button class="text-button" type="button" @click="printFinancialReport">Print / PDF</button>
                <button class="text-button" type="button" @click="exportPayrollRun(selectedPayrollRun)">Export CSV</button>
                <button v-if="selectedPayrollRun.status === 'approved'" class="text-button" type="button" :disabled="saving" @click="downloadPayrollWmList(selectedPayrollRun)">WM list for EDI (.xlsx)</button>
                <button v-if="canEditBookkeeping && selectedPayrollRun.status === 'draft'" class="text-button" type="button" :disabled="saving" @click="deletePayrollRun(selectedPayrollRun)">Delete draft</button>
                <button v-if="canEditBookkeeping && selectedPayrollRun.status === 'draft'" class="primary-button" type="button" :disabled="saving" @click="approvePayrollRun(selectedPayrollRun)">Approve and post</button>
              </div>
            </div>
            <div class="summary-grid">
              <article class="summary-card"><span>Gross salaries</span><strong>{{ formatMoney(selectedPayrollRun.gross_total) }}</strong></article>
              <article class="summary-card"><span>Pension (employee + employer)</span><strong>{{ formatMoney(Number(selectedPayrollRun.employee_contribution_total) + Number(selectedPayrollRun.employer_contribution_total)) }}</strong></article>
              <article class="summary-card"><span>Income tax withheld</span><strong>{{ formatMoney(selectedPayrollRun.income_tax_total) }}</strong></article>
              <article class="summary-card"><span>Net to pay</span><strong>{{ formatMoney(selectedPayrollRun.net_total) }}</strong></article>
            </div>
            <div class="report-table-wrap">
              <table class="report-table">
                <thead><tr><th>Employee</th><th>Days</th><th>Base</th><th>Additions</th><th>Gross</th><th>Employee pension</th><th>Employer pension</th><th>Taxable</th><th>Income tax</th><th>Net</th></tr></thead>
                <tbody>
                  <tr v-for="line in selectedPayrollRun.lines ?? []" :key="line.id"><td>{{ line.employee_name }}<template v-if="!line.is_primary_employment"> · secondary</template></td><td>{{ line.worked_days ?? '—' }}<template v-if="line.days_in_month">/{{ line.days_in_month }}</template></td><td>{{ formatMoney(line.base_salary) }}</td><td>{{ Number(line.additions) > 0 ? formatMoney(line.additions) : '' }}<template v-if="line.additions_note"> · {{ line.additions_note }}</template></td><td>{{ formatMoney(line.gross_salary) }}</td><td>{{ formatMoney(line.employee_contribution) }}</td><td>{{ formatMoney(line.employer_contribution) }}</td><td>{{ formatMoney(line.taxable_income) }}</td><td>{{ formatMoney(line.income_tax) }}</td><td>{{ formatMoney(line.net_salary) }}</td></tr>
                  <tr class="statement-total"><td>Totals</td><td></td><td></td><td></td><td>{{ formatMoney(selectedPayrollRun.gross_total) }}</td><td>{{ formatMoney(selectedPayrollRun.employee_contribution_total) }}</td><td>{{ formatMoney(selectedPayrollRun.employer_contribution_total) }}</td><td></td><td>{{ formatMoney(selectedPayrollRun.income_tax_total) }}</td><td>{{ formatMoney(selectedPayrollRun.net_total) }}</td></tr>
                </tbody>
              </table>
            </div>
          </section>
        </template>
      </section>

      <section v-else-if="activeSection === 'counterparties'" class="content-panel">
        <div class="panel-heading">
          <div><p class="eyebrow">People you work with</p><h2>Clients & suppliers</h2></div>
          <button v-if="canEditBookkeeping" class="primary-button" @click="toggleCounterpartyForm">{{ showCounterpartyForm ? 'Cancel' : 'Add contact' }}</button>
        </div>
        <form v-if="showCounterpartyForm" class="entry-form compact-form" @submit.prevent="createCounterparty">
          <h3>{{ editingCounterpartyId === null ? 'Add a client or supplier' : 'Edit contact' }}</h3>
          <p v-if="formError" class="error-text" role="alert">{{ formError }}</p>
          <div class="fields-grid">
            <label>Type<select v-model="counterpartyForm.type"><option value="customer">Customer</option><option value="supplier">Supplier</option><option value="both">Both</option></select></label>
            <label>Name<input v-model.trim="counterpartyForm.name" required maxlength="255" /></label>
            <label>NUI<input v-model.trim="counterpartyForm.nui" maxlength="32" /></label>
            <label>Email<input v-model.trim="counterpartyForm.email" type="email" maxlength="255" /></label>
            <label>Phone<input v-model.trim="counterpartyForm.phone" maxlength="40" /></label>
            <label>Address<input v-model.trim="counterpartyForm.address" maxlength="255" /></label>
            <label>Municipality<input v-model.trim="counterpartyForm.municipality" maxlength="100" /></label>
            <label v-if="editingCounterpartyId !== null">Status<select v-model="counterpartyForm.status"><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
          </div>
          <div class="form-footer"><button class="primary-button" type="submit" :disabled="saving">{{ saving ? 'Saving…' : 'Save contact' }}</button></div>
        </form>
        <section v-if="counterpartyStatement" class="contact-card" aria-live="polite">
          <div class="contact-card-heading">
            <div>
              <p class="eyebrow">Contact card</p>
              <h3>{{ counterpartyStatement.counterparty.name }}</h3>
              <p class="form-note">{{ [counterpartyStatement.counterparty.nui ? `NUI ${counterpartyStatement.counterparty.nui}` : 'No NUI', counterpartyStatement.counterparty.email, counterpartyStatement.counterparty.phone, counterpartyStatement.counterparty.municipality].filter(Boolean).join(' · ') }}</p>
            </div>
            <div class="report-actions">
              <button class="text-button" type="button" @click="printFinancialReport">Print / PDF</button>
              <button class="text-button" type="button" @click="exportCounterpartyStatement">Export CSV</button>
              <button class="text-button" type="button" @click="counterpartyStatement = null">Close</button>
            </div>
          </div>
          <form class="report-filters" @submit.prevent="openCounterpartyCard(counterpartyStatement.counterparty)">
            <label>From<input v-model="statementFrom" type="date" required /></label>
            <label>To<input v-model="statementTo" type="date" required /></label>
            <button class="primary-button" type="submit" :disabled="statementLoading">{{ statementLoading ? 'Loading…' : 'Update statement' }}</button>
          </form>
          <div class="print-only report-print-heading"><strong>Statement · {{ counterpartyStatement.counterparty.name }}</strong><span>{{ business.legal_name }} · NUI {{ business.nui }}</span><span>{{ formatDate(counterpartyStatement.from) }} – {{ formatDate(counterpartyStatement.to) }} · {{ counterpartyStatement.currency }}</span></div>
          <section v-for="section in counterpartyStatement.sections" :key="section.kind" class="statement-section">
            <h4>{{ statementSideLabel(section) }}</h4>
            <div class="summary-grid">
              <article class="summary-card"><span>Balance now</span><strong>{{ formatMoney(section.outstanding_amount) }}</strong><small>{{ section.open_invoices.length }} open invoice(s)</small></article>
              <article class="summary-card"><span>Overdue</span><strong>{{ formatMoney(section.overdue_amount) }}</strong><small>{{ section.oldest_days_overdue ? `Oldest ${section.oldest_days_overdue} days late` : 'Nothing late' }}</small></article>
              <article class="summary-card"><span>Opening · closing</span><strong>{{ formatMoney(section.closing_balance) }}</strong><small>From {{ formatMoney(section.opening_balance) }}</small></article>
            </div>
            <div class="report-table-wrap">
              <table class="report-table">
                <thead><tr><th>Date</th><th>Entry</th><th>Increase</th><th>Decrease</th><th>Balance</th></tr></thead>
                <tbody>
                  <tr><td>{{ formatDate(counterpartyStatement.from) }}</td><td>Opening balance</td><td></td><td></td><td>{{ formatMoney(section.opening_balance) }}</td></tr>
                  <tr v-for="(line, index) in section.lines" :key="`${line.type}-${line.invoice_id}-${line.payment_id}-${index}`"><td>{{ formatDate(line.date) }}</td><td>{{ statementLineLabel(line) }}</td><td>{{ line.increase !== '0.00' ? formatMoney(line.increase) : '' }}</td><td>{{ line.decrease !== '0.00' ? formatMoney(line.decrease) : '' }}</td><td>{{ formatMoney(line.balance) }}</td></tr>
                  <tr class="statement-total"><td>{{ formatDate(counterpartyStatement.to) }}</td><td>Closing balance</td><td></td><td></td><td>{{ formatMoney(section.closing_balance) }}</td></tr>
                </tbody>
              </table>
            </div>
            <template v-if="section.open_invoices.length">
              <h5>Open invoices</h5>
              <div class="report-table-wrap">
                <table class="report-table">
                  <thead><tr><th>Invoice</th><th>Date</th><th>Due</th><th>Total</th><th>Outstanding</th><th>Late</th></tr></thead>
                  <tbody><tr v-for="invoice in section.open_invoices" :key="invoice.id"><td>{{ invoice.invoice_number }}</td><td>{{ formatDate(invoice.issued_on) }}</td><td>{{ formatDate(invoice.due_on) }}</td><td>{{ formatMoney(invoice.gross_amount) }}</td><td>{{ formatMoney(invoice.outstanding_amount) }}</td><td>{{ invoice.days_overdue ? `${invoice.days_overdue} days` : '—' }}</td></tr></tbody>
                </table>
              </div>
            </template>
          </section>
        </section>
        <div class="contact-list no-print">
          <article v-for="party in counterparties" :key="party.id" class="contact-row">
            <div><strong>{{ party.name }}</strong><span>{{ party.nui || party.email || party.municipality || 'No extra details' }}</span></div>
            <span class="status-chip">{{ party.type }}<template v-if="party.status === 'inactive'"> · inactive</template></span>
            <div class="contact-actions">
              <button class="text-button" type="button" :disabled="statementLoading" @click="openCounterpartyCard(party)">Card</button>
              <button v-if="canEditBookkeeping" class="text-button" type="button" @click="editCounterparty(party)">Edit</button>
              <button v-if="canViewHistory" class="text-button" type="button" @click="toggleCounterpartyHistory(party)">{{ historyCounterpartyId === party.id ? 'Hide history' : 'History' }}</button>
            </div>
            <ul v-if="historyCounterpartyId === party.id" class="audit-list">
              <li v-for="entry in counterpartyHistory" :key="entry.id"><strong>{{ entry.action.replace('counterparty.', '').replace('_', ' ') }}</strong> · {{ formatDate(entry.created_at.slice(0, 10)) }} · {{ entry.user?.name ?? 'System' }}<span v-for="change in describeAuditChanges(entry)" :key="change">{{ change }}</span></li>
              <li v-if="!counterpartyHistory.length">No changes recorded yet.</li>
            </ul>
          </article>
          <p v-if="!counterparties.length" class="empty-message">No contacts yet. Add customers and suppliers here.</p>
        </div>
      </section>

      <section v-else-if="activeSection === 'money'" class="content-panel">
        <div class="panel-heading">
          <div><p class="eyebrow">Receipts and payments</p><h2>Cash & bank</h2></div>
          <span class="ledger-currency">{{ business.currency }}</span>
        </div>
        <nav class="kind-tabs ledger-tabs" aria-label="Cash and bank">
          <button :class="{ active: activeMoneySection === 'cash' }" @click="activeMoneySection = 'cash'">Cash accounts</button>
          <button :class="{ active: activeMoneySection === 'bank' }" @click="activeMoneySection = 'bank'">Bank accounts</button>
          <button :class="{ active: activeMoneySection === 'payments' }" @click="activeMoneySection = 'payments'">Payments</button>
        </nav>
        <p v-if="formError" class="error-text ledger-error" role="alert">{{ formError }}</p>

        <template v-if="activeMoneySection === 'cash'">
          <div class="ledger-actions"><p class="form-note">Link each cash box to an active asset account in the chart of accounts.</p><button class="primary-button" :disabled="!activeAssetAccounts.length" @click="showCashAccountForm = !showCashAccountForm">{{ showCashAccountForm ? 'Cancel' : 'Add cash account' }}</button></div>
          <p v-if="!activeAssetAccounts.length" class="setup-hint">Add an active asset account in Ledger → Accounts first.</p>
          <form v-if="showCashAccountForm" class="entry-form" @submit.prevent="createCashAccount">
            <h3>New cash account</h3>
            <div class="fields-grid"><label>Name<input v-model.trim="cashAccountForm.name" required maxlength="100" /></label><label>Ledger account<select v-model="cashAccountForm.account_id" required><option disabled value="">Choose asset account</option><option v-for="account in activeAssetAccounts" :key="account.id" :value="String(account.id)">{{ account.code }} · {{ account.name }}</option></select></label></div>
            <div class="form-footer"><button class="primary-button" type="submit" :disabled="saving">{{ saving ? 'Saving…' : 'Save cash account' }}</button></div>
          </form>
          <div class="account-list"><article v-for="account in cashAccounts" :key="account.id" class="money-account-row"><div><strong>{{ account.name }}</strong><span>{{ account.account ? account.account.code + ' · ' + account.account.name : 'Ledger account needs to be assigned' }}</span><span v-if="account.negative_balance" class="negative-balance">Cash balance is below zero</span></div><strong class="invoice-total">{{ formatMoney(account.balance) }}</strong></article><p v-if="!cashAccounts.length" class="empty-message">No cash accounts yet.</p></div>
        </template>

        <template v-else-if="activeMoneySection === 'bank'">
          <div class="ledger-actions"><p class="form-note">Link each business bank account to its active ledger asset account.</p><button class="primary-button" :disabled="!activeAssetAccounts.length" @click="showBankAccountForm = !showBankAccountForm">{{ showBankAccountForm ? 'Cancel' : 'Add bank account' }}</button></div>
          <p v-if="!activeAssetAccounts.length" class="setup-hint">Add an active asset account in Ledger → Accounts first.</p>
          <form v-if="showBankAccountForm" class="entry-form" @submit.prevent="createBankAccount">
            <h3>New bank account</h3>
            <div class="fields-grid"><label>Bank name<input v-model.trim="bankAccountForm.bank_name" required maxlength="150" /></label><label>Account name <span>(optional)</span><input v-model.trim="bankAccountForm.account_name" maxlength="150" /></label><label>IBAN <span>(optional)</span><input v-model.trim="bankAccountForm.iban" maxlength="34" /></label><label>Ledger account<select v-model="bankAccountForm.account_id" required><option disabled value="">Choose asset account</option><option v-for="account in activeAssetAccounts" :key="account.id" :value="String(account.id)">{{ account.code }} · {{ account.name }}</option></select></label></div>
            <div class="form-footer"><button class="primary-button" type="submit" :disabled="saving">{{ saving ? 'Saving…' : 'Save bank account' }}</button></div>
          </form>
          <div class="account-list"><article v-for="account in bankAccounts" :key="account.id" class="money-account-row"><div><strong>{{ account.bank_name }}<template v-if="account.account_name"> · {{ account.account_name }}</template></strong><span>{{ account.iban || 'IBAN not added' }} · {{ account.account ? account.account.code + ' · ' + account.account.name : 'Ledger account needs to be assigned' }}</span><span>{{ account.currency }} ledger balance · {{ account.unreconciled_transactions_count }} unreconciled</span><button class="text-button bank-review-button" type="button" @click="loadBankTransactions(account)">{{ selectedBankAccountId === String(account.id) ? 'Refresh transactions' : 'Review transactions' }}</button></div><strong class="invoice-total">{{ formatMoney(account.balance) }}</strong></article><p v-if="!bankAccounts.length" class="empty-message">No bank accounts yet.</p></div>
          <section v-if="selectedBankAccount" class="bank-reconciliation">
            <div class="bank-reconciliation-heading"><div><h3>{{ selectedBankAccount.bank_name }} transactions</h3><p>Import the statement your bank exports (Excel or CSV), then match each row to a posted ledger entry.</p></div><span class="status-chip">{{ selectedBankAccount.unreconciled_transactions_count }} to review</span></div>
            <form class="bank-import-form" @submit.prevent="importBankStatement">
              <label>Bank statement (.xlsx or .csv)<input type="file" accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,text/plain" required @change="selectBankStatement" /></label>
              <p class="form-note">Needs a date and a description column (<code>Data</code>, <code>Përshkrimi</code>), plus either one amount column (<code>Shuma</code>: positive for money received, negative for money paid) or separate <code>Debi</code> and <code>Kredi</code> columns. Optional <code>external_id</code> prevents importing a row twice. Bank details above the header and the totals row are skipped. Old .xls files must be saved as .xlsx first.</p>
              <button class="primary-button" type="submit" :disabled="importingBankStatement || !bankStatementFile">{{ importingBankStatement ? 'Importing…' : 'Import statement' }}</button>
            </form>
            <div class="bank-transaction-list">
              <article v-for="transaction in bankTransactions" :key="transaction.id" class="bank-transaction-row">
                <div class="bank-transaction-summary"><div><strong>{{ transaction.description }}</strong><span>{{ formatDate(transaction.transaction_date) }}<template v-if="transaction.external_id"> · Ref {{ transaction.external_id }}</template><template v-if="transaction.document"> · {{ transaction.document.original_name }}</template></span><span v-if="transaction.journal_entry">Journal #{{ transaction.journal_entry.id }} · {{ transaction.journal_entry.description }}</span></div><strong :class="transaction.amount.startsWith('-') ? 'negative-balance' : 'invoice-total'">{{ formatMoney(transaction.amount) }}</strong></div>
                <div v-if="!transaction.is_reconciled" class="bank-match-actions">
                  <label>Matching posted entry<select v-model="reconciliationSelections[transaction.id]"><option value="">Choose entry</option><option v-for="entry in bankTransactionCandidates(transaction)" :key="entry.id" :value="String(entry.id)">{{ formatDate(entry.entry_date) }} · {{ entry.description }}{{ entry.reference ? ` · ${entry.reference}` : '' }}</option></select></label>
                  <button class="primary-button" type="button" :disabled="reconcilingTransactionId === transaction.id || (!reconciliationSelections[transaction.id] && !transaction.journal_entry)" @click="reconcileBankTransaction(transaction)">{{ reconcilingTransactionId === transaction.id ? 'Saving…' : 'Reconcile' }}</button>
                  <span v-if="!bankTransactionCandidates(transaction).length && !transaction.journal_entry" class="form-note">No exact posted match for this date and amount.</span>
                </div>
                <div v-else class="bank-reconciled-status"><span class="status-chip">Reconciled</span><span>{{ transaction.reconciled_at ? formatDate(transaction.reconciled_at.slice(0, 10)) : '' }}</span></div>
              </article>
              <p v-if="!bankTransactions.length" class="empty-message">No transactions loaded for this account yet.</p>
            </div>
          </section>
        </template>

        <template v-else>
          <div class="ledger-actions"><p class="form-note">Each payment needs a source document. Payments applied in full to invoices are posted to the ledger automatically.</p><button class="primary-button" :disabled="!cashAccounts.length && !bankAccounts.length" @click="showPaymentForm = !showPaymentForm">{{ showPaymentForm ? 'Cancel' : 'Record payment' }}</button></div>
          <form v-if="showPaymentForm" class="entry-form" @submit.prevent="createPayment">
            <h3>Record a cash or bank movement</h3>
            <div class="fields-grid">
              <label>Account type<select v-model="paymentForm.source"><option value="cash">Cash</option><option value="bank">Bank</option></select></label>
              <label v-if="paymentForm.source === 'cash'">Cash account<select v-model="paymentForm.cash_account_id" required><option disabled value="">Choose cash account</option><option v-for="account in cashAccounts.filter((item) => item.account)" :key="account.id" :value="String(account.id)">{{ account.name }} · {{ account.account?.code }}</option></select></label>
              <label v-else>Bank account<select v-model="paymentForm.bank_account_id" required><option disabled value="">Choose bank account</option><option v-for="account in bankAccounts.filter((item) => item.account)" :key="account.id" :value="String(account.id)">{{ account.bank_name }} · {{ account.account?.code }}</option></select></label>
              <label>Direction<select v-model="paymentForm.direction"><option value="in">Money received</option><option value="out">Money paid</option></select></label>
              <label>Amount<input v-model="paymentForm.amount" type="number" min="0.01" step="0.01" required /></label>
              <label>Apply to invoice <span>(optional)</span><select v-model="paymentForm.invoice_id" @change="selectInvoiceAllocation"><option value="">Do not allocate</option><option v-for="invoice in allocatableInvoices" :key="invoice.id" :value="String(invoice.id)">{{ invoice.invoice_number }} · {{ invoice.counterparty.name }} · due {{ formatMoney(invoice.outstanding_amount) }}</option></select></label>
              <label v-if="!paymentForm.invoice_id && !paymentForm.journal_entry_id">What the money is for <span>(account, if not for an invoice)</span><select v-model="paymentForm.offset_account_id"><option value="">Choose account</option><option v-for="account in accounts.filter((item) => item.is_active)" :key="account.id" :value="String(account.id)">{{ account.code }} · {{ account.name }}</option></select></label>
              <label v-if="paymentForm.invoice_id">Allocated amount<input v-model="paymentForm.allocation_amount" type="number" min="0.01" step="0.01" :max="Math.min(Number(paymentForm.amount) || 0, Number(invoices.find((item) => item.id === Number(paymentForm.invoice_id))?.outstanding_amount || 0))" required /></label>
              <label>Payment date<input v-model="paymentForm.paid_on" type="date" required /></label>
              <label>Journal entry<select v-model="paymentForm.journal_entry_id"><option value="">Post journal automatically</option><option v-for="entry in availablePaymentJournalEntries" :key="entry.id" :value="String(entry.id)">{{ formatDate(entry.entry_date) }} · {{ entry.description }}{{ entry.reference ? ` · ${entry.reference}` : '' }}</option></select></label>
              <label>Reference <span>(optional)</span><input v-model.trim="paymentForm.reference" maxlength="120" /></label>
              <label>Note <span>(optional)</span><input v-model.trim="paymentForm.notes" maxlength="5000" /></label>
            </div>
            <div class="payment-source-document">
              <label>Existing source document<select v-model="paymentForm.document_id" @change="selectPaymentSourceDocument"><option value="">Upload a new receipt below</option><option v-for="document in documents" :key="document.id" :value="String(document.id)">{{ document.category }} · {{ document.original_name }}</option></select></label>
              <label>Or upload source document<input ref="paymentSourceFileInput" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" @change="selectPaymentSourceFile" /></label>
              <p class="form-note">Attach a receipt, invoice, or other evidence for this movement. The uploaded file is saved to this business before the payment is recorded.</p>
            </div>
            <div class="form-footer"><button class="primary-button" type="submit" :disabled="saving || (!paymentForm.document_id && !paymentSourceFile)">{{ saving ? 'Saving…' : 'Save payment' }}</button></div>
            <p v-if="!paymentForm.journal_entry_id" class="setup-hint">Automatic posting needs either the whole amount applied to an invoice, or the account the money is for (for example an expense account for a cash purchase).</p>
          </form>
          <div class="journal-list"><article v-for="payment in payments" :key="payment.id" class="journal-card">
            <div class="journal-card-heading"><div><strong>{{ payment.direction === 'in' ? 'Money received' : 'Money paid' }}<template v-if="payment.reference"> · {{ payment.reference }}</template></strong><span>{{ formatDate(payment.paid_on) }} · {{ payment.cash_account?.name || payment.bank_account?.bank_name }} · Journal #{{ payment.journal_entry.id }}</span></div><strong class="invoice-total">{{ formatMoney(payment.amount) }}</strong></div>
            <p v-if="payment.invoices.length" class="payment-note">Applied to {{ payment.invoices.map((invoice) => `${invoice.invoice_number} (${formatMoney(invoice.allocated_amount)})`).join(', ') }}</p>
            <p v-if="payment.document" class="payment-note">Source: {{ payment.document.original_name }}</p>
            <p v-if="payment.notes" class="payment-note">{{ payment.notes }}</p>
          </article><p v-if="!payments.length" class="empty-message">No cash or bank movements recorded yet.</p></div>
        </template>
      </section>

      <section v-else-if="activeSection === 'team' && business.role === 'owner'" class="content-panel">
        <div class="panel-heading"><div><p class="eyebrow">Business access</p><h2>Team members</h2></div><span class="status-chip">Owner controlled</span></div>
        <p v-if="formError" class="error-text ledger-error" role="alert">{{ formError }}</p>
        <form class="entry-form team-invite-form" @submit.prevent="inviteTeamMember">
          <h3>Invite an existing KontoTrack user</h3>
          <p class="form-note">They will receive an invitation in their workspace. They must accept it before this business appears in their books.</p>
          <div class="fields-grid"><label>User email<input v-model.trim="teamForm.email" type="email" required maxlength="255" autocomplete="email" /></label><label>Role<select v-model="teamForm.role"><option value="accountant">Bookkeeper</option><option value="assistant_accountant">Assistant bookkeeper</option><option value="auditor">Auditor / view only</option></select></label></div>
          <div class="form-footer"><button class="primary-button" type="submit" :disabled="saving">{{ saving ? 'Sending…' : 'Send invitation' }}</button></div>
        </form>
        <div class="account-list team-member-list"><article v-for="member in teamMembers" :key="member.id" class="team-member-row"><div><strong>{{ member.name }}</strong><span>{{ member.email }}</span></div><span class="status-chip" :class="{ posted: member.status === 'active' }">{{ member.status }}</span><span class="account-type">{{ member.role.replaceAll('_', ' ') }}</span></article><p v-if="!teamMembers.length" class="empty-message">No team members were found.</p></div>
      </section>

      <section v-else class="content-panel">
        <div class="panel-heading">
          <div><p class="eyebrow">Double-entry bookkeeping</p><h2>Ledger</h2></div>
          <span class="ledger-currency">{{ business.currency }}</span>
        </div>
        <nav class="kind-tabs ledger-tabs" aria-label="Ledger setup">
          <button :class="{ active: activeLedgerSection === 'journal' }" @click="activeLedgerSection = 'journal'">Journal</button>
          <button :class="{ active: activeLedgerSection === 'accounts' }" @click="activeLedgerSection = 'accounts'">Accounts</button>
          <button :class="{ active: activeLedgerSection === 'posting' }" @click="activeLedgerSection = 'posting'">Posting accounts</button>
          <button :class="{ active: activeLedgerSection === 'periods' }" @click="activeLedgerSection = 'periods'">Periods</button>
        </nav>
        <p v-if="formError" class="error-text ledger-error" role="alert">{{ formError }}</p>

        <template v-if="activeLedgerSection === 'journal'">
          <div class="ledger-actions">
            <p class="form-note">Only balanced entries dated inside an open period can be posted.</p>
            <button class="primary-button" :disabled="!accounts.length || !openPeriods.length" @click="showJournalForm = !showJournalForm">{{ showJournalForm ? 'Cancel' : 'New journal entry' }}</button>
          </div>
          <p v-if="!accounts.length || !openPeriods.length" class="setup-hint">Set up accounts and an open period before entering journals.</p>
          <form v-if="showJournalForm" class="entry-form" @submit.prevent="createJournalDraft">
            <h3>Journal entry draft</h3>
            <div class="fields-grid journal-fields">
              <label>Description<input v-model.trim="journalForm.description" required maxlength="255" /></label>
              <label>Accounting period<select v-model="journalForm.accounting_period_id" required><option disabled value="">Choose a period</option><option v-for="period in openPeriods" :key="period.id" :value="String(period.id)">{{ period.name }} · {{ formatDate(period.starts_on) }} – {{ formatDate(period.ends_on) }}</option></select></label>
              <label>Entry date<input v-model="journalForm.entry_date" type="date" required /></label>
              <label>Reference <span>(optional)</span><input v-model.trim="journalForm.reference" maxlength="100" /></label>
            </div>
            <div class="lines-heading"><h4>Debit and credit lines</h4><button class="text-button" type="button" @click="addJournalLine">＋ Add line</button></div>
            <div v-for="(line, index) in journalLineDrafts" :key="index" class="journal-line-row">
              <label>Account<select v-model="line.account_id" required><option disabled value="">Choose account</option><option v-for="account in accounts" :key="account.id" :value="String(account.id)">{{ account.code }} · {{ account.name }}</option></select></label>
              <label>Debit<input :value="line.debit" type="number" min="0" step="0.01" required @input="setJournalSide(index, 'debit', ($event.target as HTMLInputElement).value)" /></label>
              <label>Credit<input :value="line.credit" type="number" min="0" step="0.01" required @input="setJournalSide(index, 'credit', ($event.target as HTMLInputElement).value)" /></label>
              <label>Line note<input v-model.trim="line.description" maxlength="255" /></label>
              <button v-if="journalLineDrafts.length > 2" class="remove-line" type="button" aria-label="Remove line" @click="journalLineDrafts.splice(index, 1)">×</button>
            </div>
            <div class="totals-preview"><span>Debits {{ formatMoney(journalDebitTotal) }}</span><span>Credits {{ formatMoney(journalCreditTotal) }}</span><strong :class="{ unbalanced: !journalIsBalanced }">{{ journalIsBalanced ? 'Balanced' : 'Out of balance' }}</strong></div>
            <div class="form-footer"><button class="primary-button" type="submit" :disabled="saving || !journalIsBalanced || !journalLinesValid">{{ saving ? 'Saving…' : 'Save draft' }}</button></div>
          </form>
          <div class="journal-list">
            <article v-for="entry in journalEntries" :key="entry.id" class="journal-card">
              <div class="journal-card-heading"><div><strong>{{ entry.description }}</strong><span>{{ formatDate(entry.entry_date) }} · {{ entry.accounting_period.name }}<template v-if="entry.reference"> · {{ entry.reference }}</template></span></div><span class="status-chip" :class="{ posted: entry.status === 'posted' }">{{ entry.status }}</span></div>
              <div class="journal-lines-summary">
                <div v-for="line in entry.lines" :key="line.id"><span>{{ line.account.code }} · {{ line.account.name }}</span><strong v-if="Number(line.debit) > 0">{{ formatMoney(line.debit) }}</strong><strong v-else>{{ formatMoney(line.credit) }}</strong></div>
              </div>
              <div v-if="entry.status === 'draft'" class="journal-card-actions">
                <button class="text-button" type="button" :disabled="saving" @click="removeJournalDraft(entry)">Remove draft</button>
                <button class="primary-button" type="button" :disabled="saving" @click="postJournal(entry)">Post entry</button>
              </div>
              <div v-else-if="entry.reversal_of_id === null && !journalEntries.some((item) => item.reversal_of_id === entry.id)" class="journal-card-actions"><button class="text-button" type="button" :disabled="saving" @click="reverseJournal(entry)">Create reversal draft</button></div>
            </article>
            <p v-if="!journalEntries.length" class="empty-message">No journal entries yet.</p>
          </div>
        </template>

        <template v-else-if="activeLedgerSection === 'accounts'">
          <div class="ledger-actions"><p class="form-note">Create the chart of accounts approved for this business, or start from the Kosovo standard chart. Existing accounts are never changed.</p><div class="ledger-buttons"><button class="text-button" type="button" :disabled="saving" @click="applyKosovoChartTemplate">Use Kosovo standard chart</button><button class="primary-button" @click="showAccountForm = !showAccountForm">{{ showAccountForm ? 'Cancel' : 'Add account' }}</button></div></div>
          <p v-if="chartTemplateNotice" class="setup-hint" role="status">{{ chartTemplateNotice }}</p>
          <form v-if="showAccountForm" class="entry-form" @submit.prevent="createAccount">
            <h3>New account</h3>
            <div class="fields-grid">
              <label>Account code<input v-model.trim="accountForm.code" required maxlength="32" /></label>
              <label>Account name<input v-model.trim="accountForm.name" required maxlength="255" /></label>
              <label>Type<select v-model="accountForm.account_type"><option value="asset">Asset</option><option value="liability">Liability</option><option value="equity">Equity</option><option value="revenue">Revenue</option><option value="expense">Expense</option></select></label>
              <label>Normal balance<select v-model="accountForm.normal_balance"><option value="debit">Debit</option><option value="credit">Credit</option></select></label>
              <label>Parent account <span>(optional)</span><select v-model="accountForm.parent_id"><option value="">None</option><option v-for="account in accounts" :key="account.id" :value="String(account.id)">{{ account.code }} · {{ account.name }}</option></select></label>
            </div>
            <div class="form-footer"><button class="primary-button" type="submit" :disabled="saving">{{ saving ? 'Saving…' : 'Save account' }}</button></div>
          </form>
          <div class="account-list"><article v-for="account in accounts" :key="account.id" class="account-row"><strong>{{ account.code }}</strong><span>{{ account.name }}</span><span class="account-type">{{ account.account_type }} · {{ account.normal_balance }}</span></article><p v-if="!accounts.length" class="empty-message">No accounts set up yet.</p></div>
        </template>

        <template v-else-if="activeLedgerSection === 'posting'">
          <div class="ledger-actions"><p class="form-note">Issuing an invoice without choosing a journal entry posts it to these accounts. VAT accounts are only needed for invoices with VAT.</p></div>
          <form class="entry-form" @submit.prevent="savePostingAccounts">
            <h3>Automatic posting accounts</h3>
            <div class="fields-grid">
              <label v-for="row in postingAccounts" :key="row.purpose">{{ row.label }}<select v-model="postingAccountForm[row.purpose]"><option value="">Not mapped</option><option v-for="account in accountsForPostingPurpose(row)" :key="account.id" :value="String(account.id)">{{ account.code }} · {{ account.name }}</option></select></label>
            </div>
            <div class="form-footer"><button class="primary-button" type="submit" :disabled="saving || business.role === 'auditor' || business.role === 'assistant_accountant'">{{ saving ? 'Saving…' : 'Save posting accounts' }}</button></div>
          </form>
        </template>

        <template v-else>
          <div class="ledger-actions"><p class="form-note">Periods cannot overlap. Closed periods are protected from new journal entries.</p><button class="primary-button" @click="showPeriodForm = !showPeriodForm">{{ showPeriodForm ? 'Cancel' : 'Add period' }}</button></div>
          <form v-if="showPeriodForm" class="entry-form" @submit.prevent="createPeriod">
            <h3>New accounting period</h3>
            <div class="fields-grid"><label>Period name<input v-model.trim="periodForm.name" required maxlength="80" /></label><label>Starts on<input v-model="periodForm.starts_on" type="date" required /></label><label>Ends on<input v-model="periodForm.ends_on" type="date" required /></label></div>
            <div class="form-footer"><button class="primary-button" type="submit" :disabled="saving">{{ saving ? 'Saving…' : 'Save period' }}</button></div>
          </form>
          <div class="period-list"><article v-for="period in periods" :key="period.id" class="period-row"><div><strong>{{ period.name }}</strong><span>{{ formatDate(period.starts_on) }} – {{ formatDate(period.ends_on) }}</span></div><span class="status-chip" :class="{ posted: period.status === 'closed' }">{{ period.status }}</span><button v-if="period.status === 'open'" class="text-button" type="button" :disabled="saving || closingReviewLoading" @click="reviewPeriodClosing(period)">{{ closingReviewLoading && closingReview?.period_id === period.id ? 'Checking…' : 'Review close' }}</button></article><p v-if="!periods.length" class="empty-message">No accounting periods yet.</p></div>
          <section v-if="closingReview" class="close-review" aria-live="polite">
            <div class="close-review-heading"><div><p class="eyebrow">Month-end review</p><h3>{{ closingReview.name }}</h3></div><button class="text-button" type="button" @click="closingReview = null">Dismiss</button></div>
            <ul class="closing-check-list"><li v-for="check in closingReview.checks" :key="check.key"><span class="closing-check-status" :class="check.status">{{ check.status.replace('_', ' ') }}</span><div><strong>{{ check.label }}</strong><p>{{ check.detail }}</p></div></li></ul>
            <div class="form-footer"><button class="primary-button" type="button" :disabled="saving || !closingReview.can_close" @click="closeReviewedPeriod">{{ saving ? 'Closing…' : closingReview.can_close ? 'Confirm and close period' : 'Resolve blockers before closing' }}</button></div>
          </section>
        </template>
      </section>
    </template>
  </main>
</template>

<style scoped>
.workspace-shell { width: min(100% - 32px, 1040px); margin: 0 auto; padding-bottom: 64px; color: #23352b; }
.workspace-topbar { display: flex; height: 68px; align-items: center; justify-content: space-between; border-bottom: 1px solid #e1e8e1; }
.back-link { color: #42644f; font-size: 13px; font-weight: 650; text-decoration: none; }
.product-label { color: #20382b; font-size: 14px; font-weight: 750; }
.workspace-title { padding: 36px 0 26px; }
.eyebrow { margin: 0 0 7px; color: #527360; font-size: 11px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
h1 { margin: 0; color: #18231e; font-size: clamp(25px, 4vw, 34px); letter-spacing: -.035em; }
.legal-name { margin: 8px 0 0; color: #748077; font-size: 14px; }
.section-tabs, .kind-tabs { display: flex; gap: 8px; border-bottom: 1px solid #e1e8e1; }
.section-tabs { overflow-x: auto; }
.section-tabs button, .kind-tabs button { padding: 12px 14px; border: 0; border-bottom: 2px solid transparent; color: #748077; background: transparent; cursor: pointer; font: inherit; font-size: 13px; font-weight: 650; }
.section-tabs button.active, .kind-tabs button.active { border-bottom-color: #245c45; color: #245c45; }
.content-panel { margin-top: 22px; padding: 24px; border: 1px solid #e0e8df; border-radius: 16px; background: #fff; }
.panel-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.panel-heading h2 { margin: 0; color: #20382b; font-size: 22px; }
.panel-heading .eyebrow { margin-bottom: 4px; }
.dashboard-period { display: flex; align-items: flex-end; gap: 9px; }
.dashboard-period label { display: grid; gap: 5px; color: #45594c; font-size: 11px; font-weight: 650; }
.dashboard-period input { min-height: 38px; padding: 6px 8px; border: 1px solid #d8e1d9; border-radius: 8px; color: #27392f; background: #fff; font: inherit; }
.summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-top: 22px; }
.summary-card { display: grid; min-width: 0; gap: 8px; padding: 16px; border: 1px solid #e4ebe4; border-radius: 12px; background: #fbfdfb; }
.summary-card > span { color: #637168; font-size: 12px; font-weight: 650; }
.summary-card strong { overflow: hidden; color: #20382b; font-size: 19px; letter-spacing: -.02em; text-overflow: ellipsis; }
.summary-card small { color: #77837b; font-size: 10px; line-height: 1.5; }
.dashboard-note { margin: 16px 0 0; }
.report-filters { display: grid; grid-template-columns: minmax(170px, 1.3fr) repeat(2, minmax(130px, 1fr)) auto; align-items: end; gap: 10px; margin-top: 20px; }
.report-filters label { display: grid; gap: 5px; color: #45594c; font-size: 11px; font-weight: 650; }
.report-filters input, .report-filters select { width: 100%; min-width: 0; min-height: 40px; padding: 7px 9px; border: 1px solid #d8e1d9; border-radius: 8px; color: #27392f; background: #fff; font: inherit; }
.report-table-wrap { margin-top: 20px; overflow-x: auto; }
.report-table { width: 100%; border-collapse: collapse; font-size: 12px; text-align: left; }
.report-table th, .report-table td { padding: 11px 10px; border-bottom: 1px solid #edf1ed; white-space: nowrap; }
.report-table thead th, .report-table tfoot th { color: #45594c; background: #f7faf7; font-weight: 700; }
.report-table td:nth-last-child(-n+2), .report-table th:nth-last-child(-n+2) { text-align: right; }
.report-note { margin-top: 13px; }
.primary-button { min-height: 40px; padding: 0 15px; border: 0; border-radius: 9px; color: #fff; background: #245c45; cursor: pointer; font: inherit; font-size: 13px; font-weight: 700; }
.primary-button:disabled { cursor: not-allowed; opacity: .55; }
.kind-tabs { margin-top: 20px; }
.entry-form { margin-top: 20px; padding: 20px; border: 1px solid #dfe9df; border-radius: 13px; background: #f9fbf9; }
.entry-form h3 { margin: 0; color: #20382b; font-size: 17px; }
.form-note { margin: 7px 0 18px; color: #6e7c72; font-size: 12px; line-height: 1.5; }
.fields-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 13px; }
.fields-grid label, .line-row label, .notes-field { display: grid; gap: 6px; color: #45594c; font-size: 12px; font-weight: 650; }
.fields-grid input, .fields-grid select, .fields-grid textarea, .line-row input, .line-row select, .notes-field textarea { min-width: 0; min-height: 40px; padding: 8px 10px; border: 1px solid #d8e1d9; border-radius: 8px; color: #27392f; background: #fff; font: inherit; font-weight: 400; }
.wide-field { grid-column: 1 / -1; }
.checkbox-field { display: flex !important; align-items: center; gap: 9px !important; }
.checkbox-field input { min-height: 0; }
.inventory-actions { display: flex; align-items: center; flex-wrap: wrap; justify-content: flex-end; gap: 10px; }
.table-subtext { display: block; margin-top: 4px; color: #77837b; font-size: 10px; }
.status-chip.stock-low { color: #8c443a; background: #fbefed; }
.lines-heading { display: flex; align-items: center; justify-content: space-between; margin: 20px 0 10px; }
.lines-heading h4 { margin: 0; font-size: 13px; }
.text-button { padding: 5px; border: 0; color: #245c45; background: transparent; cursor: pointer; font: inherit; font-size: 12px; font-weight: 700; }
.line-row { display: grid; grid-template-columns: minmax(150px, 2fr) repeat(7, minmax(85px, 1fr)) 28px; align-items: end; gap: 9px; margin-top: 9px; }
.remove-line { height: 35px; border: 0; color: #8c443a; background: transparent; cursor: pointer; font-size: 20px; }
.totals-preview { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 14px; margin-top: 17px; color: #64736a; font-size: 12px; }
.totals-preview strong { color: #20382b; }
.notes-field { margin-top: 17px; }
.notes-field textarea { resize: vertical; }
.form-footer { display: flex; justify-content: flex-end; margin-top: 16px; }
.error-text { color: #9b352b; font-size: 12px; }
.invoice-list, .contact-list { display: grid; }
.invoice-row, .contact-row { display: grid; grid-template-columns: minmax(0, 1fr) auto auto auto; align-items: center; gap: 18px; padding: 15px 0; border-bottom: 1px solid #edf1ed; }
.invoice-main, .contact-row > div { display: grid; gap: 4px; min-width: 0; }
.invoice-main strong, .contact-row strong { overflow: hidden; color: #2a4033; font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }
.invoice-main span, .contact-row span:not(.status-chip) { overflow: hidden; color: #77837b; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.invoice-date { color: #77837b; font-size: 12px; }
.status-chip { padding: 5px 8px; border-radius: 999px; color: #42644f; background: #edf5ef; font-size: 10px; font-weight: 700; text-transform: capitalize; }
.status-chip.posted { color: #334b73; background: #edf1f8; }
.invoice-total { color: #20382b; font-size: 13px; white-space: nowrap; }
.contact-actions { display: flex; gap: 8px; }
.audit-list { display: grid; grid-column: 1 / -1; gap: 8px; margin: 4px 0 0; padding: 10px 12px; border-radius: 8px; background: #f6f8f6; list-style: none; font-size: 12px; }
.audit-list li span { display: block; color: #4d5f55; }
.history-panel { margin-top: 20px; }
.plain-fieldset { margin: 0; padding: 0; border: 0; }
.invoice-row { grid-template-columns: minmax(0, 1fr) auto auto auto auto; }
.report-actions { display: flex; gap: 12px; }
.topbar-actions { display: flex; align-items: center; gap: 12px; }
.section-tabs { flex-wrap: wrap; overflow-x: visible; }
.section-tabs button { white-space: nowrap; }
.controls-panel { margin-top: 20px; }
.payroll-additions { display: grid; gap: 8px; margin: 10px 0 16px; }
.payroll-addition-row { display: grid; grid-template-columns: minmax(140px, 1fr) 140px minmax(140px, 1fr); align-items: center; gap: 10px; font-size: 13px; }
.payroll-addition-row input { min-height: 34px; padding: 6px 9px; border: 1px solid #d8e1d9; border-radius: 8px; font: inherit; }
.contact-card { margin: 4px 0 22px; padding: 16px; border: 1px solid #dfe7e0; border-radius: 10px; background: #fbfcfb; }
.contact-card-heading { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 12px; }
.contact-card-heading h3 { margin: 2px 0; }
.statement-section { margin-top: 18px; }
.statement-section h4 { margin: 0 0 10px; }
.statement-section h5 { margin: 14px 0 6px; font-size: 12px; }
.statement-total td { font-weight: 700; }
.controls-heading { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; }
.controls-heading h3 { margin: 0; }
.controls-summary { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.controls-list { display: grid; gap: 8px; margin: 12px 0 0; padding: 0; list-style: none; }
.controls-list li { display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: start; gap: 12px; padding: 10px 12px; border: 1px solid #edf1ed; border-radius: 8px; }
.controls-list strong { font-size: 13px; }
.controls-list p { margin: 2px 0 0; color: #4d5f55; font-size: 12px; }
.controls-list .control-critical { border-color: #e8b4ae; background: #fdf3f2; }
.controls-list .control-warning { border-color: #ecd6a8; background: #fdf9ef; }
.severity-chip { display: inline-block; padding: 3px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; text-transform: capitalize; white-space: nowrap; }
.severity-chip.critical { color: #9b352b; background: #f8dedb; }
.severity-chip.warning { color: #8a5a12; background: #f8ebcf; }
.severity-chip.ok { color: #2f5a41; background: #e2efe6; }
.severity-chip.info { color: #4d5f55; background: #eceff0; }
.print-only { display: none; }
@media print {
  .workspace-topbar, .section-tabs, .workspace-title, .report-filters, .report-actions, .no-print, .panel-heading, .entry-form { display: none !important; }
  .workspace-shell, .content-panel { padding: 0; border: 0; background: #fff; box-shadow: none; }
  .print-only { display: grid; gap: 2px; margin-bottom: 14px; font-size: 12px; }
  .report-print-heading strong { font-size: 16px; }
}
.invoice-credit-badge { justify-self: start; }
.invoice-print-link { font-size: 12px; text-decoration: none; white-space: nowrap; }
.invoice-cancellation-note { grid-column: 1 / -1; margin: 0; color: #8a4b2a; font-size: 12px; }
.invoice-cancel-form { display: flex; flex-wrap: wrap; grid-column: 1 / -1; align-items: flex-end; justify-content: flex-end; gap: 10px; }
.invoice-cancel-form label { display: grid; gap: 4px; font-size: 11px; }
.invoice-cancel-form input { min-height: 36px; padding: 6px 9px; border: 1px solid #d8e1d9; border-radius: 8px; font: inherit; font-size: 12px; }
.status-chip.cancelled { color: #8a4b2a; background: #fbeee6; }
.invoice-issue-actions { display: flex; grid-column: 1 / -1; justify-content: flex-end; gap: 10px; }
.invoice-issue-actions select { min-width: 0; min-height: 36px; padding: 6px 9px; border: 1px solid #d8e1d9; border-radius: 8px; color: #27392f; background: #fff; font: inherit; font-size: 11px; }
.invoice-error { margin: 14px 0; }
.contact-row { grid-template-columns: minmax(0, 1fr) auto auto; }
.contact-row > .contact-actions { display: flex; gap: 8px; }
.contact-row .audit-list span { white-space: normal; }
.empty-message, .notice { padding: 18px 0; color: #77837b; font-size: 13px; }
.notice.error { color: #9b352b; }
.ledger-currency { padding: 7px 10px; border-radius: 8px; color: #42644f; background: #edf5ef; font-size: 12px; font-weight: 700; }
.ledger-tabs { margin-bottom: 18px; }
.ledger-actions { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.ledger-actions .form-note { margin: 0; }
.ledger-error { margin: 14px 0; }
.setup-hint { margin: 14px 0; color: #77837b; font-size: 12px; }
.journal-fields { margin-top: 16px; }
.journal-line-row { display: grid; grid-template-columns: minmax(150px, 1.5fr) repeat(3, minmax(90px, 1fr)) 28px; align-items: end; gap: 9px; margin-top: 9px; }
.journal-line-row label { display: grid; gap: 6px; color: #45594c; font-size: 12px; font-weight: 650; }
.journal-line-row input, .journal-line-row select { width: 100%; min-width: 0; min-height: 40px; padding: 8px 10px; border: 1px solid #d8e1d9; border-radius: 8px; color: #27392f; background: #fff; font: inherit; font-weight: 400; }
.totals-preview .unbalanced { color: #a33d34; }
.journal-list, .account-list, .period-list { display: grid; gap: 12px; margin-top: 20px; }
.journal-card { padding: 15px; border: 1px solid #e4ebe4; border-radius: 12px; }
.journal-card-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.journal-card-heading > div { display: grid; gap: 5px; min-width: 0; }
.journal-card-heading strong { overflow: hidden; color: #2a4033; font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }
.journal-card-heading > div > span { color: #77837b; font-size: 11px; }
.journal-lines-summary { display: grid; gap: 7px; margin-top: 13px; padding-top: 11px; border-top: 1px solid #edf1ed; }
.journal-lines-summary > div { display: flex; justify-content: space-between; gap: 12px; color: #637168; font-size: 11px; }
.journal-lines-summary strong { color: #34453b; font-size: 11px; white-space: nowrap; }
.journal-card-actions { display: flex; align-items: center; justify-content: flex-end; gap: 14px; margin-top: 12px; }
.account-row { display: grid; grid-template-columns: 80px minmax(0, 1fr) 180px; gap: 12px; padding: 12px 0; border-bottom: 1px solid #edf1ed; font-size: 12px; }
.account-row strong { color: #2a4033; }
.account-type { color: #77837b; text-transform: capitalize; }
.period-row { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; align-items: center; gap: 16px; padding: 14px 0; border-bottom: 1px solid #edf1ed; }
.period-row > div { display: grid; gap: 5px; }
.period-row > div strong { color: #2a4033; font-size: 13px; }
.period-row > div span { color: #77837b; font-size: 11px; }
.close-review { margin-top: 20px; padding: 18px; border: 1px solid #dce7dc; border-radius: 13px; background: #fbfdfb; }
.close-review-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.close-review-heading h3 { margin: 0; color: #20382b; font-size: 17px; }
.closing-check-list { display: grid; gap: 0; margin: 14px 0 0; padding: 0; list-style: none; }
.closing-check-list li { display: grid; grid-template-columns: 112px minmax(0, 1fr); gap: 12px; padding: 12px 0; border-top: 1px solid #edf1ed; }
.closing-check-status { align-self: start; width: fit-content; padding: 5px 8px; border-radius: 999px; color: #42644f; background: #edf5ef; font-size: 10px; font-weight: 700; text-transform: capitalize; }
.closing-check-status.warning { color: #885c0a; background: #fff4d9; }
.closing-check-status.blocked { color: #92352e; background: #fbe8e6; }
.closing-check-status.not_implemented { color: #576579; background: #edf1f6; }
.closing-check-list strong { color: #2a4033; font-size: 12px; }
.closing-check-list p { margin: 4px 0 0; color: #77837b; font-size: 11px; line-height: 1.5; }
.money-account-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 13px 0; border-bottom: 1px solid #edf1ed; }
.money-account-row > div { display: grid; min-width: 0; gap: 5px; }
.money-account-row strong { overflow: hidden; color: #2a4033; font-size: 13px; text-overflow: ellipsis; }
.money-account-row span:not(.ledger-currency) { color: #77837b; font-size: 11px; }
.bank-review-button { justify-self: start; margin-top: 2px; }
.bank-reconciliation { margin-top: 24px; padding: 18px; border: 1px solid #e1e9e1; border-radius: 13px; background: #fbfdfb; }
.bank-reconciliation-heading, .bank-transaction-summary { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; }
.bank-reconciliation-heading h3 { margin: 0; color: #20382b; font-size: 16px; }
.bank-reconciliation-heading p { margin: 5px 0 0; color: #77837b; font-size: 11px; }
.bank-import-form { display: grid; grid-template-columns: minmax(200px, 1fr) auto; align-items: end; gap: 8px 14px; margin-top: 17px; padding: 14px; border: 1px solid #e7ede7; border-radius: 10px; background: #fff; }
.bank-import-form label, .bank-match-actions label { display: grid; gap: 6px; color: #45594c; font-size: 12px; font-weight: 650; }
.bank-import-form input, .bank-match-actions select { min-width: 0; min-height: 38px; padding: 7px 9px; border: 1px solid #d8e1d9; border-radius: 8px; color: #27392f; background: #fff; font: inherit; font-weight: 400; }
.bank-import-form .form-note { grid-column: 1 / -1; margin: 0; }
.bank-import-form .primary-button { grid-column: 2; grid-row: 1; }
.bank-transaction-list { display: grid; margin-top: 14px; }
.bank-transaction-row { display: grid; gap: 11px; padding: 14px 0; border-bottom: 1px solid #e9efea; }
.bank-transaction-summary > div { display: grid; min-width: 0; gap: 5px; }
.bank-transaction-summary > div strong { color: #2a4033; font-size: 12px; }
.bank-transaction-summary > div span { color: #77837b; font-size: 11px; line-height: 1.45; }
.bank-match-actions { display: flex; align-items: end; flex-wrap: wrap; gap: 10px; }
.bank-match-actions label { flex: 1; min-width: min(100%, 240px); }
.bank-match-actions .form-note { align-self: center; margin: 0; }
.bank-reconciled-status { display: flex; align-items: center; gap: 8px; color: #77837b; font-size: 11px; }
.payment-source-document { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 18px; padding: 14px; border: 1px solid #e4ebe4; border-radius: 10px; background: #fbfdfb; }
.payment-source-document label { display: grid; min-width: 0; gap: 6px; color: #45594c; font-size: 12px; font-weight: 650; }
.payment-source-document select, .payment-source-document input { width: 100%; min-width: 0; min-height: 40px; padding: 8px 10px; border: 1px solid #d8e1d9; border-radius: 8px; color: #27392f; background: #fff; font: inherit; font-weight: 400; }
.payment-source-document .form-note { grid-column: 1 / -1; margin: 0; }
.negative-balance { color: #a33d34 !important; font-weight: 700; }
.payment-note { margin: 12px 0 0; color: #637168; font-size: 12px; }
@media (max-width: 720px) { .content-panel { padding: 17px; } .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .report-filters { grid-template-columns: repeat(2, minmax(0, 1fr)); } .report-filters .primary-button { justify-self: end; } .line-row { grid-template-columns: repeat(2, minmax(0, 1fr)); } .line-row label:first-child { grid-column: 1 / -1; } .remove-line { justify-self: end; } .invoice-row { grid-template-columns: minmax(0, 1fr) auto; gap: 8px 12px; } .invoice-date { grid-column: 1; } .invoice-total { grid-column: 2; grid-row: 1 / span 2; } .status-chip { justify-self: start; } }
@media (max-width: 720px) { .journal-line-row { grid-template-columns: repeat(2, minmax(0, 1fr)); } .journal-line-row label:first-child { grid-column: 1 / -1; } .account-row { grid-template-columns: 58px minmax(0, 1fr); } .account-type { grid-column: 2; } .period-row { grid-template-columns: minmax(0, 1fr) auto; gap: 8px; } .period-row .text-button { grid-column: 1 / -1; justify-self: end; } .closing-check-list li { grid-template-columns: 1fr; gap: 6px; } }
@media (max-width: 480px) { .panel-heading { align-items: flex-start; flex-direction: column; } .dashboard-period { width: 100%; flex-wrap: wrap; } .dashboard-period label { flex: 1; min-width: 125px; } .dashboard-period input { width: 100%; } .dashboard-period .primary-button { margin-left: auto; } .report-filters { grid-template-columns: 1fr; } .report-filters .primary-button { justify-self: end; } .section-tabs button { flex-shrink: 0; padding: 12px 8px; font-size: 12px; } .fields-grid { grid-template-columns: 1fr; } .wide-field { grid-column: 1; } .totals-preview { justify-content: flex-start; } .ledger-actions { align-items: flex-start; flex-direction: column; } .ledger-actions .primary-button { align-self: flex-end; } .inventory-actions { width: 100%; justify-content: space-between; } .journal-card-actions { flex-wrap: wrap; } }
@media (max-width: 520px) { .bank-reconciliation { padding: 13px; } .bank-reconciliation-heading { flex-direction: column; } .bank-import-form { grid-template-columns: 1fr; } .bank-import-form .form-note, .bank-import-form .primary-button { grid-column: 1; grid-row: auto; } .bank-import-form .primary-button { justify-self: end; } .bank-match-actions { align-items: stretch; flex-direction: column; } .bank-match-actions .primary-button { align-self: flex-end; } }
@media (max-width: 520px) { .payment-source-document { grid-template-columns: 1fr; } .payment-source-document .form-note { grid-column: 1; } }
</style>
