<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/lib/api'
import KtIcon from '@/components/ui/KtIcon.vue'
import LocaleToggle from '@/components/ui/LocaleToggle.vue'
import { useDismiss } from '@/lib/useDismiss'
import { useMessages } from '@/lib/locale'
import { workspaceMessages } from '@/locales/workspace'
import { useAuthStore } from '@/stores/auth'

export interface TopbarBusiness {
  id: number
  legal_name: string
  trade_name: string | null
  nui: string
}

interface AppNotification {
  type: string
  severity: 'critical' | 'warning' | 'info'
  business_id: number
  business_name: string
  title: string
  due_on: string | null
}

const props = defineProps<{
  business: TopbarBusiness | null
  businesses: TopbarBusiness[]
  period: { year: number; month: number }
  isMonthClosed: (year: number, month: number) => boolean
}>()
const emit = defineEmits<{ period: [year: number, month: number]; search: []; monthEnd: [] }>()

const m = useMessages(workspaceMessages)
const auth = useAuthStore()
const router = useRouter()

const switcherOpen = ref(false)
const periodOpen = ref(false)
const notificationsOpen = ref(false)
const userOpen = ref(false)
const switcherRoot = ref<HTMLElement | null>(null)
const periodRoot = ref<HTMLElement | null>(null)
const notificationsRoot = ref<HTMLElement | null>(null)
const userRoot = ref<HTMLElement | null>(null)
const switcherButton = ref<HTMLElement | null>(null)
const periodButton = ref<HTMLElement | null>(null)
const notificationsButton = ref<HTMLElement | null>(null)
const userButton = ref<HTMLElement | null>(null)
useDismiss(switcherOpen, switcherRoot, switcherButton)
useDismiss(periodOpen, periodRoot, periodButton)
useDismiss(notificationsOpen, notificationsRoot, notificationsButton)
useDismiss(userOpen, userRoot, userButton)

const notifications = ref<AppNotification[]>([])

onMounted(async () => {
  try {
    notifications.value = (await api.get<{ data: AppNotification[] }>('/api/v1/me/notifications')).data.data
  } catch {
    notifications.value = []
  }
})

function displayName(item: TopbarBusiness): string {
  return item.trade_name || item.legal_name
}

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]?.toUpperCase() ?? '').join('')
}

const periodLabel = computed(() => `${m.value.months[props.period.month - 1]} ${props.period.year}`)
const periodClosed = computed(() => props.isMonthClosed(props.period.year, props.period.month))

/** The last 12 calendar months, newest first. */
const months = computed(() => {
  const now = new Date()
  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1)
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    return { year, month, label: `${m.value.months[month - 1]} ${year}`, closed: props.isMonthClosed(year, month) }
  })
})

function pickPeriod(year: number, month: number): void {
  periodOpen.value = false
  emit('period', year, month)
}

function formatShortDate(value: string): string {
  const [year, month, day] = value.slice(0, 10).split('-')
  return `${day}.${month}.${year}`
}

async function signOut(): Promise<void> {
  userOpen.value = false
  await auth.logout()
  await router.replace({ name: 'landing' })
}
</script>

<template>
  <header class="topbar">
    <div ref="switcherRoot" class="pop-root">
      <button ref="switcherButton" type="button" class="switcher" :aria-expanded="switcherOpen" aria-haspopup="true" :title="`${m.topbar.switchBusiness} (Ctrl B)`" @click="switcherOpen = !switcherOpen">
        <span class="mono">{{ business ? initials(displayName(business)) : '' }}</span>
        <span v-if="business" class="identity">
          <span class="kt-body-4 name">{{ business.legal_name }}</span>
          <span class="kt-caption-5 kt-muted">{{ m.topbar.nui }} {{ business.nui }}</span>
        </span>
        <KtIcon name="caret-down" :size="16" class="caret" />
      </button>
      <Transition name="pop">
        <div v-if="switcherOpen" class="popover" role="menu">
          <p class="pop-label kt-caption-3">{{ m.topbar.switchBusiness }}</p>
          <RouterLink v-for="item in businesses" :key="item.id" class="option" role="menuitem" :to="{ name: 'business', params: { businessId: item.id } }" @click="switcherOpen = false">
            <span class="grow"><span class="kt-body-5 block">{{ item.legal_name }}</span><span class="kt-caption-5 kt-muted">{{ m.topbar.nui }} {{ item.nui }}</span></span>
            <KtIcon v-if="business && item.id === business.id" name="check" :size="16" />
          </RouterLink>
          <div class="divider" />
          <RouterLink class="option" role="menuitem" :to="{ name: 'dashboard' }" @click="switcherOpen = false"><KtIcon name="squares-four" :size="16" />{{ m.allBusinesses }}</RouterLink>
        </div>
      </Transition>
    </div>

    <div ref="periodRoot" class="pop-root hide-sm">
      <button ref="periodButton" type="button" class="period" :aria-expanded="periodOpen" aria-haspopup="true" @click="periodOpen = !periodOpen">
        <KtIcon name="calendar-blank" :size="16" />
        <span class="kt-body-5">{{ periodLabel }}</span>
        <span class="kt-chip" :class="periodClosed ? 'kt-chip--info' : 'kt-chip--ok'"><KtIcon :name="periodClosed ? 'lock-simple' : 'lock-simple-open'" :size="12" />{{ periodClosed ? m.topbar.closed : m.topbar.open }}</span>
        <KtIcon name="caret-down" :size="16" />
      </button>
      <Transition name="pop">
        <div v-if="periodOpen" class="popover" role="menu">
          <p class="pop-label kt-caption-3">{{ m.topbar.period }}</p>
          <button v-for="item in months" :key="`${item.year}-${item.month}`" type="button" class="option" role="menuitemradio" :aria-checked="item.year === period.year && item.month === period.month" @click="pickPeriod(item.year, item.month)">
            <KtIcon :name="item.closed ? 'lock-simple' : 'lock-simple-open'" :size="16" />
            <span class="grow kt-body-6">{{ item.label }}</span>
            <KtIcon v-if="item.year === period.year && item.month === period.month" name="check" :size="16" />
          </button>
          <div class="divider" />
          <button type="button" class="option" role="menuitem" @click="periodOpen = false; emit('monthEnd')"><KtIcon name="calendar-check" :size="16" />{{ m.topbar.monthEnd }}</button>
        </div>
      </Transition>
    </div>

    <button type="button" class="search hide-sm" @click="emit('search')">
      <KtIcon name="magnifying-glass" :size="16" />
      <span class="kt-body-6 placeholder">{{ m.topbar.search }}</span>
      <kbd class="kbd">Ctrl K</kbd>
    </button>

    <div ref="notificationsRoot" class="pop-root">
      <button ref="notificationsButton" type="button" class="icon-button" :aria-expanded="notificationsOpen" :aria-label="m.topbar.notifications(notifications.length)" @click="notificationsOpen = !notificationsOpen">
        <KtIcon name="bell" />
        <span v-if="notifications.length" class="count">{{ notifications.length > 99 ? '99+' : notifications.length }}</span>
      </button>
      <Transition name="pop">
        <div v-if="notificationsOpen" class="popover right wide" role="dialog" :aria-label="m.topbar.notifications(notifications.length)">
          <p v-if="!notifications.length" class="empty kt-body-6 kt-muted">{{ m.topbar.noNotifications }}</p>
          <RouterLink v-for="(item, index) in notifications" :key="index" class="option" :to="{ name: 'business', params: { businessId: item.business_id } }" @click="notificationsOpen = false">
            <span class="sev" :class="item.severity"><KtIcon :name="item.severity === 'critical' ? 'warning-octagon' : item.severity === 'warning' ? 'warning' : 'info'" :size="16" /></span>
            <span class="grow"><span class="kt-body-5 block">{{ item.title }}</span><span class="kt-caption-5 kt-muted">{{ item.business_name }}<template v-if="item.due_on"> · {{ formatShortDate(item.due_on) }}</template></span></span>
          </RouterLink>
        </div>
      </Transition>
    </div>

    <LocaleToggle class="hide-sm" />

    <div ref="userRoot" class="pop-root">
      <button ref="userButton" type="button" class="user" :aria-expanded="userOpen" :aria-label="m.topbar.userMenu" @click="userOpen = !userOpen">
        <span class="avatar">{{ initials(auth.user?.name ?? '') }}</span>
        <KtIcon name="caret-down" :size="16" class="caret" />
      </button>
      <Transition name="pop">
        <div v-if="userOpen" class="popover right" role="menu">
          <p class="pop-label"><span class="kt-body-5 block user-name">{{ auth.user?.name }}</span><span class="kt-caption-5 kt-muted">{{ auth.user?.email }}</span></p>
          <RouterLink class="option" role="menuitem" :to="{ name: 'dashboard' }" @click="userOpen = false"><KtIcon name="shield-check" :size="16" />{{ m.topbar.security }}</RouterLink>
          <button type="button" class="option" role="menuitem" @click="signOut"><KtIcon name="sign-out" :size="16" />{{ m.topbar.signOut }}</button>
        </div>
      </Transition>
    </div>
  </header>
</template>

<style scoped>
.topbar {
  position: sticky; z-index: 30; top: 0; display: flex; height: 64px; align-items: center; gap: var(--kt-s-200);
  padding: 0 var(--kt-s-300) 0 var(--kt-s-200); border-bottom: 1px solid var(--kt-border); color: var(--kt-text); background: var(--kt-surface);
}
.pop-root { position: relative; }
.switcher, .user { display: inline-flex; align-items: center; gap: var(--kt-s-100); padding: var(--kt-s-50) var(--kt-s-75) var(--kt-s-50) var(--kt-s-50); border: 0; border-radius: var(--kt-r-8); color: var(--kt-text); background: transparent; cursor: pointer; text-align: left; }
.switcher:hover, .user:hover { background: var(--kt-surface-hover); }
.mono { display: grid; flex: none; width: 36px; height: 36px; place-items: center; border-radius: var(--kt-r-8); color: var(--kt-on-action); background: var(--kt-action); font: 600 12px/16px var(--kt-font); }
.identity { display: flex; min-width: 0; flex-direction: column; }
.name { overflow: hidden; max-width: 260px; color: var(--kt-heading); text-overflow: ellipsis; white-space: nowrap; }
.caret { color: var(--kt-text-3); }
.period { display: inline-flex; height: 40px; white-space: nowrap; align-items: center; gap: var(--kt-s-75); padding: 0 var(--kt-s-100); border: 1px solid var(--kt-input); border-radius: var(--kt-r-8); color: var(--kt-text); background: var(--kt-surface); cursor: pointer; }
.period:hover { border-color: var(--kt-input-hover); }
.search { display: flex; flex: 1; min-width: 120px; max-width: 400px; height: 40px; align-items: center; gap: var(--kt-s-75); margin-left: auto; padding: 0 var(--kt-s-75) 0 var(--kt-s-100); border: 1px solid var(--kt-border); border-radius: var(--kt-r-8); color: var(--kt-text-3); background: var(--kt-surface-subtle); cursor: text; }
.placeholder { flex: 1; min-width: 0; overflow: hidden; text-align: left; text-overflow: ellipsis; white-space: nowrap; }
.kbd { padding: 0 var(--kt-s-50); border: 1px solid var(--kt-border); border-radius: var(--kt-r-4); color: var(--kt-text-2); background: var(--kt-surface); font: 500 12px/18px var(--kt-font); white-space: nowrap; }
.icon-button { position: relative; display: grid; width: 40px; height: 40px; place-items: center; border: 0; border-radius: var(--kt-r-8); color: var(--kt-text-3); background: transparent; cursor: pointer; transition: transform 100ms var(--kt-ease); }
.icon-button:hover { color: var(--kt-text); background: var(--kt-ghost-hover); }
.icon-button:active { transform: scale(0.97); }
.count { position: absolute; top: 2px; right: 0; display: grid; min-width: 20px; height: 20px; padding: 0 6px; place-items: center; border-radius: var(--kt-r-full); color: var(--kt-on-action); background: var(--kt-error); font: 600 12px/16px var(--kt-font); }
.avatar { display: grid; width: 32px; height: 32px; place-items: center; border-radius: var(--kt-r-full); color: var(--kt-link); background: var(--kt-surface-selected); font: 600 12px/16px var(--kt-font); }
.switcher:focus-visible, .user:focus-visible, .period:focus-visible, .search:focus-visible, .icon-button:focus-visible { outline: 2px solid var(--kt-focus); outline-offset: 2px; }

.popover {
  position: absolute; z-index: 40; top: calc(100% + 6px); left: 0; min-width: 280px; max-width: min(420px, calc(100vw - 32px)); max-height: min(520px, calc(100vh - 96px));
  overflow-y: auto; padding: var(--kt-s-75) 0; border: 1px solid var(--kt-border); border-radius: var(--kt-r-8); background: var(--kt-surface); box-shadow: var(--kt-shadow-2);
  transform-origin: top left;
}
.popover.right { right: 0; left: auto; transform-origin: top right; }
.popover.wide { width: 380px; }
.pop-label { margin: 0; padding: var(--kt-s-50) var(--kt-s-200); color: var(--kt-text-3); }
.user-name { color: var(--kt-text); }
.option { display: flex; width: 100%; align-items: center; gap: var(--kt-s-100); padding: var(--kt-s-75) var(--kt-s-200); border: 0; color: var(--kt-text); background: transparent; font: 400 14px/20px var(--kt-font); text-align: left; text-decoration: none; cursor: pointer; }
.option:hover { background: var(--kt-surface-hover); }
.option:focus-visible { outline: 2px solid var(--kt-focus); outline-offset: -2px; }
.option svg { flex: none; color: var(--kt-text-3); }
.grow { flex: 1; min-width: 0; }
.block { display: block; }
.divider { height: 1px; margin: var(--kt-s-75) 0; background: var(--kt-divider); }
.empty { margin: 0; padding: var(--kt-s-100) var(--kt-s-200); }
.sev { display: grid; flex: none; width: 32px; height: 32px; place-items: center; border-radius: var(--kt-r-full); }
.sev.critical { color: var(--kt-t-error); background: var(--kt-error-subtle); }
.sev.warning { color: var(--kt-t-warning); background: var(--kt-warning-subtle); }
.sev.info { color: var(--kt-text-2); background: var(--kt-neutral-subtle); }
.option .sev svg { color: inherit; }

/* Popovers grow from their trigger; exit is faster than entry. */
.pop-enter-active { transition: opacity 160ms var(--kt-ease), transform 160ms var(--kt-ease); }
.pop-leave-active { transition: opacity 100ms var(--kt-ease), transform 100ms var(--kt-ease); }
.pop-enter-from, .pop-leave-to { opacity: 0; transform: scale(0.97); }

@media (max-width: 1100px) { .search { max-width: 240px; } .name { max-width: 180px; } }
@media (max-width: 900px) { .hide-sm { display: none; } .topbar { gap: var(--kt-s-75); padding-inline: var(--kt-s-75); } .pop-root:nth-last-child(2) { margin-left: auto; } }
@media (prefers-reduced-motion: reduce) {
  .pop-enter-active, .pop-leave-active { transition: opacity 120ms linear; }
  .pop-enter-from, .pop-leave-to { transform: none; }
}
</style>
