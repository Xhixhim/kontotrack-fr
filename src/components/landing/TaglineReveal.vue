<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch, nextTick } from 'vue'

const props = defineProps<{ lines: string[] }>()

const root = ref<HTMLElement | null>(null)
const activeCount = ref(0)
const reduceMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const words = computed(() => {
  let index = 0
  return props.lines.map((line) => line.split(/\s+/).filter(Boolean).map((text) => ({ text, index: index++ })))
})
const total = computed(() => words.value.reduce((sum, line) => sum + line.length, 0))

let frame = 0

/** Words light up one at a time as they cross a line 62% down the viewport. */
function measure(): void {
  frame = 0
  if (!root.value) return
  if (reduceMotion) {
    activeCount.value = total.value
    return
  }
  const trigger = window.innerHeight * 0.62
  const spans = root.value.querySelectorAll<HTMLElement>('[data-word]')
  let count = 0
  spans.forEach((span) => {
    if (span.getBoundingClientRect().top < trigger) count++
  })
  // Reveal once: never dim words again when scrolling back up.
  activeCount.value = Math.max(activeCount.value, count)
}

function onScroll(): void {
  if (!frame) frame = requestAnimationFrame(measure)
}

onMounted(() => {
  measure()
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onScroll)
  if (frame) cancelAnimationFrame(frame)
})

watch(() => props.lines, async () => {
  activeCount.value = 0
  await nextTick()
  measure()
})
</script>

<template>
  <p ref="root" class="tagline">
    <template v-for="(line, lineIndex) in words" :key="lineIndex">
      <span class="line">
        <template v-for="word in line" :key="word.index">
          <span data-word class="word" :class="{ on: word.index < activeCount }">{{ word.text }}</span>{{ ' ' }}
        </template>
      </span>
    </template>
  </p>
</template>

<style scoped>
.tagline { max-width: 820px; margin: 0; color: var(--kt-heading); font: 600 60px/60px var(--kt-font); letter-spacing: -0.02em; text-wrap: balance; }
.line { display: block; }
.word { opacity: 0.3; transition: opacity 500ms cubic-bezier(0.22, 1, 0.36, 1); }
.word.on { opacity: 1; }
@media (max-width: 900px) { .tagline { font-size: 36px; line-height: 40px; } }
@media (prefers-reduced-motion: reduce) { .word { opacity: 1; transition: none; } }
</style>
