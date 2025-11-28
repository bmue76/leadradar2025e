// web/app/api/admin/forms/[id]/leads/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// TODO: Später mit echter Session-Auth ausbauen
async function requireAdminUser() {
  // Wir prüfen nur, ob es überhaupt einen aktiven Admin gibt.
  const user = await prisma.user.findFirst({
    where: { role: "admin", isActive: true },
  });
  return user;
}

// Muss zu mobile/src/types/forms.ts passen
type LeadValue = string | boolean | string[] | null;

interface LeadFieldValuePayload {
  fieldKey: string;
  value: LeadValue;
}

interface CreateLeadPayload {
  values: LeadFieldValuePayload[];
}

/**
 * Hilfsfunktion: LeadValue -> kanonische String-Repräsentation.
 * - MULTI_SELECT: "A,B,C"
 * - BOOLEAN: "true" / "false"
 * - null/undefined: ""
 */
function canonicalizeValue(raw: LeadValue): string {
  if (raw === null || raw === undefined) return "";
  if (Array.isArray(raw)) return raw.join(",");
  if (typeof raw === "boolean") return raw ? "true" : "false";
  return String(raw);
}

/**
 * Hilfsfunktion: formId robust direkt aus der URL extrahieren.
 * Beispielpfad: /api/admin/forms/1/leads
 */
function extractFormIdFromUrl(req: NextRequest): number | null {
  try {
    const url = new URL(req.url);
    const parts = url.pathname.split("/").filter(Boolean);
    // Erwartet: ["api", "admin", "forms", "1", "leads"]
    const formsIndex = parts.indexOf("forms");
    if (formsIndex === -1 || formsIndex + 1 >= parts.length) {
      console.error("[LeadLeadsRoute] Konnte 'forms' nicht im Pfad finden:", parts);
      return null;
    }

    const idStr = parts[formsIndex + 1];
    const formId = Number(idStr);

    if (!Number.isFinite(formId) || formId <= 0) {
      console.error("[LeadLeadsRoute] Ungültige formId aus URL:", idStr);
      return null;
    }

    return formId;
  } catch (err) {
    console.error("[LeadLeadsRoute] Fehler beim Parsen der URL:", err);
    return null;
  }
}

/**
 * GET /api/admin/forms/:id/leads
 * Liste der Leads zu einem Formular (optional für Admin-UI / Auswertungen).
 */
export async function GET(req: NextRequest) {
  const user = await requireAdminUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const formId = extractFormIdFromUrl(req);
  if (!formId) {
    return NextResponse.json(
      { error: "Ungültige Formular-ID" },
      { status: 400 },
    );
  }

  const leads = await prisma.lead.findMany({
    where: { formId },
    orderBy: { createdAt: "desc" },
    include: {
      fieldValues: {
        include: {
          field: true,
        },
      },
      event: true,
      form: true,
    },
  });

  return NextResponse.json({ leads });
}

/**
 * POST /api/admin/forms/:id/leads
 * Lead für ein Formular speichern (Mobile Lead Capture).
 */
export async function POST(req: NextRequest) {
  const user = await requireAdminUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const formId = extractFormIdFromUrl(req);
  if (!formId) {
    return NextResponse.json(
      { error: "Ungültige Formular-ID" },
      { status: 400 },
    );
  }

  // Formular inkl. Feldern & Event laden
  const form = await prisma.form.findUnique({
    where: { id: formId },
    include: {
      fields: true,
    },
  });

  if (!form) {
    return NextResponse.json(
      { error: "Formular nicht gefunden." },
      { status: 404 },
    );
  }

  if (!form.eventId) {
    // Für Mobile-Leads gehen wir davon aus, dass nur Event-Formulare verwendet werden
    return NextResponse.json(
      {
        error:
          "Formular ist keinem Event zugeordnet. Event-Formulare sind für Mobile-Leads erforderlich.",
      },
      { status: 400 },
    );
  }

  let body: CreateLeadPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Ungültiger JSON-Body" },
      { status: 400 },
    );
  }

  if (!body || !Array.isArray(body.values)) {
    return NextResponse.json(
      { error: "Payload muss ein 'values'-Array enthalten." },
      { status: 400 },
    );
  }

  // Payload in ein Lookup fieldKey -> LeadValue umwandeln
  const valueMap: Record<string, LeadValue> = {};
  for (const item of body.values) {
    if (!item || typeof item.fieldKey !== "string") continue;
    valueMap[item.fieldKey] =
      item.value === undefined ? null : item.value;
  }

  // Helper für Basisfelder (Lead.firstName etc.)
  const getStringOrNull = (key: string): string | null => {
    const raw = valueMap[key];
    if (typeof raw === "string") {
      const trimmed = raw.trim();
      return trimmed.length > 0 ? trimmed : null;
    }
    return null;
  };

  // Daten für Lead.create
  const leadData = {
    eventId: form.eventId,
    formId: form.id,
    firstName: getStringOrNull("firstName"),
    lastName: getStringOrNull("lastName"),
    email: getStringOrNull("email"),
    phone: getStringOrNull("phone"),
    company: getStringOrNull("company"),
    notes: getStringOrNull("notes"),

    // Dynamische Feldwerte: nested create in LeadFieldValue
    fieldValues: {
      create: form.fields
        .map((field) => {
          const raw = valueMap[field.key];
          // Falls der Mobile-Client für ein Feld keinen Wert sendet, legen wir keinen LeadFieldValue an
          if (raw === undefined) return null;
          const value = canonicalizeValue(raw);
          return {
            value,
            field: {
              connect: { id: field.id },
            },
          };
        })
        .filter(
          (
            entry,
          ): entry is {
            value: string;
            field: { connect: { id: number } };
          } => !!entry,
        ),
    },
  };

  const lead = await prisma.lead.create({
    data: leadData,
  });

  return NextResponse.json(
    {
      success: true,
      leadId: lead.id,
    },
    { status: 201 },
  );
}
