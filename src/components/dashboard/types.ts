/** Shape of GET /api/v1/businesses/{id}/dashboard. Payroll fields are null for members who may not see payroll. */
export interface DashboardSummary {
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
  payroll_gross: string | null
  payroll_employees: number | null
  payroll_status: 'draft' | 'approved' | null
  stock_value: string
  stock_items: number
}

export interface ControlCheck {
  key: string
  label: string
  severity: 'critical' | 'warning' | 'ok' | 'info'
  detail: string
  items: Array<Record<string, unknown>>
}

/** Shape of GET /api/v1/businesses/{id}/controls. */
export interface ControlReport {
  as_of: string
  summary: Record<ControlCheck['severity'], number>
  checks: ControlCheck[]
}
