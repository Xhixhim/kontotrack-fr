<script setup lang="ts">
import { computed } from 'vue'
import KtIcon from '@/components/ui/KtIcon.vue'
import { useMessages } from '@/lib/locale'
import { workspaceMessages } from '@/locales/workspace'
import { navigation, type NavKey } from './navigation'

const props = defineProps<{
  active: NavKey
  collapsed: boolean
  hidden?: NavKey[]
  badges?: Partial<Record<NavKey, number>>
}>()
const emit = defineEmits<{ navigate: [key: NavKey]; toggle: [] }>()
const m = useMessages(workspaceMessages)

const groups = computed(() =>
  navigation
    .map((group) => ({ ...group, items: group.items.filter((item) => !props.hidden?.includes(item.key)) }))
    .filter((group) => group.items.length),
)
</script>

<template>
  <nav class="sidebar" :class="{ collapsed }" :aria-label="m.sidebarLabel">
    <div class="brand">
      <span class="mark">KT</span>
      <span v-if="!collapsed" class="kt-title-3 wordmark">KontoTrack</span>
    </div>

    <RouterLink class="item back" :to="{ name: 'dashboard' }" :title="collapsed ? m.allBusinesses : undefined">
      <KtIcon name="caret-left" :size="16" />
      <span v-if="!collapsed" class="label kt-caption-1">{{ m.allBusinesses }}</span>
    </RouterLink>

    <template v-for="group in groups" :key="group.group ?? 'top'">
      <template v-if="group.group">
        <p v-if="!collapsed" class="group kt-caption-3">{{ m.groups[group.group] }}</p>
        <div v-else class="group-divider" role="separator" />
      </template>
      <button
        v-for="item in group.items"
        :key="item.key"
        type="button"
        class="item"
        :aria-current="active === item.key ? 'page' : undefined"
        :title="collapsed ? m.nav[item.key] : undefined"
        @click="emit('navigate', item.key)"
      >
        <KtIcon :name="item.icon" />
        <span v-if="!collapsed" class="label">{{ m.nav[item.key] }}</span>
        <span v-if="badges?.[item.key]" class="badge" :class="{ dot: collapsed }">{{ collapsed ? '' : badges[item.key] }}</span>
      </button>
    </template>

    <div class="spacer" />
    <button type="button" class="item" :title="collapsed ? m.expand : undefined" :aria-expanded="!collapsed" @click="emit('toggle')">
      <KtIcon name="sidebar-simple" />
      <span v-if="!collapsed" class="label">{{ m.collapse }}</span>
      <kbd v-if="!collapsed" class="kbd">[</kbd>
    </button>
  </nav>
</template>

<style scoped>
.sidebar {
  position: sticky; top: 0; display: flex; height: 100vh; flex-direction: column; gap: var(--kt-s-25);
  overflow-y: auto; padding: var(--kt-s-100); color: var(--kt-on-sidebar); background: var(--kt-sidebar); scrollbar-width: thin;
}
.brand { display: flex; align-items: center; gap: var(--kt-s-100); padding: var(--kt-s-50) var(--kt-s-75) var(--kt-s-200); }
.mark { display: grid; flex: none; width: 32px; height: 32px; place-items: center; border-radius: var(--kt-r-8); color: var(--kt-on-sidebar-strong); background: var(--kt-sidebar-active); font: 600 12px/16px var(--kt-font); }
.wordmark { color: var(--kt-on-sidebar-strong); }
.item {
  display: flex; width: 100%; min-height: 36px; align-items: center; gap: var(--kt-s-100); padding: var(--kt-s-75) var(--kt-s-100);
  border: 0; border-radius: var(--kt-r-8); color: var(--kt-on-sidebar); background: transparent; font: 500 14px/20px var(--kt-font);
  text-align: left; text-decoration: none; cursor: pointer;
}
.item svg { color: var(--kt-on-sidebar-icon); }
.item:hover { background: var(--kt-sidebar-hover); }
.item[aria-current='page'] { color: var(--kt-on-sidebar-strong); background: var(--kt-sidebar-active); }
.item[aria-current='page'] svg { color: var(--kt-on-sidebar-strong); }
.item:focus-visible { outline: 2px solid var(--kt-focus); outline-offset: -2px; }
.label { flex: 1; min-width: 0; }
.group { margin: 0; padding: var(--kt-s-200) var(--kt-s-100) var(--kt-s-50); color: var(--kt-on-sidebar); opacity: 0.85; }
.group-divider { height: 1px; margin: var(--kt-s-75) var(--kt-s-50); background: var(--kt-sidebar-active); }
.badge { display: inline-grid; min-width: 20px; height: 20px; padding: 0 6px; place-items: center; border-radius: var(--kt-r-full); color: var(--kt-on-action); background: var(--kt-error); font: 600 12px/16px var(--kt-font); }
.item { position: relative; }
.badge.dot { position: absolute; top: 6px; right: 6px; min-width: 8px; width: 8px; height: 8px; padding: 0; }
.spacer { flex: 1; min-height: var(--kt-s-200); }
.kbd { padding: 0 var(--kt-s-50); border: 1px solid var(--kt-sidebar-active); border-radius: var(--kt-r-4); color: var(--kt-on-sidebar); font: 500 12px/18px var(--kt-font); }
.collapsed { align-items: center; }
.collapsed .item { justify-content: center; padding: var(--kt-s-75); }
.collapsed .brand { padding-inline: 0; }
</style>
