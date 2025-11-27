// web/app/api/admin/events/stats/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type EventStats = {
  id: number;
  name: string;
  startDate: string | null;
  endDate: string | null;
  formCount: number;
  leadCountTotal: number;
  leadCountToday: number;
  leadCountLast7Days: number;
};

export async function GET(_req: NextRequest) {
  try {
    // 1) Events holen (Basis-Metadaten)
    const events = await prisma.event.findMany({
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
      },
      orderBy: {
        startDate: 'desc',
      },
    });

    if (events.length === 0) {
      const empty: EventStats[] = [];
      return NextResponse.json({ events: empty }, { status: 200 });
    }

    const eventIds = events.map((e) => e.id);

    // 2) Forms inkl. Lead-Gesamtanzahl pro Form
    const forms = await prisma.form.findMany({
      where: {
        eventId: {
          in: eventIds,
        },
      },
      select: {
        id: true,
        eventId: true,
        _count: {
          select: {
            leads: true,
          },
        },
      },
    });

    // Maps für Aggregation
    const statsByEvent: {
      [eventId: number]: {
        formCount: number;
        leadCountTotal: number;
        leadCountToday: number;
        leadCountLast7Days: number;
      };
    } = {};

    const formIdToEventId: { [formId: number]: number } = {};

    // Initialisieren
    for (const eventId of eventIds) {
      statsByEvent[eventId] = {
        formCount: 0,
        leadCountTotal: 0,
        leadCountToday: 0,
        leadCountLast7Days: 0,
      };
    }

    // Forms + Lead-Gesamtzahlen
    for (const form of forms) {
      if (form.eventId == null) {
        continue;
      }

      const eventId = form.eventId as number;
      const entry = statsByEvent[eventId];

      if (!entry) {
        continue;
      }

      formIdToEventId[form.id] = eventId;

      entry.formCount += 1;
      entry.leadCountTotal += form._count.leads;
    }

    // 3) Zeitfenster definieren (Server-Zeit)
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    // letzte 7 Tage inkl. heute
    const sevenDaysAgo = new Date(startOfToday);
    sevenDaysAgo.setDate(startOfToday.getDate() - 6);

    // 4) Leads "heute" gruppieren
    const leadsToday = await prisma.lead.groupBy({
      by: ['formId'],
      _count: {
        _all: true,
      },
      where: {
        createdAt: {
          gte: startOfToday,
        },
        form: {
          eventId: {
            in: eventIds,
          },
        },
      },
    });

    for (const row of leadsToday) {
      // formId kann laut Typ ggf. null sein → absichern
      const formId = row.formId as number | null;
      if (formId == null) continue;

      const eventId = formIdToEventId[formId];
      if (eventId == null) continue;

      const entry = statsByEvent[eventId];
      if (!entry) continue;

      entry.leadCountToday += row._count._all;
    }

    // 5) Leads "letzte 7 Tage" gruppieren
    const leadsLast7Days = await prisma.lead.groupBy({
      by: ['formId'],
      _count: {
        _all: true,
      },
      where: {
        createdAt: {
          gte: sevenDaysAgo,
        },
        form: {
          eventId: {
            in: eventIds,
          },
        },
      },
    });

    for (const row of leadsLast7Days) {
      const formId = row.formId as number | null;
      if (formId == null) continue;

      const eventId = formIdToEventId[formId];
      if (eventId == null) continue;

      const entry = statsByEvent[eventId];
      if (!entry) continue;

      entry.leadCountLast7Days += row._count._all;
    }

    // 6) Response-Objekte bauen
    const result: EventStats[] = events.map((e) => {
      const base =
        statsByEvent[e.id] ?? ({
          formCount: 0,
          leadCountTotal: 0,
          leadCountToday: 0,
          leadCountLast7Days: 0,
        } as const);

      return {
        id: e.id,
        name: e.name,
        startDate: e.startDate ? e.startDate.toISOString() : null,
        endDate: e.endDate ? e.endDate.toISOString() : null,
        formCount: base.formCount,
        leadCountTotal: base.leadCountTotal,
        leadCountToday: base.leadCountToday,
        leadCountLast7Days: base.leadCountLast7Days,
      };
    });

    return NextResponse.json({ events: result }, { status: 200 });
  } catch (error) {
    console.error('Fehler beim Laden der Event-Statistiken', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden der Event-Statistiken' },
      { status: 500 },
    );
  }
}
