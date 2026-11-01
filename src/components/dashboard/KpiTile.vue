<script setup lang="ts">
import KtIcon from '@/components/ui/KtIcon.vue'
import type { IconName } from '@/components/ui/icons'

defineProps<{
  label: string
  value: string
  icon: IconName
  note?: string
  /** Colours the note; 'error' also outlines the tile (e.g. negative cash). */
  tone?: 'neutral' | 'success' | 'warning' | 'error'
  disabled?: boolean
}>()
defineEmits<{ open: [] }>()
</script>

<template>
  <button type="button" class="kpi" :class="tone ? `tone-${tone}` : ''" :disabled="disabled" @click="$emit('open')">
    <span class="top kt-caption-1"><span class="label">{{ label }}</span><KtIcon :name="icon" :size="16" /></span>
    <!-- Working data: the value never animates or counts up. -->
    <span class="value kt-num">{{ value }}</span>
    <span v-if="note" class="note kt-caption-5">{{ note }}</span>
  </button>
</template>

<style scoped>
.kpi {
  display: flex; min-width: 0; flex-direction: column; gap: var(--kt-s-75); padding: var(--kt-s-200);
  border: 1px solid var(--kt-border); border-radius: var(--kt-r-12); color: var(--kt-text); background: var(--kt-surface);
  font-family: var(--kt-font); text-align: left; cursor: pointer; transition: border-color 150ms var(--kt-ease);
}
.kpi:hover:not(:disabled) { border-color: var(--kt-input); }
.kpi:focus-visible { outline: 2px solid var(--kt-focus); outline-offset: 2px; }
.kpi:disabled { cursor: default; }
.top { display: flex; align-items: center; gap: var(--kt-s-75); color: var(--kt-text-2); }
.top svg { color: var(--kt-text-3); }
.label { flex: 1; min-width: 0; }
.value { overflow: hidden; color: var(--kt-heading); font-size: 24px; font-weight: 500; line-height: 32px; text-overflow: ellipsis; white-space: nowrap; }
.note { color: var(--kt-text-3); }
.tone-success .note { color: var(--kt-t-success); }
.tone-warning .note { color: var(--kt-t-warning); }
.tone-error { border-color: var(--kt-border-error); }
.tone-error .value, .tone-error .note { color: var(--kt-t-error); }
</style>
