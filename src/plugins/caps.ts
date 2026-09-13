// KOPIE aus EC-Portal/src/plugins/caps.ts (dort wiederum aus EC-Verwaltung, Stand de016c0).
// Aenderungen bitte in allen Repos spiegeln, siehe DUPLIKATE.md.
import { ref } from 'vue'
import { defineUseFunction } from './base'

export const useCaps = defineUseFunction(() => {
  const isCaps = ref(false)

  window.addEventListener('keydown', (ev: KeyboardEvent) => {
    const key = ev.key
    if (key.length === 1) {
      isCaps.value =
        key.toUpperCase() === key && key.toLowerCase() !== key && !ev.shiftKey
    } else {
      if (key === 'CapsLock') {
        isCaps.value = !isCaps.value
      }
    }
  })

  return {
    isCaps
  }
})
