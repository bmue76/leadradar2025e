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
