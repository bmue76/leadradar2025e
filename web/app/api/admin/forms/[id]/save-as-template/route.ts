// web/app/api/admin/forms/[id]/save-as-template/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type FormStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

type SaveAsTemplateBody = {
  name?: string;
  description?: string | null;
};

/**
 * POST /api/admin/forms/[id]/save-as-template
 * Erzeugt aus einem bestehenden (Event-)Formular eine neue Formular-Vorlage
 * und kopiert alle FormFields + Branding.
 */
export async function POST(
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

  const payload = body as SaveAsTemplateBody;

  try {
    // Quellformular inkl. Felder laden
    const sourceForm = await prisma.form.findUnique({
      where: { id: formId },
      include: {
        fields: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!sourceForm) {
      return NextResponse.json(
        { error: 'Formular nicht gefunden' },
        { status: 404 },
      );
    }

    if (sourceForm.isTemplate) {
      return NextResponse.json(
        { error: 'Dieses Formular ist bereits eine Vorlage.' },
        { status: 400 },
      );
    }

    const templateName =
      (payload.name ?? '').trim() || `Template: ${sourceForm.name}`;

    const templateDescription =
      payload.description !== undefined
        ? typeof payload.description === 'string'
          ? payload.description.trim()
          : null
        : sourceForm.description;

    // Neue Vorlage anlegen (ohne Event-Bezug)
    const newTemplate = await prisma.form.create({
      data: {
        name: templateName,
        description: templateDescription,
        status: 'DRAFT' as FormStatus,
        isDefault: false,
        isTemplate: true,
        eventId: null,
        displayTitle: sourceForm.displayTitle,
        displaySubtitle: sourceForm.displaySubtitle,
        logoUrl: sourceForm.logoUrl,
        primaryColor: sourceForm.primaryColor,
        accentColor: sourceForm.accentColor,
      },
    });

    // Felder kopieren
    if (sourceForm.fields.length > 0) {
      await Promise.all(
        sourceForm.fields.map((field) =>
          prisma.formField.create({
            data: {
              formId: newTemplate.id,
              key: field.key,
              label: field.label,
              type: field.type,
              isRequired: field.isRequired,
              isReadOnly: field.isReadOnly,
              isOcrField: field.isOcrField,
              order: field.order,
              placeholder: field.placeholder,
              helpText: field.helpText,
              defaultValue: field.defaultValue,
              options: field.options as any,
              config: field.config as any,
            },
          }),
        ),
      );
    }

    return NextResponse.json(
      {
        template: newTemplate,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Fehler beim Anlegen einer Vorlage aus Formular', error);
    return NextResponse.json(
      { error: 'Fehler beim Anlegen der Formular-Vorlage' },
      { status: 500 },
    );
  }
}
