// web/app/api/admin/events/[id]/forms/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// kleine Hilfsfunktion für Next 16, weil params ein Promise sein kann
async function getParams(
  context: { params: Promise<{ id: string }> } | { params: { id: string } }
): Promise<{ id: string }> {
  const anyCtx = context as any;
  if (anyCtx.params && typeof anyCtx.params.then === "function") {
    return await anyCtx.params;
  }
  return anyCtx.params;
}

function parsePositiveInt(raw: unknown): number | null {
  const n = Number.parseInt(String(raw), 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

const prismaAny = prisma as any;

// GET /api/admin/events/[id]/forms
// Liefert alle Formulare zu einem Event
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> } | { params: { id: string } }
) {
  const { id } = await getParams(context);
  const eventId = parsePositiveInt(id);

  if (!eventId) {
    return NextResponse.json({ error: "Invalid event id" }, { status: 400 });
  }

  try {
    // optional prüfen, ob Event existiert
    const event = await prismaAny.event.findUnique({
      where: { id: eventId },
      select: { id: true },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const forms = await prismaAny.form.findMany({
      where: { eventId },
      orderBy: [
        { isDefault: "desc" }, // Default-Formular zuerst
        { createdAt: "asc" },
      ],
    });

    return NextResponse.json({ forms });
  } catch (error) {
    console.error("Error loading forms for event", error);
    return NextResponse.json(
      { error: "Formulare konnten nicht geladen werden" },
      { status: 500 }
    );
  }
}

// POST /api/admin/events/[id]/forms
// Einfaches Formular für dieses Event anlegen
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> } | { params: { id: string } }
) {
  const { id } = await getParams(context);
  const eventId = parsePositiveInt(id);

  if (!eventId) {
    return NextResponse.json({ error: "Invalid event id" }, { status: 400 });
  }

  let body: {
    name: string;
    description?: string | null;
    status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
    isDefault?: boolean;
  };

  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.name || !body.name.trim()) {
    return NextResponse.json(
      { error: "Name des Formulars ist erforderlich" },
      { status: 400 }
    );
  }

  const status = body.status ?? "DRAFT";

  try {
    // Wenn als Default markiert: andere Defaults für dieses Event deaktivieren
    const tx = await prisma.$transaction(async (txClient) => {
      const prismaTx: any = txClient;

      if (body.isDefault) {
        await prismaTx.form.updateMany({
          where: { eventId },
          data: { isDefault: false },
        });
      }

      const created = await prismaTx.form.create({
        data: {
          eventId,
          name: body.name.trim(),
          description: body.description ?? null,
          status,
          isDefault: body.isDefault ?? false,
        },
      });

      return created;
    });

    return NextResponse.json(tx, { status: 201 });
  } catch (error: any) {
    console.error("Error creating form for event", error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      // FK-Fehler (Event existiert nicht)
      return NextResponse.json(
        { error: "Event existiert nicht mehr" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Formular konnte nicht erstellt werden" },
      { status: 500 }
    );
  }
}
