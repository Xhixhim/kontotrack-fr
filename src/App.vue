<script setup lang="ts">
import { useRoute } from 'vue-router'
import { locale } from '@/lib/locale'

const route = useRoute()
</script>

<template>
  <!-- Keyed by path so switching business (same view, new id) remounts and reloads the workspace,
       and by language so labels prepared when a screen opens are rebuilt in the new language. -->
  <RouterView :key="`${route.path}|${locale}`" />
</template>
