import { locale } from '@/lib/locale'
import { sq } from '@/locales/sq'

/**
 * Translate interface text written in English into the current language.
 * English is the key; text without an Albanian entry is shown in English.
 */
export function tr(text: string): string {
  return locale.value === 'sq' ? (sq[text] ?? text) : text
}

/** Translate text with values put in at {0}, {1}, … */
export function trf(text: string, values: Array<string | number | null | undefined>): string {
  return tr(text).replace(/\{(\d+)\}/g, (_, index: string) => String(values[Number(index)] ?? ''))
}

/** Albanian for the fixed values the API returns (statuses, types, roles). */
const values: Record<string, string> = {
  draft: 'draft', issued: 'e lëshuar', partially_paid: 'pjesërisht e paguar', paid: 'e paguar', cancelled: 'anuluar', posted: 'postuar',
  open: 'e hapur', closed: 'e mbyllur', active: 'aktiv', inactive: 'joaktiv', invited: 'i ftuar', pending: 'në pritje', reviewed: 'rishikuar',
  approved: 'e miratuar', rejected: 'refuzuar', submitted: 'dorëzuar', accepted: 'pranuar', done: 'kryer', completed: 'kryer', disposed: 'çregjistruar',
  customer: 'klient', supplier: 'furnitor', both: 'të dy', owner: 'pronar', accountant: 'kontabilist', assistant_accountant: 'asistent kontabël', auditor: 'auditor',
  asset: 'aktiv', liability: 'detyrim', equity: 'kapital', revenue: 'të hyra', expense: 'shpenzim', debit: 'debi', credit: 'kredi',
  invoice: 'faturë', receipt: 'kupon', contract: 'kontratë', bank_statement: 'ekstrakt bankar', payroll: 'paga', tax_filing: 'deklarim tatimor',
  certificate: 'certifikatë', authorization: 'autorizim', lease: 'qira', other: 'tjetër',
  opening: 'gjendje fillestare', adjustment: 'korrigjim', purchase: 'blerje', sale: 'shitje', transfer_in: 'transfer hyrës', transfer_out: 'transfer dalës',
  stock_count: 'numërim stoku', invoice_cancellation: 'anulim fature', credit_note: 'notë krediti', cancellation: 'anulim',
  taxable: 'e tatueshme', exempt: 'e liruar', non_vat: 'pa TVSH', reverse_charge: 'ngarkesë e kundërt', zero_rated: 'normë zero', export: 'eksport',
  current: 'pa skaduar', days_1_30: '1–30 ditë', days_31_60: '31–60 ditë', days_61_90: '61–90 ditë', days_over_90: 'mbi 90 ditë',
  passed: 'në rregull', failed: 'me problem', warning: 'paralajmërim', blocked: 'e bllokuar', acquired: 'blerë', transferred: 'transferuar',
  straight_line: 'metoda lineare', declining_balance: 'saldo zbritëse', indefinite: 'pa afat', fixed_term: 'me afat', part_time: 'orar i pjesshëm', seasonal: 'sezonal',
}

/** Show a fixed API value (a status, type or role) in the current language. */
export function trValue(value: string | null | undefined): string {
  if (!value) return ''
  return locale.value === 'sq' ? (values[value] ?? value.replaceAll('_', ' ')) : value.replaceAll('_', ' ')
}
