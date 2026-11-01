<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import LocaleToggle from '@/components/ui/LocaleToggle.vue'
import { useAuthStore } from '@/stores/auth'
import type { LandingMessages } from '@/locales/landing'

defineProps<{ m: LandingMessages }>()

const auth = useAuthStore()
const menuOpen = ref(false)
const isSignedIn = computed(() => auth.user !== null)

const sections = ['si-funksionon', 'vecorite', 'per-kend', 'pyetje'] as const

function closeMenu(): void {
  menuOpen.value = false
}

function onKey(event: KeyboardEvent): void {
  if (event.key === 'Escape') closeMenu()
}

// The panel becomes visible first, then gets the class that runs the staggered entrance.
const panelVisible = ref(false)
const panelIn = ref(false)

watch(menuOpen, (open) => {
  panelVisible.value = open
  if (open) requestAnimationFrame(() => (panelIn.value = true))
  else panelIn.value = false
  document.body.style.overflow = open ? 'hidden' : ''
  if (open) window.addEventListener('keydown', onKey)
  else window.removeEventListener('keydown', onKey)
})

onBeforeUnmount(() => {
  document.body.style.overflow = ''
  window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div class="nav-shell" :class="{ 'is-open': menuOpen }">
    <nav class="nav" :aria-label="m.nav.menu">
      <RouterLink class="brand" :to="{ name: 'landing' }" @click="closeMenu"><span class="mark">KT</span><span class="kt-title-3">KontoTrack</span></RouterLink>
      <div class="links kt-body-5">
        <a v-for="(id, index) in sections" :key="id" :href="`#${id}`">{{ [m.nav.how, m.nav.features, m.nav.roles, m.nav.faq][index] }}</a>
      </div>
      <div class="right">
        <LocaleToggle class="hide-sm" />
        <RouterLink v-if="isSignedIn" class="kt-btn kt-btn--ghost kt-btn--sm hide-sm" :to="{ name: 'dashboard' }">{{ m.nav.openApp }}</RouterLink>
        <RouterLink v-else class="kt-btn kt-btn--ghost kt-btn--sm hide-sm" :to="{ name: 'login' }">{{ m.nav.signIn }}</RouterLink>
        <a class="kt-btn kt-btn--primary kt-btn--sm" href="#demo">{{ m.nav.demo }}</a>
        <button class="menu-btn" type="button" :aria-label="m.nav.menu" :aria-expanded="menuOpen" aria-controls="landing-mobile-menu" @click="menuOpen = !menuOpen">
          <span /><span /><span />
        </button>
      </div>
    </nav>
  </div>

  <div v-show="panelVisible" id="landing-mobile-menu" class="mobile-panel" :class="{ 'is-open': panelIn }">
    <a v-for="(id, index) in sections" :key="id" :href="`#${id}`" :style="{ transitionDelay: `${Math.min(index * 60, 400)}ms` }" @click="closeMenu">{{ [m.nav.how, m.nav.features, m.nav.roles, m.nav.faq][index] }}</a>
    <RouterLink :to="isSignedIn ? { name: 'dashboard' } : { name: 'login' }" :style="{ transitionDelay: '240ms' }" @click="closeMenu">{{ isSignedIn ? m.nav.openApp : m.nav.signIn }}</RouterLink>
    <LocaleToggle class="panel-locale" />
  </div>
</template>

<style scoped>
.nav-shell {
  position: sticky; z-index: 20; top: calc(env(safe-area-inset-top, 0px) + var(--kt-s-200));
  display: flex; justify-content: center;
  padding-right: max(16px, env(safe-area-inset-right, 0px)); padding-left: max(16px, env(safe-area-inset-left, 0px));
}
.nav {
  display: flex; align-items: center; gap: var(--kt-s-300); max-width: 100%;
  padding: var(--kt-s-75) var(--kt-s-75) var(--kt-s-75) var(--kt-s-200);
  border: 1px solid var(--kt-border); border-radius: var(--kt-r-16);
  background: color-mix(in srgb, var(--kt-surface) 78%, transparent);
  box-shadow: var(--kt-shadow-2);
  backdrop-filter: blur(16px) saturate(1.3); -webkit-backdrop-filter: blur(16px) saturate(1.3);
}
.brand { display: flex; align-items: center; gap: var(--kt-s-75); color: var(--kt-heading); text-decoration: none; }
.mark { display: grid; width: 32px; height: 32px; place-items: center; border-radius: var(--kt-r-8); color: var(--kt-on-action); background: var(--kt-action); font: 600 12px/16px var(--kt-font); }
.links { display: flex; gap: var(--kt-s-50); }
.links a { padding: var(--kt-s-75) var(--kt-s-100); border-radius: var(--kt-r-8); color: var(--kt-text-2); text-decoration: none; transition: background-color 200ms var(--kt-ease); }
.links a:hover { color: var(--kt-text); background: var(--kt-ghost-hover); }
.links a:focus-visible, .brand:focus-visible { outline: 2px solid var(--kt-focus); outline-offset: 2px; }
.right { display: flex; align-items: center; gap: var(--kt-s-75); }

.menu-btn { position: relative; display: none; width: 40px; height: 40px; border: 0; border-radius: var(--kt-r-8); color: var(--kt-text); background: transparent; }
.menu-btn:focus-visible { outline: 2px solid var(--kt-focus); }
.menu-btn span { position: absolute; left: 11px; width: 18px; height: 2px; border-radius: 2px; background: currentColor; transition: transform 500ms cubic-bezier(0.22, 1, 0.36, 1), opacity 300ms cubic-bezier(0.22, 1, 0.36, 1); }
.menu-btn span:nth-child(1) { top: 14px; }
.menu-btn span:nth-child(2) { top: 19px; }
.menu-btn span:nth-child(3) { top: 24px; }
.is-open .menu-btn span:nth-child(1) { transform: translateY(5px) rotate(45deg); }
.is-open .menu-btn span:nth-child(2) { opacity: 0; }
.is-open .menu-btn span:nth-child(3) { transform: translateY(-5px) rotate(-45deg); }

.mobile-panel {
  position: fixed; z-index: 15; inset: 0; display: flex; flex-direction: column; gap: var(--kt-s-100);
  padding: calc(env(safe-area-inset-top, 0px) + 96px) max(24px, env(safe-area-inset-right, 0px)) 24px max(24px, env(safe-area-inset-left, 0px));
  background: color-mix(in srgb, var(--kt-canvas) 92%, transparent);
  backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
}
.mobile-panel a { color: var(--kt-heading); font: 600 24px/32px var(--kt-font); text-decoration: none; opacity: 0; transform: translateY(24px); transition: opacity 500ms cubic-bezier(0.22, 1, 0.36, 1), transform 500ms cubic-bezier(0.22, 1, 0.36, 1); }
.mobile-panel.is-open a { opacity: 1; transform: none; }
.panel-locale { align-self: flex-start; margin-top: var(--kt-s-200); }

@media (max-width: 900px) {
  .links, .hide-sm { display: none; }
  .menu-btn { display: block; }
  .nav { width: 100%; justify-content: space-between; }
}
@media (prefers-reduced-motion: reduce) {
  .menu-btn span, .mobile-panel a { transition: opacity 150ms linear; transform: none !important; }
}
</style>
