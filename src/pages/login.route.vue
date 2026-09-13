<template lang="pug">
v-app
  v-main
    .ec-alignCenter.pa-4
      v-card(min-width='300px', max-width='440px')
        v-card-title.d-flex.align-center
          h1(v-font, v-primary) Schutzkonzept
          v-spacer
          img(width='64px', src='../assets/ec-logo-without-bg-512.png', alt='')
        v-card-subtitle Für die EC-Kreise im EC-Nordbund

        //- Schritt 1: E-Mail
        template(v-if='schritt === "email"')
          v-card-text
            p.mb-4
              | Melde dich mit der E-Mail-Adresse an, die für deinen EC-Kreis als
              | Schutzkonzept-Adresse hinterlegt ist. Du bekommst einen
              | sechsstelligen Code per Mail.
            v-form(v-model='valid', @submit.prevent='codeAnfordern')
              v-text-field(
                label='E-Mail-Adresse',
                type='email',
                autocomplete='email',
                v-model='adresse',
                autofocus,
                :rules='[(v) => (/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test((v || "").trim()) ? true : "Bitte eine gültige E-Mail-Adresse angeben.")]'
              )
          v-card-actions
            v-spacer
            v-btn(
              v-accent-bg,
              v-white,
              :disabled='!valid || laedt',
              :loading='laedt',
              @click='codeAnfordern'
            ) Code anfordern

        //- Schritt 2: Code
        template(v-else)
          v-card-text
            v-alert.mb-4(v-if='ausLink', type='info', variant='tonal', density='compact')
              | Adresse und Code aus der Mail sind eingetragen. Klicke auf
              | <strong>Anmelden</strong>, um dich anzumelden.
            v-alert.mb-4(v-else, type='info', variant='tonal', density='compact')
              | Wenn die Adresse <strong>{{ adresse }}</strong> hinterlegt ist,
              | kommt gleich eine Mail mit dem Code. Er ist 15 Minuten gültig.
            v-otp-input(
              v-model='code',
              length='6',
              type='number',
              :disabled='laedt',
              autofocus,
              @finish='codeVollstaendig'
            )
            v-alert.mt-2(v-if='fehler', type='error', variant='tonal', density='compact') {{ fehler }}
          v-card-actions.flex-wrap
            v-btn(variant='text', size='small', @click='andereEmail') Andere E-Mail
            v-btn(variant='text', size='small', :disabled='laedt || wartenBis > jetzt', @click='codeAnfordern')
              | Code erneut senden{{ wartenBis > jetzt ? ` (${Math.ceil((wartenBis - jetzt) / 1000)} s)` : '' }}
            v-spacer
            v-btn(
              v-accent-bg,
              v-white,
              :disabled='code.length !== 6 || laedt',
              :loading='laedt',
              @click='anmelden'
            ) Anmelden
  ec-dialog-host
</template>

<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useTheme } from 'vuetify'
import { useStorage } from '../storage'
import { useLogin } from '../plugins/auth'
import { useRouter } from '../plugins/router'
import { useDialog } from '../plugins/dialog'

/**
 * Anmeldung per Code statt Passwort.
 *
 * Die Schutzkonzept-Adressen gehören oft einem Kreis und nicht einer Person
 * (z. B. vorstand@...), mehrere Leute teilen sie sich. Ein Passwort müsste
 * dann herumgereicht werden -- ein Code an die Adresse nicht.
 */
const { dark, email: gemerkteEmail } = useStorage()
const { route, router } = useRouter()
const { fordereCodeAn, loginMitCode, authToken } = useLogin()
const { error } = useDialog()

const schritt = ref<'email' | 'code'>('email')
const adresse = ref(gemerkteEmail.value || '')
const code = ref('')
const valid = ref(false)
const laedt = ref(false)
const fehler = ref('')
/**
 * Adresse und Code kamen aus dem Link der Mail. Dann wird NICHT automatisch
 * angemeldet: Mail-Scanner (Defender Safe Links, Mimecast, ...) öffnen Links
 * in einem echten Browser -- eine automatische Anmeldung verbrauchte den
 * Einmal-Code schon bei der Zustellung, und der Mensch bekäme nur noch
 * "Der Code ist falsch oder abgelaufen." Erst ein Klick auf "Anmelden" löst
 * den Code ein.
 */
const ausLink = ref(false)

// Kurze Sperre für "erneut senden" -- die API bremst ohnehin, so gibt es
// aber keine verwirrende 429-Meldung.
const wartenBis = ref(0)
const jetzt = ref(Date.now())
const uhr = setInterval(() => (jetzt.value = Date.now()), 1000)
onUnmounted(() => clearInterval(uhr))

const theme = useTheme()
watch(dark, (v) => theme.change(v ? 'dark' : 'light'), { immediate: true })

function weiter() {
  const next = route.value.query.next as string | undefined
  router.push(
    next && next.startsWith('/') && !next.startsWith('/404') ? next : '/home'
  )
}

async function codeAnfordern() {
  if (laedt.value) return
  laedt.value = true
  try {
    await fordereCodeAn(adresse.value.trim())
    schritt.value = 'code'
    code.value = ''
    fehler.value = ''
    wartenBis.value = Date.now() + 30000
  } catch (err: any) {
    error({
      title: 'Code anfordern fehlgeschlagen',
      text: err.message || String(err)
    })
  } finally {
    laedt.value = false
  }
}

async function anmelden() {
  if (laedt.value || code.value.length !== 6) return
  laedt.value = true
  fehler.value = ''
  // Ab dem ersten Klick ist es eine echte Anmeldung -- ein danach neu
  // getippter Code darf wieder automatisch abgeschickt werden.
  ausLink.value = false
  try {
    await loginMitCode(adresse.value.trim(), code.value)
    weiter()
  } catch (err: any) {
    fehler.value = err.message || String(err)
    code.value = ''
    laedt.value = false
    // Während der Prüfung ist das Feld gesperrt und verliert den Fokus --
    // damit man direkt neu tippen kann, zurück ins erste Kästchen.
    await nextTick()
    document
      .querySelector<HTMLInputElement>(
        '.v-otp-input input:not(.v-otp-input__spacer)'
      )
      ?.focus()
  } finally {
    laedt.value = false
  }
}

/**
 * Sechste Ziffer getippt: direkt anmelden. VOtpInput meldet `finish` auch,
 * wenn der Code programmatisch gesetzt wird (Watch auf das Model) -- beim
 * Vorbelegen aus dem Mail-Link darf das nicht anmelden, siehe `ausLink`.
 */
function codeVollstaendig() {
  if (ausLink.value) return
  anmelden()
}

function andereEmail() {
  schritt.value = 'email'
  code.value = ''
  fehler.value = ''
  ausLink.value = false
}

onMounted(() => {
  // Link aus der Mail: #/login?email=...&code=123456 -- nur vorbelegen,
  // angemeldet wird erst per Klick (Link-Scanner, siehe `ausLink`).
  const qEmail = route.value.query.email as string | undefined
  const qCode = route.value.query.code as string | undefined
  if (qEmail && qCode && /^\d{6}$/.test(qCode)) {
    adresse.value = qEmail
    code.value = qCode
    schritt.value = 'code'
    ausLink.value = true
    // Code nicht in der Adresszeile stehen lassen
    router.replace({
      path: '/login',
      query: route.value.query.next ? { next: route.value.query.next } : {}
    })
    return
  }
  // Nach "Abmelden" navigiert das Layout zuerst hierher und löscht den Token
  // erst danach (damit der Editor noch speichern kann) -- nicht zurückspringen.
  if (authToken.value && !route.value.query.abgemeldet) weiter()
})
</script>
