import { createApp, h } from 'vue'
import { RouterView } from 'vue-router'

import 'vuetify/styles'
import 'material-design-icons-iconfont/dist/material-design-icons.css'
import 'roboto-fontface/css/roboto/roboto-fontface.css'
import './assets/style.css'

import { installRouter } from './plugins/router'
import { useVuetify } from './plugins/vuetify'
import { registerLibComponents } from './lib/import'

/**
 * Einstieg des Schutzkonzept-Systems (schutzkonzept.ec-nordbund.de).
 *
 * Aufbau wie EC-Portal, aber ohne Formularsystem und ohne Excel: die
 * Formulare hier baut der Schutzkonzept-Verwalter im Portal, gerendert
 * werden sie von src/schutzkonzept/abschnitt.vue.
 */
export const app = createApp({
  render: () => h(RouterView)
})

const router = installRouter()
// Der Routen-Generator (Kopie aus der Verwaltung) leitet die leere Wurzel auf
// /404. Hier ist '/' der natuerliche Einstieg -- also auf die Uebersicht.
router.beforeEach((to) => (to.path === '/' ? '/home' : true))
app.use(router)
useVuetify(app)
registerLibComponents(app)

app.mount('#app')
