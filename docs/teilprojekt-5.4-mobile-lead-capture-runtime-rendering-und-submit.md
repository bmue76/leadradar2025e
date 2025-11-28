# Teilprojekt 5.4 – Mobile Lead Capture: Runtime-Form-Rendering & Lead-Submit

**Datum:** 28.11.2025  
**Bereich:** Mobile-App (`/mobile` – Expo / React Native) & API (`/web` – Next.js 16 / Prisma)

## Ziel

Die Mobile-App soll Leads direkt auf Basis der im Admin-Backend definierten Formulare erfassen können:

- Formular-Felder werden **dynamisch** gerendert (Runtime-Rendering).
- Feldwerte werden im State gehalten und validiert.
- Leads werden über einen zentralen Endpoint an das Backend gesendet.
- Es wird die bestehende Datenstruktur mit `Lead` + `LeadFieldValue` verwendet.

## Relevante Modelle (Prisma)

```prisma
model Lead {
  id        Int      @id @default(autoincrement())

  eventId   Int
  event     Event    @relation(fields: [eventId], references: [id])

  formId    Int?
  form      Form?    @relation(fields: [formId], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  firstName String?
  lastName  String?
  email     String?
  phone     String?
  company   String?
  notes     String?

  // Dynamische Feldwerte aus FormField-Definitionen
  fieldValues LeadFieldValue[]
}

model FormField {
  id          Int       @id @default(autoincrement())
  form        Form      @relation(fields: [formId], references: [id])
  formId      Int
  key         String
  label       String
  type        FieldType
  // ...
  leadValues  LeadFieldValue[]

  @@unique([formId, key])
}

model LeadFieldValue {
  id        Int        @id @default(autoincrement())

  lead      Lead       @relation(fields: [leadId], references: [id])
  leadId    Int

  field     FormField  @relation(fields: [fieldId], references: [id])
  fieldId   Int

  // Kanonische String-Repräsentation des Feldwertes.
  // Bei MULTI_SELECT z.B. "A,B,C"
  value     String

  createdAt DateTime   @default(now())

  @@unique([leadId, fieldId])
}
