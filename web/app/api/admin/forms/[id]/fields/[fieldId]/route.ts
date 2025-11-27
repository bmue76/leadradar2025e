// web/app/api/admin/forms/[id]/fields/[fieldId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

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

const prismaAny = prisma as any;

type UpdateFieldBody = {
  key?: string;
  label?: string;
  type?: FieldType;
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

async function parseIds(
  context:
    | { params: Promise<{ id: string; fieldId: string }> }
    | { params: { id: string; fieldId: string } }
) {
  const rawParams =
    "then" in (context as any).params
      ? await (context as any).params
      : (context as any).params;

  const formId = parsePositiveInt(rawParams.id);
  const fieldId = parsePositiveInt(rawParams.fieldId);

  if (!formId || !fieldId) return null;
  return { formId, fieldId };
}

// GET: einzelnes Feld
export async function GET(
  _req: NextRequest,
  context:
    | { params: Promise<{ id: string; fieldId: string }> }
    | { params: { id: string; fieldId: string } }
) {
  const ids = await parseIds(context);
  if (!ids) {
    return NextResponse.json({ error: "Invalid ids" }, { status: 400 });
  }

  const { formId, fieldId } = ids;

  try {
    const field = await prismaAny.formField.findFirst({
      where: { id: fieldId, formId },
    });

    if (!field) {
      return NextResponse.json({ error: "Feld nicht gefunden" }, { status: 404 });
    }

    return NextResponse.json(field);
  } catch (error) {
    console.error("Error loading form field", error);
    return NextResponse.json(
      { error: "Feld konnte nicht geladen werden" },
      { status: 500 }
    );
  }
}

// PATCH: Feld aktualisieren
export async function PATCH(
  req: NextRequest,
  context:
    | { params: Promise<{ id: string; fieldId: string }> }
    | { params: { id: string; fieldId: string } }
) {
  const ids = await parseIds(context);
  if (!ids) {
    return NextResponse.json({ error: "Invalid ids" }, { status: 400 });
  }

  const { formId, fieldId } = ids;

  let body: UpdateFieldBody;
  try {
    body = (await req.json()) as UpdateFieldBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const data: any = {};

  if (body.key !== undefined) data.key = body.key;
  if (body.label !== undefined) data.label = body.label;
  if (body.isRequired !== undefined) data.isRequired = body.isRequired;
  if (body.isReadOnly !== undefined) data.isReadOnly = body.isReadOnly;
  if (body.isOcrField !== undefined) data.isOcrField = body.isOcrField;
  if (body.order !== undefined) data.order = body.order;
  if (body.placeholder !== undefined) data.placeholder = body.placeholder;
  if (body.helpText !== undefined) data.helpText = body.helpText;
  if (body.defaultValue !== undefined) data.defaultValue = body.defaultValue;
  if (body.options !== undefined) data.options = body.options;
  if (body.config !== undefined) data.config = body.config;

  if (body.type !== undefined) {
    if (!isValidFieldType(body.type)) {
      return NextResponse.json(
        {
          error: `Ungültiger Feldtyp '${body.type}'. Erlaubt sind: ${ALLOWED_FIELD_TYPES.join(
            ", "
          )}`,
        },
        { status: 400 }
      );
    }
    data.type = body.type;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: "Keine Änderungen übergeben" },
      { status: 400 }
    );
  }

  try {
    const updated = await prismaAny.formField.update({
      where: { id: fieldId },
      data,
    });

    if (updated.formId !== formId) {
      console.warn(
        `FormField ${fieldId} gehört nicht zu Form ${formId}, wurde aber über diesen Pfad aktualisiert.`
      );
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Error updating form field", error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          error:
            "Es existiert bereits ein Feld mit diesem key für dieses Formular.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Feld konnte nicht aktualisiert werden" },
      { status: 500 }
    );
  }
}

// DELETE: Feld löschen
export async function DELETE(
  _req: NextRequest,
  context:
    | { params: Promise<{ id: string; fieldId: string }> }
    | { params: { id: string; fieldId: string } }
) {
  const ids = await parseIds(context);
  if (!ids) {
    return NextResponse.json({ error: "Invalid ids" }, { status: 400 });
  }

  const { fieldId } = ids;

  try {
    await prismaAny.formField.delete({
      where: { id: fieldId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting form field", error);
    return NextResponse.json(
      { error: "Feld konnte nicht gelöscht werden" },
      { status: 500 }
    );
  }
}
