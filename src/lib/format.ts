export function formatMoney(value: string | number | null | undefined, currency = 'EUR'): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(Number(value ?? 0))
}

const ksNumber = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** Kosovo display format, 1.234,56, with a true minus sign (−) for negatives. */
export function formatAmountKs(value: number): string {
  return ksNumber.format(value).replace(/^-/, '−')
}

/** Money in the Kosovo display format: 1.234,56 €. */
export function formatEuroKs(value: number): string {
  return `${formatAmountKs(value)} €`
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(new Date(`${value.slice(0, 10)}T00:00:00`))
}

export function todayIsoDate(): string {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10)
}

export function nullableText(value: string): string | null {
  return value.trim() === '' ? null : value.trim()
}

export function getApiError(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = error.response as { data?: { message?: string; errors?: Record<string, string[]> } }
    return Object.values(response.data?.errors ?? {})[0]?.[0] ?? response.data?.message ?? fallback
  }

  return fallback
}

function csvCell(value: string, protectSpreadsheetFormula: boolean): string {
  const safeValue = protectSpreadsheetFormula && /^[\s]*[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return `"${safeValue.replaceAll('"', '""')}"`
}

/** Download rows as a UTF-8 CSV file; the first `textColumns` columns are protected against spreadsheet formulas. */
export function downloadCsv(rows: string[][], filename: string, textColumns = 2): void {
  const csv = rows.map((row) => row.map((value, index) => csvCell(value, index < textColumns)).join(',')).join('\r\n')
  const downloadUrl = URL.createObjectURL(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = downloadUrl
  link.download = filename
  link.click()
  URL.revokeObjectURL(downloadUrl)
}
