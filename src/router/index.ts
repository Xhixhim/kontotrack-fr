import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import DashboardView from '../views/DashboardView.vue'
import LoginView from '../views/LoginView.vue'
import LandingView from '../views/LandingView.vue'
import BusinessWorkspaceView from '../views/BusinessWorkspaceView.vue'
import ComplianceSettingsView from '../views/ComplianceSettingsView.vue'
import InvoicePrintView from '../views/InvoicePrintView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: DashboardView,
      meta: { requiresAuth: true },
    },
    {
      path: '/welcome',
      name: 'landing',
      component: LandingView,
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
    },
    {
      path: '/businesses/:businessId',
      name: 'business',
      component: BusinessWorkspaceView,
      meta: { requiresAuth: true },
    },
    {
      path: '/businesses/:businessId/invoices/:invoiceId/print',
      name: 'invoice-print',
      component: InvoicePrintView,
      meta: { requiresAuth: true },
    },
    {
      path: '/settings/compliance',
      name: 'compliance-settings',
      component: ComplianceSettingsView,
      meta: { requiresAuth: true, requiresSystemAdmin: true },
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  if (!auth.initialized) {
    await auth.fetchUser()
  }

  if (to.meta.requiresAuth === true && !auth.user) {
    // Guests opening the app root see the public landing page; deep links go to sign in and come back after.
    if (to.name === 'dashboard') return { name: 'landing' }
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if ('requiresSystemAdmin' in to.meta && to.meta.requiresSystemAdmin === true && auth.user?.is_system_admin !== true) {
    return { name: 'dashboard' }
  }

  if (to.name === 'login' && auth.user) {
    return { name: 'dashboard' }
  }
})

export default router
