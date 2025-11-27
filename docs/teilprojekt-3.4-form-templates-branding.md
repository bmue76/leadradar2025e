## Teilprojekt 3.4 – Formular-Vorlagen & Branding (CI-Farben & Logo)

**Datum:** 27.11.2025  
**Status:** abgeschlossen

### Ziel

- Systemweite **Formular-Vorlagen** bereitstellen, aus denen Event-Formulare erstellt werden können.
- Pro Formular ein einfaches **Branding** (Titel, Untertitel, Logo, Primär-/Akzentfarbe) definieren.
- Branding sowohl in der **Admin-Preview** als auch in der **öffentlichen Runtime** anzeigen.
- Option: bestehende Formulare als Vorlagen speichern.

---

### Datenmodell-Erweiterungen

**Form (Prisma-Modell)**

- `isTemplate Boolean @default(false)`  
  - `true` = systemweite Vorlage (ohne Event-Bezug)  
  - `false` = normales Event-Formular
- Branding-Felder:
  - `displayTitle String?` – Anzeige-Titel für Runtime (Fallback: `name`)
  - `displaySubtitle String?` – Untertitel/Beschreibung für User
  - `logoUrl String?` – URL zu Logo (PNG/SVG)
  - `primaryColor String?` – Primärfarbe (Button, Titel, etc., HEX)
  - `accentColor String?` – Akzentfarbe (zweite Farbe, HEX)

Existierende Beziehungen (Events, FormFields, Leads) bleiben unverändert.

---

### API-Endpunkte

**Admin / Intern**

- `GET /api/admin/forms/[id]`
  - Liefert ein Formular inkl. Felder (erweitert um Branding-Felder).
- `PATCH /api/admin/forms/[id]`
  - Aktualisiert Basisinfos + Branding (`name`, `description`, `displayTitle`, `displaySubtitle`, `logoUrl`, `primaryColor`, `accentColor`).

- `GET /api/admin/form-templates`
  - Liefert alle Formular-Vorlagen (`Form.isTemplate = true`), sortiert nach `createdAt desc`.
- `POST /api/admin/form-templates`
  - Legt eine neue leere Formular-Vorlage (ohne Felder) an.

- `POST /api/admin/events/[id]/forms/from-template`
  - Erzeugt ein neues Event-Formular auf Basis einer Vorlage:
    - kopiert Branding-Felder
    - kopiert alle `FormField`s der Vorlage
    - setzt `eventId` auf das Ziel-Event, `isTemplate = false`, `status = DRAFT`.

- `POST /api/admin/forms/[id]/save-as-template`
  - Erzeugt aus einem bestehenden Event-Formular eine neue Vorlage:
    - kopiert Branding-Felder
    - kopiert alle `FormField`s
    - neue `Form` mit `eventId = null`, `isTemplate = true`.

**Public / Runtime**

- `GET /api/forms/[id]`
  - Öffentliche Form-API für Web/App:
    - nur nicht-Template-Forms (`isTemplate = false`)
    - inkl. Branding + Felder (sortiert nach `order`).

- `POST /api/forms/[id]/submit`  
  - (Bestand aus Teilprojekt 3.3 / 3.4.1 – hier nur genutzt)  
  - Erzeugt Leads mit dynamischen Feldwerten.

---

### Admin-UI

**Neue/angepasste Seiten**

- `/admin/form-templates`
  - Übersicht aller Vorlagen (Liste mit Farben & Status).
  - Formular „Neue Formular-Vorlage anlegen“.
  - Aktionen pro Vorlage:
    - „Einstellungen“ → `/admin/forms/[id]/settings`
    - „Felder“ → `/admin/forms/[id]/fields`
    - „Preview“ → `/admin/forms/[id]/preview`

- `/admin/events/[id]/forms`
  - Formularliste pro Event (inkl. Anzeige von Typ „Vorlage“/„Event-Formular“ und Farbchips).
  - Funktionen:
    - Neues leeres Formular anlegen (Name + interne Beschreibung).
    - Dialog „Formular aus Vorlage erstellen…“:
      - lädt Templates via `GET /api/admin/form-templates`
      - erzeugt Formular via `POST /api/admin/events/[id]/forms/from-template`.

- `/admin/forms/[id]/settings`
  - Bearbeitung von:
    - Basisdaten: `name`, `description`
    - Branding: `displayTitle`, `displaySubtitle`, `logoUrl`, `primaryColor`, `accentColor` inkl. Vorschau.
  - Zusätzlich für **Event-Formulare**:
    - Block „Als Vorlage speichern“:
      - optionaler Vorlagenname + Beschreibung
      - legt neue Vorlage via `POST /api/admin/forms/[id]/save-as-template` an.

- `/admin/forms/[id]/preview`
  - Nutzt die gemeinsame `FormRuntime`-Komponente im Modus `preview`.
  - Zeigt Branding (Logo, Titel, Untertitel, Farben) + alle Felder.
  - Hinweis: „Vorschau – Eingaben werden nicht gespeichert.“

---

### Runtime & öffentliche Formseite

**Komponente**

- `web/components/FormRuntime.tsx`
  - Props:
    - `form: RuntimeForm` (inkl. Branding-Feldern)
    - `fields: RuntimeField[]`
    - `mode: 'preview' | 'live'`
  - Verhalten:
    - `mode = 'preview'`:
      - kein echter Submit, Meldung „Daten werden nicht gespeichert“.
    - `mode = 'live'`:
      - `POST /api/forms/[id]/submit` wird aufgerufen, Success-/Fehlermeldungen werden angezeigt.
  - Unterstützte Feldtypen: TEXT, TEXTAREA, SINGLE_SELECT, MULTI_SELECT, NUMBER, EMAIL, PHONE, DATE, DATETIME, BOOLEAN.

**Öffentliche Seite**

- `GET /forms/[id]` → `web/app/forms/[id]/page.tsx`
  - Lädt `form` + `fields` via `GET /api/forms/[id]`.
  - Rendert `FormRuntime` im Modus `live`.
  - Branding wird vollständig berücksichtigt.

---

### Tests / Checkliste Teilprojekt 3.4

1. **Vorlagen anlegen**
   - `/admin/form-templates` → neue Vorlage „Standard-Leaderfassung“ erstellen.
   - Felder über `/admin/forms/[id]/fields` hinzufügen und Preview prüfen.

2. **Event-Formular aus Vorlage**
   - `/admin/events/[EVENT_ID]/forms` → „Formular aus Vorlage erstellen…“.
   - Neues Formular erscheint in Liste, Felder sind kopiert, Branding wird übernommen.

3. **Branding-Settings**
   - `/admin/forms/[FORM_ID]/settings`:
     - Titel, Untertitel, Logo-URL, Primär-/Akzentfarbe setzen.
   - `/admin/forms/[FORM_ID]/preview`:
     - Branding sichtbar, Vorschau-Hinweis vorhanden.

4. **Öffentliche Runtime**
   - `/forms/[FORM_ID]` im Browser öffnen.
   - Formular mit Branding angezeigt.
   - Submit erzeugt einen Lead, sichtbar unter `/admin/forms/[FORM_ID]/leads`.

5. **Formular als Vorlage speichern**
   - Event-Formular mit Feldern & Branding auswählen.
   - In `/admin/forms/[ID]/settings` block „Als Vorlage speichern“ nutzen.
   - Neue Vorlage erscheint unter `/admin/form-templates` mit kopierten Feldern & Branding.

---

Damit ist Teilprojekt **3.4 – Formular-Vorlagen & Branding** fachlich und technisch abgeschlossen und sauber dokumentiert. 💪  

Wenn du möchtest, können wir im nächsten Schritt die Gesamt-Projektübersicht aktualisieren (welche Teilprojekte erledigt sind, was als Nächstes ansteht – z. B. Mobile-App-Anbindung an die neue Runtime-API).
::contentReference[oaicite:0]{index=0}
