# Duplikate zu EC-Portal

Das Schutzkonzept-System ist bewusst ein eigenes, kleines Repo mit demselben
Stack wie EC-Portal. Ein gemeinsames Paket gibt es nicht (Begründung siehe
`EC-Portal/DUPLIKATE.md`) – die Kopien sind gewollt, driften aber, wenn niemand
hinsieht. Jede kopierte Datei trägt einen Kopfkommentar `KOPIE aus EC-Portal/...`.

## Fachlich geteilt (müssen identisch bleiben)

| Datei hier | Quelle | identisch |
|---|---|---|
| `src/schutzkonzept/definition.ts` | `EC-Api/src/schutzkonzept/definition.ts` und `EC-Portal/src/schutzkonzept/definition.ts` | ja |
| `src/schutzkonzept/feld.vue` | `EC-Portal/src/schutzkonzept/feld.vue` | ja |
| `src/schutzkonzept/abschnitt.vue` | `EC-Portal/src/schutzkonzept/abschnitt.vue` | ja |

`definition.ts` rechnet Fortschritt, Pflichtfelder und Bereinigung – Backend,
Portal und dieses Repo müssen dabei exakt dasselbe Ergebnis liefern.

## Technisches Gerüst (aus EC-Portal, dort teils aus EC-Verwaltung)

| Datei hier | Quelle in EC-Portal | identisch |
|---|---|---|
| `src/plugins/routes.ts` | `src/plugins/routes.ts` | ja (bis auf Kopfkommentar) |
| `src/plugins/router.ts` | `src/plugins/router.ts` | ja (bis auf Kopfkommentar) |
| `src/plugins/vuetify.ts` | `src/plugins/vuetify.ts` | ja (bis auf Kopfkommentar) |
| `src/plugins/base.ts` | `src/plugins/base.ts` | ja (bis auf Kopfkommentar) |
| `src/plugins/dialog.ts` | `src/plugins/dialog.ts` | ja (bis auf Kopfkommentar) |
| `src/plugins/caps.ts` | `src/plugins/caps.ts` | ja (bis auf Kopfkommentar) |
| `src/plugins/apiBase.ts` | `src/plugins/apiBase.ts` | ja (bis auf Kopfkommentar) |
| `src/plugins/api.ts` | `src/plugins/api.ts` | ja (bis auf Kopfkommentar) |
| `src/lib/dialogHost.lib.vue` | `src/lib/dialogHost.lib.vue` | ja (bis auf Kopfkommentar) |
| `src/config/theme.ts` | `src/config/theme.ts` | ja (bis auf Kopfkommentar) |
| `src/util/download.util.ts` | `src/util/download.util.ts` | ja (bis auf Kopfkommentar) |
| `src/util/bild.util.ts` | `src/util/bild.util.ts` | ja (bis auf Kopfkommentar) – `feld.vue` (Foto-Feld) braucht es |

## Bewusst abweichend

- `src/assets/style.css` – ohne `html { overflow: hidden }` (die Formularseiten
  scrollen normal statt in einer festen Karte) und ohne `user-select: none`
  (eigene Eingaben müssen markier- und kopierbar sein).
- `src/storage/index.ts` – eigene Schlüssel mit Präfix `ecSchutzkonzept:`.
- `src/plugins/auth.ts` – Login per Code bzw. Übergabe-Link statt Passwort.
- `src/main.ts` – ohne Formularsystem; `/` leitet auf `/home`.
- Kein `wrapper.lib.vue`: dessen feste Kartenhöhe passt nicht zu langen
  Formularseiten, die Seiten nutzen normale Cards.

## Pflege

```bash
for f in definition.ts feld.vue abschnitt.vue; do
  diff -q src/schutzkonzept/$f ../EC-Portal/src/schutzkonzept/$f
done
diff -q src/schutzkonzept/definition.ts ../EC-Api/src/schutzkonzept/definition.ts
diff -r --brief src/plugins ../EC-Portal/src/plugins
```
