// web/app/api/admin/forms/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/forms/[id]
 * Lädt ein Formular inkl. Felder.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const formId = Number.parseInt(id, 10);

  if (Number.isNaN(formId)) {
    return NextResponse.json(
      { error: 'Ungültige Formular-ID' },
      { status: 400 },
    );
  }

  try {
    const form = await prisma.form.findUnique({
      where: { id: formId },
      include: {
        fields: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!form) {
      return NextResponse.json(
        { error: 'Formular nicht gefunden' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      form,
      fields: form.fields,
    });
  } catch (error) {
    console.error('Fehler beim Laden des Formulars', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden des Formulars' },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/admin/forms/[id]
 * Aktualisiert Basis-Infos & Branding-Felder eines Formulars.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const formId = Number.parseInt(id, 10);

  if (Number.isNaN(formId)) {
    return NextResponse.json(
      { error: 'Ungültige Formular-ID' },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Ungültiger JSON-Body' },
      { status: 400 },
    );
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json(
      { error: 'Body muss ein Objekt sein' },
      { status: 400 },
    );
  }

  const payload = body as {
    name?: string;
    description?: string | null;
    displayTitle?: string | null;
    displaySubtitle?: string | null;
    logoUrl?: string | null;
    primaryColor?: string | null;
    accentColor?: string | null;
  };

  // simples Datenobjekt – Prisma akzeptiert das problemlos
  const data: Record<string, string | null> = {};

  if (typeof payload.name === 'string') {
    data.name = payload.name.trim();
  }
  if (payload.description !== undefined) {
    data.description =
      typeof payload.description === 'string'
        ? payload.description.trim()
        : null;
  }
  if (payload.displayTitle !== undefined) {
    data.displayTitle =
      typeof payload.displayTitle === 'string'
        ? payload.displayTitle.trim()
        : null;
  }
  if (payload.displaySubtitle !== undefined) {
    data.displaySubtitle =
      typeof payload.displaySubtitle === 'string'
        ? payload.displaySubtitle.trim()
        : null;
  }
  if (payload.logoUrl !== undefined) {
    data.logoUrl =
      typeof payload.logoUrl === 'string'
        ? payload.logoUrl.trim()
        : null;
  }
  if (payload.primaryColor !== undefined) {
    data.primaryColor =
      typeof payload.primaryColor === 'string'
        ? payload.primaryColor.trim()
        : null;
  }
  if (payload.accentColor !== undefined) {
    data.accentColor =
      typeof payload.accentColor === 'string'
        ? payload.accentColor.trim()
        : null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: 'Keine gültigen Felder zum Aktualisieren übergeben' },
      { status: 400 },
    );
  }

  try {
    const updated = await prisma.form.update({
      where: { id: formId },
      data,
      include: {
        fields: {
          orderBy: { order: 'asc' },
        },
      },
    });

    return NextResponse.json({
      form: updated,
      fields: updated.fields,
    });
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Formulars', error);
    return NextResponse.json(
      { error: 'Fehler beim Aktualisieren des Formulars' },
      { status: 500 },
    );
  }
}
