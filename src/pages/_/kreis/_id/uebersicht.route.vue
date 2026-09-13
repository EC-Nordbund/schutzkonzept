<template lang="pug">
div
  .d-flex.align-center.flex-wrap.mb-4
    h1.text-h5(v-font, v-primary) {{ daten ? daten.kreis.bezeichnung : 'Schutzkonzept' }}
    v-spacer
    v-btn(icon='replay', variant='text', title='Neu laden', :loading='laedt', @click='laden')

  v-progress-linear.mb-4(v-if='laedt && !daten', indeterminate, color='primary')

  template(v-if='daten')
    v-alert.mb-4(v-if='!daten.aktuelleFormularVersion', type='info', variant='tonal')
      | Noch kein Formular veröffentlicht. Sobald die Schutzkonzept-Verwaltung
      | das Formular freigibt, kannst du hier loslegen.

    //- Aktueller Arbeitsstand
    v-card.mb-4(v-else)
      v-card-title Aktueller Stand
      v-card-text
        template(v-if='daten.draft')
          .d-flex.align-center.mb-2
            span.text-body-1 Stand {{ daten.draft.versionNr }} in Bearbeitung
            v-spacer
            strong {{ daten.draft.fortschritt }} %
          v-progress-linear.mb-2(
            :model-value='daten.draft.fortschritt',
            color='primary',
            height='10',
            rounded
          )
          .text-body-2.text-medium-emphasis
            | Zuletzt gespeichert {{ datumZeit(daten.draft.geaendert) }} von {{ daten.draft.geaendertVon }}
          //- Was dem Veröffentlichen noch im Weg steht (aus dem Prüfstand des Drafts)
          .d-flex.flex-wrap.mt-3(v-if='entwurf', style='gap: 6px')
            v-chip(
              v-if='entwurf.bestaetigen',
              size='small',
              :color='entwurf.bestaetigt === entwurf.abschnitte ? "success" : undefined',
              :variant='entwurf.bestaetigt === entwurf.abschnitte ? "flat" : "tonal"',
              :prepend-icon='entwurf.bestaetigt === entwurf.abschnitte ? "verified" : "fact_check"'
            ) {{ entwurf.bestaetigt }}/{{ entwurf.abschnitte }} Abschnitte bestätigt
            v-chip(v-if='entwurf.fehlend', size='small', color='warning', variant='tonal', prepend-icon='error_outline')
              | {{ entwurf.fehlend }} Pflichtangaben offen
            v-chip(v-if='entwurf.verstoesse', size='small', color='warning', variant='tonal', prepend-icon='rule')
              | {{ entwurf.verstoesse }} Angaben außerhalb des erlaubten Bereichs
            v-chip(v-if='entwurf.bereit', size='small', color='success', variant='flat', prepend-icon='check')
              | Bereit zum Veröffentlichen
          v-alert.mt-4(v-if='daten.draft.veraltet', type='info', variant='tonal', density='compact')
            | Neue Formularversion ({{ daten.aktuelleFormularVersion.versionNr }}) –
            | beim Öffnen werden deine Angaben übernommen.
        template(v-else-if='aktuell')
          p
            | Veröffentlicht ist Stand {{ aktuell.versionNr }} vom {{ datum(aktuell.publishedAm) }}.
            | Wenn sich etwas geändert hat, lege eine Aktualisierung an – deine
            | bisherigen Angaben werden übernommen.
          v-alert.mt-4(v-if='aktuell.veraltet', type='warning', variant='tonal', density='compact')
            | Inzwischen gibt es eine neue Formularversion ({{ daten.aktuelleFormularVersion.versionNr }}).
            | Bitte das Schutzkonzept aktualisieren.
        template(v-else)
          p
            | Für {{ daten.kreis.bezeichnung }} ist noch kein Schutzkonzept veröffentlicht.
            | Das Formular führt dich Schritt für Schritt durch alle Bereiche;
            | nach jedem Schritt wird gespeichert.
      v-card-actions.flex-wrap
        template(v-if='daten.draft')
          v-btn(v-accent-bg, v-white, prepend-icon='edit', :to='bearbeitenLink') Weiter bearbeiten
          v-btn(variant='text', color='error', :loading='verwirft', @click='verwerfen') Entwurf verwerfen
        v-btn(v-else, v-accent-bg, v-white, prepend-icon='edit', :to='bearbeitenLink')
          | {{ daten.historie.length ? 'Schutzkonzept aktualisieren' : 'Schutzkonzept ausfüllen' }}

    //- Anstehende Termine aus dem zuletzt veröffentlichten Stand -- nur, wenn es welche gibt
    v-card.mb-4(v-if='aktuell && termine && termine.length')
      v-card-title Anstehende Termine
      v-card-subtitle.text-wrap Aus dem veröffentlichten Stand {{ aktuell.versionNr }}
      v-list(density='compact')
        v-list-item(
          v-for='t in termine',
          :key='`${t.feldKey}:${t.zeile ?? 0}`',
          :prepend-icon='t.tage < 0 ? "event_busy" : "event"'
        )
          v-list-item-title.text-wrap {{ t.label }}
          v-list-item-subtitle
            | {{ datumDe(t.datumISO) }} ·
            strong.ml-1(:class='t.tage < 0 ? "text-error" : t.tage <= 30 ? "text-warning" : ""') {{ wannText(t.tage) }}
      v-card-text.text-caption.text-medium-emphasis.pt-0
        | Erinnerungs-Mails gehen an die Schutzkonzept-E-Mail-Adressen des
        | Kreises: vor dem Termin, am Tag selbst und danach wöchentlich, bis
        | ein neues Datum eingetragen und veröffentlicht ist.

    //- Veröffentlichte Stände
    v-card
      v-card-title Veröffentlichte Stände
      v-card-text(v-if='daten.historie.length === 0')
        span.text-medium-emphasis Noch nichts veröffentlicht.
      v-list(v-else, lines='three')
        template(v-for='(s, i) in daten.historie', :key='s.standID')
          v-divider(v-if='i > 0')
          v-list-item
            v-list-item-title.d-flex.align-center.flex-wrap
              span Stand {{ s.versionNr }}
              v-chip.ml-2(v-if='i === 0', size='x-small', color='success', variant='flat') aktuell gültig
              v-chip.ml-2(v-if='s.veraltet', size='x-small', variant='tonal') Formularversion {{ s.formularVersionNr }}
            v-list-item-subtitle
              | veröffentlicht {{ datumZeit(s.publishedAm) }} von {{ s.publishedVon }}
            .d-flex.flex-wrap.mt-2(style='gap: 8px')
              v-btn(
                v-for='p in s.pdfs',
                :key='p.pdfID',
                size='small',
                variant='tonal',
                prepend-icon='picture_as_pdf',
                :loading='pdfLaedt === p.pdfID',
                @click='pdf(p)'
              ) {{ pdfName(p) }}
              v-btn(
                size='small',
                variant='text',
                prepend-icon='visibility',
                :to='`/kreis/${daten.kreis.ecKreisID}/stand/${s.standID}`'
              ) Ansehen
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useApi } from '../../../../plugins/api'
import { useDialog } from '../../../../plugins/dialog'
import { useRouter } from '../../../../plugins/router'
import saveBlob from '../../../../util/download.util'
import { datum, datumZeit, groesse } from '../../../../util/format'
import {
  erinnerungsTermine,
  heuteISO,
  type ErinnerungsTermin
} from '../../../../schutzkonzept/definition'
import type {
  KreisUebersicht,
  PdfInfo,
  StandDetail
} from '../../../../schutzkonzept/typen'

const { route } = useRouter()
const api = useApi()
const { error, notifyInfo } = useDialog()

const daten = ref<KreisUebersicht | null>(null)
const laedt = ref(false)
const verwirft = ref(false)
const pdfLaedt = ref<number | null>(null)

const id = computed(() => Number(route.value.params.id))
const aktuell = computed(() => daten.value?.historie[0] ?? null)
const bearbeitenLink = computed(() => `/kreis/${id.value}/bearbeiten`)

/**
 * Kreis, dessen Daten gerade angezeigt werden. Alle Aktionen (Verwerfen,
 * PDF) hängen daran und nicht an der Route: beim Wechsel über die
 * Kreis-Auswahl wird diese Seite wiederverwendet, und bis die Antwort für
 * den neuen Kreis da ist -- oder wenn sie ausbleibt -- stünde sonst der
 * alte Kreis auf dem Bildschirm, während `id` schon der neue ist. Ein
 * "Entwurf verwerfen" ginge dann mit der Revision des alten an den neuen.
 */
const geladeneKreisId = computed(() => daten.value?.kreis.ecKreisID ?? null)

/** Prüfstand des Drafts (GET stand/:standId): was dem Veröffentlichen fehlt. */
interface EntwurfsStand {
  bestaetigen: boolean
  bestaetigt: number
  abschnitte: number
  fehlend: number
  verstoesse: number
  bereit: boolean
}
const entwurf = ref<EntwurfsStand | null>(null)

/** Erinnerungstermine des zuletzt veröffentlichten Stands, mit Tagen bis dahin. */
type Termin = ErinnerungsTermin & { tage: number }
const termine = ref<Termin[] | null>(null)

/** Laufende Nummer des letzten Ladevorgangs -- ältere Antworten verfallen. */
let ladeNr = 0

async function laden() {
  const kreisId = id.value
  if (!Number.isInteger(kreisId) || kreisId <= 0) return
  const nr = ++ladeNr
  laedt.value = true
  try {
    const d = await api.get<KreisUebersicht>(`/schutzkonzept/kreis/${kreisId}`)
    // Inzwischen ein anderer Kreis gewählt oder neu geladen: diese Antwort
    // gehört nicht mehr zur Anzeige.
    if (nr !== ladeNr || d.kreis.ecKreisID !== kreisId) return
    daten.value = d
    entwurf.value = null
    termine.value = null
    await Promise.all([ladeEntwurf(d, nr), ladeTermine(d, nr)])
  } catch {
    /* Fehlerdialog kommt aus dem API-Client */
  } finally {
    if (nr === ladeNr) laedt.value = false
  }
}

/**
 * Bestätigungsstand und offene Punkte des Drafts. Die Übersicht der API
 * kennt nur den Fortschritt; der Prüfstand steckt in der Stand-Antwort.
 * Scheitert das, bleibt die Karte ohne die Chips -- kein Dialog.
 */
async function ladeEntwurf(d: KreisUebersicht, nr: number) {
  if (!d.draft) return
  try {
    const s = await api.get<StandDetail>(
      `/schutzkonzept/kreis/${d.kreis.ecKreisID}/stand/${d.draft.standID}`,
      { quiet: true }
    )
    if (nr !== ladeNr) return
    const abschnitte = s.definition.bereiche.reduce(
      (n, b) => n + b.abschnitte.length,
      0
    )
    const fehlend = s.fehlend?.length ?? 0
    const verstoesse = s.verstoesse?.length ?? 0
    const unbestaetigt = s.unbestaetigt?.length ?? 0
    entwurf.value = {
      bestaetigen: s.definition.einstellungen?.abschnitteBestaetigen === true,
      bestaetigt: (s.stand.abschnitteBestaetigt ?? []).length,
      abschnitte,
      fehlend,
      verstoesse,
      bereit: fehlend === 0 && verstoesse === 0 && unbestaetigt === 0
    }
  } catch {
    /* nur Zusatzinfo */
  }
}

/**
 * Anstehende Termine: es gibt dafür keine Kreis-Route im Ausfüll-System,
 * deshalb lokal aus dem zuletzt veröffentlichten Stand gerechnet
 * (erinnerungsTermine, dieselbe Grundlage wie der Erinnerungs-Job der
 * API). `heute` kommt aus der Antwort (Server-Zeit), damit die Tage mit
 * den Mails übereinstimmen.
 */
async function ladeTermine(d: KreisUebersicht, nr: number) {
  const letzter = d.historie[0]
  if (!letzter) return
  try {
    const s = await api.get<StandDetail>(
      `/schutzkonzept/kreis/${d.kreis.ecKreisID}/stand/${letzter.standID}`,
      { quiet: true }
    )
    if (nr !== ladeNr) return
    const heute = s.heute || heuteISO()
    termine.value = erinnerungsTermine(s.definition, s.stand.daten)
      .map((t) => ({ ...t, tage: tageBis(t.datumISO, heute) }))
      .sort((a, b) => a.tage - b.tage)
  } catch {
    /* nur Zusatzinfo */
  }
}

/** Ganze Tage von `heute` bis `iso` (negativ = vergangen), beide JJJJ-MM-TT. */
function tageBis(iso: string, heute: string): number {
  const a = Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10))
  const b = Date.UTC(
    +heute.slice(0, 4),
    +heute.slice(5, 7) - 1,
    +heute.slice(8, 10)
  )
  return Math.round((a - b) / 86400000)
}

function wannText(tage: number): string {
  if (tage === 0) return 'heute'
  if (tage === 1) return 'morgen'
  if (tage === -1) return 'seit gestern überfällig'
  if (tage < 0) return `seit ${-tage} Tagen überfällig`
  return `in ${tage} Tagen`
}

const datumDe = (iso: string) =>
  `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}`

watch(
  id,
  () => {
    // Erst leeren, dann laden: nichts vom vorigen Kreis stehen lassen.
    daten.value = null
    entwurf.value = null
    termine.value = null
    laden()
  },
  { immediate: true }
)

async function verwerfen() {
  const d = daten.value?.draft
  const kreisId = geladeneKreisId.value
  if (!d || !kreisId) return
  if (kreisId !== id.value) {
    error({
      title: 'Bitte neu laden',
      text: 'Die Anzeige gehört zu einem anderen EC-Kreis als die Adresse. Bitte die Seite neu laden.'
    })
    return
  }
  if (
    !window.confirm(
      `Stand ${d.versionNr} (in Bearbeitung) von ${daten.value!.kreis.bezeichnung} wirklich verwerfen? Alle Änderungen seit der letzten Veröffentlichung gehen verloren.`
    )
  )
    return
  verwirft.value = true
  try {
    await api.request(`/schutzkonzept/kreis/${kreisId}/draft`, {
      method: 'DELETE',
      body: { revision: d.revision }
    })
    notifyInfo('Entwurf verworfen.')
  } catch {
    /* Dialog */
  } finally {
    verwirft.value = false
    laden()
  }
}

function pdfName(p: PdfInfo) {
  return `${p.dateiname.replace(/\.pdf$/i, '')} (${groesse(p.groesse)})`
}

async function pdf(p: PdfInfo) {
  const kreisId = geladeneKreisId.value
  if (!kreisId) return
  pdfLaedt.value = p.pdfID
  try {
    const r = await api.requestBlob(
      `/schutzkonzept/kreis/${kreisId}/pdf/${p.pdfID}`
    )
    saveBlob(r.dateiname, r.blob)
  } catch {
    /* Dialog */
  } finally {
    pdfLaedt.value = null
  }
}
</script>
