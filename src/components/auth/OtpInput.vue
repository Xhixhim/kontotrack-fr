<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'

const props = defineProps<{ modelValue: string; invalid?: boolean; groupLabel: string; digitLabel: (position: number) => string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string]; complete: [value: string] }>()

const LENGTH = 6
const digits = ref<string[]>(Array.from({ length: LENGTH }, (_, i) => props.modelValue[i] ?? ''))
const inputs = ref<HTMLInputElement[]>([])

watch(
  () => props.modelValue,
  (value) => {
    if (value !== digits.value.join('')) digits.value = Array.from({ length: LENGTH }, (_, i) => value[i] ?? '')
  },
)

function sync(): void {
  const value = digits.value.join('')
  emit('update:modelValue', value)
  if (value.length === LENGTH && !digits.value.includes('')) emit('complete', value)
}

function focusAt(index: number): void {
  inputs.value[Math.max(0, Math.min(LENGTH - 1, index))]?.focus()
}

function onInput(index: number, event: Event): void {
  const target = event.target as HTMLInputElement
  const digit = target.value.replace(/\D/g, '').slice(-1)
  digits.value[index] = digit
  target.value = digit
  sync()
  if (digit) focusAt(index + 1)
}

function onKeydown(index: number, event: KeyboardEvent): void {
  if (event.key === 'Backspace' && !digits.value[index]) {
    event.preventDefault()
    if (index > 0) {
      digits.value[index - 1] = ''
      sync()
      focusAt(index - 1)
    }
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault()
    focusAt(index - 1)
  } else if (event.key === 'ArrowRight') {
    event.preventDefault()
    focusAt(index + 1)
  }
}

function onPaste(event: ClipboardEvent): void {
  const pasted = (event.clipboardData?.getData('text') ?? '').replace(/\D/g, '').slice(0, LENGTH)
  if (!pasted) return
  event.preventDefault()
  digits.value = Array.from({ length: LENGTH }, (_, i) => pasted[i] ?? '')
  sync()
  focusAt(Math.min(pasted.length, LENGTH - 1))
}

async function focus(): Promise<void> {
  await nextTick()
  focusAt(digits.value.findIndex((d) => !d) === -1 ? LENGTH - 1 : digits.value.findIndex((d) => !d))
}

defineExpose({ focus })
</script>

<template>
  <div class="otp" role="group" :aria-label="groupLabel">
    <input
      v-for="(digit, index) in digits"
      :key="index"
      :ref="(el) => { if (el) inputs[index] = el as HTMLInputElement }"
      :value="digit"
      class="digit kt-num"
      inputmode="numeric"
      pattern="[0-9]*"
      maxlength="1"
      :autocomplete="index === 0 ? 'one-time-code' : 'off'"
      :aria-label="digitLabel(index + 1)"
      :aria-invalid="invalid ? 'true' : 'false'"
      @input="onInput(index, $event)"
      @keydown="onKeydown(index, $event)"
      @paste="onPaste"
      @focus="($event.target as HTMLInputElement).select()"
    />
  </div>
</template>

<style scoped>
.otp { display: flex; gap: var(--kt-s-75); }
.digit {
  width: 48px; height: 56px; padding: 0; border: 1px solid var(--kt-input); border-radius: var(--kt-r-8);
  color: var(--kt-text); background: var(--kt-surface); font: 600 24px/32px var(--kt-font); text-align: center;
}
.digit:hover { border-color: var(--kt-input-hover); }
.digit:focus { border: 2px solid var(--kt-focus); outline: none; }
.digit[aria-invalid='true'] { border: 2px solid var(--kt-border-error); }
@media (max-width: 380px) { .digit { width: 40px; height: 48px; } }
</style>
