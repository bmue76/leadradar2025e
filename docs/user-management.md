# Benutzerverwaltung & Rollen (LeadRadar 2025e)

Stand: Teilprojekt 2.2 – Benutzerverwaltung & Rollen

## 1. Rollenmodell

Aktuelle Rollen (einfaches String-Feld `role` im Prisma-Model):

- `admin` – Vollzugriff auf Admin-Bereich
- `editor` – Fach-/Backoffice-User (z. B. Formulare, Auswertungen)
- `event_user` – Nutzer für Events / Messen (später für App relevant)

Technisch ist `role` aktuell ein `String`-Feld im `User`-Model. Auf TypeScript-Seite wird ein Union-Type verwendet:

```ts
export type UserRole = "admin" | "editor" | "event_user";
