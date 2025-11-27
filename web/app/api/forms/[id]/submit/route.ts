// web/app/api/forms/[id]/submit/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Typen für den Request-Body
type SubmitBody = {
  values: Record<string, unknown>;
};

// Hilfsfunktion: prüft, ob ein Wert "leer" ist
function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

// Hilfsfunktion: einfache Normalisierung + Typ-Validierung
function normalizeFieldValue(
  field: {
    key: string;
    label: string;
    type: string;
    isRequired: boolean;
  },
  rawValue: unknown
): { value: string | null; error?: string } {
  const type = field.type;

  // Required-Check
  if (field.isRequired && isEmptyValue(rawValue)) {
    return {
      value: null,
      error: 'Dieses Feld ist erforderlich.',
    };
  }

  // Nicht required & kein Wert → gar nichts speichern
  if (!field.isRequired && isEmptyValue(rawValue)) {
    return {
      value: null,
    };
  }

  // Ab hier: rawValue ist nicht leer
  switch (type) {
    case 'EMAIL': {
      if (typeof rawValue !== 'string') {
        return { value: null, error: 'Ungültiger E-Mail-Wert.' };
      }
      const trimmed = rawValue.trim();
      const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
      if (!emailRegex.test(trimmed)) {
        return {
          value: null,
          error: 'Bitte eine gültige E-Mail-Adresse eingeben.',
        };
      }
      return { value: trimmed };
    }

    case 'NUMBER': {
      if (typeof rawValue === 'number') {
        return { value: rawValue.toString() };
      }
      if (typeof rawValue === 'string') {
        const normalized = rawValue.replace(',', '.').trim();
        const num = Number(normalized);
        if (Number.isNaN(num)) {
          return { value: null, error: 'Bitte eine Zahl eingeben.' };
        }
        return { value: num.toString() };
      }
      return { value: null, error: 'Bitte eine Zahl eingeben.' };
    }

    case 'BOOLEAN': {
      if (typeof rawValue === 'boolean') {
        return { value: rawValue ? 'true' : 'false' };
      }
      if (rawValue === 'true' || rawValue === 'false') {
        return { value: String(rawValue) };
      }
      return { value: null, error: 'Ungültiger Wert.' };
    }

    case 'MULTI_SELECT': {
      if (!Array.isArray(rawValue)) {
        return { value: null, error: 'Ungültiges Auswahlformat.' };
      }
      const items = rawValue
        .map((v) => (typeof v === 'string' ? v.trim() : String(v)))
        .filter((v) => v !== '');
      if (items.length === 0) {
        return { value: null };
      }
      return { value: items.join(', ') };
    }

    // TEXT, TEXTAREA, SINGLE_SELECT, PHONE, DATE, DATETIME, etc.
    default: {
      if (typeof rawValue !== 'string') {
        return { value: null, error: 'Ungültiger Wert.' };
      }
      return { value: rawValue };
    }
  }
}

export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // ID aus /api/forms/:id/submit parsen
  const match = pathname.match(/\/api\/forms\/(\d+)\/submit/);
  const rawId = match?.[1];
  const formId = rawId !== undefined ? Number(rawId) : NaN;

  console.log('SubmitLead pathname:', pathname, 'rawId:', rawId, 'formId:', formId);

  if (Number.isNaN(formId)) {
    return NextResponse.json(
      {
        error: 'Invalid form id',
        details: { rawId, pathname },
      },
      { status: 400 }
    );
  }

  // Body parsen
  let body: SubmitBody;
  try {
    body = (await request.json()) as SubmitBody;
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  if (!body || typeof body !== 'object' || typeof body.values !== 'object') {
    return NextResponse.json(
      { error: 'Invalid body: "values" object is required' },
      { status: 400 }
    );
  }

  const values = body.values || {};

  try {
    // Formular + Felder laden
    const form = await prisma.form.findUnique({
      where: { id: formId },
      include: {
        fields: true,
      },
    });

    if (!form) {
      return NextResponse.json(
        { error: 'Form not found' },
        { status: 404 }
      );
    }

    // Map der Felder nach Key
    const fieldsByKey = new Map(form.fields.map((f) => [f.key, f]));

    // 1) Prüfen: alle Keys im Body müssen zu einem Feld gehören
    for (const key of Object.keys(values)) {
      if (!fieldsByKey.has(key)) {
        return NextResponse.json(
          { error: `Unknown field key: ${key}` },
          { status: 400 }
        );
      }
    }

    // 2) Validierung + Normalisierung, Fehler sammeln
    const errors: Record<string, string> = {};
    const normalizedValues: {
      fieldId: number;
      value: string;
    }[] = [];

    for (const field of form.fields) {
      const rawValue = (values as Record<string, unknown>)[field.key];

      const { value, error } = normalizeFieldValue(
        {
          key: field.key,
          label: field.label,
          type: field.type,
          isRequired: field.isRequired ?? false,
        },
        rawValue
      );

      if (error) {
        errors[field.key] = error;
      } else if (value !== null && value !== undefined) {
        normalizedValues.push({
          fieldId: field.id,
          value,
        });
      }
    }

    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: errors,
        },
        { status: 400 }
      );
    }

    // 3) Lead + LeadFieldValues in einer Transaktion anlegen
    const lead = await prisma.$transaction(async (tx) => {
      const newLead = await tx.lead.create({
        data: {
          formId,
          eventId: form.eventId,
        },
      });

      if (normalizedValues.length > 0) {
        await tx.leadFieldValue.createMany({
          data: normalizedValues.map((nv) => ({
            leadId: newLead.id,
            fieldId: nv.fieldId,
            value: nv.value,
          })),
        });
      }

      return newLead;
    });

    return NextResponse.json(
      {
        success: true,
        leadId: lead.id,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('Error while submitting lead:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
