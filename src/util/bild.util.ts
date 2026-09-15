// KOPIE aus EC-Portal/src/util/bild.util.ts.
// Aenderungen bitte in beiden Repos spiegeln, siehe DUPLIKATE.md.
/**
 * Bilder im Browser verkleinern.
 *
 * Die API hat keine Bildverarbeitung (kein sharp, kein Dateisystem -- Fotos
 * liegen als Blob in der Datenbank, siehe Portal-Downloads). Ein Handyfoto
 * hat aber 4 bis 8 MB, und davon sollen weder Datenbank noch Mobilfunk-
 * Verbindung der nächsten Nutzerin etwas merken. Also rechnet der Browser
 * die Datei vor dem Upload klein: einmal als Foto (max. 1200 px) und einmal
 * als Vorschau (max. 240 px) für die Liste.
 *
 * Ausgabe immer JPEG: Fotos von Gegenständen haben keine Transparenz, und
 * JPEG ist bei gleicher Qualität ein Bruchteil der PNG-Größe.
 */
export interface VerkleinertesBild {
  /** Reines base64 ohne `data:`-Präfix -- so erwartet es die API. */
  base64: string
  mimetype: 'image/jpeg'
  /** Größe der kodierten Datei in Byte (nicht der base64-Zeichen). */
  groesse: number
  breite: number
  hoehe: number
}

class BildFehler extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BildFehler'
  }
}

/**
 * Datei dekodieren. `createImageBitmap` respektiert die EXIF-Drehung
 * (Handyfotos liegen sonst quer); der Fallback über <img> ist für ältere
 * Safari-Versionen, die die Option nicht kennen.
 */
async function dekodieren(
  datei: File
): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(datei, { imageOrientation: 'from-image' })
    } catch {
      /* z. B. HEIC: der Browser kann das Format nicht -- unten ein zweiter Versuch */
    }
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(datei)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(
        new BildFehler(
          'Das Bild lässt sich nicht lesen. Bitte ein JPEG oder PNG wählen (HEIC-Fotos vom iPhone vorher umwandeln).'
        )
      )
    }
    img.src = url
  })
}

function blobZuBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const s = reader.result as string
      // "data:image/jpeg;base64,...." -> nur den Teil hinter dem Komma
      resolve(s.slice(s.indexOf(',') + 1))
    }
    reader.onerror = () =>
      reject(new BildFehler('Bild konnte nicht kodiert werden.'))
    reader.readAsDataURL(blob)
  })
}

/**
 * Bild auf `maxPx` (längste Kante) verkleinern und als JPEG kodieren.
 * Kleinere Bilder werden nicht hochskaliert, aber trotzdem neu kodiert --
 * so ist die Ausgabe immer JPEG und nie die Originaldatei.
 */
export async function verkleinere(
  datei: File,
  maxPx: number,
  qualitaet = 0.8
): Promise<VerkleinertesBild> {
  const quelle = await dekodieren(datei)
  const qw = 'naturalWidth' in quelle ? quelle.naturalWidth : quelle.width
  const qh = 'naturalHeight' in quelle ? quelle.naturalHeight : quelle.height
  if (!qw || !qh) throw new BildFehler('Das Bild ist leer.')

  const faktor = Math.min(1, maxPx / Math.max(qw, qh))
  const breite = Math.max(1, Math.round(qw * faktor))
  const hoehe = Math.max(1, Math.round(qh * faktor))

  const canvas = document.createElement('canvas')
  canvas.width = breite
  canvas.height = hoehe
  const ctx = canvas.getContext('2d')
  if (!ctx)
    throw new BildFehler(
      'Bildverarbeitung wird von diesem Browser nicht unterstützt.'
    )
  // Weißer Grund: transparente PNG-Bereiche würden in JPEG sonst schwarz.
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, breite, hoehe)
  ctx.drawImage(quelle, 0, 0, breite, hoehe)
  if ('close' in quelle) quelle.close()

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', qualitaet)
  )
  if (!blob) throw new BildFehler('Bild konnte nicht kodiert werden.')

  return {
    base64: await blobZuBase64(blob),
    mimetype: 'image/jpeg',
    groesse: blob.size,
    breite,
    hoehe
  }
}

/** Die beiden Fassungen, die die API für ein Material erwartet. */
export async function materialFotoAufbereiten(datei: File) {
  const foto = await verkleinere(datei, 1200, 0.8)
  const vorschau = await verkleinere(datei, 240, 0.7)
  return { foto, vorschau }
}
