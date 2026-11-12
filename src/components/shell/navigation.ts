import type { IconName } from '@/components/ui/icons'

/** Modules in the business sidebar. Each maps onto an existing workspace section in BusinessWorkspaceView. */
export type NavKey =
  | 'overview'
  | 'customers'
  | 'suppliers'
  | 'sales'
  | 'purchases'
  | 'cash'
  | 'bank'
  | 'stock'
  | 'payroll'
  | 'ledger'
  | 'vat'
  | 'assets'
  | 'documents'
  | 'reports'
  | 'tasks'
  | 'controls'
  | 'assistant'
  | 'team'
  | 'profile'

export type NavGroup = 'operations' | 'accounting' | 'reporting' | 'administration'

export interface NavItem {
  key: NavKey
  icon: IconName
}

export const navigation: { group: NavGroup | null; items: NavItem[] }[] = [
  { group: null, items: [{ key: 'overview', icon: 'house' }] },
  {
    group: 'operations',
    items: [
      { key: 'customers', icon: 'users-three' },
      { key: 'suppliers', icon: 'truck' },
      { key: 'sales', icon: 'receipt' },
      { key: 'purchases', icon: 'shopping-cart' },
      { key: 'cash', icon: 'wallet' },
      { key: 'bank', icon: 'bank' },
      { key: 'stock', icon: 'package' },
    ],
  },
  {
    group: 'accounting',
    items: [
      { key: 'payroll', icon: 'identification-card' },
      { key: 'ledger', icon: 'book-open' },
      { key: 'vat', icon: 'percent' },
      { key: 'assets', icon: 'storefront' },
    ],
  },
  {
    group: 'reporting',
    items: [
      { key: 'documents', icon: 'folder-simple' },
      { key: 'reports', icon: 'chart-bar' },
      { key: 'tasks', icon: 'calendar-check' },
      { key: 'controls', icon: 'shield-check' },
      { key: 'assistant', icon: 'sparkle' },
    ],
  },
  {
    group: 'administration',
    items: [
      { key: 'team', icon: 'user-gear' },
      { key: 'profile', icon: 'gear-six' },
    ],
  },
]

/** Where each automatic check (by its backend key) is fixed. */
export const checkTargets: Record<string, NavKey> = {
  vat_status: 'profile',
  posting_accounts: 'ledger',
  negative_cash: 'cash',
  duplicate_purchases: 'purchases',
  missing_nui: 'customers',
  duplicate_nui: 'customers',
  counterparty_nui: 'customers',
  identifier_format: 'customers',
  overdue_receivables: 'sales',
  overdue_payables: 'purchases',
  stale_drafts: 'sales',
  bank_reconciliation: 'bank',
  bank_differences: 'bank',
  low_stock: 'stock',
  journal_source: 'ledger',
  vat_threshold: 'vat',
  payroll: 'payroll',
  deadlines: 'tasks',
  document_requests: 'documents',
  unusual_transactions: 'ledger',
}
