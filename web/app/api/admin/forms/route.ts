// app/api/admin/forms/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Lokale Abbildung der Form-Statuswerte
const FORM_STATUSES = ["DRAFT", "ACTIVE", "ARCHIVED"] as const;
type FormStatus = (typeof FORM_STATUSES)[number];

function isValidFormStatus(value: unknown): value is FormStatus {
  return typeof value === "string" && FORM_STATUSES.includes(value as FormStatus);
}

// TODO: Später mit echter Session-Auth ausbauen
async function requireAdminUser() {
  const user = await prisma.user.findFirst({
    where: { role: "admin", isActive: true },
  });
  return user;
}

// GET /api/admin/forms?eventId=123
export async function GET(req: NextRequest) {
  const user = await requireAdminUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const eventIdParam = searchParams.get("eventId");

  const where: any = {};

  if (eventIdParam) {
    const eventId = Number(eventIdParam);
    if (Number.isNaN(eventId)) {
      return new NextResponse("Invalid eventId", { status: 400 });
    }
    where.eventId = eventId;
  }

  const forms = await prisma.form.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ forms });
}

// POST /api/admin/forms
// Body: { eventId, name, description?, status?, isDefault?, definition? }
export async function POST(req: NextRequest) {
  const user = await requireAdminUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new NextResponse("Invalid JSON body", { status: 400 });
  }

  const {
    eventId: rawEventId,
    name,
    description,
    status,
    isDefault,
    definition,
  } = body as {
    eventId?: number | string;
    name?: string;
    description?: string | null;
    status?: string;
    isDefault?: boolean;
    definition?: unknown;
  };

  const eventId =
    typeof rawEventId === "string" ? Number(rawEventId) : rawEventId;

  if (!eventId || Number.isNaN(eventId)) {
    return new NextResponse("eventId is required and must be a number", {
      status: 400,
    });
  }

  if (!name) {
    return new NextResponse("name is required", { status: 400 });
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    return new NextResponse("Event not found", { status: 404 });
  }

  let formStatus: FormStatus = "DRAFT";
  if (status && isValidFormStatus(status)) {
    formStatus = status;
  } else if (status && !isValidFormStatus(status)) {
    return new NextResponse("Invalid status", { status: 400 });
  }

  const form = await prisma.form.create({
    data: {
      eventId,
      name,
      description: description ?? null,
      status: formStatus,
      isDefault: isDefault ?? false,
      definition: definition ?? null,
      // createdById lassen wir vorerst weg
    },
  });

  return NextResponse.json({ form }, { status: 201 });
}
