# Teilprojekt 5.2 – Mobile Events & Forms (Backend-API)

**Datum:** 28.11.2025  
**Projekt:** LeadRadar2025e  
**Scope:** Mobile-App (Expo, TypeScript) – Events & Forms via Backend-API

---

## 1. Ziel

Die Mobile-App soll echte Daten aus dem bestehenden Web-Backend laden:

- Events-Liste (`/api/admin/events`)
- Formular-Liste (`/api/admin/forms`)

Fokus in diesem Teilprojekt:

- iOS-first (Expo Go auf iPhone) – Android wird bereits mitgedacht.
- Keine „echte“ Authentifizierung in diesem Schritt:
  - Admin-API ist für Dev zwecks Mobile-Test offen.
- Sichtbare Loading- und Error-Zustände im UI.

---

## 2. Architektur & Datenfluss

### 2.1 Backend (Next.js /web)

Relevante Endpoints:

- `GET /api/admin/events`  
  Liefert eine Event-Liste als JSON:

  ```json
  { "events": [ { ...Event-Felder... }, ... ] }
