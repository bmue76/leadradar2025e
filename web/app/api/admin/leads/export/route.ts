// web/app/api/admin/leads/export/route.ts
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

const CSV_DELIMITER = ';';

function parseDateParam(value: string | null): Date | null {
  if (!value) return null;

  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const isoString = isDateOnly ? `${value}T00:00:00.000Z` : value;

  const d = new Date(isoString);
  return Number.isNaN(d.getTime()) ? null : d;
}

function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  const str = String(value);
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

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

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') ?? 'csv';
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    const eventIdParam = searchParams.get('eventId');

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

    let eventIdFilter: number | undefined;
    if (eventIdParam) {
      const parsed = Number.parseInt(eventIdParam, 10);
      if (!Number.isFinite(parsed)) {
        return new Response(
          JSON.stringify({ error: 'Ungültige eventId' }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
      eventIdFilter = parsed;
    }

    // createdAt-Filter aufbauen
    let createdAtFilter: { gte?: Date; lte?: Date } | undefined;
    if (fromDate || toDate) {
      createdAtFilter = {};
      if (fromDate) createdAtFilter.gte = fromDate;
      if (toDate) createdAtFilter.lte = toDate;
    }

    // Leads holen
    const leads = await prisma.lead.findMany({
      where: {
        ...(eventIdFilter ? { eventId: eventIdFilter } : {}),
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

    // Event- und Form-Namen nachladen
    const eventIds = Array.from(
      new Set(leads.map((l) => l.eventId).filter((id) => id != null))
    ) as number[];

    const formIds = Array.from(
      new Set(
        leads
          .map((l) => l.formId)
          .filter((id): id is number => id !== null && id !== undefined)
      )
    );

    const [events, forms] = await Promise.all([
      eventIds.length
        ? prisma.event.findMany({
            where: { id: { in: eventIds } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
      formIds.length
        ? prisma.form.findMany({
            where: { id: { in: formIds } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
    ]);

    const eventMap = new Map<number, string>();
    for (const e of events) {
      eventMap.set(e.id, e.name);
    }

    const formMap = new Map<number, string | null>();
    for (const f of forms) {
      formMap.set(f.id, f.name);
    }

    // CSV bauen
    const headers = [
      'eventId',
      'eventName',
      'formId',
      'formName',
      'leadId',
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

    for (const lead of leads as LeadForExport[]) {
      const eventName = eventMap.get(lead.eventId) ?? '';
      const formName =
        (lead.formId != null ? formMap.get(lead.formId) : null) ?? '';

      const rowCells = [
        escapeCsvCell(lead.eventId),
        escapeCsvCell(eventName),
        escapeCsvCell(lead.formId ?? ''),
        escapeCsvCell(formName),
        escapeCsvCell(lead.id),
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

    const csv = rows.join('\r\n');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    const filenameParts = ['leads'];
    if (eventIdFilter) filenameParts.push(`event_${eventIdFilter}`);
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
    console.error('Error while exporting global leads CSV', err);
    return new Response(
      JSON.stringify({ error: 'Interner Serverfehler beim CSV-Export' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
