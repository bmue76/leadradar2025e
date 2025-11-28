# LeadRadar2025e – Teilprojekt 5.5: Mobile Lead-Liste & Detailansicht

**Datum:** 28.11.2025  
**Status:** umgesetzt (erste Version)

## Ziel

Im Lead-Tab der Mobile-App (Expo / React Native) sollen erfasste Leads pro Formular
sichtbar und einsehbar sein:

- Lead-Liste pro Formular
- Detailansicht eines einzelnen Leads mit Basis- und Formularfeldern

## Architektur & Flow

### Navigation (LeadStack)

- `LeadSelection`  
  Auswahl eines Formulars. Für jedes Formular stehen zwei Aktionen zur Verfügung:
  - **Lead erfassen** → `LeadCapture`
  - **Leads anzeigen** → `LeadList`

- `LeadCapture`  
  Runtime-Form-Rendering & Lead-Submit (Form-Definition wird per `fetchLeadForm(formId)` geladen).
  - `formId` wird aus den Route-Params übernommen und beim Submit an
    `submitLead(formId, payload)` übergeben.

- `LeadList`  
  - Route-Params: `{ formId: number; formName: string }`
  - Zeigt alle Leads für das ausgewählte Formular als `FlatList`.

- `LeadDetail`  
  - Route-Params: `{ formName: string; lead: LeadWithFieldValuesDto }`
  - Zeigt Detailansicht eines Leads (Stammdaten + dynamische Formularfelder).

### Datenfluss

- Backend-API (Admin, Next.js):
  - `GET /api/admin/events` → Events für Auswahl im LeadSelectionScreen
  - `GET /api/admin/forms` → Formular-Liste
  - `GET /api/admin/forms/:id` → Form-Definition (Felder)
  - `POST /api/admin/forms/:id/leads` → Lead anlegen
  - `GET /api/admin/forms/:id/leads` → Leads inkl. `fieldValues` (und zugehörigem `field`)

- Mobile-API-Client (`mobile/src/api/leads.ts`):
  - `fetchLeadForm(formId)` → Runtime-Form
  - `submitLead(formId, payload)` → Lead speichern
  - `fetchLeadsForForm(formId)` → Leads eines Formulars laden

- Typen & Mapping:
  - `mobile/src/types/leads.ts`
    - DTO: `LeadWithFieldValuesDto`, `LeadFieldValueDto`
    - UI-Modelle: `LeadSummary`, `LeadDetail`, `LeadDetailField`
  - `mobile/src/utils/leadMappers.ts`
    - `mapLeadToSummary(dto) -> LeadSummary`
    - `mapLeadToDetail(dto) -> LeadDetail`
    - Datumsformatierung in `de-CH`.

## Neue / angepasste Dateien

### Typen & Utils

- `mobile/src/types/leads.ts`
  - Definiert DTO-Typen für Leads inkl. FieldValues.
  - Definiert UI-Typen für Lead-Liste und Detailansicht.

- `mobile/src/utils/leadMappers.ts`
  - Formatierung von Datum/Zeit (`de-CH`).
  - Mapping von DTO → `LeadSummary` (Titel, Untertitel, Datum).
  - Mapping von DTO → `LeadDetail` (Stammdaten + dynamische Felder).

### API

- `mobile/src/api/leads.ts`
  - Enthält:
    - `fetchLeadForm(formId)` – lädt Formulardefinition.
    - `submitLead(formId, payload)` – speichert Lead für ein Formular.
    - `fetchLeadsForForm(formId)` – ruft `/api/admin/forms/:id/leads` auf.
  - Typ `LeadsForFormResponse` dokumentiert die erwartete Antwortstruktur.

### Navigation

- `mobile/src/navigation/LeadStackNavigator.tsx`
  - `LeadStackParamList` mit Routen:
    - `LeadSelection`
    - `LeadCapture`
    - `LeadList`
    - `LeadDetail`
  - Screens registriert:
    - `LeadSelectionScreen`
    - `LeadCaptureScreen`
    - `LeadListScreen`
    - `LeadDetailScreen`

### UI-Komponenten & Screens

- `mobile/src/screens/leads/LeadSelectionScreen.tsx`
  - Lädt Events & Formulare (`/api/admin/events`, `/api/admin/forms`).
  - Filtert Formulare nach ausgewähltem Event.
  - Pro Formular:
    - Button **„Lead erfassen“** → `LeadCapture` (mit `formId`, `formName`).
    - Button **„Leads anzeigen“** → `LeadList` (mit `formId`, `formName`).

- `mobile/src/screens/leads/LeadCaptureScreen.tsx`
  - Lädt Formulardefinition via `fetchLeadForm(formId)` (R
