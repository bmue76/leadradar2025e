// app/api/admin/events/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Hilfsfunktion: ID immer zuverlässig aus der URL holen
function getEventIdFromRequest(req: NextRequest): number | null {
  const url = new URL(req.url);
  const segments = url.pathname.split("/").filter(Boolean);
  const last = segments[segments.length - 1];
  const id = Number(last);
  if (!last || Number.isNaN(id)) {
    return null;
  }
  return id;
}

// TODO: Später mit echter Session-/Auth-Logik ersetzen
async function requireAdminUser() {
  const user = await prisma.user.findFirst({
    where: { role: "admin", isActive: true },
  });
  return user;
}

// GET /api/admin/events/[id]
export async function GET(req: NextRequest) {
  const user = await requireAdminUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const id = getEventIdFromRequest(req);
  if (id === null) {
    return new NextResponse("Invalid id", { status: 400 });
  }

  const event = await prisma.event.findUnique({
    where: { id },
  });

  if (!event) {
    return new NextResponse("Event not found", { status: 404 });
  }

  return NextResponse.json({ event });
}

// PATCH /api/admin/events/[id]
export async function PATCH(req: NextRequest) {
  const user = await requireAdminUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const id = getEventIdFromRequest(req);
  if (id === null) {
    return new NextResponse("Invalid id", { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new NextResponse("Invalid JSON body", { status: 400 });
  }

  const { name, startDate, endDate, location, description } = body as {
    name?: string;
    startDate?: string;
    endDate?: string | null;
    location?: string | null;
    description?: string | null;
  };

  const data: Record<string, unknown> = {};

  if (typeof name === "string" && name.trim().length > 0) {
    data.name = name.trim();
  }

  if (typeof startDate === "string") {
    const d = new Date(startDate);
    if (Number.isNaN(d.getTime())) {
      return new NextResponse("Invalid startDate", { status: 400 });
    }
    data.startDate = d;
  }

  if (typeof endDate === "string") {
    const d = new Date(endDate);
    if (Number.isNaN(d.getTime())) {
      return new NextResponse("Invalid endDate", { status: 400 });
    }
    data.endDate = d;
  } else if (endDate === null) {
    data.endDate = null;
  }

  if (location !== undefined) {
    data.location = location && location.trim().length > 0 ? location.trim() : null;
  }

  if (description !== undefined) {
    data.description =
      description && description.trim().length > 0 ? description.trim() : null;
  }

  try {
    const event = await prisma.event.update({
      where: { id },
      data,
    });

    return NextResponse.json({ event });
  } catch (err) {
    console.error("Error updating event", err);
    return new NextResponse("Error updating event", { status: 500 });
  }
}
