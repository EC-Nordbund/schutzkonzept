<template lang="pug">
v-app
  v-app-bar(v-accent-bg, density='comfortable')
    v-toolbar-title.text-white(style='min-width: 120px')
      router-link.text-white.text-decoration-none(to='/home') Schutzkonzept
    template(v-if='me && me.kreise.length > 1')
      v-select.kreis-auswahl.mr-2(
        :model-value='aktuellerKreis',
        :items='me.kreise',
        item-title='bezeichnung',
        item-value='ecKreisID',
        density='compact',
        variant='solo-filled',
        flat,
        hide-details,
        placeholder='EC-Kreis wählen',
        @update:model-value='kreisWechseln'
      )
    v-spacer
    template(v-if='me')
      v-chip.mr-2(v-if='me.typ === "portal"', size='small', color='white', variant='outlined') Verwaltung
      span.text-white.text-body-2.mr-2.d-none.d-sm-inline {{ me.name }}
    v-btn(icon, variant='text', :title='dark ? "Helles Design" : "Dunkles Design"', @click='dark = !dark')
      v-icon(color='white') {{ dark ? 'light_mode' : 'dark_mode' }}
    v-btn(icon, variant='text', title='Abmelden', @click='abmelden')
      v-icon(color='white') logout

  v-main
    v-container.pa-2.pa-sm-4(style='max-width: 1100px')
      router-view(v-if='geladen', v-slot='{ Component }')
        component(:is='Component', :me='me', @reload='laden')
      v-alert.ma-4(v-else-if='ladeFehler', type='warning', variant='tonal')
        | Die Anmeldung konnte nicht geprüft werden: {{ ladeFehler }}
        template(#append)
          v-btn(variant='text', :loading='laedt', @click='laden') Erneut versuchen
      .pa-8.text-center(v-else)
        v-progress-circular(indeterminate, color='primary')

  ec-dialog-host
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { isNavigationFailure } from 'vue-router'
import { useTheme } from 'vuetify'
import { useLogin } from '../plugins/auth'
import { ApiError, useApi } from '../plugins/api'
import { useDialog } from '../plugins/dialog'
import { useRouter } from '../plugins/router'
import { useStorage } from '../storage'

/**
 * Layout und Zugangsschutz. Wie im Portal ohne Router-Guard: ohne Token geht
 * es zum Login, und lehnt /schutzkonzept/me den Token ab (abgelaufen, Adresse
 * inzwischen entfernt), ebenfalls.
 */
const { me, ladeMe, logout, authToken } = useLogin()
const { route, router } = useRouter()
const { dark, portalToken } = useStorage()
const api = useApi()
const { error, notifyInfo } = useDialog()

const geladen = ref(false)
const laedt = ref(false)
const ladeFehler = ref('')

const theme = useTheme()
watch(dark, (v) => theme.change(v ? 'dark' : 'light'), { immediate: true })

const aktuellerKreis = computed(() => {
  const id = Number(route.value.params.id)
  return Number.isInteger(id) && id > 0 ? id : null
})

function kreisWechseln(id: number) {
  if (id) router.push(`/kreis/${id}/uebersicht`)
}

async function zumLogin() {
  const warUebergabe = !!portalToken.value
  logout()
  // Übergabe abgelaufen, aber im Browser liegt noch eine E-Mail-Sitzung:
  // `authToken` fällt still auf sie zurück und die Login-Seite schickt sofort
  // wieder in den Editor -- der Nutzer arbeitete unbemerkt unter einer
  // anderen Identität weiter, womöglich mit anderen Kreisen. Also sagen, was
  // passiert ist, und `me` neu laden (auf /home, weil der Kreis der Übergabe
  // der E-Mail-Adresse nicht freigeschaltet sein muss).
  if (warUebergabe && authToken.value) {
    notifyInfo(
      'Deine Anmeldung aus dem Portal ist abgelaufen. Du arbeitest jetzt wieder mit deiner E-Mail-Anmeldung.'
    )
    await router.push('/home')
    await laden()
    return
  }
  // Mehrere parallele Requests können gleichzeitig 401 liefern -- nicht
  // jedes Mal eine neue Navigation starten.
  if (route.value.path === '/login') return
  router.push({ path: '/login', query: { next: route.value.fullPath } })
}

/**
 * Erst wegnavigieren, dann abmelden: der Leave-Guard des Editors speichert
 * ungespeicherte Eingaben noch mit dem gültigen Token. Andersherum lief er
 * ohne Token in eine 401 und von dort in eine Schleife aus Speicherversuchen.
 * `abgemeldet` hält die Login-Seite davon ab, mit dem noch gesetzten Token
 * gleich wieder weiterzuleiten.
 *
 * `logout(true)` räumt beide Sitzungsschichten: wer hier klickt, will ganz
 * heraus -- auch aus einer parallel liegenden E-Mail-Sitzung (siehe auth.ts).
 */
async function abmelden() {
  const fehler = await router.push({
    path: '/login',
    query: { abgemeldet: '1' }
  })
  // Abgebrochen (z. B. "Seite verlassen?" verneint): angemeldet bleiben
  if (isNavigationFailure(fehler)) return
  logout(true)
}

/**
 * Nur eine 401 heißt "abgemeldet" -- die behandelt schon der
 * Unauthorized-Handler. Netzwerkfehler, API-Neustart (5xx) oder 429 dürfen
 * den Token nicht löschen: einen neuen Code gibt es nur wenige Male pro
 * Stunde, und eine Übergabe aus dem Portal lässt sich hier gar nicht neu
 * anfordern.
 */
async function laden() {
  laedt.value = true
  try {
    await ladeMe()
    ladeFehler.value = ''
    geladen.value = true
  } catch (err: any) {
    if (err instanceof ApiError && err.status === 401) return
    const text = err?.message || String(err)
    // Beim ersten Laden ersetzt die Meldung die Seite, bei einem späteren
    // @reload bleibt die Seite stehen und es gibt nur den Dialog.
    if (geladen.value) error({ title: 'Laden fehlgeschlagen', text })
    else ladeFehler.value = text
  } finally {
    laedt.value = false
  }
}

onMounted(() => {
  api.setUnauthorizedHandler(zumLogin)
  if (!authToken.value) {
    zumLogin()
    return
  }
  laden()
})
</script>

<style scoped>
.kreis-auswahl {
  max-width: 260px;
}
</style>
