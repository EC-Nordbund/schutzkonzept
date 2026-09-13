// KOPIE aus EC-Portal/src/util/download.util.ts.
// Aenderungen bitte in beiden Repos spiegeln, siehe DUPLIKATE.md.
/**
 * Datei im Browser speichern.
 *
 * Über den versteckten Anker `#ec-download` in der index.html -- dasselbe
 * Vorgehen wie in EC-Verwaltung. Ein frisch erzeugtes `<a>` täte es auch,
 * aber der feste Anker ist im DOM auffindbar und überlebt einen Rerender.
 */
export default function saveBlob(dateiname: string, blob: Blob): void {
  const a = document.getElementById('ec-download') as HTMLAnchorElement
  const url = URL.createObjectURL(blob)
  a.href = url
  a.download = dateiname
  a.click()
  // Ohne revoke bleibt der Blob bis zum Neuladen im Speicher.
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}
