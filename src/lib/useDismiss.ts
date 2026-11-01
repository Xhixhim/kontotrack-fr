import { onBeforeUnmount, watch, type Ref } from 'vue'

/**
 * Closes a popover when the user clicks outside `root` or presses Escape.
 * Focus returns to `trigger` on Escape so keyboard users keep their place.
 */
export function useDismiss(open: Ref<boolean>, root: Ref<HTMLElement | null>, trigger?: Ref<HTMLElement | null>): void {
  function onPointer(event: PointerEvent): void {
    if (root.value && !root.value.contains(event.target as Node)) open.value = false
  }

  function onKey(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      open.value = false
      trigger?.value?.focus()
    }
  }

  function detach(): void {
    document.removeEventListener('pointerdown', onPointer, true)
    document.removeEventListener('keydown', onKey)
  }

  watch(open, (value) => {
    detach()
    if (value) {
      document.addEventListener('pointerdown', onPointer, true)
      document.addEventListener('keydown', onKey)
    }
  })

  onBeforeUnmount(detach)
}
