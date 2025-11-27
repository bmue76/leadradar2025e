// web/app/api/admin/events/[eventId]/forms/from-template/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type FormStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

type CreateFromTemplateBody = {
  templateId?: number;
  name?: string;
};

/**
 * POST /api/admin/events/[eventId]/forms/from-template
 * Erzeugt ein neues Event-Formular auf Basis einer Formular-Vorlage
 * und kopiert alle FormFields.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  const parsedEventId = Number.parseInt(eventId, 10);

  if (Number.isNaN(parsedEventId)) {
    return NextResponse.json(
      { error: 'Ungültige Event-ID' },
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

  const payload = body as CreateFromTemplateBody;

  if (
    typeof payload.templateId !== 'number' ||
    Number.isNaN(payload.templateId)
  ) {
    return NextResponse.json(
      { error: 'templateId (number) ist erforderlich' },
      { status: 400 },
    );
  }

  try {
    // Event prüfen
    const event = await prisma.event.findUnique({
      where: { id: parsedEventId },
      select: { id: true, name: true },
    });

    if (!event) {
      return NextResponse.json(
        { error: 'Event nicht gefunden' },
        { status: 404 },
      );
    }

    // Template inkl. Felder laden – nur echte Templates erlaubt
    const template = await prisma.form.findFirst({
      where: {
        id: payload.templateId,
        isTemplate: true,
      },
      include: {
        fields: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Formular-Vorlage nicht gefunden' },
        { status: 404 },
      );
    }

    // Name für das neue Formular bestimmen
    const name =
      (payload.name ?? '').trim() ||
      `${template.name} – ${event.name ?? `Event ${event.id}`}`;

    // Neues Formular anlegen (Event-Formular)
    const newForm = await prisma.form.create({
      data: {
        name,
        description: template.description,
        status: 'DRAFT' as FormStatus,
        isDefault: false,
        isTemplate: false,
        eventId: parsedEventId,
        displayTitle: template.displayTitle,
        displaySubtitle: template.displaySubtitle,
        logoUrl: template.logoUrl,
        primaryColor: template.primaryColor,
        accentColor: template.accentColor,
      },
    });

    // FormFields kopieren
    if (template.fields.length > 0) {
      await Promise.all(
        template.fields.map((field) =>
          prisma.formField.create({
            data: {
              formId: newForm.id,
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
              // JSON-Felder: Typkonflikt JsonValue vs. InputJsonValue → bewusst casten
              options: field.options as any,
              config: field.config as any,
            },
          }),
        ),
      );
    }

    // Formular inkl. kopierter Felder zurückgeben
    const createdWithFields = await prisma.form.findUnique({
      where: { id: newForm.id },
      include: {
        fields: {
          orderBy: { order: 'asc' },
        },
      },
    });

    return NextResponse.json(
      {
        form: createdWithFields,
        fields: createdWithFields?.fields ?? [],
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      'Fehler beim Erzeugen eines Formulars aus Vorlage',
      error,
    );
    return NextResponse.json(
      { error: 'Fehler beim Erzeugen des Formulars aus Vorlage' },
      { status: 500 },
    );
  }
}
