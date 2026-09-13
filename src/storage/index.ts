import { computed, effectScope } from 'vue'
import { useLocalStorage, useSessionStorage } from '@vueuse/core'
import { defineUseFunction } from '../plugins/base'

/**
 * Persistenter Zustand im localStorage.
 *
 * Eigener Präfix `ecSchutzkonzept:` -- in der Entwicklung laufen Verwaltung,
 * Portal und Schutzkonzept alle auf localhost und teilen sich damit den
 * Speicher. Drei Secrets, drei Schlüssel (siehe EC-Portal/src/storage).
 *
 * Zwei Arten von Sitzung:
 * - E-Mail-Login (Code): gilt für alle Kreise der Adresse, liegt im
 *   localStorage und damit in allen Tabs -- wer sich einmal anmeldet, will
 *   nicht in jedem Tab neu einen Code anfordern.
 * - Verwalter-Übergabe aus dem Portal: der Token gilt für genau EINEN Kreis,
 *   und das Portal öffnet jeden Kreis in einem neuen Tab. Im gemeinsamen
 *   localStorage würde der zweite Kreis dem ersten Tab den Zugang wegnehmen
 *   (403 beim Speichern). Deshalb liegt er im sessionStorage, also je Tab.
 *
 * `authToken` ist der Token, mit dem dieser Tab arbeitet: die Übergabe hat
 * Vorrang, sonst die E-Mail-Sitzung.
 */
export const useStorage = defineUseFunction(() => {
  // Eigener, losgelöster Scope: der Singleton entsteht im setup() der ersten
  // Seite, die ihn braucht. Ohne Scope hingen die Schreib-Watcher von vueuse
  // an dieser Komponente und stünden nach deren Unmount still -- ein logout()
  // nach dem Wegnavigieren (Abmelden im Layout) käme nie im Speicher an.
  const scope = effectScope(true)
  return scope.run(() => {
    const emailToken = useLocalStorage('ecSchutzkonzept:authToken', '')
    const portalToken = useSessionStorage('ecSchutzkonzept:portalToken', '')

    const authToken = computed<string>({
      get: () => portalToken.value || emailToken.value,
      // Schreiben trifft die aktive Sitzung -- wichtig für `authToken = ''`
      // bei einer 401: eine abgelaufene Übergabe darf die E-Mail-Sitzung der
      // anderen Tabs nicht mit abmelden.
      set: (v) => {
        if (portalToken.value) portalToken.value = v
        else emailToken.value = v
      }
    })

    return {
      authToken,
      emailToken,
      portalToken,
      email: useLocalStorage('ecSchutzkonzept:email', ''),
      dark: useLocalStorage('ecSchutzkonzept:dark', false)
    }
  })!
})
