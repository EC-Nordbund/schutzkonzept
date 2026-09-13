import type {
  AbschnittRef,
  Daten,
  Definition,
  Fehlend,
  Verstoss
} from './definition'

/** Kopf eines Stands (GET /schutzkonzept/kreis/:id). */
export interface StandKurz {
  standID: number
  versionNr: number
  status: 'draft' | 'published'
  formularVersionID: number
  formularVersionNr: number
  fortschritt: number
  revision: number
  erstellt: string
  geaendert: string
  geaendertVon: string
  publishedAm: string | null
  publishedVon: string | null
  veraltet?: boolean
}

export interface PdfInfo {
  pdfID: number
  vorlageID: number
  dateiname: string
  groesse: number
}

export interface KreisUebersicht {
  kreis: { ecKreisID: number; bezeichnung: string }
  aktuelleFormularVersion: {
    formularVersionID: number
    versionNr: number
  } | null
  draft: (StandKurz & { veraltet: boolean }) | null
  historie: (StandKurz & { veraltet: boolean; pdfs: PdfInfo[] })[]
}

/** Vollständiger Stand (Editor und Ansicht). */
export interface StandDetail {
  kreis: { ecKreisID: number; bezeichnung: string }
  stand: StandKurz & {
    daten: Daten
    bereicheGespeichert: string[]
    abschnitteBestaetigt: string[]
  }
  definition: Definition
  vorlagen: { vorlageID: number; bezeichnung: string }[]
  pdfs: PdfInfo[]
  /** JJJJ-MM-TT (Europe/Berlin, Server-Zeit) -- damit rechnen die Datumsregeln. */
  heute: string
  /** Prüfstand: die drei Sperren vor dem Veröffentlichen. */
  fehlend: Fehlend[]
  verstoesse: Verstoss[]
  /** Leer, wenn definition.einstellungen.abschnitteBestaetigen aus ist. */
  unbestaetigt: AbschnittRef[]
  migriert?: { vonVersionNr: number; nachVersionNr: number } | null
}

export interface BereichGespeichert {
  revision: number
  fortschritt: number
  bereicheGespeichert: string[]
  abschnitteBestaetigt: string[]
  heute: string
  fehlend: Fehlend[]
  verstoesse: Verstoss[]
  unbestaetigt: AbschnittRef[]
}
