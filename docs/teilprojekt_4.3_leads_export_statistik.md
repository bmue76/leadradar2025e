# Teilprojekt 4.3 – CSV-Export & einfache Statistik (Leads)

**Datum:** 27.11.2025  
**Verantwortlich:** Beat / LeadRadar2025e

## Ziel

Für jedes Formular im Admin-Bereich sollen die erfassten Leads:

- als CSV-Datei exportiert werden können (für Excel/Weiterverarbeitung),
- im Admin mit einer einfachen Statistik ausgewertet werden (Anzahl Leads, Leads pro Tag).

Dies erfolgt vollständig im Web-Frontend, basierend auf der bestehenden Lead-Struktur
(Lead + LeadFieldValue) und der dynamischen Form-Definition.

---

## Implementierte Komponenten

### 1. API-Route: CSV-Export

**Datei:**

- `web/app/api/admin/forms/[id]/leads/export/route.ts`

**Endpoint:**

- `GET /api/admin/forms/:id/leads/export`

**Query-Parameter:**

- `format` (optional, derzeit nur `csv`)
  - Standard: `csv`
  - Andere Werte führen zu HTTP 400 mit `{ error: 'Aktuell wird nur format=csv unterstützt' }`.
- `from` (optional, ISO-Datum/-Datetime)
  - Filtert Leads mit `createdAt >= from`.
- `to` (optional, ISO-Datum/-Datetime)
  - Filtert Leads mit `createdAt <= to`.

**CSV-Format:**

- Encoding: UTF-8 mit BOM (`\uFEFF`) → Excel-freundlich.
- Trennzeichen: `,` (Komma).
- Zeilentrenner: `\r\n`.
- Werte werden korrekt gequotet:
  - Enthält ein Wert `,`, `"` oder Zeilenumbrüche, wird er in `"` eingeschlossen
    und `"` im Text werden verdoppelt (`"` → `""`).

**Spalten:**

1. `LeadId` – interne Lead-ID (Integer)
2. `CreatedAt` – Zeitstempel der Erfassung (`Date.toISOString()`)
3. je Formularfeld eine Spalte:
   - Spaltenname = `FormField.label`
   - Fallback: `FormField.key` oder `Field_<id>`, falls Label/Key fehlen.

**Datenbasis:**

- `Form` mit `fields` (sortiert nach `order`).
- `Form.leads` inkl.:
  - `fieldValues` + zugehörigem `field`.

Jede CSV-Zeile entspricht genau einem Lead.  
Pro Feld wird der passende `LeadFieldValue.value` eingetragen (oder leer, wenn nicht gesetzt).

**Fehlerverhalten:**

- Ungültige Formular-ID → `400 { error: 'Ungültige Formular-ID' }`
- Formular nicht gefunden → `404 { error: 'Formular nicht gefunden' }`
- Ungültige `from`/`to` → `400 { error: 'Ungültiger from-Parameter' }` bzw. `to`
- Unerwarteter Fehler → `500 { error: 'Fehler beim CSV-Export der Leads' }`

Die API verwendet das bestehende Prisma-Setup (`{ prisma }` aus `@/lib/prisma`).

---

### 2. Admin-Seite: Leads-Übersicht & Export

**Datei:**

- `web/app/(admin)/admin/forms/[id]/leads/page.tsx`

**Funktionen:**

- Lädt mit `GET /api/admin/forms/:id/leads`:
  - Formular-Metadaten (`form`)
  - Felddefinitionen (`fields`)
  - Leads im kompakten Format:
    - `LeadRow` mit `id`, `createdAt`, `values` (Map `fieldKey → value`).
- Zeigt die Leads in einer Tabelle:
  - Spalten: lfd. Nummer, Erfassungsdatum, je Feld eine Spalte.
- Formatiert `createdAt` lokal (`de-CH`) für Anzeige.

**Neue Elemente (Teilprojekt 4.3):**

1. **Toolbar über der Tabelle**, sobald Leads vorhanden sind:
   - Anzeige: `X Leads erfasst`.
   - Button **„Statistik anzeigen / verbergen“**.
   - Button **„CSV exportieren“**.

2. **CSV-Export-Button:**

   - Handler: `handleExportCsv`.
   - Implementierung:
     - `window.location.href = /api/admin/forms/${formId}/leads/export`.
   - Effekt:
     - Browser lädt direkt die CSV-Datei (Download-Dialog).

3. **Einfache Statistik:**

   - Ein-/ausblendbar via `showStats` (Toggle-Button).
   - Berechnung clientseitig mit `useMemo`:
     - Gruppierung der Leads nach Datum (`YYYY-MM-DD`).
     - Aggregation `count` je Tag.
     - Sortierung chronologisch.
   - Darstellung:
     - Box „Statistik“ mit:
       - Gesamtanzahl Leads.
       - Liste „Leads pro Tag“.
     - Pro Tag ein horizontaler Balken:
       - Breite relativ zur Maximalanzahl (`maxCount`).
       - Beschriftung: Datum (`DD.MM.YYYY`) & Count im Balken.

Die Statistik basiert auf denselben geladenen Leads wie die Tabelle, es wird kein zusätzlicher API-Call benötigt.

---

## Tests

**Manuelle Tests (Stand lokal, `npm run dev`):**

1. **Leads-Erfassung:**
   - Über `/admin/forms/:id/preview` Leads erfassen.
   - Auf `/admin/forms/:id/leads` prüfen, ob sie angezeigt werden.

2. **CSV-Export via Button:**
   - `/admin/forms/:id/leads` aufrufen.
   - Sicherstellen, dass Leads vorhanden sind.
   - Button **„CSV exportieren“** anklicken.
   - Erwartung:
     - Download der Datei `form-<id>-leads-YYYYMMDD-HHmmss.csv`.
     - Öffnen in Excel: Header + eine Zeile pro Lead, Spalten pro Formularfeld.

3. **CSV-Export via direkter URL:**
   - Im Browser:
     - `/api/admin/forms/1/leads/export`
     - Optional mit Parametern:
       - `?from=2025-01-01&to=2025-12-31`
   - Erwartung wie oben.

4. **Statistik im Admin:**
   - `/admin/forms/:id/leads` aufrufen.
   - Button **„Statistik anzeigen“** anklicken.
   - Erwartung:
     - Box mit:
       - Gesamtanzahl Leads.
       - Auflistung der Tage, an denen Leads erfasst wurden.
       - Balkenlängen proportional zur Anzahl Leads pro Tag.

5. **Fehlerfälle:**
   - Ungültige Formular-ID in URL (z. B. `/admin/forms/99999/leads` mit nicht existierendem Formular):
     - sollte passenden Fehler bei `/api/admin/forms/:id/leads` liefern und im UI als Fehlermeldung angezeigt werden.
   - Ungültige Parameter für Export (`format=xlsx`, `from=foobar`):
     - `/api/admin/forms/:id/leads/export?format=xlsx` → HTTP 400 mit Fehler-JSON.
     - `/api/admin/forms/:id/leads/export?from=foobar` → HTTP 400 mit Fehler-JSON.

---

## Offene Punkte / Erweiterungsideen

- Optionaler **Excel-Export** (`format=xlsx`) mittels einer zusätzlichen, kostenlosen JS-Library
  (z. B. später via `xlsx` / SheetJS).
- Filtermöglichkeiten im UI (Datum von/bis) für:
  - Anzeige der Leads in der Tabelle,
  - Export des gefilterten Ausschnitts.
- Erweiterte Statistiken:
  - Leads nach Feldwerten (z. B. „Interesse A/B/C“),
  - Leads nach Team/Benutzer (falls später Tracking eingebaut wird),
  - Konfiguration der sichtbaren Kennzahlen pro Formular.
