// web/app/api/admin/events/[id]/leads/export/route.ts
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

const CSV_DELIMITER = ';'; // Ggf. an deinen bestehenden CSV-Export anpassen

type RouteContext = {
  params: Promise<{ id: string }>;
};

function parseDateParam(value: string | null): Date | null {
  if (!value) return null;

  // Erlaube sowohl reine Daten (YYYY-MM-DD) als auch komplette ISO-Strings
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const isoString = isDateOnly ? `${value}T00:00:00.000Z` : value;

  const d = new Date(isoString);
  return Number.isNaN(d.getTime()) ? null : d;
}

function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  const str = String(value);

  // Doppelte Anführungszeichen escapen
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

// Typ entsprechend deiner Lead-Spalten
type LeadForExport = {
  id: number;
  eventId: number;
  formId: number | null;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  company: string | null;
  notes: string | null;
  createdAt: Date;
};

function buildCsv(
  event: { id: number; name: string },
  leads: LeadForExport[]
): string {
  // Feste Header (kannst du nach Bedarf erweitern)
  const headers = [
    'eventId',
    'eventName',
    'leadId',
    'formId',
    'leadCreatedAt',
    'email',
    'firstName',
    'lastName',
    'phone',
    'company',
    'notes',
  ];

  const headerRow = headers.map(escapeCsvCell).join(CSV_DELIMITER);

  const rows: string[] = [headerRow];

  for (const lead of leads) {
    const rowCells = [
      escapeCsvCell(event.id),
      escapeCsvCell(event.name),
      escapeCsvCell(lead.id),
      escapeCsvCell(lead.formId ?? ''),
      escapeCsvCell(lead.createdAt.toISOString()),
      escapeCsvCell(lead.email ?? ''),
      escapeCsvCell(lead.firstName ?? ''),
      escapeCsvCell(lead.lastName ?? ''),
      escapeCsvCell(lead.phone ?? ''),
      escapeCsvCell(lead.company ?? ''),
      escapeCsvCell(lead.notes ?? ''),
    ];

    rows.push(rowCells.join(CSV_DELIMITER));
  }

  return rows.join('\r\n');
}

export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<Response> {
  try {
    const { id } = await context.params;
    const eventId = Number.parseInt(id, 10);

    if (!Number.isFinite(eventId)) {
      return new Response(
        JSON.stringify({ error: 'Ungültige Event-ID' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') ?? 'csv';
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');

    if (format !== 'csv') {
      return new Response(
        JSON.stringify({ error: 'Nur CSV-Export wird aktuell unterstützt' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const fromDate = parseDateParam(fromParam);
    const toDateRaw = parseDateParam(toParam);

    if (fromParam && !fromDate) {
      return new Response(
        JSON.stringify({ error: 'Ungültiger "from"-Parameter' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (toParam && !toDateRaw) {
      return new Response(
        JSON.stringify({ error: 'Ungültiger "to"-Parameter' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    let toDate: Date | undefined;
    if (toDateRaw) {
      toDate = toDateRaw;
    }

    // Event holen (für Name und Validation)
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        name: true,
      },
    });

    if (!event) {
      return new Response(
        JSON.stringify({ error: 'Event nicht gefunden' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // createdAt-Filter aufbauen
    let createdAtFilter: { gte?: Date; lte?: Date } | undefined;
    if (fromDate || toDate) {
      createdAtFilter = {};
      if (fromDate) createdAtFilter.gte = fromDate;
      if (toDate) createdAtFilter.lte = toDate;
    }

    // Alle Leads dieses Events laden
    const leads = await prisma.lead.findMany({
      where: {
        eventId: eventId,
        ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
      },
      orderBy: {
        createdAt: 'asc',
      },
      select: {
        id: true,
        eventId: true,
        formId: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        company: true,
        notes: true,
        createdAt: true,
      },
    });

    const csv = buildCsv(event, leads as LeadForExport[]);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    const filenameParts = [`event-${eventId}-leads`];
    if (fromParam) filenameParts.push(`from_${fromParam}`);
    if (toParam) filenameParts.push(`to_${toParam}`);
    filenameParts.push(timestamp);

    const filename = `${filenameParts.join('_')}.csv`;

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error('Error while exporting event leads CSV', err);
    return new Response(
      JSON.stringify({ error: 'Interner Serverfehler beim CSV-Export' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
