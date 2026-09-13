// KOPIE aus EC-Portal/src/plugins/base.ts (dort wiederum aus EC-Verwaltung, Stand de016c0).
// Aenderungen bitte in allen Repos spiegeln, siehe DUPLIKATE.md.
export function defineUseFunction<T>(init: () => T) {
  let data: T = null

  return () => {
    if (!data) {
      data = init()
    }

    return data
  }
}
