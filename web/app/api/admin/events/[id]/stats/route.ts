// web/app/api/admin/events/[id]/stats/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type Totals = {
  leadCountTotal: number;
  leadCountToday: number;
  leadCountLast7Days: number;
};

type FormStats = {
  formId: number;
  formName: string;
  status: string;
  leadCountTotal: number;
  leadCountToday: number;
  leadCountLast7Days: number;
};

type DayStats = {
  date: string; // YYYY-MM-DD
  leadCount: number;
};

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    // ⬇️ Next 15/16: params ist ein Promise → erst await
    const { id } = await context.params;
    const eventId = Number.parseInt(id, 10);

    if (Number.isNaN(eventId)) {
      return NextResponse.json(
        { error: 'Ungültige Event-ID' },
        { status: 400 },
      );
    }

    // Event-Basisdaten laden
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
      },
    });

    if (!event) {
      return NextResponse.json(
        { error: 'Event nicht gefunden' },
        { status: 404 },
      );
    }

    // Alle Formulare des Events mit Gesamt-Leads
    const forms = await prisma.form.findMany({
      where: { eventId },
      select: {
        id: true,
        name: true,
        status: true,
        _count: {
          select: {
            leads: true,
          },
        },
      },
    });

    const formIds = forms.map((f) => f.id);
    const formIdSet = new Set(formIds);

    // Zeitfenster definieren
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    const sevenDaysAgo = new Date(startOfToday);
    sevenDaysAgo.setDate(startOfToday.getDate() - 6);

    // Trend-Zeitraum (Tage) aus Query ?days=...
    const url = new URL(req.url);
    const daysParam = url.searchParams.get('days');
    let trendDays = 30;
    if (daysParam) {
      const parsed = Number.parseInt(daysParam, 10);
      if (!Number.isNaN(parsed) && parsed > 0 && parsed <= 365) {
        trendDays = parsed;
      }
    }

    const trendStart = new Date(startOfToday);
    trendStart.setDate(startOfToday.getDate() - (trendDays - 1));

    // 1) Leads heute pro Formular
    const leadsToday = await prisma.lead.groupBy({
      by: ['formId'],
      _count: {
        _all: true,
      },
      where: {
        createdAt: {
          gte: startOfToday,
        },
        formId: {
          in: formIds,
        },
      },
    });

    // 2) Leads letzte 7 Tage pro Formular
    const leadsLast7Days = await prisma.lead.groupBy({
      by: ['formId'],
      _count: {
        _all: true,
      },
      where: {
        createdAt: {
          gte: sevenDaysAgo,
        },
        formId: {
          in: formIds,
        },
      },
    });

    // 3) Trend: Leads nach Tag (YYYY-MM-DD)
    const trendLeads = await prisma.lead.findMany({
      where: {
        createdAt: {
          gte: trendStart,
        },
        formId: {
          in: formIds,
        },
      },
      select: {
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Maps für Aggregation
    const todayByForm: Record<number, number> = {};
    const last7DaysByForm: Record<number, number> = {};

    for (const row of leadsToday) {
      const formId = row.formId as number;
      if (!formIdSet.has(formId)) continue;
      todayByForm[formId] = (todayByForm[formId] ?? 0) + row._count._all;
    }

    for (const row of leadsLast7Days) {
      const formId = row.formId as number;
      if (!formIdSet.has(formId)) continue;
      last7DaysByForm[formId] =
        (last7DaysByForm[formId] ?? 0) + row._count._all;
    }

    // Form-Statistiken
    const byForm: FormStats[] = forms.map((f) => {
      const leadCountTotal = f._count.leads;
      const leadCountToday = todayByForm[f.id] ?? 0;
      const leadCountLast7Days = last7DaysByForm[f.id] ?? 0;

      return {
        formId: f.id,
        formName: f.name,
        status: String(f.status),
        leadCountTotal,
        leadCountToday,
        leadCountLast7Days,
      };
    });

    // Totals
    const totals: Totals = byForm.reduce(
      (acc, f) => {
        acc.leadCountTotal += f.leadCountTotal;
        acc.leadCountToday += f.leadCountToday;
        acc.leadCountLast7Days += f.leadCountLast7Days;
        return acc;
      },
      {
        leadCountTotal: 0,
        leadCountToday: 0,
        leadCountLast7Days: 0,
      },
    );

    // Trend pro Tag
    const trendByDay: Record<string, number> = {};

    for (const lead of trendLeads) {
      const d = lead.createdAt;
      const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
      trendByDay[key] = (trendByDay[key] ?? 0) + 1;
    }

    const byDay: DayStats[] = Object.entries(trendByDay)
      .map(([date, count]) => ({
        date,
        leadCount: count,
      }))
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

    const responseBody = {
      event: {
        id: event.id,
        name: event.name,
        startDate: event.startDate ? event.startDate.toISOString() : null,
        endDate: event.endDate ? event.endDate.toISOString() : null,
      },
      totals,
      byForm,
      byDay,
    };

    return NextResponse.json(responseBody, { status: 200 });
  } catch (error) {
    console.error('Fehler beim Laden der Event-Statistik', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden der Event-Statistik' },
      { status: 500 },
    );
  }
}
