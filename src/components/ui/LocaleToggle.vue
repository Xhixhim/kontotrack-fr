<script setup lang="ts">
import { locale, setLocale } from '@/lib/locale'
</script>

<template>
  <div class="kt-seg" role="group" :aria-label="locale === 'sq' ? 'Gjuha' : 'Language'">
    <button type="button" :aria-pressed="locale === 'sq'" lang="sq" @click="setLocale('sq')">SQ</button>
    <button type="button" :aria-pressed="locale === 'en'" lang="en" @click="setLocale('en')">EN</button>
  </div>
</template>
