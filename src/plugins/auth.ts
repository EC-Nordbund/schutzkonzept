import { computed, ref } from 'vue'
import { defineUseFunction } from './base'
import { useStorage } from '../storage'
import { useApi } from './api'

export interface SkKreis {
  ecKreisID: number
  bezeichnung: string
}

/** Antwort von GET /schutzkonzept/me */
export interface SkMe {
  /** 'email' = per Code angemeldet, 'portal' = Verwalter aus dem Portal */
  typ: 'email' | 'portal'
  name: string
  kreise: SkKreis[]
}

/**
 * Anmeldung und freigeschaltete Kreise.
 *
 * Kein Passwort: angemeldet wird mit einem 6-stelligen Code per Mail an eine
 * der Schutzkonzept-E-Mails des Kreises -- oder per Einmal-Link aus dem Portal.
 * Wie im Portal kein Refresh: ein abgelaufener Token heißt neuer Code.
 */
export const useLogin = defineUseFunction(() => {
  const { authToken, emailToken, portalToken, email } = useStorage()
  const api = useApi()

  const me = ref<SkMe | null>(null)
  const angemeldet = computed(() => !!authToken.value)
  /**
   * Zählt Abmeldungen in diesem Tab. Der Editor merkt sich den Wert beim
   * Öffnen: hat er sich geändert, ist die Sitzung, mit der der Entwurf
   * geladen wurde, vorbei -- dann nicht mehr speichern (401-Schleife bzw.
   * Speichern unter einer anderen Identität), sondern die Eingaben sichern.
   */
  const abmeldungen = ref(0)

  async function fordereCodeAn(adresse: string) {
    await api.post(
      '/schutzkonzept/login/code',
      { email: adresse },
      { auth: false, quiet: true }
    )
    email.value = adresse.trim().toLowerCase()
  }

  async function loginMitCode(adresse: string, code: string) {
    const res = await api.post<{ token: string }>(
      '/schutzkonzept/login',
      { email: adresse, code },
      { auth: false, quiet: true }
    )
    // Wer sich in diesem Tab per Code anmeldet, will die E-Mail-Sitzung --
    // eine noch liegende Übergabe des Tabs hätte sonst Vorrang.
    portalToken.value = ''
    emailToken.value = res.token
    email.value = adresse.trim().toLowerCase()
  }

  async function loginMitUebergabe(token: string) {
    const res = await api.post<{ token: string }>(
      '/schutzkonzept/login/uebergabe',
      { token },
      { auth: false, quiet: true }
    )
    // Nur für diesen Tab, siehe storage/index.ts
    portalToken.value = res.token
  }

  async function ladeMe() {
    me.value = await api.get<SkMe>('/schutzkonzept/me', { quiet: true })
    return me.value
  }

  /**
   * Meldet ab.
   *
   * `komplett` (Klick auf "Abmelden"): beide Schichten. Ein Tab kann eine
   * Übergabe aus dem Portal (sessionStorage) UND eine E-Mail-Sitzung
   * (localStorage) haben -- das ist bei einem Verwalter, der auch Kontakt
   * eines Kreises ist, der Normalfall. Bliebe die E-Mail-Sitzung stehen,
   * käme der Nächste am selben Rechner ohne Code wieder hinein, obwohl der
   * Knopf "Abmelden" heißt.
   *
   * Ohne `komplett` (automatisch nach einer 401): nur die aktive Schicht,
   * damit eine abgelaufene Übergabe die E-Mail-Sitzung der anderen Tabs
   * nicht mit abmeldet.
   */
  function logout(komplett = false) {
    if (komplett) {
      portalToken.value = ''
      emailToken.value = ''
    } else {
      authToken.value = ''
    }
    me.value = null
    abmeldungen.value++
  }

  return {
    authToken,
    email,
    me,
    angemeldet,
    abmeldungen,
    fordereCodeAn,
    loginMitCode,
    loginMitUebergabe,
    ladeMe,
    logout
  }
})
