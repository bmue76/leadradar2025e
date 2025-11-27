// web/app/api/forms/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type FormStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

type FormItem = {
  id: number;
  eventId: number | null;
  name: string;
  description: string | null;
  status: FormStatus;
  isDefault: boolean;
  isTemplate: boolean;
  displayTitle: string | null;
  displaySubtitle: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
};

type FieldType =
  | 'TEXT'
  | 'TEXTAREA'
  | 'SINGLE_SELECT'
  | 'MULTI_SELECT'
  | 'NUMBER'
  | 'EMAIL'
  | 'PHONE'
  | 'DATE'
  | 'DATETIME'
  | 'BOOLEAN';

type FormFieldItem = {
  id: number;
  formId: number;
  key: string;
  label: string;
  type: FieldType | string;
  isRequired: boolean;
  isReadOnly: boolean;
  isOcrField: boolean;
  order: number;
  placeholder: string | null;
  helpText: string | null;
  defaultValue: string | null;
  options: unknown;
  config: unknown;
};

/**
 * GET /api/forms/[id]
 * Öffentliche Form-API für Runtime (Web/App).
 * Liefert Formular inkl. Branding + Felder.
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
    const form = await prisma.form.findFirst({
      where: {
        id: formId,
        // Sicherheit: nur echte Runtime-Formulare, keine Templates
        isTemplate: false,
        // Optional: nur nicht archivierte
        // status: { not: 'ARCHIVED' },
      },
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

    const resultForm: FormItem = {
      id: form.id,
      eventId: form.eventId,
      name: form.name,
      description: form.description,
      status: form.status as FormStatus,
      isDefault: form.isDefault,
      isTemplate: form.isTemplate,
      displayTitle: form.displayTitle,
      displaySubtitle: form.displaySubtitle,
      logoUrl: form.logoUrl,
      primaryColor: form.primaryColor,
      accentColor: form.accentColor,
    };

    const resultFields: FormFieldItem[] = form.fields.map((f) => ({
      id: f.id,
      formId: f.formId,
      key: f.key,
      label: f.label,
      type: f.type as FieldType | string,
      isRequired: f.isRequired,
      isReadOnly: f.isReadOnly,
      isOcrField: f.isOcrField,
      order: f.order,
      placeholder: f.placeholder,
      helpText: f.helpText,
      defaultValue: f.defaultValue,
      options: f.options,
      config: f.config,
    }));

    return NextResponse.json({
      form: resultForm,
      fields: resultFields,
    });
  } catch (error) {
    console.error('Fehler beim Laden des Formulars (public)', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden des Formulars' },
      { status: 500 },
    );
  }
}
