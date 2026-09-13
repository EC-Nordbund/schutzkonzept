// Nach dem Vorbild von EC-Portal/vite.config.ts, ohne die Node-Aliase fuer
// xlsx-template (das Schutzkonzept erzeugt keine Excel-Dateien).
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'

export default defineConfig({
  plugins: [
    vue({
      template: {
        preprocessOptions: {
          // WICHTIG (wie in EC-Verwaltung): ohne doctype rendert pug
          // valuelose Attribute als attr="attr" und bricht damit
          // template(#prepend), v-btn(icon), v-else.
          doctype: 'html'
        }
      }
    }),
    vuetify({ autoImport: true })
    // Kein VitePWA -- Begruendung wie im Portal.
  ],
  define: {
    __API_BASE__: JSON.stringify(
      process.env.API_BASE || 'https://api.ec-nordbund.de'
    )
  },
  optimizeDeps: {
    exclude: ['vuetify']
  },
  server: {
    // 8090 Verwaltung, 8091 deren HMR-Socket, 8092 Portal, 8093 zweite
    // Portal-Instanz -- deshalb 8094.
    port: Number(process.env.DEV_PORT ?? 8094)
  }
})
