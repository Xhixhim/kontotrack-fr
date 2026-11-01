<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import KtIcon from '@/components/ui/KtIcon.vue'
import type { IconName } from '@/components/ui/icons'
import { useMessages } from '@/lib/locale'
import { workspaceMessages } from '@/locales/workspace'

export interface PaletteItem {
  id: string
  group: 'modules' | 'customers' | 'invoices'
  label: string
  sub?: string
  icon: IconName
}

const props = defineProps<{ open: boolean; items: PaletteItem[] }>()
const emit = defineEmits<{ close: []; select: [item: PaletteItem] }>()
const m = useMessages(workspaceMessages)

const query = ref('')
const activeIndex = ref(0)
const input = ref<HTMLInputElement | null>(null)

function normalise(value: string): string {
  return value.toLocaleLowerCase('sq').normalize('NFD').replace(/[̀-ͯ]/g, '')
}

const results = computed(() => {
  const q = normalise(query.value.trim())
  const matches = q ? props.items.filter((item) => normalise(`${item.label} ${item.sub ?? ''}`).includes(q)) : props.items.filter((item) => item.group === 'modules')
  return matches.slice(0, 40)
})

watch(
  () => props.open,
  async (open) => {
    if (!open) return
    query.value = ''
    activeIndex.value = 0
    await nextTick()
    input.value?.focus()
  },
)
watch(query, () => (activeIndex.value = 0))

function onKey(event: KeyboardEvent): void {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    activeIndex.value = Math.min(results.value.length - 1, activeIndex.value + 1)
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    activeIndex.value = Math.max(0, activeIndex.value - 1)
  } else if (event.key === 'Enter') {
    event.preventDefault()
    const item = results.value[activeIndex.value]
    if (item) emit('select', item)
  } else if (event.key === 'Escape') {
    emit('close')
  }
}

function groupLabel(group: PaletteItem['group']): string {
  return m.value.palette[group]
}
</script>

<template>
  <div v-if="open" class="palette-layer">
    <div class="scrim" @click="emit('close')" />
    <div class="palette" role="dialog" aria-modal="true" :aria-label="m.palette.label">
      <input
        ref="input"
        v-model="query"
        class="search"
        role="combobox"
        aria-expanded="true"
        aria-controls="palette-results"
        :aria-activedescendant="results[activeIndex] ? `palette-${results[activeIndex]!.id}` : undefined"
        :placeholder="m.palette.placeholder"
        autocomplete="off"
        @keydown="onKey"
      />
      <ul id="palette-results" class="results" role="listbox">
        <template v-for="(item, index) in results" :key="item.id">
          <li v-if="index === 0 || results[index - 1]!.group !== item.group" class="group kt-caption-3" role="presentation">{{ groupLabel(item.group) }}</li>
          <li
            :id="`palette-${item.id}`"
            class="option"
            role="option"
            :aria-selected="index === activeIndex"
            @mousemove="activeIndex = index"
            @click="emit('select', item)"
          >
            <KtIcon :name="item.icon" :size="16" />
            <span class="text"><span class="kt-body-5">{{ item.label }}</span><span v-if="item.sub" class="kt-caption-5 kt-muted">{{ item.sub }}</span></span>
            <kbd v-if="index === activeIndex" class="kbd">Enter</kbd>
          </li>
        </template>
        <li v-if="!results.length" class="empty kt-body-6 kt-muted">{{ m.palette.empty(query) }}</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
/* Opens instantly: the palette is keyboard driven and must not animate. */
.palette-layer { position: fixed; z-index: 80; inset: 0; }
.scrim { position: absolute; inset: 0; background: var(--kt-overlay); }
.palette { position: absolute; top: 12vh; left: 50%; width: min(600px, calc(100vw - 32px)); overflow: hidden; transform: translateX(-50%); border: 1px solid var(--kt-border); border-radius: var(--kt-r-12); background: var(--kt-surface); box-shadow: var(--kt-shadow-3); }
.search { width: 100%; height: 56px; padding: 0 var(--kt-s-300); border: 0; border-bottom: 1px solid var(--kt-divider); color: var(--kt-text); background: transparent; font: 400 16px/24px var(--kt-font); }
.search:focus { outline: none; }
.results { max-height: 360px; margin: 0; padding: var(--kt-s-75) 0; overflow-y: auto; list-style: none; }
.group { padding: var(--kt-s-75) var(--kt-s-300) var(--kt-s-50); color: var(--kt-text-3); }
.option { display: flex; align-items: center; gap: var(--kt-s-100); padding: var(--kt-s-75) var(--kt-s-300); color: var(--kt-text); cursor: pointer; }
.option svg { color: var(--kt-text-3); }
.option[aria-selected='true'] { background: var(--kt-surface-hover); }
.text { display: flex; flex: 1; min-width: 0; flex-direction: column; }
.kbd { padding: 0 var(--kt-s-50); border: 1px solid var(--kt-border); border-radius: var(--kt-r-4); color: var(--kt-text-2); background: var(--kt-surface-subtle); font: 500 12px/18px var(--kt-font); }
.empty { padding: var(--kt-s-200) var(--kt-s-300); }
</style>
