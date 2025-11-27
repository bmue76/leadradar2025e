// web/app/api/admin/forms/[id]/fields/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// Erlaubte Feldtypen – muss mit deinem Prisma-Enum FieldType übereinstimmen
const ALLOWED_FIELD_TYPES = [
  "TEXT",
  "TEXTAREA",
  "SINGLE_SELECT",
  "MULTI_SELECT",
  "NUMBER",
  "EMAIL",
  "PHONE",
  "DATE",
  "DATETIME",
  "BOOLEAN",
] as const;

type FieldType = (typeof ALLOWED_FIELD_TYPES)[number];

function isValidFieldType(value: any): value is FieldType {
  return ALLOWED_FIELD_TYPES.includes(value as FieldType);
}

// Prisma als any casten, damit TS nicht über .formField meckert
const prismaAny = prisma as any;

type CreateFieldBody = {
  key: string;
  label: string;
  type: FieldType;
  isRequired?: boolean;
  isReadOnly?: boolean;
  isOcrField?: boolean;
  order?: number;
  placeholder?: string | null;
  helpText?: string | null;
  defaultValue?: string | null;
  options?: unknown;
  config?: unknown;
};

function parsePositiveInt(value: unknown): number | null {
  const n = Number.parseInt(String(value), 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

// GET: alle Felder eines Formulars
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> } | { params: { id: string } }
) {
  const rawParams = "then" in (context as any).params
    ? await (context as any).params
    : (context as any).params;

  const formId = parsePositiveInt(rawParams.id);

  if (!formId) {
    return NextResponse.json({ error: "Invalid form id" }, { status: 400 });
  }

  try {
    const fields = await prismaAny.formField.findMany({
      where: { formId },
      orderBy: { order: "asc" },
    });

    return NextResponse.json(fields);
  } catch (error) {
    console.error("Error fetching form fields", error);
    return NextResponse.json(
      { error: "Failed to load form fields" },
      { status: 500 }
    );
  }
}

// POST: neues Feld anlegen
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> } | { params: { id: string } }
) {
  const rawParams = "then" in (context as any).params
    ? await (context as any).params
    : (context as any).params;

  const formId = parsePositiveInt(rawParams.id);

  if (!formId) {
    return NextResponse.json({ error: "Invalid form id" }, { status: 400 });
  }

  let body: CreateFieldBody;
  try {
    body = (await req.json()) as CreateFieldBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { key, label, type } = body;

  if (!key || !label || !type) {
    return NextResponse.json(
      { error: "key, label und type sind Pflichtfelder" },
      { status: 400 }
    );
  }

  if (!isValidFieldType(type)) {
    return NextResponse.json(
      {
        error: `Ungültiger Feldtyp '${type}'. Erlaubt sind: ${ALLOWED_FIELD_TYPES.join(
          ", "
        )}`,
      },
      { status: 400 }
    );
  }

  try {
    const field = await prismaAny.formField.create({
      data: {
        formId,
        key,
        label,
        type,
        isRequired: body.isRequired ?? false,
        isReadOnly: body.isReadOnly ?? false,
        isOcrField: body.isOcrField ?? false,
        order: body.order ?? 0,
        placeholder: body.placeholder ?? null,
        helpText: body.helpText ?? null,
        defaultValue: body.defaultValue ?? null,
        options: body.options ?? undefined,
        config: body.config ?? undefined,
      },
    });

    return NextResponse.json(field, { status: 201 });
  } catch (error: any) {
    console.error("Error creating form field", error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      // Unique-Constraint (formId, key)
      return NextResponse.json(
        {
          error:
            "Es existiert bereits ein Feld mit diesem key für dieses Formular.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Feld konnte nicht erstellt werden" },
      { status: 500 }
    );
  }
}
