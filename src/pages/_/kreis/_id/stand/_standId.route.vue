<template lang="pug">
div
  .d-flex.align-center.flex-wrap.mb-2
    v-btn.mr-2(icon='arrow_back', variant='text', :to='`/kreis/${id}/uebersicht`', title='Zurück')
    h1.text-h5(v-font, v-primary)
      | {{ daten ? `${daten.kreis.bezeichnung} · Stand ${daten.stand.versionNr}` : 'Stand' }}
  v-progress-linear.mb-4(v-if='!daten', indeterminate, color='primary')
  template(v-else)
    .text-body-2.text-medium-emphasis.mb-4
      template(v-if='daten.stand.status === "published"')
        | Veröffentlicht {{ datumZeit(daten.stand.publishedAm) }} von {{ daten.stand.publishedVon }} ·
      template(v-else) In Bearbeitung ·
      |  Formularversion {{ daten.stand.formularVersionNr }}
    .d-flex.flex-wrap.mb-4(v-if='daten.pdfs.length', style='gap: 8px')
      v-btn(
        v-for='p in daten.pdfs',
        :key='p.pdfID',
        size='small',
        variant='tonal',
        prepend-icon='picture_as_pdf',
        @click='pdf(p)'
      ) {{ p.dateiname }}
    template(v-for='b in daten.definition.bereiche', :key='b.id')
      h2.text-h6.mt-6.mb-2 {{ b.titel }}
      //- Nur lesen; der eingefrorene Bestätigungsstand wird als Chip gezeigt
      abschnitt(
        v-for='a in b.abschnitte',
        :key='a.id',
        v-model:daten='daten.stand.daten',
        :abschnitt='a',
        :heute='daten.heute',
        :bestaetigen-noetig='daten.definition.einstellungen?.abschnitteBestaetigen === true',
        :bestaetigt='(daten.stand.abschnitteBestaetigt ?? []).includes(a.id)',
        readonly
      )
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Abschnitt from '../../../../../schutzkonzept/abschnitt.vue'
import { useApi } from '../../../../../plugins/api'
import { useRouter } from '../../../../../plugins/router'
import saveBlob from '../../../../../util/download.util'
import { datumZeit } from '../../../../../util/format'
import type { PdfInfo, StandDetail } from '../../../../../schutzkonzept/typen'

/** Nur-Lese-Ansicht eines Stands, genau so, wie er veröffentlicht wurde. */
const { route } = useRouter()
const api = useApi()

const daten = ref<StandDetail | null>(null)
const id = computed(() => Number(route.value.params.id))
const standId = computed(() => Number(route.value.params.standId))

watch(
  [id, standId],
  async () => {
    daten.value = null
    try {
      daten.value = await api.get<StandDetail>(
        `/schutzkonzept/kreis/${id.value}/stand/${standId.value}`
      )
    } catch {
      /* Dialog */
    }
  },
  { immediate: true }
)

async function pdf(p: PdfInfo) {
  const r = await api.requestBlob(
    `/schutzkonzept/kreis/${id.value}/pdf/${p.pdfID}`
  )
  saveBlob(r.dateiname, r.blob)
}
</script>
