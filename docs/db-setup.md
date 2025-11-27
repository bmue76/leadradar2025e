# LeadRadar 2025e – Datenbank-Setup (Prisma + SQLite)

## Umgebung

- Monorepo: `C:\dev\leadradar2025e`
- Web-App: `web/`
- DB für Development: SQLite (`prisma/dev.db`)
- ORM: Prisma (v6.15.x)

---

## Installation & Grundsetup

Im Ordner `web/`:

```bash
npm install -D prisma@6.15.0
npm install @prisma/client@6.15.0

npx prisma init --datasource-provider sqlite
