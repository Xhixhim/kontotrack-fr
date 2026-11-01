<script setup lang="ts">
import KtIcon from '@/components/ui/KtIcon.vue'
import type { IconName } from '@/components/ui/icons'
import type { LandingMessages } from '@/locales/landing'

defineProps<{ m: LandingMessages }>()

const healthIcon: Record<'critical' | 'warning' | 'ok', IconName> = { critical: 'warning-octagon', warning: 'warning', ok: 'check-circle' }
const navIcons: IconName[] = ['squares-four', 'calendar-check', 'bell', 'folder-simple']
</script>

<template>
  <figure class="mock" :aria-label="m.preview.label">
    <div class="bar">
      <span class="mark">KT</span>
      <span class="kt-body-4">{{ m.preview.title }}</span>
      <div class="search kt-caption-2"><KtIcon name="magnifying-glass" :size="16" /><span>{{ m.preview.search }}</span></div>
      <span class="kt-chip kt-chip--ok month"><KtIcon name="calendar-blank" :size="14" />{{ m.preview.month }}</span>
    </div>
    <div class="body">
      <div class="side kt-caption-1" aria-hidden="true">
        <div v-for="(label, index) in m.preview.nav" :key="label" :class="{ on: index === 0 }"><KtIcon :name="navIcons[index]!" />{{ label }}</div>
      </div>
      <div class="main">
        <div class="summary">
          <span class="kt-body-5">{{ m.preview.today }}</span>
          <span class="kt-chip kt-chip--critical"><KtIcon name="warning-octagon" :size="14" />{{ m.preview.summary.critical }}</span>
          <span class="kt-chip kt-chip--warning"><KtIcon name="warning" :size="14" />{{ m.preview.summary.warning }}</span>
          <span class="kt-chip kt-chip--ok"><KtIcon name="check-circle" :size="14" />{{ m.preview.summary.ok }}</span>
        </div>
        <div class="table-scroll">
          <table class="kt-body-6">
            <thead class="kt-caption-3">
              <tr>
                <th>{{ m.preview.columns.business }}</th><th>{{ m.preview.columns.nui }}</th><th>{{ m.preview.columns.status }}</th><th>{{ m.preview.columns.deadline }}</th><th class="r">{{ m.preview.columns.open }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in m.preview.rows" :key="row.nui">
                <td class="kt-body-5">{{ row.name }}</td>
                <td class="kt-num">{{ row.nui }}</td>
                <td><span class="kt-chip" :class="`kt-chip--${row.health}`"><KtIcon :name="healthIcon[row.health]" :size="14" />{{ row.status }}</span></td>
                <td class="kt-num">{{ row.deadline }}</td>
                <td class="r"><span v-if="row.open" class="count">{{ row.open }}</span><span v-else class="kt-muted">0</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </figure>
</template>

<style scoped>
.mock { margin: var(--kt-s-600) 0 0; overflow: hidden; border: 1px solid var(--kt-border); border-radius: var(--kt-r-16); background: var(--kt-surface); box-shadow: var(--kt-shadow-3); }
.bar { display: flex; align-items: center; gap: var(--kt-s-200); padding: var(--kt-s-100) var(--kt-s-300); border-bottom: 1px solid var(--kt-divider); color: var(--kt-heading); }
.mark { display: grid; width: 28px; height: 28px; place-items: center; border-radius: var(--kt-r-8); color: var(--kt-on-action); background: var(--kt-action); font: 600 12px/16px var(--kt-font); }
.search { display: flex; flex: 1; align-items: center; gap: var(--kt-s-75); max-width: 360px; height: 36px; padding: 0 var(--kt-s-100); border: 1px solid var(--kt-border); border-radius: var(--kt-r-8); color: var(--kt-text-3); background: var(--kt-surface-subtle); }
.month { margin-left: auto; }
.body { display: grid; grid-template-columns: 220px minmax(0, 1fr); }
.side { display: flex; flex-direction: column; gap: var(--kt-s-25); padding: var(--kt-s-200) var(--kt-s-100); color: var(--kt-on-sidebar); background: var(--kt-sidebar); }
.side div { display: flex; align-items: center; gap: var(--kt-s-100); padding: var(--kt-s-75) var(--kt-s-100); border-radius: var(--kt-r-8); }
.side svg { color: var(--kt-on-sidebar-icon); }
.side .on { color: var(--kt-on-sidebar-strong); background: var(--kt-sidebar-active); }
.side .on svg { color: var(--kt-on-sidebar-strong); }
.main { min-width: 0; padding: var(--kt-s-300); }
.summary { display: flex; flex-wrap: wrap; align-items: center; gap: var(--kt-s-75); margin-bottom: var(--kt-s-200); color: var(--kt-text); }
.table-scroll { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; color: var(--kt-text); }
th { padding: var(--kt-s-100); border-bottom: 1px solid var(--kt-divider); color: var(--kt-text-2); background: var(--kt-surface-subtle); text-align: left; white-space: nowrap; }
td { padding: var(--kt-s-100); border-bottom: 1px solid var(--kt-divider); white-space: nowrap; }
tbody tr:hover td { background: var(--kt-surface-hover); }
.r { text-align: right; }
.count { display: inline-grid; min-width: 20px; height: 20px; padding: 0 6px; place-items: center; border-radius: var(--kt-r-full); color: var(--kt-on-action); background: var(--kt-error); font: 600 12px/16px var(--kt-font); }
@media (max-width: 900px) {
  .body { grid-template-columns: 1fr; }
  .side { display: none; }
  .main { padding: var(--kt-s-200); }
  .search { display: none; }
}
</style>
