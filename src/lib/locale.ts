import { computed, ref, watch } from 'vue'

export type Locale = 'sq' | 'en'

const STORAGE_KEY = 'kt-locale'

function readStoredLocale(): Locale {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'sq'
  } catch {
    return 'sq'
  }
}

/** Albanian first; English is a per-browser preference. */
export const locale = ref<Locale>(readStoredLocale())

watch(
  locale,
  (value) => {
    document.documentElement.lang = value
    try {
      localStorage.setItem(STORAGE_KEY, value)
    } catch {
      // Storage can be blocked (private mode); the toggle still works for this visit.
    }
  },
  { immediate: true },
)

export function setLocale(value: Locale): void {
  locale.value = value
}

/** Picks the message set for the current locale. */
export function useMessages<T>(messages: Record<Locale, T>) {
  return computed(() => messages[locale.value])
}
