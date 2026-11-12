import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import api, { initializeCsrf } from '@/lib/api'

export interface AuthUser {
  id: number
  name: string
  email: string
  is_system_admin: boolean
  two_factor_enabled?: boolean
  email_notifications?: boolean
}

interface UserResponse {
  data: AuthUser
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null)
  const initialized = ref(false)
  const isAuthenticated = computed(() => user.value !== null)

  async function fetchUser(): Promise<void> {
    try {
      const response = await api.get<UserResponse>('/api/v1/me')
      user.value = response.data.data
    } catch {
      user.value = null
    } finally {
      initialized.value = true
    }
  }

  async function login(email: string, password: string, code?: string, recoveryCode?: string, remember = false): Promise<void> {
    await initializeCsrf()
    const response = await api.post<UserResponse>('/api/v1/login', { email, password, code: code || undefined, recovery_code: recoveryCode || undefined, remember })
    user.value = response.data.data
    initialized.value = true
  }

  async function logout(): Promise<void> {
    await api.post('/api/v1/logout')
    user.value = null
    initialized.value = true
  }

  return { user, initialized, isAuthenticated, fetchUser, login, logout }
})
