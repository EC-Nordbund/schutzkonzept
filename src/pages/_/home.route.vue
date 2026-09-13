<template lang="pug">
div
  h1.text-h5.mb-4(v-font, v-primary) Schutzkonzept zur Gewaltprävention
  v-alert(v-if='me.kreise.length === 0', type='info', variant='tonal')
    | Für diese Anmeldung ist derzeit kein EC-Kreis freigeschaltet.
  v-row(v-else)
    v-col(v-for='k in me.kreise', :key='k.ecKreisID', cols='12', sm='6', md='4')
      v-card(:to='`/kreis/${k.ecKreisID}/uebersicht`')
        v-card-item
          template(#prepend)
            v-icon(color='primary') shield
          v-card-title {{ k.bezeichnung }}
          v-card-subtitle Schutzkonzept öffnen
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import type { SkMe } from '../../plugins/auth'
import { useRouter } from '../../plugins/router'

const props = defineProps<{ me: SkMe }>()
const { router } = useRouter()

// Die meisten Adressen gehören zu genau einem Kreis -- dann ohne Umweg hin.
onMounted(() => {
  if (props.me.kreise.length === 1) {
    router.replace(`/kreis/${props.me.kreise[0].ecKreisID}/uebersicht`)
  }
})
</script>
