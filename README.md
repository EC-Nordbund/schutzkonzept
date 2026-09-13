# Schutzkonzept

Ausfüll-System für das **Schutzkonzept zur Gewaltprävention** der EC-Kreise im
EC-Nordbund – erreichbar unter <https://schutzkonzept.ec-nordbund.de>.

Jeder EC-Kreis füllt das Formular Schritt für Schritt aus (ein Schritt je
Bereich, eine Card je Abschnitt, gespeichert wird bei jedem „Weiter“). Beim
**Veröffentlichen** erzeugt die API aus den DOCX-Vorlagen fertige PDFs und friert
den Stand ein. Spätere Aktualisierungen legen einen neuen Stand an, der die
bisherigen Angaben übernimmt – auch wenn es inzwischen eine neue
Formularversion gibt.

Das **Formular selbst** (Bereiche, Abschnitte, Felder, Vorlagen, Versionen)
baut der *Schutzkonzept-Verwalter* im EC-Portal.

## Stack

Vue 3.5 · Vuetify 4 · Vite 8 · TypeScript · Pug – wie EC-Portal, ohne GraphQL.
Die App spricht nur die REST-Routen `/schutzkonzept/*` der EC-Api.

## Anmeldung

- **Per Code:** E-Mail-Adresse eingeben. Ist sie in der Verwaltung bei einem
  EC-Kreis als *Schutzkonzept-E-Mail* hinterlegt, kommt ein 6-stelliger Code
  (15 Minuten gültig, fünf Versuche). Die Mail enthält zusätzlich einen
  Direktlink `#/login?email=…&code=…`. Die Antwort ist absichtlich immer
  gleich – ob eine Adresse hinterlegt ist, verrät die Seite nicht.
- **Übergabe aus dem Portal:** Schutzkonzept-Verwalter öffnen einen Kreis im
  Portal über „Im Schutzkonzept-System öffnen“. Das erzeugt einen
  Einmal-Link `#/uebergabe?token=…` (5 Minuten, genau einmal, nur für diesen
  Kreis).

## Entwicklung

```bash
nvm use
npm install
DEV_PORT=8094 API_BASE=http://localhost:4000 npm run dev
```

Port 8094, weil 8090/8091 (Verwaltung), 8092 und 8093 (Portal) belegt sind. Die
API läuft über `dev/run-api.sh` auf 4000 und braucht in `dev/api.env`
`SCHUTZKONZEPT_JWT_SECRET` (verschieden von den anderen Secrets) und
`SCHUTZKONZEPT_BASE_URL=http://localhost:8094`. Das Schema liegt in
`EC-Api/sql/schutzkonzept-schema.sql`. Login-Codes landen in Mailpit
(<http://localhost:8026>).

End-to-End-Test: `node ../dev/test-schutzkonzept.js` (aus `EC-Api`, wegen
der Playwright-Abhängigkeit in `dev/`).

## Deploy

`.github/workflows/build.yml`: bei jedem Push Build, Lint und Typen; auf
`main` zusätzlich rsync nach
`deployer@ec-nordbund.de:/webpage/schutzkonzept.ec-nordbund.de/` (Secret
`DEPLOY_KEY`). Statischer vhost, Hash-Routing – kein SPA-Fallback nötig, und
Tokens im Fragment landen nicht in Access-Logs.

Siehe auch `DUPLIKATE.md`.
