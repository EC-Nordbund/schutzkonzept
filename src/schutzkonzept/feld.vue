<template lang="pug">
//- Info-Text: nur Anzeige
v-alert.mb-4(
  v-if='feld.typ === "info"',
  type='info',
  variant='tonal',
  density='compact',
  :title='feld.label || undefined'
)
  .text-pre {{ feld.hilfe }}

//- Tabelle: wiederholbare Einträge mit eigenen Spalten
.mb-4(v-else-if='feld.typ === "gruppe"')
  .text-subtitle-1.font-weight-medium
    | {{ feld.label }}
    span.text-error(v-if='feld.pflicht') &nbsp;*
  .text-body-2.text-medium-emphasis.text-pre.mb-2(v-if='feld.hilfe') {{ feld.hilfe }}
  v-alert.mb-2(
    v-if='markiereFehlend && tabelleFehlt',
    type='warning',
    variant='tonal',
    density='compact'
  ) {{ tabelleFehlt }}
  v-card.mb-3(
    v-for='(zeile, i) in zeilen',
    :key='i',
    variant='outlined'
  )
    v-card-title.d-flex.align-center.text-subtitle-1
      span {{ zeilenTitel(zeile, i) }}
      v-spacer
      v-btn(
        v-if='!readonly',
        icon='delete',
        size='small',
        variant='text',
        :title='`${feld.eintragLabel || "Eintrag"} entfernen`',
        @click='entferneZeile(i)'
      )
    v-card-text
      feld-selbst(
        v-for='spalte in feld.felder',
        :key='spalte.id',
        v-model:daten='zeilen[i]',
        :feld='spalte',
        :readonly='readonly',
        :markiere-fehlend='markiereFehlend',
        :heute='heute'
      )
  .text-body-2.text-medium-emphasis.mb-2(v-if='readonly && zeilen.length === 0') Keine Einträge.
  //- Auch ohne eigenes maxEintraege gilt die Servergrenze: uebernimmWerte
    kuerzt still auf GRENZEN.maxZeilen, weitere Zeilen waeren also weg.
  v-btn(
    v-if='!readonly',
    prepend-icon='add',
    variant='tonal',
    :disabled='zeilen.length >= Math.min(feld.maxEintraege || GRENZEN.maxZeilen, GRENZEN.maxZeilen)',
    @click='neueZeile'
  ) {{ feld.eintragLabel || 'Eintrag' }} hinzufügen

//- Mehrfachauswahl: eine Checkbox je Option, flache Schlüssel key_option
.mb-4(v-else-if='feld.typ === "multiselect"')
  .text-body-1
    | {{ feld.label }}
    span.text-error(v-if='feld.pflicht') &nbsp;*
  .d-flex.flex-wrap(style='column-gap: 16px')
    v-checkbox(
      v-for='o in feld.optionen',
      :key='o.id',
      v-model='daten[`${feld.key}_${o.key}`]',
      :label='o.label',
      :readonly='readonly',
      :error='fehltMarkierung',
      density='compact',
      hide-details
    )
  .text-caption.text-medium-emphasis.text-pre(v-if='feld.hilfe') {{ feld.hilfe }}

.mb-2(v-else-if='feld.typ === "radio"')
  .text-body-1
    | {{ feld.label }}
    span.text-error(v-if='feld.pflicht') &nbsp;*
  v-radio-group(
    v-model='daten[feld.key]',
    :readonly='readonly',
    :error='fehltMarkierung',
    inline,
    density='compact',
    :hint='feld.hilfe',
    :persistent-hint='!!feld.hilfe',
    :hide-details='!feld.hilfe'
  )
    v-radio(v-for='o in feld.optionen', :key='o.id', :label='o.label', :value='o.key')

v-checkbox.mb-2(
  v-else-if='feld.typ === "checkbox"',
  v-model='daten[feld.key]',
  :label='beschriftung',
  :readonly='readonly',
  :error='fehltMarkierung',
  density='compact',
  :hint='feld.hilfe',
  :persistent-hint='!!feld.hilfe',
  :hide-details='!feld.hilfe'
)

v-select.mb-2(
  v-else-if='feld.typ === "select"',
  v-model='daten[feld.key]',
  :items='feld.optionen',
  item-title='label',
  item-value='key',
  :label='beschriftung',
  :readonly='readonly',
  :error='fehltMarkierung',
  :hint='feld.hilfe',
  :persistent-hint='!!feld.hilfe',
  :clearable='!readonly'
)

//- maxlength: Regel-Höchstlänge, sonst die Servergrenze (GRENZEN); Vuetify
//- nimmt den Zähler aus maxlength, ein eigener :counter-Wert würde ignoriert.
v-textarea.mb-2(
  v-else-if='feld.typ === "textarea"',
  v-model='daten[feld.key]',
  :label='beschriftung',
  :readonly='readonly',
  :maxlength='grenzen.maxLaenge || GRENZEN.textareaLaenge',
  :counter='!readonly',
  :error='fehltMarkierung',
  :error-messages='fehlerMeldung',
  :rules='regeln',
  :hint='hinweis',
  :persistent-hint='!!hinweis',
  rows='3',
  auto-grow
)

v-text-field.mb-2(
  v-else-if='feld.typ === "number"',
  :model-value='daten[feld.key] ?? ""',
  type='number',
  :label='beschriftung',
  :readonly='readonly',
  :min='grenzen.min ?? undefined',
  :max='grenzen.max ?? undefined',
  :error='fehltMarkierung',
  :error-messages='fehlerMeldung',
  :rules='regeln',
  :hint='hinweis',
  :persistent-hint='!!hinweis',
  @update:model-value='setzeZahl'
)

//- Datum: min/max aus den aufgelösten Regeln sperren den Kalender-Picker,
//- Tippen bleibt möglich -- deshalb zusätzlich die Vuetify-Regel.
v-text-field.mb-2(
  v-else-if='feld.typ === "date"',
  v-model='daten[feld.key]',
  type='date',
  :label='beschriftung',
  :readonly='readonly',
  :min='grenzen.minDatum ?? undefined',
  :max='grenzen.maxDatum ?? undefined',
  :error='fehltMarkierung',
  :error-messages='fehlerMeldung',
  :rules='regeln',
  :hint='hinweis',
  :persistent-hint='!!hinweis'
)

v-text-field.mb-2(
  v-else,
  v-model='daten[feld.key]',
  type='text',
  :label='beschriftung',
  :readonly='readonly',
  :maxlength='grenzen.maxLaenge || GRENZEN.textLaenge',
  :counter='!readonly',
  :error='fehltMarkierung',
  :error-messages='fehlerMeldung',
  :rules='regeln',
  :hint='hinweis',
  :persistent-hint='!!hinweis'
)
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  GRENZEN,
  aufgeloesteRegeln,
  heuteISO,
  istAusgefuellt,
  regelHinweis,
  regelVerstoss,
  type Feld,
  type Zeile
} from './definition'
// Expliziter Selbst-Import: ein Tag `feld` würde im Template den gleichnamigen
// Prop (das Feld-Objekt) treffen statt dieser Komponente.
import FeldSelbst from './feld.vue'

/**
 * Ein Feld des Schutzkonzept-Formulars.
 *
 * KOPIE in schutzkonzept/src/schutzkonzept/feld.vue -- Aenderungen bitte in
 * beiden Repos spiegeln (DUPLIKATE.md).
 *
 * Schreibt direkt in das flache Datenobjekt (`daten[feld.key]`), bei Tabellen
 * in die Zeilenobjekte. Deshalb `defineModel` auf das ganze Objekt statt eines
 * Einzelwerts: Mehrfachauswahlen belegen mehrere Schlüssel.
 *
 * Regeln (Wertebereich, Textlänge) werden nur ANGEZEIGT: Vuetify-Rule und
 * Hinweis unter dem Feld. Gesperrt wird nichts -- ein Kreis darf einen
 * vorläufigen Wert speichern; erst das Veröffentlichen verlangt regelkonforme
 * Daten (Server: RULES_VIOLATED).
 */
const props = defineProps<{
  feld: Feld
  readonly?: boolean
  /** Unausgefüllte Pflichtfelder und Regelverstöße rot markieren (nach "Veröffentlichen"). */
  markiereFehlend?: boolean
  /**
   * Heutiges Datum JJJJ-MM-TT für relative Datumsregeln ("+1y"). Kommt aus
   * der API-Antwort (Server-Zeit); ohne Angabe das Datum des Browsers.
   */
  heute?: string
}>()

const daten = defineModel<Record<string, any>>('daten', { required: true })

const beschriftung = computed(() =>
  props.feld.pflicht ? `${props.feld.label} *` : props.feld.label
)

const ausgefuellt = computed(() => istAusgefuellt(props.feld, daten.value))

const heute = computed(() => props.heute || heuteISO())

/** Aufgelöste Regeln: Datumsgrenzen als ISO für min/max am Input. */
const grenzen = computed(() => aufgeloesteRegeln(props.feld, heute.value))

/** Hilfetext und Regel-Hinweis zusammen unter dem Feld. */
const hinweis = computed(() =>
  [props.feld.hilfe, regelHinweis(props.feld, heute.value)]
    .filter(Boolean)
    .join('\n')
)

/** Aktueller Regelverstoß des gespeicherten Werts (null = keiner). */
const verstoss = computed(() =>
  regelVerstoss(props.feld, daten.value[props.feld.key], heute.value)
)

/**
 * Vuetify-Rule: prüft den Eingabewert live. Zahlen kommen aus dem Input
 * als String, deshalb hier dieselbe Umwandlung wie in setzeZahl().
 */
const regeln = computed(() => [
  (v: unknown) => {
    const wert =
      props.feld.typ === 'number'
        ? v === '' || v === null || v === undefined
          ? null
          : Number(v)
        : v
    return regelVerstoss(props.feld, wert, heute.value) ?? true
  }
])

const fehltMarkierung = computed(
  () => !!props.markiereFehlend && props.feld.pflicht && !ausgefuellt.value
)

/**
 * Nach "Veröffentlichen" auch Regelverstöße rot zeigen, die noch nie
 * angefasst wurden -- Vuetify-Rules laufen erst bei Eingabe.
 */
const fehlerMeldung = computed(() =>
  props.markiereFehlend && verstoss.value ? [verstoss.value] : []
)

const zeilen = computed<Zeile[]>(() =>
  Array.isArray(daten.value[props.feld.key]) ? daten.value[props.feld.key] : []
)

const mindestens = computed(() =>
  Math.max(props.feld.pflicht ? 1 : 0, props.feld.minEintraege)
)

/**
 * Warnung einer Tabelle -- dieselbe Regel wie fehlendePflichtfelder(), nicht
 * istAusgefuellt(): das verlangt immer mindestens eine Zeile (für den
 * Fortschritt) und hätte bei einer freiwilligen, leeren Tabelle
 * „Bitte 0 Eintrag anlegen“ angezeigt. Leerer Text = nichts fehlt.
 */
const tabelleFehlt = computed(() => {
  const name = props.feld.eintragLabel || 'Eintrag'
  const n = mindestens.value
  if (zeilen.value.length < n) {
    return `Bitte mindestens ${n} × „${name}“ anlegen.`
  }
  const offen = zeilen.value.some((z) =>
    props.feld.felder.some((s) => s.pflicht && !istAusgefuellt(s, z))
  )
  if (offen) {
    return `Bitte in jedem Eintrag „${name}“ die Pflichtangaben ausfüllen.`
  }
  const verstoesst = zeilen.value.some((z) =>
    props.feld.felder.some((s) => regelVerstoss(s, z?.[s.key], heute.value))
  )
  return verstoesst
    ? `Bitte in jedem Eintrag „${name}“ die rot markierten Angaben korrigieren.`
    : ''
})

function neueZeile() {
  const z: Zeile = {}
  for (const s of props.feld.felder) {
    if (s.typ === 'checkbox') z[s.key] = false
    else if (s.typ === 'number') z[s.key] = null
    else if (s.typ === 'multiselect')
      s.optionen.forEach((o) => (z[`${s.key}_${o.key}`] = false))
    else z[s.key] = ''
  }
  daten.value[props.feld.key] = [...zeilen.value, z]
}

function entferneZeile(i: number) {
  const titel = zeilenTitel(zeilen.value[i], i)
  if (!window.confirm(`„${titel}“ wirklich entfernen?`)) return
  daten.value[props.feld.key] = zeilen.value.filter((_, j) => j !== i)
}

/** Erste Textspalte als Titel ("Gruppenraum 1: Jugendraum"). */
function zeilenTitel(z: Zeile, i: number) {
  const basis = `${props.feld.eintragLabel || 'Eintrag'} ${i + 1}`
  const erste = props.feld.felder.find((s) => s.typ === 'text')
  const wert = erste ? z?.[erste.key] : ''
  return typeof wert === 'string' && wert.trim() ? `${basis}: ${wert}` : basis
}

function setzeZahl(v: string) {
  daten.value[props.feld.key] = v === '' || v === null ? null : Number(v)
}
</script>

<style scoped>
.text-pre {
  white-space: pre-line;
}
/* Hilfetext und Regel-Hinweis stehen in einem Hint, getrennt durch Umbruch. */
:deep(.v-messages__message) {
  white-space: pre-line;
}
</style>
