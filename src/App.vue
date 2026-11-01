<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <!-- Keyed by path so switching business (same view, new id) remounts and reloads the workspace. -->
  <RouterView :key="route.path" />
</template>
