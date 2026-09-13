<template lang="pug">
v-card.mb-4(:id='`abschnitt-${abschnitt.id}`')
  v-card-title.d-flex.align-center.flex-wrap.ga-2.text-wrap
    span.flex-grow-1 {{ abschnitt.titel }}
    //- Bestätigungsstand nur, wenn die Formularversion ihn verlangt
    template(v-if='aktiv')
      v-chip(
        v-if='bestaetigt',
        size='small',
        color='green',
        variant='flat',
        prepend-icon='check_circle'
      ) Bestätigt
      v-chip(
        v-else,
        size='small',
        :color='geaendert ? "orange" : undefined',
        :variant='geaendert ? "flat" : "tonal"',
        prepend-icon='radio_button_unchecked'
      ) {{ geaendert ? 'Geändert – bitte erneut bestätigen' : 'Noch nicht bestätigt' }}
  v-card-subtitle.text-wrap.text-pre(v-if='abschnitt.beschreibung') {{ abschnitt.beschreibung }}
  v-card-text.pt-4
    div(v-for='f in abschnitt.felder', :key='f.id', :id='`feld-${f.id}`')
      feld(
        v-model:daten='daten',
        :feld='f',
        :readonly='readonly',
        :markiere-fehlend='markiereFehlend',
        :heute='heute'
      )
    .text-medium-emphasis(v-if='abschnitt.felder.length === 0') Dieser Abschnitt hat noch keine Felder.
  //- Bestätigen: nur beim Ausfüllen, nicht in der Nur-Lese-Ansicht. Die API
  //- setzt die Bestätigung zurück, sobald sich ein Wert des Abschnitts
  //- ändert -- deshalb steht der Knopf unten, nach den Feldern.
  template(v-if='aktiv && !readonly')
    v-divider
    v-card-actions.px-4.flex-wrap.ga-2
      .text-caption.text-medium-emphasis(v-if='bestaetigt')
        | Geprüft und bestätigt. Eine Änderung in diesem Abschnitt hebt die Bestätigung wieder auf.
      .text-caption.text-medium-emphasis(v-else-if='geaendert')
        | Seit der Bestätigung wurde hier etwas geändert – bitte noch einmal prüfen.
      .text-caption.text-medium-emphasis(v-else)
        | Bitte alle Angaben dieses Abschnitts prüfen und dann bestätigen.
      v-spacer
      v-btn(
        v-if='bestaetigt',
        size='small',
        variant='text',
        @click='setze(false)'
      ) Bestätigung zurücknehmen
      v-btn(
        v-else,
        variant='tonal',
        color='green',
        prepend-icon='task_alt',
        @click='setze(true)'
      ) Geprüft und bestätigt
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Feld from './feld.vue'
import type { Abschnitt } from './definition'

/**
 * Ein Abschnitt als Card. KOPIE in schutzkonzept/src/schutzkonzept/abschnitt.vue.
 *
 * Bestätigung ("Geprüft und bestätigt", definition.einstellungen
 * .abschnitteBestaetigen): die Card zeigt nur den Zustand und meldet den
 * Klick -- als `update:bestaetigt` (v-model) und zusätzlich als `bestaetigen`
 * mit der Abschnitt-ID. Ob sich der Abschnitt seit der Bestätigung geändert
 * hat, entscheidet die Seite über abschnittsHash() aus definition.ts und
 * gibt es als `geaendert` herein.
 */
const props = defineProps<{
  abschnitt: Abschnitt
  readonly?: boolean
  markiereFehlend?: boolean
  /** Heutiges Datum JJJJ-MM-TT für relative Datumsregeln (aus der API). */
  heute?: string
  /** Formularversion verlangt Bestätigungen -- Chip und Knopf anzeigen. */
  bestaetigenAktiv?: boolean
  /** Gleichbedeutend mit bestaetigenAktiv (Schreibweise des Ausfüll-Editors). */
  bestaetigenNoetig?: boolean
  /** War bestätigt, seither aber geändert -- Hinweis "bitte erneut bestätigen". */
  geaendert?: boolean
}>()

const emit = defineEmits<{
  /** Klick auf "Geprüft und bestätigt"; Argument: Abschnitt-ID. */
  bestaetigen: [abschnittId: string]
}>()

const daten = defineModel<Record<string, any>>('daten', { required: true })
/** Dieser Abschnitt ist aktuell bestätigt (auch als reiner Prop nutzbar). */
const bestaetigt = defineModel<boolean>('bestaetigt', { default: false })

const aktiv = computed(
  () => !!props.bestaetigenAktiv || !!props.bestaetigenNoetig
)

function setze(wert: boolean) {
  bestaetigt.value = wert
  if (wert) emit('bestaetigen', props.abschnitt.id)
}
</script>

<style scoped>
.text-pre {
  white-space: pre-line;
}
.text-wrap {
  white-space: normal;
}
</style>
