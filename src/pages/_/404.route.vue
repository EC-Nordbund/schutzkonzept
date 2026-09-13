<template lang="pug">
v-card
  v-card-title Seite nicht gefunden
  v-card-text
    p Diese Seite gibt es nicht (mehr).
    p.text-medium-emphasis(v-if='route.query.prev') {{ route.query.prev }}
  v-card-actions
    v-btn(variant='tonal', to='/home') Zur Übersicht
</template>
<script setup lang="ts">
import { useRouter } from '../../plugins/router'

const { route } = useRouter()
</script>
