// app/api/admin/forms/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

type RouteParams = {
  params: { id: string };
};

// GET /api/admin/forms/[id]
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const user = await requireAdminUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const id = Number(params.id);
  if (Number.isNaN(id)) {
    return new NextResponse("Invalid id", { status: 400 });
  }

  const form = await prisma.form.findUnique({
    where: { id },
  });

  if (!form) {
    return new NextResponse("Form not found", { status: 404 });
  }

  return NextResponse.json({ form });
}

// PATCH /api/admin/forms/[id]
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const user = await requireAdminUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const id = Number(params.id);
  if (Number.isNaN(id)) {
    return new NextResponse("Invalid id", { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new NextResponse("Invalid JSON body", { status: 400 });
  }

  const {
    name,
    description,
    status,
    isDefault,
    definition,
  } = body as {
    name?: string;
    description?: string | null;
    status?: string;
    isDefault?: boolean;
    definition?: unknown;
  };

  const data: Record<string, unknown> = {};

  if (typeof name === "string") data.name = name;
  if (description !== undefined) data.description = description;

  if (status !== undefined) {
    if (!isValidFormStatus(status)) {
      return new NextResponse("Invalid status", { status: 400 });
    }
    data.status = status;
  }

  if (typeof isDefault === "boolean") {
    data.isDefault = isDefault;
  }

  if (definition !== undefined) {
    data.definition = definition;
  }

  try {
    const form = await prisma.form.update({
      where: { id },
      data,
    });

    return NextResponse.json({ form });
  } catch (err) {
    console.error("Error updating form", err);
    return new NextResponse("Error updating form", { status: 500 });
  }
}
