// web/app/api/admin/forms/[id]/leads/export/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function csvEscape(value: string | number | boolean | Date | null | undefined): string {
  if (value === null || value === undefined) return '';

  let str: string;

  if (value instanceof Date) {
    str = value.toISOString();
  } else {
    str = String(value);
  }

  const needsQuoting = /[",\r\n]/.test(str);
  if (needsQuoting) {
    // " verdoppeln und mit " umschliessen
    str = `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

type ExportFormField = {
  id: number;
  label: string | null;
  key: string | null;
};

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(req: NextRequest, context: RouteContext) {
  // ⬇️ params-Promise auflösen (Next.js 16 Änderung)
  const { id } = await context.params;

  const formId = Number(id);
  if (Number.isNaN(formId) || formId <= 0) {
    return NextResponse.json({ error: 'Ungültige Formular-ID' }, { status: 400 });
  }

  const url = new URL(req.url);
  const format = url.searchParams.get('format') ?? 'csv';
  const fromParam = url.searchParams.get('from');
  const toParam = url.searchParams.get('to');

  if (format !== 'csv') {
    return NextResponse.json(
      { error: 'Aktuell wird nur format=csv unterstützt' },
      { status: 400 }
    );
  }

  // Datumsfilter vorbereiten
  let createdAtFilter: { gte?: Date; lte?: Date } | undefined;

  try {
    const fromDate = fromParam ? new Date(fromParam) : undefined;
    const toDate = toParam ? new Date(toParam) : undefined;

    if (fromDate && Number.isNaN(fromDate.getTime())) {
      return NextResponse.json(
        { error: 'Ungültiger from-Parameter' },
        { status: 400 }
      );
    }

    if (toDate && Number.isNaN(toDate.getTime())) {
      return NextResponse.json(
        { error: 'Ungültiger to-Parameter' },
        { status: 400 }
      );
    }

    if (fromDate || toDate) {
      createdAtFilter = {};
      if (fromDate) createdAtFilter.gte = fromDate;
      if (toDate) createdAtFilter.lte = toDate;
    }
  } catch {
    return NextResponse.json(
      { error: 'Fehler beim Verarbeiten der Datumsfilter' },
      { status: 400 }
    );
  }

  try {
    const form = await prisma.form.findUnique({
      where: { id: formId },
      include: {
        fields: {
          // dein Prisma-Log zeigt ein Feld "order" – das nehmen wir
          orderBy: { order: 'asc' },
        },
        leads: {
          where: createdAtFilter ? { createdAt: createdAtFilter } : undefined,
          orderBy: { createdAt: 'asc' },
          include: {
            fieldValues: {
              include: {
                field: true,
              },
            },
          },
        },
      },
    });

    if (!form) {
      return NextResponse.json(
        { error: 'Formular nicht gefunden' },
        { status: 404 }
      );
    }

    const fields = form.fields as ExportFormField[];

    // CSV-Header
    const headerColumns: string[] = [
      'LeadId',
      'CreatedAt',
      ...fields.map(
        (field: ExportFormField) => field.label || field.key || `Field_${field.id}`
      ),
    ];
    const headerLine = headerColumns.map(csvEscape).join(',');

    // CSV-Zeilen
    const rows: string[] = [];

    for (const lead of form.leads) {
      const valueByFieldId = new Map<number, string>();

      for (const fv of lead.fieldValues) {
        let valueStr = fv.value ?? '';

        // Optional: spezielle Behandlung für MULTI_SELECT etc. hier einbauen
        // if (fv.field.type === 'MULTI_SELECT') { ... }

        valueByFieldId.set(fv.fieldId, valueStr);
      }

      const rowValues: (string | number | boolean | Date | null | undefined)[] = [
        lead.id,
        lead.createdAt,
      ];

      for (const field of fields) {
        rowValues.push(valueByFieldId.get(field.id) ?? '');
      }

      const rowLine = rowValues.map(csvEscape).join(',');
      rows.push(rowLine);
    }

    const allLines = [headerLine, ...rows];
    const csvContent = '\uFEFF' + allLines.join('\r\n');

    const now = new Date();
    const timestamp =
      [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0'),
      ].join('') +
      '-' +
      [
        String(now.getHours()).padStart(2, '0'),
        String(now.getMinutes()).padStart(2, '0'),
        String(now.getSeconds()).padStart(2, '0'),
      ].join('');

    const filename = `form-${formId}-leads-${timestamp}.csv`;

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Fehler beim CSV-Export der Leads:', error);
    return NextResponse.json(
      { error: 'Fehler beim CSV-Export der Leads' },
      { status: 500 }
    );
  }
}
