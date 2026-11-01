<script setup lang="ts">
import { reactive, ref } from 'vue'
import KtIcon from '@/components/ui/KtIcon.vue'
import type { LandingMessages } from '@/locales/landing'

const props = defineProps<{ m: LandingMessages }>()

const contactEmail = (import.meta.env.VITE_CONTACT_EMAIL ?? '').trim()
const form = reactive({ name: '', email: '', count: '10 – 24' })
const errors = reactive<{ name: string; email: string }>({ name: '', email: '' })
const sentTo = ref('')
const nameInput = ref<HTMLInputElement | null>(null)
const emailInput = ref<HTMLInputElement | null>(null)
const counts = ['1 – 9', '10 – 24', '25 – 50', '50+']

function validate(): boolean {
  const d = props.m.demo
  const email = form.email.trim()
  errors.name = form.name.trim() ? '' : d.nameRequired
  errors.email = !email ? d.emailRequired : /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? '' : d.emailInvalid
  if (errors.name) nameInput.value?.focus()
  else if (errors.email) emailInput.value?.focus()
  return !errors.name && !errors.email
}

/** No sales backend exists yet, so the request opens the visitor's email app addressed to VITE_CONTACT_EMAIL. */
function submit(): void {
  if (!validate() || !contactEmail) return
  const subject = `KontoTrack demo · ${form.name.trim()}`
  const body = `${form.name.trim()}\n${form.email.trim()}\n${props.m.demo.count} ${form.count}`
  window.location.href = `mailto:${contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  sentTo.value = form.name.trim().split(' ')[0] ?? ''
}
</script>

<template>
  <form class="card" novalidate @submit.prevent="submit">
    <template v-if="!sentTo">
      <div class="kt-field">
        <label class="kt-label" for="demo-name">{{ m.demo.name }}</label>
        <input id="demo-name" ref="nameInput" v-model="form.name" class="kt-input" autocomplete="name" :aria-invalid="!!errors.name" aria-describedby="demo-name-error" />
        <span v-if="errors.name" id="demo-name-error" class="kt-field-error"><KtIcon name="warning-circle" :size="14" />{{ errors.name }}</span>
      </div>
      <div class="kt-field">
        <label class="kt-label" for="demo-email">{{ m.demo.email }}</label>
        <input id="demo-email" ref="emailInput" v-model="form.email" class="kt-input" type="email" autocomplete="email" :aria-invalid="!!errors.email" aria-describedby="demo-email-error" />
        <span v-if="errors.email" id="demo-email-error" class="kt-field-error"><KtIcon name="warning-circle" :size="14" />{{ errors.email }}</span>
      </div>
      <div class="kt-field">
        <label class="kt-label" for="demo-count">{{ m.demo.count }}</label>
        <select id="demo-count" v-model="form.count" class="kt-input"><option v-for="option in counts" :key="option">{{ option }}</option></select>
      </div>
      <button class="kt-btn kt-btn--primary kt-btn--lg" type="submit" :disabled="!contactEmail">{{ m.demo.submit }}</button>
      <p v-if="!contactEmail" class="kt-caption-5 kt-muted">{{ m.demo.notConfigured }}</p>
    </template>
    <div v-else class="done" role="status">
      <KtIcon name="check-circle" :size="24" class="done-icon" />
      <p class="kt-title-2">{{ m.demo.opened(sentTo) }}</p>
      <p class="kt-body-6 kt-second">{{ m.demo.openedNote }}</p>
      <p class="kt-body-5 address"><KtIcon name="envelope-simple" :size="16" />{{ contactEmail }}</p>
    </div>
  </form>
</template>

<style scoped>
.card { display: flex; flex-direction: column; gap: var(--kt-s-200); padding: var(--kt-s-300); border-radius: var(--kt-r-16); color: var(--kt-text); background: var(--kt-surface); }
.done { display: flex; flex-direction: column; align-items: flex-start; gap: var(--kt-s-100); }
.done-icon { color: var(--kt-t-success); }
.address { display: inline-flex; align-items: center; gap: var(--kt-s-75); user-select: all; }
</style>
