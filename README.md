# leadradar2025e

Moderne Neuauflage von **LeadRadar** als SaaS-Lösung zur digitalen Leaderfassung auf Messen.

## Ziel

leadradar2025e besteht aus:

- **Web-Frontend (Admin & Formular-Editor)**  
  - Verwaltung von Messen, Formularen und Leads  
  - Konfiguration von Lizenzen und Benutzerkonten

- **Backend-API**  
  - Zentrale Schnittstelle für Web-Frontend und Mobile App  
  - Zugriff auf Datenbank (Prisma + SQLite in Dev, später z. B. Postgres/MySQL)

- **Mobile App (iOS & Android – späteres Teilprojekt)**  
  - Erfassung von Leads auf Messen  
  - QR-/Visitenkarten-Scan  
  - Offline-Fähigkeit mit späterer Synchronisation

Die alte LeadRadar-Version (2017) dient nur als konzeptionelle Vorlage. Technisch wird das Projekt komplett neu und modern aufgebaut. 

## Tech-Stack (Stand Basis-Setup)

- **Framework:** Next.js (App Router, TypeScript)
- **Sprache:** TypeScript
- **Styling (Basis):** Tailwind CSS (für spätere UI-Komponenten)
- **Bundler/Dev:** Next.js (mit Turbopack)
- **Versionierung:** Git

## Projektstruktur (geplant)

```text
leadradar2025e/
├─ web/          # Next.js App (Web-Admin & API)
├─ mobile/       # (später) Expo/React-Native App
├─ docs/         # Projektdokumentation, Architektur, Konzepte
└─ README.md     # Dieses Dokument
