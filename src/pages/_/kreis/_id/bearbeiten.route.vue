<template lang="pug">
div
  .d-flex.align-center.flex-wrap.mb-2
    v-btn.mr-2(icon='arrow_back', variant='text', title='Zur Übersicht', @click='zurUebersicht')
    h1.text-h5(v-font, v-primary)
      | {{ detail ? detail.kreis.bezeichnung : 'Schutzkonzept' }}
    v-spacer
    .text-body-2.text-medium-emphasis(v-if='detail')
      template(v-if='speichert') Speichert …
      template(v-else-if='ungespeichert') Ungespeicherte Änderungen
      template(v-else-if='gespeichertUm') Gespeichert um {{ gespeichertUm }}

  v-progress-linear.mb-4(v-if='laedt && !detail', indeterminate, color='primary')

  v-alert.mb-4(v-if='oeffnenFehler', type='info', variant='tonal')
    | {{ oeffnenFehler }}

  template(v-if='detail')
    //- Fortschritt über das ganze Formular
    .d-flex.align-center.mb-1
      span.text-body-2 Stand {{ detail.stand.versionNr }} · Formularversion {{ detail.stand.formularVersionNr }}
      v-spacer
      strong.text-body-1 {{ prozent }} %
    v-progress-linear.mb-1(
      :model-value='prozent',
      color='primary',
      height='10',
      rounded
    )
    .d-flex.align-center.mb-4.text-body-2(v-if='bestaetigenNoetig')
      v-icon.mr-1(
        size='small',
        :color='bestaetigtGesamt.n === bestaetigtGesamt.von ? "success" : undefined'
      ) {{ bestaetigtGesamt.n === bestaetigtGesamt.von ? 'verified' : 'fact_check' }}
      span {{ bestaetigtGesamt.n }}/{{ bestaetigtGesamt.von }} Abschnitte geprüft und bestätigt
    .mb-4(v-else)

    v-alert.mb-4(
      v-if='detail.migriert',
      type='info',
      variant='tonal',
      density='compact',
      closable
    )
      | Das Formular wurde auf Version {{ detail.migriert.nachVersionNr }} aktualisiert,
      | deine bisherigen Angaben wurden übernommen. Bitte prüfe neue oder geänderte Bereiche.

    v-stepper.mb-4(
      :model-value='schritt',
      :alt-labels='!mobil',
      :mobile='mobil',
      flat,
      @update:model-value='geheZu'
    )
      v-stepper-header.stepper-kopf
        template(v-for='(b, i) in bereiche', :key='b.id')
          v-stepper-item(
            :value='i',
            :title='b.titel',
            :subtitle='bereichUntertitel(b)',
            :complete='istFertig(b)',
            :color='istFertig(b) && bereichProzent(b) === 100 ? "success" : "primary"',
            editable,
            :edit-icon='istFertig(b) ? "check" : "edit"',
            complete-icon='check'
          )
          v-divider
        v-stepper-item(
          :value='bereiche.length',
          title='Abschluss',
          :subtitle='offenGesamt ? `${offenGesamt} offen` : "bereit"',
          :color='offenGesamt ? "warning" : "success"',
          editable,
          edit-icon='flag',
          icon='flag'
        )

    //- Ein Bereich
    template(v-if='aktuellerBereich')
      h2.text-h6.mb-1 {{ aktuellerBereich.titel }}
      .text-body-2.text-medium-emphasis.text-pre.mb-4(v-if='aktuellerBereich.beschreibung') {{ aktuellerBereich.beschreibung }}
      abschnitt(
        v-for='a in aktuellerBereich.abschnitte',
        :key='a.id',
        v-model:daten='daten',
        :abschnitt='a',
        :markiere-fehlend='markiereFehlend',
        :heute='heute',
        :bestaetigen-noetig='bestaetigenNoetig',
        :bestaetigt='istBestaetigt(a)',
        :geaendert='istGeaendert(a)',
        @update:bestaetigt='(v) => setzeBestaetigt(a, v)'
      )
      .d-flex.flex-wrap.mb-8(style='gap: 8px')
        v-btn(
          v-if='schritt > 0',
          variant='tonal',
          prepend-icon='arrow_back',
          :disabled='speichert',
          @click='geheZu(schritt - 1)'
        ) Zurück
        v-spacer
        v-btn(
          v-accent-bg,
          v-white,
          append-icon='arrow_forward',
          :loading='speichert',
          @click='geheZu(schritt + 1)'
        ) {{ schritt + 1 < bereiche.length ? 'Speichern & weiter' : 'Speichern & zum Abschluss' }}

    //- Abschluss
    template(v-else)
      v-card.mb-4
        v-card-title Abschluss
        v-card-text
          p.mb-4
            | Hier kannst du die fertigen Dokumente als Vorschau ansehen und das
            | Schutzkonzept veröffentlichen. Beim Veröffentlichen werden die
            | PDFs erzeugt und dieser Stand eingefroren.
          //- Antwort der API auf einen abgelehnten Versuch (z. B. parallel geändert)
          v-alert.mb-4(
            v-if='veroeffentlichenFehler',
            type='error',
            variant='tonal',
            closable,
            @click:close='veroeffentlichenFehler = ""'
          ) {{ veroeffentlichenFehler }}
          v-alert.mb-4(v-if='fehlend.length', type='warning', variant='tonal')
            | {{ fehlend.length === 1 ? 'Es fehlt noch eine Pflichtangabe:' : `Es fehlen noch ${fehlend.length} Pflichtangaben:` }}
          v-list.mb-4(v-if='fehlend.length', density='compact', border, rounded)
            v-list-item(
              v-for='(f, i) in fehlend',
              :key='i',
              prepend-icon='error_outline',
              @click='springeZu(f)'
            )
              v-list-item-title.text-wrap {{ f.label }}
              v-list-item-subtitle {{ bereichTitel(f.bereichId) }}
          v-alert.mb-4(v-else, type='success', variant='tonal')
            | Alle Pflichtangaben sind ausgefüllt.

          //- Zweite Sperre: Werte außerhalb der erlaubten Bereiche
          v-alert.mb-4(v-if='verstoesse.length', type='warning', variant='tonal')
            | {{ verstoesse.length === 1 ? 'Eine Angabe liegt' : `${verstoesse.length} Angaben liegen` }} außerhalb des erlaubten Bereichs:
          v-list.mb-4(v-if='verstoesse.length', density='compact', border, rounded)
            v-list-item(
              v-for='(v, i) in verstoesse',
              :key='i',
              prepend-icon='error_outline',
              @click='springeZu(v)'
            )
              v-list-item-title.text-wrap {{ v.label }}
              v-list-item-subtitle.text-wrap {{ v.text }}

          //- Dritte Sperre: jeder Abschnitt einzeln bestätigt
          template(v-if='bestaetigenNoetig')
            v-alert.mb-4(v-if='unbestaetigt.length', type='warning', variant='tonal')
              | {{ unbestaetigt.length === 1 ? 'Ein Abschnitt ist' : `${unbestaetigt.length} Abschnitte sind` }} noch nicht als geprüft bestätigt.
              | Prüfe die Angaben dort und klicke unten im Abschnitt auf „Geprüft und bestätigt“.
            v-list.mb-4(v-if='unbestaetigt.length', density='compact', border, rounded)
              v-list-item(
                v-for='(a, i) in unbestaetigt',
                :key='i',
                prepend-icon='checklist',
                @click='springeZuAbschnitt(a)'
              )
                v-list-item-title.text-wrap {{ a.titel }}
                v-list-item-subtitle {{ bereichTitel(a.bereichId) }}
            v-alert.mb-4(v-else, type='success', variant='tonal')
              | Alle Abschnitte sind als geprüft bestätigt.

          h3.text-subtitle-1.mb-2 Vorschau
          .d-flex.flex-wrap.mb-2(style='gap: 8px')
            v-btn(
              v-for='v in detail.vorlagen',
              :key='v.vorlageID',
              variant='tonal',
              prepend-icon='picture_as_pdf',
              :loading='vorschauLaedt === v.vorlageID',
              @click='vorschau(v.vorlageID)'
            ) {{ v.bezeichnung }}
          .text-caption.text-medium-emphasis Die Vorschau ist mit „ENTWURF“ gekennzeichnet und wird nicht gespeichert.
        v-card-actions.flex-wrap
          v-btn(variant='tonal', prepend-icon='arrow_back', @click='geheZu(bereiche.length - 1)') Zurück
          v-spacer
          v-btn(
            v-accent-bg,
            v-white,
            prepend-icon='publish',
            :disabled='!veroeffentlichbar || veroeffentlicht',
            :loading='veroeffentlicht',
            @click='bestaetigen = true'
          ) Veröffentlichen

  //- Bestätigung vor dem Veröffentlichen
  v-dialog(v-model='bestaetigen', max-width='480px')
    v-card
      v-card-title Schutzkonzept veröffentlichen?
      v-card-text
        | Danach ist dieser Stand eingefroren; spätere Änderungen erzeugen einen
        | neuen Stand. Das Erzeugen der PDFs dauert einige Sekunden.
      v-card-actions
        v-spacer
        v-btn(variant='text', @click='bestaetigen = false') Abbrechen
        v-btn(v-accent-bg, v-white, @click='veroeffentlichen') Veröffentlichen

  //- Jemand anderes hat gespeichert / neue Formularversion
  v-dialog(v-model='konflikt.offen', max-width='480px', persistent)
    v-card
      v-card-title Neu laden nötig
      v-card-text {{ konflikt.text }}
      v-card-actions
        v-spacer
        v-btn(v-accent-bg, v-white, @click='neuLaden') Neu laden

  v-overlay.align-center.justify-center(:model-value='veroeffentlicht', persistent)
    v-card.pa-6.text-center
      v-progress-circular.mb-4(indeterminate, color='primary', size='48')
      div PDFs werden erzeugt …
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch
} from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { useDisplay } from 'vuetify'
import Abschnitt from '../../../../schutzkonzept/abschnitt.vue'
import {
  abschnittsHash,
  alleFelder,
  felderVonBereich,
  fortschritt,
  fortschrittBereich,
  hatDaten,
  heuteISO,
  migriereDaten,
  type Abschnitt as AbschnittDef,
  type AbschnittRef,
  type Bereich,
  type Daten,
  type Definition,
  type Feld,
  type Fehlend,
  type Verstoss
} from '../../../../schutzkonzept/definition'
import type {
  BereichGespeichert,
  StandDetail
} from '../../../../schutzkonzept/typen'
import { ApiError, useApi } from '../../../../plugins/api'
import { useLogin } from '../../../../plugins/auth'
import { useDialog } from '../../../../plugins/dialog'
import { useRouter } from '../../../../plugins/router'
import saveBlob from '../../../../util/download.util'
import { uhrzeit } from '../../../../util/format'

/**
 * Ausfüllen eines Stands: ein Schritt je Bereich, eine Card je Abschnitt.
 *
 * Gespeichert wird bereichsweise beim Verlassen eines Schritts (Weiter,
 * Zurück, Klick in den Stepper). Die API übernimmt nur die Felder dieses
 * Bereichs; die `revision` schützt davor, dass zwei Personen mit derselben
 * Kreis-Adresse sich gegenseitig überschreiben.
 */
const { route, router } = useRouter()
const api = useApi()
const { authToken, abmeldungen, me } = useLogin()
const { error, notifyInfo } = useDialog()
const { smAndDown } = useDisplay()
const mobil = computed(() => smAndDown.value)

const id = computed(() => Number(route.value.params.id))

const detail = ref<StandDetail | null>(null)
const daten = ref<Daten>({})
const revision = ref(0)
const bereicheGespeichert = ref<string[]>([])
const fehlend = ref<Fehlend[]>([])
/** Werte außerhalb der erlaubten Bereiche (feld.regeln) -- zweite Sperre. */
const verstoesse = ref<Verstoss[]>([])
/** Server-Datum (Europe/Berlin) für relative Datumsregeln; bis zur Antwort das des Browsers. */
const heute = ref(heuteISO())
/** Meldung der API, wenn das Veröffentlichen abgelehnt wurde. */
const veroeffentlichenFehler = ref('')
const schritt = ref(0)
const laedt = ref(false)
const veroeffentlicht = ref(false)
const bestaetigen = ref(false)
const markiereFehlend = ref(false)
const gespeichertUm = ref('')
const vorschauLaedt = ref<number | null>(null)
const oeffnenFehler = ref('')
const konflikt = reactive({ offen: false, text: '' })

/**
 * Zuletzt geladener bzw. an die API gesendeter Wert je Schlüssel (als JSON)
 * -- Grundlage für "ungespeichert". Je Schlüssel statt eines Abbilds aller
 * Daten: ein PUT überträgt nur die Felder EINES Bereichs, und nur genau die
 * gesendeten Werte dürfen danach als gespeichert gelten. Was während eines
 * laufenden Requests getippt wird, bleibt so ungespeichert und geht beim
 * nächsten Speichern mit.
 */
const gespeichert = ref<Record<string, string>>({})

/**
 * Abmeldezähler beim Öffnen. Ändert er sich, ist die Sitzung, mit der der
 * Entwurf geladen wurde, vorbei (401 oder Abmelden). Dann wird nicht mehr
 * gespeichert -- ohne Token gäbe es nur weitere 401 und damit eine Schleife
 * aus Navigation, Leave-Guard und Speicherversuch.
 */
let abmeldungenBeimOeffnen = abmeldungen.value
const sitzungVorbei = () =>
  !authToken.value || abmeldungen.value !== abmeldungenBeimOeffnen

const bereiche = computed<Bereich[]>(
  () => detail.value?.definition.bereiche ?? []
)
const aktuellerBereich = computed<Bereich | null>(
  () => bereiche.value[schritt.value] ?? null
)
const prozent = computed(() =>
  detail.value ? fortschritt(detail.value.definition, daten.value) : 0
)

/** Die flachen Schlüssel eines Felds (multiselect: ein Flag je Option). */
function keysVon(f: Feld): string[] {
  if (!hatDaten(f.typ) || !f.key) return []
  return f.typ === 'multiselect'
    ? f.optionen.map((o) => `${f.key}_${o.key}`)
    : [f.key]
}

const alsJson = (v: unknown) => (v === undefined ? '' : JSON.stringify(v))

function abbild(d: Record<string, unknown>): Record<string, string> {
  const r: Record<string, string> = {}
  for (const k of Object.keys(d)) r[k] = alsJson(d[k])
  return r
}

/** Schlüssel der aktuellen Definition, deren Wert vom gespeicherten abweicht. */
const geaenderteKeys = computed<string[]>(() => {
  if (!detail.value) return []
  return alleFelder(detail.value.definition)
    .flatMap(keysVon)
    .filter((k) => alsJson(daten.value[k]) !== (gespeichert.value[k] ?? ''))
})
const ungespeichert = computed(() => geaenderteKeys.value.length > 0)
/** Werte ODER Haken, die die API noch nicht kennt. */
const nichtGespeichert = computed(
  () => ungespeichert.value || bereiche.value.some(bestaetigungOffen)
)

const bereichProzent = (b: Bereich) => fortschrittBereich(b, daten.value)
const istGespeichert = (b: Bereich) => bereicheGespeichert.value.includes(b.id)
const bereichTitel = (bid: string) =>
  bereiche.value.find((b) => b.id === bid)?.titel ?? ''

/** Nur die Schlüssel eines Bereichs (inkl. key_option-Flags und Tabellen). */
function werteVon(b: Bereich): Record<string, unknown> {
  const w: Record<string, unknown> = {}
  for (const f of felderVonBereich(b))
    for (const k of keysVon(f)) w[k] = daten.value[k]
  return w
}

/* ------------------------------------------- Abschnitte "geprüft und bestätigt" */

/**
 * Jeder Abschnitt muss einzeln bestätigt werden, wenn das Formular es
 * verlangt -- sonst lehnt die API das Veröffentlichen mit
 * SECTIONS_UNCONFIRMED ab. Die Bestätigung fällt serverseitig weg, sobald
 * sich ein Wert des Abschnitts ändert (aktualisiereBestaetigungen), deshalb
 * ist `bestaetigtServer` die Wahrheit und `bestaetigt` nur der lokale Stand
 * inklusive noch nicht gesendeter Haken.
 */
const bestaetigt = ref<string[]>([])
const bestaetigtServer = ref<string[]>([])
/**
 * Fingerabdruck der Werte je bestätigtem Abschnitt zum Zeitpunkt der
 * Bestätigung bzw. des letzten Speicherns (abschnittsHash, dieselbe
 * Rechnung wie im Server). Weicht der aktuelle Fingerabdruck ab, wurde seit
 * der Bestätigung etwas geändert: der Haken gilt nicht mehr ("bitte erneut
 * bestätigen") und die ID geht beim Speichern nicht mit -- genau wie die API
 * ihn dann auch streichen würde.
 */
const bestaetigtHash = ref<Record<string, string>>({})
const bestaetigenNoetig = computed(
  () => detail.value?.definition.einstellungen?.abschnitteBestaetigen === true
)

const hashJetzt = (a: AbschnittDef) => abschnittsHash(a, daten.value)

/** Bestätigt UND seither unverändert. */
const istBestaetigt = (a: AbschnittDef) =>
  bestaetigt.value.includes(a.id) && bestaetigtHash.value[a.id] === hashJetzt(a)

/** War bestätigt, seit der Bestätigung aber geändert. */
const istGeaendert = (a: AbschnittDef) =>
  bestaetigt.value.includes(a.id) && bestaetigtHash.value[a.id] !== hashJetzt(a)

/**
 * Noch nicht bestätigte Abschnitte -- aus dem LOKALEN Stand gerechnet, damit
 * ein frisch gesetzter Haken sofort zählt; gespeichert wird er ohnehin, bevor
 * veröffentlicht wird.
 */
const unbestaetigt = computed<AbschnittRef[]>(() => {
  if (!bestaetigenNoetig.value) return []
  return bereiche.value.flatMap((b) =>
    b.abschnitte
      .filter((a) => !istBestaetigt(a))
      .map((a) => ({ bereichId: b.id, abschnittId: a.id, titel: a.titel }))
  )
})

/** Bestätigte Abschnitte im ganzen Formular ("3/12 Abschnitte bestätigt"). */
const bestaetigtGesamt = computed(() => {
  const alle = bereiche.value.flatMap((b) => b.abschnitte)
  return { n: alle.filter(istBestaetigt).length, von: alle.length }
})

/** Alles gespeichert UND -- falls verlangt -- jeder Abschnitt bestätigt. */
const istFertig = (b: Bereich) =>
  istGespeichert(b) &&
  (!bestaetigenNoetig.value || b.abschnitte.every(istBestaetigt))

function bereichUntertitel(b: Bereich): string {
  const p = `${bereichProzent(b)} %`
  if (!bestaetigenNoetig.value || !b.abschnitte.length) return p
  return `${p} · ${b.abschnitte.filter(istBestaetigt).length}/${b.abschnitte.length} bestätigt`
}

/** Was dem Veröffentlichen noch im Weg steht (Untertitel des Abschluss-Schritts). */
const offenGesamt = computed(
  () =>
    fehlend.value.length + verstoesse.value.length + unbestaetigt.value.length
)

/** Die drei Sperren der API, clientseitig gespiegelt. */
const veroeffentlichbar = computed(() => offenGesamt.value === 0)

/**
 * Haken gesetzt oder entfernt. Beim Setzen wird der Bereich sofort
 * gespeichert: die Bestätigung ist eine bewusste Handlung und soll nicht
 * verloren gehen, wenn der Tab danach geschlossen wird.
 */
function setzeBestaetigt(a: AbschnittDef, an: unknown) {
  const ohne = bestaetigt.value.filter((x) => x !== a.id)
  if (an) {
    bestaetigt.value = [...ohne, a.id]
    bestaetigtHash.value = { ...bestaetigtHash.value, [a.id]: hashJetzt(a) }
    const b = bereiche.value.find((x) =>
      x.abschnitte.some((y) => y.id === a.id)
    )
    // In die Schlange, auch wenn gerade gespeichert wird: der Vorgang liest
    // die Haken erst, wenn er dran ist, und schickt diesen dann mit.
    if (b) nacheinander(() => sendeBereich(b))
  } else {
    // Nur lokal: die API kennt kein "Zurücknehmen" für einen unveränderten
    // Abschnitt (sie streicht Bestätigungen nur bei geänderten Werten).
    // Beim nächsten Speichern gilt wieder, was die API zurückmeldet.
    bestaetigt.value = ohne
  }
}

/** Weicht in diesem Bereich ein Haken vom Stand der API ab? */
function bestaetigungOffen(b: Bereich): boolean {
  if (!bestaetigenNoetig.value) return false
  const server = new Set(bestaetigtServer.value)
  return b.abschnitte.some((a) => istBestaetigt(a) !== server.has(a.id))
}

/** Die gültigen Haken dieses Bereichs -- nur sie gehen im PUT mit. */
const bestaetigtVon = (b: Bereich) =>
  b.abschnitte.filter(istBestaetigt).map((a) => a.id)

/** Fingerabdrücke der Abschnitte eines Bereichs (zum Zeitpunkt des Aufrufs). */
function hashesVon(b: Bereich, d: Daten): Record<string, string> {
  const r: Record<string, string> = {}
  for (const a of b.abschnitte) r[a.id] = abschnittsHash(a, d)
  return r
}

/**
 * Nach dem Laden: die API sagt, welche Abschnitte bestätigt sind; der
 * Fingerabdruck dazu ist der der geladenen Werte.
 */
function uebernimmGeladen(def: Definition, ids: string[], d: Daten) {
  bestaetigt.value = [...ids]
  bestaetigtServer.value = [...ids]
  const hashes: Record<string, string> = {}
  for (const b of def.bereiche) Object.assign(hashes, hashesVon(b, d))
  const neu: Record<string, string> = {}
  for (const id of ids) if (hashes[id]) neu[id] = hashes[id]
  bestaetigtHash.value = neu
}

/**
 * Nach dem Speichern eines Bereichs: die Antwort ist die Wahrheit über
 * diesen Bereich -- mit einer Ausnahme: Haken, die lokal stehen, bleiben samt
 * ihrem Fingerabdruck. Das sind entweder mitgesendete (die API bestätigt sie
 * immer) oder während des Requests neu gesetzte (sie gehen mit dem nächsten,
 * schon eingereihten Speichern mit) oder "geändert seit Bestätigung" (der
 * Hinweis soll stehen bleiben). Was die API darüber hinaus als bestätigt
 * meldet -- ein lokal zurückgenommener, aber unveränderter Abschnitt --,
 * kommt mit dem Fingerabdruck der gesendeten Werte dazu. Haken anderer
 * Bereiche kennt die Antwort nicht anders als vorher.
 */
function uebernimmGespeichert(
  b: Bereich,
  ids: string[],
  hashes: Record<string, string>
) {
  bestaetigtServer.value = ids
  const lokal = new Set(bestaetigt.value)
  const server = new Set(ids)
  const neu = { ...bestaetigtHash.value }
  for (const a of b.abschnitte) {
    if (lokal.has(a.id)) continue
    if (server.has(a.id)) neu[a.id] = hashes[a.id]
    else delete neu[a.id]
  }
  bestaetigtHash.value = neu
  bestaetigt.value = [...new Set([...ids, ...bestaetigt.value])]
}

/* ------------------------------------------ Ungespeicherte Eingaben retten */

/**
 * Was nach einem Neuladen wieder eingesetzt wird: die geänderten Felder (per
 * stabiler Feld-ID, nicht per Key) samt der Definition, zu der die Werte
 * gehören. So lassen sie sich auch auf eine neue Formularversion heben.
 */
interface Rettung {
  definition: Definition
  feldIds: string[]
  daten: Daten
  bereichId: string | null
  /** Wer die Eingaben getippt hat (Anzeigename aus /me), siehe darfEinsetzen. */
  wer: string
}

/** Angemeldeter Name -- Kreis-Adressen teilen sich oft mehrere Personen. */
const werBinIch = () => me.value?.name ?? ''

/**
 * Wer den Entwurf geladen hat. Beim Retten selbst ist `me` oft schon leer:
 * die 401 meldet ab (me = null) und erst danach läuft der Leave-Guard.
 */
let werBeimOeffnen = ''

function rettung(): Rettung | null {
  const d = detail.value
  if (!d) return null
  const geaendert = new Set(geaenderteKeys.value)
  const feldIds = alleFelder(d.definition)
    .filter((f) => keysVon(f).some((k) => geaendert.has(k)))
    .map((f) => f.id)
  if (!feldIds.length) return null
  return {
    definition: d.definition,
    feldIds,
    daten: JSON.parse(JSON.stringify(daten.value)),
    bereichId: aktuellerBereich.value?.id ?? null,
    wer: werBeimOeffnen
  }
}

/**
 * Nach einer 401 ist die Seite gleich weg (Login). Die Eingaben kommen in den
 * sessionStorage dieses Tabs und werden nach dem erneuten Anmelden beim
 * Öffnen desselben Kreises wieder eingesetzt.
 */
const rettungsSchluessel = () => `ecSchutzkonzept:ungespeichert:${id.value}`

function sichereFuerSpaeter() {
  const r = rettung()
  if (!r) return
  try {
    sessionStorage.setItem(rettungsSchluessel(), JSON.stringify(r))
  } catch {
    /* Speicher voll oder gesperrt -- dann bleibt nur der Verlust */
  }
}

function gesicherteRettung(): Rettung | null {
  try {
    const roh = sessionStorage.getItem(rettungsSchluessel())
    const r = roh ? JSON.parse(roh) : null
    return r?.definition && Array.isArray(r.feldIds) && r.daten ? r : null
  } catch {
    return null
  }
}

function entferneGesicherteRettung() {
  try {
    sessionStorage.removeItem(rettungsSchluessel())
  } catch {
    /* egal */
  }
}

/**
 * Die Rettung liegt im sessionStorage dieses Tabs, kann aber von einer
 * anderen Anmeldung stammen: Schutzkonzept-Adressen gehören meist dem Kreis
 * und werden geteilt, und nach einer 401 meldet sich vielleicht jemand
 * anderes an. Derselbe Kreis, also kein fremder Kreis-Zugriff -- fremde
 * Eingaben trotzdem nicht ungefragt übernehmen und an die API schicken.
 */
function darfEinsetzen(r: Rettung): boolean {
  if ((r.wer || '') === werBeimOeffnen) return true
  return window.confirm(
    `An diesem Gerät liegen noch nicht gespeicherte Eingaben${r.wer ? ` von „${r.wer}“` : ' einer anderen Anmeldung'} für diesen EC-Kreis. Sollen sie übernommen und gespeichert werden?`
  )
}

/**
 * Setzt gerettete Eingaben auf den frisch geladenen Stand und speichert sie.
 *
 * migriereDaten ordnet über die Feld-IDs zu und bereinigt dabei wie der
 * Server (uebernimmWerte): gibt es ein Feld nicht mehr, fällt sein Wert weg;
 * passt ein Wert nicht mehr zum Typ, wird er leer. Übernommen werden nur die
 * Felder, die wirklich lokal geändert waren -- was die andere Person in
 * anderen Feldern gespeichert hat, bleibt stehen.
 */
async function spieleEin(r: Rettung) {
  const d = detail.value
  if (!d) return
  const ids = new Set(r.feldIds)
  const migriert = migriereDaten(r.definition, d.definition, r.daten)
  const felder = alleFelder(d.definition).filter(
    (f) => ids.has(f.id) && keysVon(f).length > 0
  )
  const neu: Daten = { ...daten.value }
  for (const f of felder) for (const k of keysVon(f)) neu[k] = migriert[k]
  daten.value = neu

  const weg = r.feldIds.length - felder.length
  const hinweisWeg = weg
    ? ` ${weg === 1 ? 'Ein Feld gibt' : `${weg} Felder gibt`} es in der aktuellen Formularversion nicht mehr, diese Eingaben fehlen.`
    : ''

  const iAlt = bereiche.value.findIndex((b) => b.id === r.bereichId)
  const iErster = bereiche.value.findIndex((b) =>
    felderVonBereich(b).some((f) => ids.has(f.id))
  )
  if (iAlt >= 0 || iErster >= 0) {
    schritt.value = iAlt >= 0 ? iAlt : iErster
    zeigeAktivenSchritt(schritt.value)
  }

  if (!felder.length) {
    if (hinweisWeg) notifyInfo(hinweisWeg.trim())
    return
  }
  if (await speichereAenderungen()) {
    notifyInfo(
      `Deine nicht gespeicherten Eingaben wurden wieder eingesetzt und gespeichert – bitte prüfe sie.${hinweisWeg}`
    )
  } else if (hinweisWeg) {
    notifyInfo(hinweisWeg.trim())
  }
}

/* --------------------------------------------------------------- Laden -- */

function zeigeKonflikt(err: ApiError) {
  const eingaben = ungespeichert.value
    ? ' Deine noch nicht gespeicherten Eingaben werden danach wieder eingesetzt und gespeichert, soweit es die Felder noch gibt – bitte prüfe sie anschließend.'
    : ''
  konflikt.text =
    err.code === 'FORM_OUTDATED'
      ? `Inzwischen gibt es eine neue Formularversion. Beim Neuladen werden deine bereits gespeicherten Angaben übernommen.${eingaben}`
      : `Jemand anderes hat dieses Schutzkonzept zwischenzeitlich gespeichert. Beim Neuladen siehst du den aktuellen Stand.${eingaben}${eingaben ? ' Hat die andere Person dieselben Felder geändert, gilt deine Eingabe.' : ''}`
  konflikt.offen = true
}

async function oeffnen(uebernehmen: Rettung | null = null) {
  laedt.value = true
  oeffnenFehler.value = ''
  try {
    const d = await api.request<StandDetail>(
      `/schutzkonzept/kreis/${id.value}/draft`,
      {
        method: 'POST',
        quiet: true
      }
    )
    detail.value = d
    daten.value = d.stand.daten
    revision.value = d.stand.revision
    bereicheGespeichert.value = d.stand.bereicheGespeichert
    fehlend.value = d.fehlend
    verstoesse.value = d.verstoesse ?? []
    heute.value = d.heute || heuteISO()
    veroeffentlichenFehler.value = ''
    uebernimmGeladen(
      d.definition,
      d.stand.abschnitteBestaetigt ?? [],
      d.stand.daten
    )
    gespeichert.value = abbild(d.stand.daten)
    abmeldungenBeimOeffnen = abmeldungen.value
    werBeimOeffnen = werBinIch()
    const offen = d.definition.bereiche.findIndex(
      (b) => !d.stand.bereicheGespeichert.includes(b.id)
    )
    schritt.value = offen >= 0 ? offen : 0
    zeigeAktivenSchritt(schritt.value)
    laedt.value = false
    // Eine gesicherte Rettung wird nur gelesen, wenn keine aus dem
    // Konfliktpfad übergeben wurde -- und dann in jedem Fall verworfen, auch
    // wenn das Einsetzen scheitert: sonst stolperte jedes weitere Öffnen
    // erneut über dieselbe kaputte Rettung.
    const gesichert = uebernehmen ? null : gesicherteRettung()
    if (gesichert) entferneGesicherteRettung()
    const r =
      uebernehmen ?? (gesichert && darfEinsetzen(gesichert) ? gesichert : null)
    if (r) {
      try {
        await spieleEin(r)
      } catch (err: any) {
        // Das Formular selbst steht -- nur die geretteten Eingaben fehlen
        // (z. B. eine Rettung zu einer Definition, die nicht mehr passt).
        error({
          title: 'Eingaben nicht wieder eingesetzt',
          text: `Deine zwischengespeicherten Eingaben passen nicht zum geladenen Formular und wurden verworfen: ${err?.message || String(err)}`
        })
      }
    }
  } catch (err: any) {
    if (err instanceof ApiError && err.code === 'NO_FORM') {
      oeffnenFehler.value = err.message
    } else if (!(err instanceof ApiError) || err.status !== 401) {
      // 401 behandelt der Unauthorized-Handler; alles andere (auch ein
      // Programmfehler) darf nicht stillschweigend verschwinden.
      error({
        title: 'Öffnen fehlgeschlagen',
        text: err?.message || String(err)
      })
    }
  } finally {
    laedt.value = false
  }
}

/* ----------------------------------------------------------- Speichern -- */

/**
 * Alle Speichervorgänge laufen nacheinander. Sonst schickten z. B. der
 * Leave-Guard und "Speichern & weiter" zwei PUTs mit derselben revision los,
 * und der zweite endete in einem selbst erzeugten Konflikt. In der Schlange
 * liest jeder Vorgang revision und Werte erst, wenn er dran ist.
 */
let warteschlange: Promise<unknown> = Promise.resolve()
const laufend = ref(0)
const speichert = computed(() => laufend.value > 0)

function nacheinander<T>(fn: () => Promise<T>): Promise<T> {
  laufend.value++
  const p = warteschlange.then(fn).finally(() => laufend.value--)
  warteschlange = p.catch(() => undefined)
  return p
}

/** Einen Bereich senden -- nur innerhalb von nacheinander() aufrufen. */
async function sendeBereich(b: Bereich): Promise<boolean> {
  // Offener Konflikt: jeder weitere PUT scheitert ohnehin an der revision.
  if (!detail.value || konflikt.offen || sitzungVorbei()) return false
  const werte = werteVon(b)
  const gesendet = abbild(werte)
  // Fingerabdrücke zu GENAU diesen Werten -- was während des Requests
  // getippt wird, gilt danach als Änderung nach der Bestätigung.
  const hashes = hashesVon(b, daten.value)
  try {
    const r = await api.request<BereichGespeichert>(
      `/schutzkonzept/kreis/${id.value}/draft/bereich/${encodeURIComponent(b.id)}`,
      {
        method: 'PUT',
        body: {
          revision: revision.value,
          werte,
          bestaetigt: bestaetigtVon(b)
        },
        quiet: true
      }
    )
    revision.value = r.revision
    bereicheGespeichert.value = r.bereicheGespeichert
    fehlend.value = r.fehlend
    verstoesse.value = r.verstoesse ?? []
    if (r.heute) heute.value = r.heute
    uebernimmGespeichert(b, r.abschnitteBestaetigt ?? [], hashes)
    gespeichert.value = { ...gespeichert.value, ...gesendet }
    gespeichertUm.value = uhrzeit(new Date())
    return true
  } catch (err: any) {
    if (err instanceof ApiError && err.status === 409) zeigeKonflikt(err)
    // 401: der Unauthorized-Handler navigiert schon zum Login
    else if (err instanceof ApiError && err.status !== 401)
      error({ title: 'Speichern fehlgeschlagen', text: err.message })
    return false
  }
}

/** Alle Bereiche mit Änderungen senden -- nur innerhalb von nacheinander(). */
async function sendeAenderungen(): Promise<boolean> {
  const geaendert = new Set(geaenderteKeys.value)
  for (const b of bereiche.value) {
    const werteOffen = Object.keys(werteVon(b)).some((k) => geaendert.has(k))
    // Auch ein Bereich ohne geänderte Werte muss mit, wenn dort ein Haken
    // gesetzt oder entfernt wurde -- sonst fehlte die Bestätigung.
    if (!werteOffen && !bestaetigungOffen(b)) continue
    if (!(await sendeBereich(b))) return false
  }
  return true
}

/** Speichert alle Änderungen; wartet vorher auf laufende Speichervorgänge. */
const speichereAenderungen = () => nacheinander(sendeAenderungen)

async function geheZu(ziel: unknown) {
  const n = Number(ziel)
  if (
    !Number.isInteger(n) ||
    n < 0 ||
    n > bereiche.value.length ||
    speichert.value
  )
    return
  const b = aktuellerBereich.value
  if (b) {
    // Den aktuellen Bereich immer senden (die API merkt sich, welche Bereiche
    // gespeichert wurden), dazu Reste aus anderen Bereichen, die während
    // eines früheren Speicherns getippt wurden.
    const ok = await nacheinander(
      async () => (await sendeBereich(b)) && (await sendeAenderungen())
    )
    if (!ok) return
  }
  schritt.value = n
  window.scrollTo({ top: 0, behavior: 'smooth' })
  zeigeAktivenSchritt(n)
}

/**
 * Bei vielen Bereichen scrollt die Stepper-Leiste waagerecht: den aktiven
 * Schritt sichtbar halten. Nur die Leiste scrollen, nicht die Seite.
 */
async function zeigeAktivenSchritt(n: number) {
  await nextTick()
  const leiste = document.querySelector<HTMLElement>('.stepper-kopf')
  const item = leiste?.querySelectorAll<HTMLElement>('.v-stepper-item')[n]
  if (!leiste || !item) return
  leiste.scrollTo({
    left: item.offsetLeft - leiste.clientWidth / 2 + item.clientWidth / 2,
    behavior: 'smooth'
  })
}

async function springeZu(f: Fehlend) {
  markiereFehlend.value = true
  const i = bereiche.value.findIndex((b) => b.id === f.bereichId)
  if (i < 0) return
  await geheZu(i)
  await nextTick()
  setTimeout(() => {
    document
      .getElementById(`feld-${f.feldId}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, 50)
}

/** Aus der Liste im Abschluss zu einem unbestätigten Abschnitt springen. */
async function springeZuAbschnitt(a: AbschnittRef) {
  const i = bereiche.value.findIndex((b) => b.id === a.bereichId)
  if (i < 0) return
  await geheZu(i)
  await nextTick()
  setTimeout(() => {
    document
      .getElementById(`abschnitt-${a.abschnittId}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, 50)
}

async function vorschau(vorlageID: number) {
  vorschauLaedt.value = vorlageID
  try {
    const r = await api.requestBlob(
      `/schutzkonzept/kreis/${id.value}/draft/vorschau/${vorlageID}`,
      { method: 'POST' }
    )
    saveBlob(r.dateiname, r.blob)
  } catch {
    /* Dialog aus dem API-Client */
  } finally {
    vorschauLaedt.value = null
  }
}

async function veroeffentlichen() {
  bestaetigen.value = false
  veroeffentlicht.value = true
  veroeffentlichenFehler.value = ''
  try {
    // Noch offene Reste zuerst speichern, sonst fehlten sie im
    // veröffentlichten Stand -- und ein laufender PUT änderte die revision.
    if (!(await speichereAenderungen())) return
    await api.request(`/schutzkonzept/kreis/${id.value}/draft/publish`, {
      method: 'POST',
      body: { revision: revision.value },
      quiet: true
    })
    detail.value = null // Leave-Guard: nichts mehr zu speichern
    notifyInfo(
      'Schutzkonzept veröffentlicht. Die PDFs stehen in der Übersicht bereit.'
    )
    router.push(`/kreis/${id.value}/uebersicht`)
  } catch (err: any) {
    if (err instanceof ApiError && err.code === 'REQUIRED_MISSING') {
      fehlend.value = err.details?.fehlend ?? fehlend.value
      markiereFehlend.value = true
      veroeffentlichenFehler.value = err.message
    } else if (err instanceof ApiError && err.code === 'RULES_VIOLATED') {
      verstoesse.value = err.details?.verstoesse ?? verstoesse.value
      markiereFehlend.value = true
      veroeffentlichenFehler.value = err.message
    } else if (err instanceof ApiError && err.code === 'SECTIONS_UNCONFIRMED') {
      // Die API hat Haken verworfen (ein Wert des Abschnitts hat sich
      // geändert). Lokal nachziehen, sonst zeigte der Abschluss weiter grün.
      const offen = new Set<string>(
        (err.details?.unbestaetigt ?? []).map(
          (a: AbschnittRef) => a.abschnittId
        )
      )
      bestaetigt.value = bestaetigt.value.filter((x) => !offen.has(x))
      bestaetigtServer.value = bestaetigtServer.value.filter(
        (x) => !offen.has(x)
      )
      veroeffentlichenFehler.value = err.message
    } else if (err instanceof ApiError && err.status === 409) {
      zeigeKonflikt(err)
    } else if (err instanceof ApiError && err.status !== 401) {
      error({ title: 'Veröffentlichen fehlgeschlagen', text: err.message })
    }
  } finally {
    veroeffentlicht.value = false
  }
}

/** Nach einem Konflikt: frisch laden und die eigenen Eingaben darüberlegen. */
async function neuLaden() {
  const r = rettung()
  konflikt.offen = false
  await oeffnen(r)
}

function zurUebersicht() {
  router.push(`/kreis/${id.value}/uebersicht`)
}

// Nicht ohne Speichern weg: erst speichern, und nur wenn das scheitert fragen.
onBeforeRouteLeave(async () => {
  if (!detail.value) return true
  // Wartet auf ein laufendes Speichern und sendet nur, was danach noch fehlt.
  if (!sitzungVorbei()) await speichereAenderungen()
  if (!nichtGespeichert.value) return true
  if (sitzungVorbei()) {
    // Abgemeldet: Speichern ginge nur noch in eine 401. Eingaben für nach
    // dem erneuten Anmelden sichern und zum Login durchlassen.
    sichereFuerSpaeter()
    return true
  }
  return window.confirm(
    'Deine Änderungen konnten nicht gespeichert werden. Seite trotzdem verlassen?'
  )
})

function vorDemSchliessen(ev: BeforeUnloadEvent) {
  if (nichtGespeichert.value) {
    ev.preventDefault()
    ev.returnValue = ''
  }
}
onMounted(() => window.addEventListener('beforeunload', vorDemSchliessen))
onBeforeUnmount(() =>
  window.removeEventListener('beforeunload', vorDemSchliessen)
)

watch(id, () => oeffnen(), { immediate: true })
</script>

<style scoped>
.text-pre {
  white-space: pre-line;
}
/*
 * Zehn und mehr Bereiche: Vuetify staucht die Schritte sonst auf die
 * Containerbreite und die Titel laufen ineinander. Feste Breite je Schritt,
 * Titel duerfen umbrechen, die Leiste scrollt waagerecht.
 */
.stepper-kopf {
  overflow-x: auto;
  flex-wrap: nowrap;
  justify-content: flex-start;
  scroll-behavior: smooth;
}
.stepper-kopf :deep(.v-stepper-item) {
  flex: 0 0 128px;
  min-width: 128px;
  padding-inline: 4px;
}
.stepper-kopf :deep(.v-stepper-item__title) {
  white-space: normal;
  text-align: center;
  line-height: 1.25;
  font-size: 0.85rem;
}
.v-stepper--mobile .stepper-kopf :deep(.v-stepper-item) {
  flex-basis: 44px;
  min-width: 44px;
}
.stepper-kopf :deep(.v-divider) {
  flex: 0 0 12px;
  min-width: 12px;
  margin-inline: 0;
}
</style>
