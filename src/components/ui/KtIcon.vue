<script setup lang="ts">
import { icons, type IconName } from './icons'

withDefaults(defineProps<{ name: IconName; size?: number }>(), { size: 20 })
</script>

<template>
  <svg class="kt-icon" :width="size" :height="size" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true" focusable="false">
    <path :d="icons[name]" />
  </svg>
</template>

<style scoped>
.kt-icon { flex: none; }
</style>
