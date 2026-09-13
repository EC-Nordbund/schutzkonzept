import type { App } from 'vue'

import dialogHost from './dialogHost.lib.vue'

/** Global registrierte Bausteine. */
export function registerLibComponents(app: App) {
  app.component('EcDialogHost', dialogHost)
}
