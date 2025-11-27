// app/api/admin/events/route.ts
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

// GET /api/admin/events
export async function GET(_req: NextRequest) {
  const user = await requireAdminUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const events = await prisma.event.findMany({
    orderBy: { startDate: "desc" },
  });

  return NextResponse.json({ events });
}

// POST /api/admin/events
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

  const { name, startDate, endDate, location, description } = body as {
    name?: string;
    startDate?: string;
    endDate?: string | null;
    location?: string | null;
    description?: string | null;
  };

  if (!name || !startDate) {
    return new NextResponse("name and startDate are required", { status: 400 });
  }

  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) {
    return new NextResponse("Invalid startDate", { status: 400 });
  }

  let end: Date | null = null;
  if (endDate) {
    const d = new Date(endDate);
    if (Number.isNaN(d.getTime())) {
      return new NextResponse("Invalid endDate", { status: 400 });
    }
    end = d;
  }

  const event = await prisma.event.create({
    data: {
      name,
      startDate: start,
      endDate: end,
      location: location ?? null,
      description: description ?? null,
      // ownerId lassen wir vorerst weg, bis das Multi-Tenant-Konzept steht
    },
  });

  return NextResponse.json({ event }, { status: 201 });
}
