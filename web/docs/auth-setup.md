# Auth-Setup – LeadRadar2025e

Dieses Dokument beschreibt das aktuelle Authentifizierungs-Setup von **LeadRadar2025e** (Stand: Teilprojekt 2.1 – Benutzer-Accounts & Login).

Ziel: Einfaches, eigenständiges Auth-System ohne externe Anbieter (Clerk/Auth0 etc.) mit:

- Login via E-Mail + Passwort
- Passwort-Hashing (bcryptjs)
- HTTP-only Session-Cookie mit JWT
- Middleware-Schutz für Admin-Routen
- Login- und Logout-Flow im Adminbereich

---

## 1. Datenbank & Prisma

### 1.1 User-Model (Prisma)

`prisma/schema.prisma`:

```prisma
model User {
  id           Int      @id @default(autoincrement())
  email        String   @unique
  name         String?
  role         String   @default("admin")

  // Auth-Felder
  passwordHash String?          // null = kein Passwort gesetzt (kein Login möglich)
  isActive     Boolean @default(true)
  lastLoginAt  DateTime?

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
