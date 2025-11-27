# Teilprojekt 4.1 – Event-Dashboard & Lead-Statistik (Admin)

## Kontext

Projekt: **leadradar2025e**  
Ziel: Digitale Leaderfassung auf Messen mit Web-Admin, Formular-Editor und Mobile Apps.

Dieses Teilprojekt erweitert die Admin-Sicht um Event-bezogene Kennzahlen und ein zentrales Dashboard.

---

## Ziele von Teilprojekt 4.1

- Event-Übersicht mit Kennzahlen:
  - Anzahl Formulare pro Event
  - Anzahl Leads total
  - Leads heute
  - Leads letzte 7 Tage
- Detail-Statistik pro Event:
  - Gesamt-Leads
  - Leads nach Formular
  - Leads nach Tag (Trend)
- Zentrales Dashboard:
  - Gesamt-Leads
  - Leads heute / letzte 7 Tage
  - Anzahl aktiver Events
  - Top-Events nach Leads

---

## Backend-Änderungen (API & Aggregationen)

### 1. Event-Kennzahlen für alle Events

**Datei:** `web/app/api/admin/events/stats/route.ts`  
**Route:** `GET /api/admin/events/stats`

Funktion:

- Lädt alle `Event`s (Basisdaten).
- Ermittelt pro Event:
  - `formCount` (Anzahl `Form`s)
  - `leadCountTotal` (Summe aller Leads über alle Forms)
  - `leadCountToday` (Leads mit `createdAt >= startOfToday`)
  - `leadCountLast7Days` (Leads der letzten 7 Tage inkl. heute)
- Nutzt `Prisma`-Aggregationen:
  - `form.findMany` mit `_count.leads`
  - `lead.groupBy({ by: ['formId'], ... })` für Zeitfenster

Response-Struktur (vereinfacht):

```json
{
  "events": [
    {
      "id": 1,
      "name": "Messe XY",
      "startDate": "2026-01-10T08:00:00.000Z",
      "endDate": "2026-01-12T17:00:00.000Z",
      "formCount": 3,
      "leadCountTotal": 42,
      "leadCountToday": 5,
      "leadCountLast7Days": 20
    }
  ]
}
