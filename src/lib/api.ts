import axios from 'axios'
import { locale } from '@/lib/locale'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  withCredentials: true,
  withXSRFToken: true,
  headers: {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
})

// The API answers errors, checks and reminders in the language of the interface.
api.interceptors.request.use((config) => {
  config.headers.set('Accept-Language', locale.value)
  return config
})

export async function initializeCsrf(): Promise<void> {
  await api.get('/sanctum/csrf-cookie')
}

export default api
