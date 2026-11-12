import type { Locale } from '@/lib/locale'
import type { NavGroup, NavKey } from '@/components/shell/navigation'

export interface WorkspaceMessages {
  nav: Record<NavKey, string>
  groups: Record<NavGroup, string>
  allBusinesses: string
  loading: string
  collapse: string
  expand: string
  sidebarLabel: string
  topbar: {
    switchBusiness: string
    period: string
    open: string
    closed: string
    search: string
    notifications: (count: number) => string
    noNotifications: string
    userMenu: string
    security: string
    signOut: string
    monthEnd: string
    nui: string
  }
  palette: { placeholder: string; modules: string; customers: string; invoices: string; empty: (query: string) => string; label: string }
  months: string[]
  /** Month names as used after "Afatet e …" (Albanian genitive). */
  monthsOf: string[]
  dashboard: {
    title: string
    subtitle: (period: string, asOf: string) => string
    newInvoice: string
    uploadDocument: string
    unit: string
    wholeBusiness: string
    unitHint: string
    kpi: {
      revenue: string; expenses: string; result: string; vat: string; cash: string; bank: string; payroll: string; stock: string
      revenueNote: string; expensesNote: string; resultProfit: string; resultLoss: string; vatPayable: string; vatCredit: string
      cashNote: string; bankNote: string; payrollApproved: (count: number) => string; payrollDraft: (count: number) => string; payrollNone: string
      stockNote: (count: number) => string; hidden: string
    }
    deadlines: { title: (monthOf: string) => string; subtitle: string; legal: string; internal: string; overdue: string; inDays: (days: number) => string; today: string; none: string; done: string }
    checks: { title: string; subtitle: (asOf: string, count: number) => string; critical: string; warning: string; ok: string; info: string; okSummary: (count: number) => string; show: string; hide: string; fix: string; view: string; allClear: string; allClearText: string }
    activity: { title: string; subtitle: string; empty: string; auditTrail: string }
    loadError: string
    retry: string
    weekdays: string[]
  }
  checkLabels: Record<string, string>
  actions: Record<string, string>
}

const sq: WorkspaceMessages = {
  nav: {
    overview: 'Paneli', customers: 'Klientët', suppliers: 'Furnitorët', sales: 'Shitjet', purchases: 'Blerjet', cash: 'Arka', bank: 'Banka',
    stock: 'Stoku', payroll: 'Punëtorët & Pagat', ledger: 'Kontabiliteti', vat: 'TVSH & Tatimet', assets: 'Asetet', documents: 'Dokumentet',
    reports: 'Raportet', tasks: 'Detyrat & Afatet', controls: 'Kontrollet', team: 'Përdoruesit & Siguria', profile: 'Konfigurimet',
  },
  groups: { operations: 'Operacionet', accounting: 'Kontabiliteti', reporting: 'Raportimi', administration: 'Administrimi' },
  allBusinesses: 'Të gjitha bizneset',
  loading: 'Po ngarkohet biznesi…',
  collapse: 'Palos menunë',
  expand: 'Hap menunë',
  sidebarLabel: 'Modulet e biznesit',
  topbar: {
    switchBusiness: 'Ndërro biznesin', period: 'Periudha', open: 'E hapur', closed: 'E mbyllur', search: 'Kërko klientë, fatura, module…',
    notifications: (count) => (count ? `Njoftimet, ${count} të reja` : 'Njoftimet'), noNotifications: 'Asnjë njoftim i ri.',
    userMenu: 'Menyja e përdoruesit', security: 'Siguria e llogarisë', signOut: 'Dil', monthEnd: 'Mbyllja e muajit', nui: 'NUI',
  },
  palette: { placeholder: 'Kërko modul, klient (emër ose NUI) ose faturë…', modules: 'Modulet', customers: 'Klientët dhe furnitorët', invoices: 'Faturat', empty: (q) => `Asgjë për “${q}”.`, label: 'Kërko' },
  monthsOf: ['janarit', 'shkurtit', 'marsit', 'prillit', 'majit', 'qershorit', 'korrikut', 'gushtit', 'shtatorit', 'tetorit', 'nëntorit', 'dhjetorit'],
  months: ['Janar', 'Shkurt', 'Mars', 'Prill', 'Maj', 'Qershor', 'Korrik', 'Gusht', 'Shtator', 'Tetor', 'Nëntor', 'Dhjetor'],
  dashboard: {
    title: 'Paneli',
    subtitle: (period, asOf) => `${period} · të dhënat deri më ${asOf}`,
    newInvoice: 'Faturë e re',
    uploadDocument: 'Ngarko dokument',
    unit: 'Njësia',
    wholeBusiness: 'I gjithë biznesi',
    unitHint: 'Njësia ngushton të hyrat, shpenzimet, rezultatin dhe TVSH-në. Arka, banka dhe borxhet mbeten për gjithë biznesin.',
    kpi: {
      revenue: 'Të hyrat', expenses: 'Shpenzimet', result: 'Rezultati', vat: 'TVSH e faturave', cash: 'Arka', bank: 'Banka', payroll: 'Pagat', stock: 'Vlera e stokut',
      revenueNote: 'regjistrime të postuara', expensesNote: 'regjistrime të postuara', resultProfit: 'fitim i periudhës', resultLoss: 'humbje e periudhës',
      vatPayable: 'për pagesë sipas faturave', vatCredit: 'kredi sipas faturave', cashNote: 'bilanci në libra', bankNote: 'bilanci në libra',
      payrollApproved: (n) => `bruto · ${n} punëtorë · miratuar`, payrollDraft: (n) => `bruto · ${n} punëtorë · pa miratuar`, payrollNone: 'asnjë listë pagash',
      stockNote: (n) => `${n} artikuj · me çmim blerjeje`, hidden: 'Pa qasje',
    },
    deadlines: {
      title: (monthOf) => `Afatet e ${monthOf}`, subtitle: 'Detyrimet ndaj ATK dhe detyrat e zyrës', legal: 'Afat ligjor', internal: 'Detyrë e brendshme',
      overdue: 'Me vonesë', inDays: (d) => (d === 1 ? 'nesër' : `pas ${d} ditësh`), today: 'sot', none: 'Asnjë afat i hapur këtë muaj.', done: 'Kryer',
    },
    checks: {
      title: 'Kontrollet automatike', subtitle: (asOf, n) => `Rifreskuar më ${asOf} · ${n} kontrolle`, critical: 'Kritike', warning: 'Paralajmërime', ok: 'Në rregull', info: 'Informacion',
      okSummary: (n) => `${n} kontrolle në rregull`, show: 'Shfaq', hide: 'Fshih', fix: 'Rregullo', view: 'Shiko', allClear: 'Asnjë problem tani', allClearText: 'Të gjitha kontrollet kaluan.',
    },
    activity: { title: 'Aktiviteti i fundit', subtitle: 'Kush ndryshoi çfarë', empty: 'Ende nuk ka aktivitet.', auditTrail: 'Gjurmët e auditimit' },
    loadError: 'Paneli nuk u ngarkua.',
    retry: 'Provo sërish',
    weekdays: ['D', 'H', 'M', 'M', 'E', 'P', 'S'],
  },
  checkLabels: {
    vat_status: 'Statusi i TVSH', posting_accounts: 'Llogaritë e regjistrimit', negative_cash: 'Arka negative', duplicate_purchases: 'Fatura blerjeje të dyfishta',
    missing_nui: 'Pala pa NUI', duplicate_nui: 'NUI të përsëritur', overdue_receivables: 'Fatura shitjeje me vonesë', overdue_payables: 'Fatura furnitorësh me vonesë',
    stale_drafts: 'Drafte të vjetra', bank_reconciliation: 'Rreshta banke pa rakorduar', bank_differences: 'Banka kundrejt librave', low_stock: 'Stok nën minimum',
    journal_source: 'Regjistrime pa dokument burimor', vat_threshold: 'Kufiri i regjistrimit në TVSH', payroll: 'Pagat e muajit të kaluar', deadlines: 'Afatet',
    document_requests: 'Kërkesat për dokumente', unusual_transactions: 'Transaksione të pazakonta',
  },
  actions: {
    'invoice.issued': 'lëshoi faturën', 'invoice.draft_created': 'krijoi draftin e faturës', 'invoice.cancelled': 'anuloi faturën', 'invoice.credited': 'krijoi notë krediti',
    'payment.recorded': 'regjistroi pagesën', 'journal_entry.posted': 'postoi regjistrimin', 'journal_entry.draft_created': 'krijoi regjistrim draft',
    'bank_statement.imported': 'importoi pasqyrën e bankës', 'bank_transaction.booked': 'regjistroi rresht banke', 'bank_transaction.reconciled': 'rakordoi rresht banke',
    'document.uploaded': 'ngarkoi dokument', 'document.reviewed': 'shqyrtoi dokument', 'accounting_period.closed': 'mbylli periudhën', 'accounting_period.created': 'krijoi periudhë',
    'payroll_run.approved': 'miratoi listën e pagave', 'payroll_run.draft_created': 'llogariti listën e pagave', 'counterparty.created': 'shtoi palë', 'counterparty.updated': 'ndryshoi palën',
    'employee.created': 'shtoi punëtor', 'employee.updated': 'ndryshoi punëtorin', 'business.updated': 'ndryshoi të dhënat e biznesit', 'business.member_invited': 'ftoi përdorues',
    'atk.vat_book_exported': 'shkarkoi librin e TVSH', 'atk.payroll_list_exported': 'shkarkoi listën WM', 'stock_movement.recorded': 'regjistroi lëvizje stoku',
    'depreciation_run.approved': 'miratoi amortizimin', 'fixed_asset.created': 'shtoi aset',
  },
}

const en: WorkspaceMessages = {
  nav: {
    overview: 'Dashboard', customers: 'Customers', suppliers: 'Suppliers', sales: 'Sales', purchases: 'Purchases', cash: 'Cash', bank: 'Bank',
    stock: 'Stock', payroll: 'Employees & Payroll', ledger: 'Ledger', vat: 'VAT & Taxes', assets: 'Fixed assets', documents: 'Documents',
    reports: 'Reports', tasks: 'Tasks & Deadlines', controls: 'Controls', team: 'Users & Security', profile: 'Settings',
  },
  groups: { operations: 'Operations', accounting: 'Accounting', reporting: 'Reporting', administration: 'Administration' },
  allBusinesses: 'All businesses',
  loading: 'Loading the business…',
  collapse: 'Collapse menu',
  expand: 'Expand menu',
  sidebarLabel: 'Business modules',
  topbar: {
    switchBusiness: 'Switch business', period: 'Period', open: 'Open', closed: 'Closed', search: 'Search customers, invoices, modules…',
    notifications: (count) => (count ? `Notifications, ${count} new` : 'Notifications'), noNotifications: 'No new notifications.',
    userMenu: 'User menu', security: 'Account security', signOut: 'Sign out', monthEnd: 'Month end close', nui: 'NUI',
  },
  palette: { placeholder: 'Search a module, customer (name or NUI) or invoice…', modules: 'Modules', customers: 'Customers and suppliers', invoices: 'Invoices', empty: (q) => `Nothing for “${q}”.`, label: 'Search' },
  monthsOf: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  dashboard: {
    title: 'Dashboard',
    subtitle: (period, asOf) => `${period} · data up to ${asOf}`,
    newInvoice: 'New invoice',
    uploadDocument: 'Upload document',
    unit: 'Unit',
    wholeBusiness: 'Whole business',
    unitHint: 'A unit narrows revenue, expenses, result and VAT. Cash, bank and debts stay for the whole business.',
    kpi: {
      revenue: 'Revenue', expenses: 'Expenses', result: 'Result', vat: 'Invoice VAT', cash: 'Cash', bank: 'Bank', payroll: 'Payroll', stock: 'Stock value',
      revenueNote: 'posted entries', expensesNote: 'posted entries', resultProfit: 'profit for the period', resultLoss: 'loss for the period',
      vatPayable: 'payable per invoices', vatCredit: 'credit per invoices', cashNote: 'balance per books', bankNote: 'balance per books',
      payrollApproved: (n) => `gross · ${n} employees · approved`, payrollDraft: (n) => `gross · ${n} employees · not approved`, payrollNone: 'no payroll run',
      stockNote: (n) => `${n} items · at purchase price`, hidden: 'No access',
    },
    deadlines: {
      title: (monthOf) => `${monthOf} deadlines`, subtitle: 'ATK obligations and office tasks', legal: 'Legal deadline', internal: 'Internal task',
      overdue: 'Overdue', inDays: (d) => (d === 1 ? 'tomorrow' : `in ${d} days`), today: 'today', none: 'No open deadlines this month.', done: 'Done',
    },
    checks: {
      title: 'Automatic checks', subtitle: (asOf, n) => `Refreshed ${asOf} · ${n} checks`, critical: 'Critical', warning: 'Warnings', ok: 'OK', info: 'Info',
      okSummary: (n) => `${n} checks OK`, show: 'Show', hide: 'Hide', fix: 'Fix', view: 'View', allClear: 'No problems right now', allClearText: 'Every check passed.',
    },
    activity: { title: 'Recent activity', subtitle: 'Who changed what', empty: 'No activity yet.', auditTrail: 'Audit trail' },
    loadError: 'The dashboard did not load.',
    retry: 'Try again',
    weekdays: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
  },
  checkLabels: {
    vat_status: 'VAT status', posting_accounts: 'Posting accounts', negative_cash: 'Negative cash', duplicate_purchases: 'Duplicate purchase bills',
    missing_nui: 'Parties without NUI', duplicate_nui: 'Repeated NUI', overdue_receivables: 'Overdue customer invoices', overdue_payables: 'Overdue supplier bills',
    stale_drafts: 'Old drafts', bank_reconciliation: 'Unreconciled bank lines', bank_differences: 'Bank vs books', low_stock: 'Stock below minimum',
    journal_source: 'Entries without a source document', vat_threshold: 'VAT registration threshold', payroll: 'Last month payroll', deadlines: 'Deadlines',
    document_requests: 'Document requests', unusual_transactions: 'Unusual transactions',
  },
  actions: {
    'invoice.issued': 'issued invoice', 'invoice.draft_created': 'created an invoice draft', 'invoice.cancelled': 'cancelled invoice', 'invoice.credited': 'created a credit note',
    'payment.recorded': 'recorded a payment', 'journal_entry.posted': 'posted an entry', 'journal_entry.draft_created': 'created a draft entry',
    'bank_statement.imported': 'imported a bank statement', 'bank_transaction.booked': 'booked a bank line', 'bank_transaction.reconciled': 'reconciled a bank line',
    'document.uploaded': 'uploaded a document', 'document.reviewed': 'reviewed a document', 'accounting_period.closed': 'closed the period', 'accounting_period.created': 'created a period',
    'payroll_run.approved': 'approved payroll', 'payroll_run.draft_created': 'calculated payroll', 'counterparty.created': 'added a party', 'counterparty.updated': 'updated a party',
    'employee.created': 'added an employee', 'employee.updated': 'updated an employee', 'business.updated': 'updated business details', 'business.member_invited': 'invited a user',
    'atk.vat_book_exported': 'downloaded a VAT book', 'atk.payroll_list_exported': 'downloaded the WM list', 'stock_movement.recorded': 'recorded a stock movement',
    'depreciation_run.approved': 'approved depreciation', 'fixed_asset.created': 'added an asset',
  },
}

export const workspaceMessages: Record<Locale, WorkspaceMessages> = { sq, en }
