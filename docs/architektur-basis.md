# Architektur – Basis (Stand: Initial-Setup)

## Übersicht

leadradar2025e besteht aus mehreren Schichten:

- **Web-App (`web/`)**
  - Next.js (App Router, TypeScript, Tailwind CSS)
  - Bereiche:
    - `(public)` – öffentliche Landingpage, Marketing, Info
    - `(admin)` – Admin-Bereich für Messen, Formulare, Leads
  - API-Routen im App Router (z. B. `/api/health`)

- **Backend / API**
  - Läuft innerhalb der Next.js-App (Server-Komponenten & API-Routen)
  - Später Anbindung an Datenbank via Prisma
  - Gemeinsame API-Basis für Web-Frontend und Mobile-App

- **Datenbank (geplant)**
  - Entwicklung: SQLite (lokale Datei)
  - Zugriff über Prisma (TypeScript-ORM)
  - Später optional Umstieg auf Postgres/MySQL in der Cloud

- **Mobile App (geplant, eigener Ordner `mobile/`)**
  - Expo / React Native
  - Kommunikation mit der Backend-API (z. B. JSON/REST)
  - Offline-Fähigkeit mit Synchronisation

## Aktueller Stand

- Next.js-App im Ordner `web/` erstellt
- Routengruppen:
  - `app/(public)/page.tsx` → `/`
  - `app/(admin)/page.tsx` → `/admin`
- Erste API-Route:
  - `app/api/health/route.ts` → `/api/health`

  ## API-Struktur (Stand Basis-Setup)

- **Global**
  - `GET /api/health`  
    - Health-Check für den gesamten Service (wird von Web & Mobile genutzt)

- **Admin**
  - `GET /api/admin/health`  
    - Health-Check speziell für Admin-Kontext (später z. B. Berechtigungen, Datenbank-Checks, etc.)

- **Mobile**
  - `GET /api/mobile/health`  
    - Health-Check-Endpunkt für die Mobile-App

- **Response-Format**

  Alle API-Endpunkte nutzen gemeinsame Helfer in `lib/api/response.ts`:

  ```json
  {
    "success": true,
    "data": { ... }
  }

- **neue Models Event, Lead**

Migration add_event_and_lead

Endpoint /api/admin/events.
