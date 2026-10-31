<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import api from '@/lib/api'
import { formatDate } from '@/lib/format'

interface AppNotification {
  type: string
  severity: 'critical' | 'warning' | 'info'
  business_id: number
  business_name: string
  title: string
  due_on: string | null
}

const notifications = ref<AppNotification[]>([])
const open = ref(false)
const urgentCount = computed(() => notifications.value.filter((item) => item.severity !== 'info').length)

const typeLabels: Record<string, string> = {
  task_overdue: 'Overdue',
  task_due_soon: 'Due soon',
  document_requested: 'Document requested',
  document_submitted: 'Document to review',
  invitation: 'Invitation',
  period_reopen_requested: 'Approval needed',
}

onMounted(async () => {
  try {
    const response = await api.get<{ data: AppNotification[] }>('/api/v1/me/notifications')
    notifications.value = response.data.data
  } catch {
    notifications.value = []
  }
})
</script>

<template>
  <div class="notification-bell">
    <button type="button" class="bell-button" :aria-expanded="open" aria-label="Notifications" @click="open = !open">
      <span aria-hidden="true">🔔</span>
      <span v-if="notifications.length" class="bell-count" :class="{ urgent: urgentCount > 0 }">{{ notifications.length }}</span>
    </button>
    <div v-if="open" class="bell-panel" role="dialog" aria-label="Notifications">
      <p v-if="!notifications.length" class="bell-empty">You're all caught up.</p>
      <RouterLink v-for="(item, index) in notifications" :key="index" class="bell-item" :to="{ name: 'business', params: { businessId: item.business_id } }" @click="open = false">
        <span class="severity-chip" :class="item.severity">{{ typeLabels[item.type] ?? item.type }}</span>
        <strong>{{ item.title }}</strong>
        <small>{{ item.business_name }}<template v-if="item.due_on"> · {{ formatDate(item.due_on) }}</template></small>
      </RouterLink>
    </div>
  </div>
</template>

<style scoped>
.notification-bell { position: relative; }
.bell-button { position: relative; padding: 6px 10px; border: 1px solid #dfe7e0; border-radius: 999px; background: #fff; cursor: pointer; font-size: 15px; }
.bell-count { position: absolute; top: -6px; right: -6px; min-width: 18px; padding: 1px 5px; border-radius: 999px; color: #fff; background: #77837b; font-size: 10px; font-weight: 700; }
.bell-count.urgent { background: #9b352b; }
.bell-panel { position: absolute; z-index: 20; top: calc(100% + 8px); right: 0; display: grid; width: min(360px, calc(100vw - 32px)); max-height: 420px; overflow-y: auto; gap: 2px; padding: 8px; border: 1px solid #dfe7e0; border-radius: 12px; background: #fff; box-shadow: 0 10px 30px rgb(31 45 37 / 14%); }
.bell-item { display: grid; gap: 4px; padding: 10px; border-radius: 8px; color: #1f2d25; text-decoration: none; }
.bell-item:hover, .bell-item:focus-visible { background: #f4f7f4; }
.bell-item strong { font-size: 13px; }
.bell-item small { color: #77837b; font-size: 11px; }
.bell-item .severity-chip { justify-self: start; }
.bell-empty { margin: 8px; color: #77837b; font-size: 13px; }
</style>
