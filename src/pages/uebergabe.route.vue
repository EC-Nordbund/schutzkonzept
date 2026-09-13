<template lang="pug">
v-app
  v-main
    .ec-alignCenter.pa-4
      v-card(min-width='300px', max-width='440px')
        v-card-title
          h1(v-font, v-primary) Schutzkonzept
        v-card-text(v-if='!fehler')
          .d-flex.align-center
            v-progress-circular.mr-4(indeterminate, color='primary')
            span Anmeldung aus dem Portal …
        template(v-else)
          v-card-text
            v-alert(type='warning', variant='tonal') {{ fehler }}
            p.mt-4
              | Öffne das Schutzkonzept bitte erneut aus dem Portal – der Link
              | gilt nur wenige Minuten und genau einmal.
          v-card-actions
            v-spacer
            v-btn(variant='text', to='/login') Zur Anmeldung
  ec-dialog-host
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useLogin } from '../plugins/auth'
import { useRouter } from '../plugins/router'
import { useStorage } from '../storage'

/**
 * Einstieg für Schutzkonzept-Verwalter aus dem Portal.
 *
 * Das Portal erzeugt einen Einmal-Link (#/uebergabe?token=...), der für genau
 * einen EC-Kreis gilt. Er wird sofort eingelöst und aus der Adresszeile
 * entfernt; danach arbeitet der Verwalter wie ein Kreis-Nutzer.
 *
 * Kein allgemeines logout(): die Übergabe-Sitzung liegt je Tab im
 * sessionStorage (storage/index.ts), eine E-Mail-Sitzung in anderen Tabs
 * bleibt davon unberührt. Ersetzt wird nur eine ältere Übergabe DIESES Tabs.
 */
const { route, router } = useRouter()
const { loginMitUebergabe, ladeMe } = useLogin()
const { portalToken } = useStorage()
const fehler = ref('')

onMounted(async () => {
  const token = route.value.query.token as string | undefined
  router.replace('/uebergabe')
  if (!token) {
    fehler.value = 'Der Link ist unvollständig.'
    return
  }
  try {
    portalToken.value = ''
    await loginMitUebergabe(token)
    const me = await ladeMe()
    const k = me.kreise[0]
    router.replace(k ? `/kreis/${k.ecKreisID}/uebersicht` : '/home')
  } catch (err: any) {
    portalToken.value = ''
    fehler.value =
      err?.status === 410
        ? 'Dieser Link ist abgelaufen oder wurde schon benutzt.'
        : err?.message || String(err)
  }
})
</script>
