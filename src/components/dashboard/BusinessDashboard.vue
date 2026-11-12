<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import api from '@/lib/api'
import KpiTile from './KpiTile.vue'
import KtIcon from '@/components/ui/KtIcon.vue'
import type { IconName } from '@/components/ui/icons'
import { checkTargets, type NavKey } from '@/components/shell/navigation'
import { formatEuroKs } from '@/lib/format'
import { useMessages } from '@/lib/locale'
import { workspaceMessages } from '@/locales/workspace'
import type { ControlCheck, ControlReport, DashboardSummary } from './types'

interface DashboardTask {
  id: number
  kind: 'task' | 'tax_filing'
  title: string
  period_label: string | null
  due_on: string
  status: 'open' | 'done'
  is_overdue: boolean
}

interface ActivityEntry {
  id: number
  action: string
  user: { id: number; name: string } | null
  created_at: string
}

const props = defineProps<{
  businessId: number
  summary: DashboardSummary | null
  controls: ControlReport | null
  loading: boolean
  error: string
  period: { year: number; month: number }
  units: Array<{ id: number; name: string }>
  unitId: string
  canViewHistory: boolean
  canEdit: boolean
}>()
const emit = defineEmits<{ navigate: [key: NavKey]; retry: []; newInvoice: []; upload: []; selectUnit: [unitId: string] }>()
const m = useMessages(workspaceMessages)

const tasks = ref<DashboardTask[]>([])
const activity = ref<ActivityEntry[]>([])
const activityLoading = ref(false)
const showPassed = ref(false)

const pad = (value: number) => String(value).padStart(2, '0')
const monthStart = computed(() => `${props.period.year}-${pad(props.period.month)}-01`)
const daysInMonth = computed(() => new Date(props.period.year, props.period.month, 0).getDate())
const monthEnd = computed(() => `${props.period.year}-${pad(props.period.month)}-${pad(daysInMonth.value)}`)
const todayIso = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10)

function ksDate(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split('-')
  return `${day}.${month}.${year}`
}

const periodLabel = computed(() => `${m.value.months[props.period.month - 1]} ${props.period.year}`)
const asOf = computed(() => ksDate(props.summary?.to ?? todayIso))

async function loadTasks(): Promise<void> {
  try {
    const response = await api.get<{ data: DashboardTask[] }>(`/api/v1/businesses/${props.businessId}/tasks`, { params: { from: monthStart.value, to: monthEnd.value } })
    tasks.value = response.data.data
  } catch {
    tasks.value = []
  }
}

async function loadActivity(): Promise<void> {
  if (!props.canViewHistory) return
  activityLoading.value = true
  try {
    const response = await api.get<{ data: ActivityEntry[] }>(`/api/v1/businesses/${props.businessId}/audit-logs`)
    activity.value = response.data.data.filter((entry) => !entry.action.startsWith('auth.')).slice(0, 6)
  } catch {
    activity.value = []
  } finally {
    activityLoading.value = false
  }
}

watch(() => [props.businessId, props.period.year, props.period.month], loadTasks, { immediate: true })
watch(() => [props.businessId, props.canViewHistory], loadActivity, { immediate: true })

/* ---------- KPIs ---------- */
interface Tile { key: string; label: string; value: string; icon: IconName; note: string; tone: 'neutral' | 'success' | 'warning' | 'error'; target: NavKey; disabled?: boolean }

const tiles = computed<Tile[]>(() => {
  const s = props.summary
  if (!s) return []
  const k = m.value.dashboard.kpi
  const result = Number(s.result)
  const netVat = Number(s.net_vat)
  const cash = Number(s.cash_balance)
  const payrollHidden = s.payroll_gross === null
  return [
    { key: 'revenue', label: k.revenue, value: formatEuroKs(Number(s.revenue)), icon: 'trend-up', note: k.revenueNote, tone: 'neutral', target: 'reports' },
    { key: 'expenses', label: k.expenses, value: formatEuroKs(Number(s.expenses)), icon: 'receipt', note: k.expensesNote, tone: 'neutral', target: 'reports' },
    { key: 'result', label: k.result, value: formatEuroKs(result), icon: 'chart-bar', note: result < 0 ? k.resultLoss : k.resultProfit, tone: result < 0 ? 'error' : 'success', target: 'reports' },
    { key: 'vat', label: k.vat, value: formatEuroKs(Math.abs(netVat)), icon: 'percent', note: netVat >= 0 ? k.vatPayable : k.vatCredit, tone: netVat > 0 ? 'warning' : 'neutral', target: 'vat' },
    { key: 'cash', label: k.cash, value: formatEuroKs(cash), icon: 'wallet', note: k.cashNote, tone: cash < 0 ? 'error' : 'neutral', target: 'cash' },
    { key: 'bank', label: k.bank, value: formatEuroKs(Number(s.bank_balance)), icon: 'bank', note: k.bankNote, tone: Number(s.bank_balance) < 0 ? 'error' : 'neutral', target: 'bank' },
    {
      key: 'payroll', label: k.payroll, icon: 'identification-card', target: 'payroll', disabled: payrollHidden,
      value: payrollHidden ? '—' : formatEuroKs(Number(s.payroll_gross)),
      note: payrollHidden ? k.hidden : s.payroll_status === null ? k.payrollNone : s.payroll_status === 'draft' ? k.payrollDraft(s.payroll_employees ?? 0) : k.payrollApproved(s.payroll_employees ?? 0),
      tone: s.payroll_status === 'draft' ? 'warning' : 'neutral',
    },
    { key: 'stock', label: k.stock, value: formatEuroKs(Number(s.stock_value)), icon: 'package', note: k.stockNote(s.stock_items), tone: 'neutral', target: 'stock' },
  ]
})

/* ---------- Deadlines ---------- */
const days = computed(() => {
  const byDay = new Map<number, DashboardTask[]>()
  for (const task of tasks.value) {
    const day = Number(task.due_on.slice(8, 10))
    byDay.set(day, [...(byDay.get(day) ?? []), task])
  }
  return Array.from({ length: daysInMonth.value }, (_, index) => {
    const day = index + 1
    const iso = `${props.period.year}-${pad(props.period.month)}-${pad(day)}`
    const weekday = new Date(props.period.year, props.period.month - 1, day).getDay()
    const dayTasks = (byDay.get(day) ?? []).filter((task) => task.status === 'open')
    const kind = dayTasks.some((task) => task.kind === 'tax_filing') ? 'legal' : dayTasks.length ? 'internal' : null
    return { day, iso, weekday, weekend: weekday === 0 || weekday === 6, today: iso === todayIso, kind, titles: dayTasks.map((task) => task.title).join(' · ') }
  })
})

function daysUntil(iso: string): number {
  return Math.round((new Date(`${iso}T00:00:00`).getTime() - new Date(`${todayIso}T00:00:00`).getTime()) / 86_400_000)
}

const upcoming = computed(() =>
  tasks.value
    .filter((task) => task.status === 'open')
    .sort((left, right) => left.due_on.localeCompare(right.due_on))
    .slice(0, 3)
    .map((task) => {
      const until = daysUntil(task.due_on)
      const d = m.value.dashboard.deadlines
      const when = task.is_overdue ? d.overdue : until === 0 ? d.today : until > 0 ? d.inDays(until) : d.overdue
      return { ...task, when, legal: task.kind === 'tax_filing' }
    }),
)

/* ---------- Checks ---------- */
const order: Record<ControlCheck['severity'], number> = { critical: 0, warning: 1, info: 2, ok: 3 }
const critical = computed(() => props.controls?.checks.filter((check) => check.severity === 'critical') ?? [])
const warnings = computed(() => props.controls?.checks.filter((check) => check.severity === 'warning') ?? [])
const passed = computed(() => [...(props.controls?.checks.filter((check) => check.severity === 'ok' || check.severity === 'info') ?? [])].sort((a, b) => order[a.severity] - order[b.severity]))
const severityIcon: Record<ControlCheck['severity'], IconName> = { critical: 'warning-octagon', warning: 'warning', ok: 'check-circle', info: 'info' }

function checkLabel(check: ControlCheck): string {
  return m.value.checkLabels[check.key] ?? check.label
}

function openCheck(check: ControlCheck): void {
  emit('navigate', checkTargets[check.key] ?? 'controls')
}

/* ---------- Activity ---------- */
function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]?.toUpperCase() ?? '').join('')
}

function actionText(action: string): string {
  return m.value.actions[action] ?? action.replace(/[._]/g, ' ')
}

function activityTime(iso: string): string {
  const date = new Date(iso)
  const day = new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10)
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`
  return day === todayIso ? time : `${ksDate(day).slice(0, 5)} ${time}`
}
</script>

<template>
  <div class="dashboard">
    <header class="page-header">
      <div class="title-block">
        <h1 class="kt-heading-5">{{ m.dashboard.title }}</h1>
        <p class="kt-body-6 kt-second">{{ m.dashboard.subtitle(periodLabel, asOf) }}</p>
      </div>
      <label v-if="units.length" class="unit-filter kt-caption-1">
        <span>{{ m.dashboard.unit }}</span>
        <select class="kt-input" :value="unitId" :title="m.dashboard.unitHint" @change="emit('selectUnit', ($event.target as HTMLSelectElement).value)">
          <option value="">{{ m.dashboard.wholeBusiness }}</option>
          <option v-for="unit in units" :key="unit.id" :value="String(unit.id)">{{ unit.name }}</option>
        </select>
      </label>
      <div v-if="canEdit" class="actions">
        <button type="button" class="kt-btn kt-btn--secondary" @click="emit('upload')"><KtIcon name="upload-simple" :size="16" />{{ m.dashboard.uploadDocument }}</button>
        <button type="button" class="kt-btn kt-btn--primary" @click="emit('newInvoice')"><KtIcon name="plus" :size="16" />{{ m.dashboard.newInvoice }}</button>
      </div>
    </header>

    <div v-if="error" class="kt-banner kt-banner--error" role="alert">
      <KtIcon name="warning-octagon" />
      <div class="grow"><p class="kt-body-4">{{ m.dashboard.loadError }}</p><p class="kt-body-6">{{ error }}</p></div>
      <button type="button" class="kt-btn kt-btn--secondary kt-btn--sm" @click="emit('retry')"><KtIcon name="arrow-counter-clockwise" :size="16" />{{ m.dashboard.retry }}</button>
    </div>

    <section class="kpis" aria-label="KPI">
      <template v-if="loading && !summary">
        <div v-for="index in 8" :key="index" class="kpi-skeleton" aria-busy="true"><span class="sk" style="width: 40%" /><span class="sk tall" style="width: 70%" /><span class="sk" style="width: 55%" /></div>
      </template>
      <KpiTile v-for="tile in tiles" :key="tile.key" :label="tile.label" :value="tile.value" :icon="tile.icon" :note="tile.note" :tone="tile.tone" :disabled="tile.disabled" @open="emit('navigate', tile.target)" />
    </section>

    <section class="card" aria-labelledby="deadlines-title">
      <div class="card-head">
        <div class="grow">
          <h2 id="deadlines-title" class="kt-title-3">{{ m.dashboard.deadlines.title(m.monthsOf[period.month - 1]!) }}</h2>
          <p class="kt-caption-5 kt-muted">{{ m.dashboard.deadlines.subtitle }}</p>
        </div>
        <span class="kt-chip kt-chip--warning"><KtIcon name="warning" :size="14" />{{ m.dashboard.deadlines.legal }}</span>
        <span class="kt-chip kt-chip--info"><KtIcon name="calendar-check" :size="14" />{{ m.dashboard.deadlines.internal }}</span>
      </div>
      <ol class="calendar" :style="{ gridTemplateColumns: `repeat(${daysInMonth}, minmax(28px, 1fr))` }">
        <li v-for="day in days" :key="day.iso" class="day" :class="[day.kind, { weekend: day.weekend, today: day.today }]" :title="day.titles || undefined">
          <span class="weekday">{{ m.dashboard.weekdays[day.weekday] }}</span>
          <span class="kt-num">{{ day.day }}</span>
          <KtIcon v-if="day.kind === 'legal'" name="warning" :size="12" />
          <KtIcon v-else-if="day.kind === 'internal'" name="calendar-check" :size="12" />
          <span v-else class="marker-space" />
        </li>
      </ol>
      <div class="deadline-list">
        <button v-for="task in upcoming" :key="task.id" type="button" class="deadline" @click="emit('navigate', 'tasks')">
          <span class="date kt-body-4 kt-num" :class="{ legal: task.legal, overdue: task.is_overdue }">{{ ksDate(task.due_on).slice(0, 5) }}</span>
          <span class="grow deadline-text">
            <span class="kt-body-5 block">{{ task.title }}</span>
            <span class="meta">
              <span class="kt-chip" :class="task.is_overdue ? 'kt-chip--critical' : task.legal ? 'kt-chip--warning' : 'kt-chip--info'">
                <KtIcon :name="task.is_overdue ? 'warning-octagon' : task.legal ? 'warning' : 'calendar-check'" :size="14" />{{ task.is_overdue ? m.dashboard.deadlines.overdue : task.legal ? m.dashboard.deadlines.legal : m.dashboard.deadlines.internal }}
              </span>
              <span class="kt-caption-5 kt-muted">{{ task.period_label ? `${task.period_label} · ` : '' }}{{ task.when }}</span>
            </span>
          </span>
        </button>
        <p v-if="!upcoming.length" class="kt-body-6 kt-muted none">{{ m.dashboard.deadlines.none }}</p>
      </div>
    </section>

    <div class="lower">
      <section class="card" aria-labelledby="checks-title">
        <div class="card-head">
          <div class="grow">
            <h2 id="checks-title" class="kt-title-3">{{ m.dashboard.checks.title }}</h2>
            <p v-if="controls" class="kt-caption-5 kt-muted">{{ m.dashboard.checks.subtitle(ksDate(controls.as_of), controls.checks.length) }}</p>
          </div>
          <template v-if="controls">
            <span v-if="controls.summary.critical" class="kt-chip kt-chip--critical"><KtIcon name="warning-octagon" :size="14" />{{ controls.summary.critical }} {{ m.dashboard.checks.critical.toLowerCase() }}</span>
            <span v-if="controls.summary.warning" class="kt-chip kt-chip--warning"><KtIcon name="warning" :size="14" />{{ controls.summary.warning }} {{ m.dashboard.checks.warning.toLowerCase() }}</span>
            <span class="kt-chip kt-chip--ok"><KtIcon name="check-circle" :size="14" />{{ passed.length }} {{ m.dashboard.checks.ok.toLowerCase() }}</span>
          </template>
        </div>

        <div v-if="loading && !controls" class="skeleton-rows"><span v-for="index in 4" :key="index" class="sk row" /></div>
        <template v-else-if="controls">
          <template v-for="group in [{ name: m.dashboard.checks.critical, items: critical }, { name: m.dashboard.checks.warning, items: warnings }]" :key="group.name">
            <template v-if="group.items.length">
              <p class="group-head kt-caption-3">{{ group.name }} · {{ group.items.length }}</p>
              <div v-for="check in group.items" :key="check.key" class="check-row">
                <span class="sev" :class="check.severity"><KtIcon :name="severityIcon[check.severity]" /></span>
                <div class="grow"><p class="kt-body-5">{{ checkLabel(check) }}</p><p class="kt-caption-5 kt-muted">{{ check.detail }}</p></div>
                <button type="button" class="link" @click="openCheck(check)">{{ m.dashboard.checks.fix }}<KtIcon name="arrow-right" :size="16" /></button>
              </div>
            </template>
          </template>
          <div v-if="!critical.length && !warnings.length" class="check-row">
            <span class="sev ok"><KtIcon name="check-circle" /></span>
            <div class="grow"><p class="kt-body-5">{{ m.dashboard.checks.allClear }}</p><p class="kt-caption-5 kt-muted">{{ m.dashboard.checks.allClearText }}</p></div>
          </div>
          <div class="check-row">
            <span class="sev ok"><KtIcon name="check-circle" /></span>
            <div class="grow"><p class="kt-body-5">{{ m.dashboard.checks.okSummary(passed.length) }}</p><p class="kt-caption-5 kt-muted">{{ passed.slice(0, 4).map(checkLabel).join(' · ') }}<template v-if="passed.length > 4">…</template></p></div>
            <button type="button" class="link" :aria-expanded="showPassed" aria-controls="passed-checks" @click="showPassed = !showPassed">{{ showPassed ? m.dashboard.checks.hide : m.dashboard.checks.show }}</button>
          </div>
          <div v-show="showPassed" id="passed-checks">
            <div v-for="check in passed" :key="check.key" class="check-row nested">
              <span class="sev" :class="check.severity"><KtIcon :name="severityIcon[check.severity]" :size="16" /></span>
              <div class="grow"><p class="kt-body-6">{{ checkLabel(check) }}</p><p class="kt-caption-5 kt-muted">{{ check.detail }}</p></div>
              <button type="button" class="link" @click="openCheck(check)">{{ m.dashboard.checks.view }}</button>
            </div>
          </div>
        </template>
      </section>

      <section v-if="canViewHistory" class="card" aria-labelledby="activity-title">
        <div class="card-head">
          <div class="grow">
            <h2 id="activity-title" class="kt-title-3">{{ m.dashboard.activity.title }}</h2>
            <p class="kt-caption-5 kt-muted">{{ m.dashboard.activity.subtitle }}</p>
          </div>
        </div>
        <div v-if="activityLoading && !activity.length" class="skeleton-rows"><span v-for="index in 3" :key="index" class="sk row" /></div>
        <p v-else-if="!activity.length" class="kt-body-6 kt-muted none">{{ m.dashboard.activity.empty }}</p>
        <div v-for="entry in activity" :key="entry.id" class="check-row">
          <span class="avatar">{{ initials(entry.user?.name ?? '?') }}</span>
          <p class="grow kt-body-5">{{ entry.user?.name ?? 'KontoTrack' }} <span class="kt-second action">{{ actionText(entry.action) }}</span></p>
          <span class="kt-caption-5 kt-muted nowrap">{{ activityTime(entry.created_at) }}</span>
        </div>
        <div class="card-foot"><button type="button" class="link" @click="emit('navigate', 'team')">{{ m.dashboard.activity.auditTrail }}<KtIcon name="arrow-right" :size="16" /></button></div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.dashboard { display: flex; flex-direction: column; gap: var(--kt-s-300); color: var(--kt-text); font-family: var(--kt-font); }
.dashboard p, .dashboard h1, .dashboard h2 { margin: 0; }
.dashboard h1, .dashboard h2 { color: var(--kt-heading); }
.page-header { display: flex; flex-wrap: wrap; align-items: flex-end; gap: var(--kt-s-200); }
.title-block { display: flex; flex: 1; min-width: 240px; flex-direction: column; gap: var(--kt-s-25); }
.actions { display: flex; flex-wrap: wrap; gap: var(--kt-s-75); }
.unit-filter { display: flex; align-items: center; gap: var(--kt-s-75); color: var(--kt-text-2); }
.unit-filter .kt-input { width: auto; min-width: 160px; }
.grow { flex: 1; min-width: 0; }
.block { display: block; }
.nowrap { white-space: nowrap; }

.kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--kt-s-200); }
.kpi-skeleton { display: flex; flex-direction: column; gap: var(--kt-s-100); padding: var(--kt-s-200); border: 1px solid var(--kt-border); border-radius: var(--kt-r-12); background: var(--kt-surface); }
.sk { display: block; height: 12px; border-radius: var(--kt-r-4); background: var(--kt-tertiary); }
.sk.tall { height: 28px; }
.sk.row { height: 36px; }
.skeleton-rows { display: flex; flex-direction: column; gap: var(--kt-s-100); padding: var(--kt-s-300); }

.card { min-width: 0; overflow: hidden; border: 1px solid var(--kt-border); border-radius: var(--kt-r-12); background: var(--kt-surface); }
.card-head { display: flex; flex-wrap: wrap; align-items: center; gap: var(--kt-s-75); padding: var(--kt-s-200) var(--kt-s-300); border-bottom: 1px solid var(--kt-divider); }
.card-foot { padding: var(--kt-s-100) var(--kt-s-200); }

.calendar { display: grid; gap: var(--kt-s-50); margin: 0; padding: var(--kt-s-200) var(--kt-s-300) var(--kt-s-100); overflow-x: auto; list-style: none; }
.day { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: var(--kt-s-75) 0; border-radius: var(--kt-r-8); font: 500 12px/16px var(--kt-font); }
.weekday { color: var(--kt-text-3); font-weight: 400; }
.day.weekend { color: var(--kt-text-3); }
.day.legal { color: var(--kt-t-warning); background: var(--kt-warning-subtle); }
.day.internal { background: var(--kt-neutral-subtle); }
.day.today { box-shadow: inset 0 0 0 2px var(--kt-focus); }
.marker-space { height: 12px; }
.deadline-list { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: var(--kt-s-200); padding: var(--kt-s-100) var(--kt-s-300) var(--kt-s-300); }
.deadline { display: flex; align-items: center; gap: var(--kt-s-200); padding: var(--kt-s-100) var(--kt-s-200); border: 1px solid var(--kt-border); border-radius: var(--kt-r-12); color: var(--kt-text); background: var(--kt-surface); font-family: var(--kt-font); text-align: left; cursor: pointer; transition: border-color 150ms var(--kt-ease); }
.deadline:hover { border-color: var(--kt-input); }
.deadline:focus-visible { outline: 2px solid var(--kt-focus); outline-offset: 2px; }
.deadline-text { display: flex; flex-direction: column; gap: var(--kt-s-50); }
.meta { display: flex; flex-wrap: wrap; align-items: center; gap: var(--kt-s-75); }
.date { align-self: flex-start; padding: var(--kt-s-50) var(--kt-s-100); border-radius: var(--kt-r-6); color: var(--kt-text-2); background: var(--kt-neutral-subtle); }
.date.legal { color: var(--kt-t-warning); background: var(--kt-warning-subtle); }
.date.overdue { color: var(--kt-t-error); background: var(--kt-error-subtle); }
.none { padding: var(--kt-s-100) var(--kt-s-300) var(--kt-s-200); }

.lower { display: grid; grid-template-columns: minmax(0, 1fr) 400px; align-items: start; gap: var(--kt-s-300); }
.group-head { padding: var(--kt-s-75) var(--kt-s-300); border-bottom: 1px solid var(--kt-divider); color: var(--kt-text-2); background: var(--kt-surface-subtle); }
.check-row { display: flex; align-items: center; gap: var(--kt-s-100); padding: var(--kt-s-100) var(--kt-s-300); border-bottom: 1px solid var(--kt-divider); }
.check-row.nested { padding-left: var(--kt-s-600); }
.sev { display: inline-flex; flex: none; }
.sev.critical { color: var(--kt-t-error); }
.sev.warning { color: var(--kt-t-warning); }
.sev.ok { color: var(--kt-t-success); }
.sev.info { color: var(--kt-text-3); }
.link { display: inline-flex; flex: none; align-items: center; gap: var(--kt-s-50); padding: var(--kt-s-50) var(--kt-s-75); border: 0; border-radius: var(--kt-r-6); color: var(--kt-link); background: transparent; font: 600 14px/20px var(--kt-font); white-space: nowrap; cursor: pointer; }
.link:hover { background: var(--kt-ghost-hover); }
.link:focus-visible { outline: 2px solid var(--kt-focus); }
.avatar { display: grid; flex: none; width: 32px; height: 32px; place-items: center; border-radius: var(--kt-r-full); color: var(--kt-link); background: var(--kt-surface-selected); font: 600 12px/16px var(--kt-font); }
.action { font-weight: 400; }

@media (max-width: 1100px) { .lower { grid-template-columns: minmax(0, 1fr); } }
@media (max-width: 1000px) { .kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
</style>
