// web/app/api/admin/events/[id]/analytics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type RouteParams = {
  // Next 15/16: params ist ein Promise
  params: Promise<{ id: string }>;
};

function parseDateOnly(value: string | null): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parts = trimmed.split('-');
  if (parts.length !== 3) return null;

  const year = Number.parseInt(parts[0], 10);
  const month = Number.parseInt(parts[1], 10);
  const day = Number.parseInt(parts[2], 10);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }

  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

function formatDateKey(date: Date): string {
  // YYYY-MM-DD
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

type ScoreBucketKey = '0-20' | '21-40' | '41-60' | '61-80' | '81-100';

function getScoreBucket(score: number): ScoreBucketKey {
  if (score <= 20) return '0-20';
  if (score <= 40) return '21-40';
  if (score <= 60) return '41-60';
  if (score <= 80) return '61-80';
  return '81-100';
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    // ⬇️ params zuerst auflösen (Next 16)
    const resolvedParams = await params;
    const eventId = Number.parseInt(resolvedParams.id, 10);

    if (!Number.isFinite(eventId) || eventId <= 0) {
      return NextResponse.json({ error: 'Ungültige Event-ID' }, { status: 400 });
    }

    const url = new URL(req.url);
    const searchParams = url.searchParams;

    const fromParam = searchParams.get('from'); // YYYY-MM-DD
    const toParam = searchParams.get('to'); // YYYY-MM-DD
    const formIdParam = searchParams.get('formId');

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
      return NextResponse.json({ error: 'Event nicht gefunden' }, { status: 404 });
    }

    // Alle Formulare für dieses Event
    const allForms = await prisma.form.findMany({
      where: { eventId },
      select: { id: true, name: true },
    });

    if (allForms.length === 0) {
      // Kein Formular → leere Analytics zurück
      return NextResponse.json(
        {
          event: {
            id: event.id,
            name: event.name,
          },
          funnel: {
            byDay: [],
            byHour: Array.from({ length: 24 }, (_, h) => ({
              hour: h,
              leadCount: 0,
            })),
            activeDays: 0,
            avgLeadsPerDay: 0,
            peakHour: null,
            peakHourLeadCount: null,
          },
          fields: {
            perField: [],
            selectDistributions: [],
          },
          leadQuality: {
            perForm: [],
            distribution: [],
            globalAvgScore: 0,
          },
        },
        { status: 200 },
      );
    }

    // Filter: bestimmtes Formular?
    let selectedForms = allForms;
    if (formIdParam) {
      const parsedFormId = Number.parseInt(formIdParam, 10);
      if (Number.isFinite(parsedFormId)) {
        selectedForms = allForms.filter((f) => f.id === parsedFormId);
      }
    }

    if (selectedForms.length === 0) {
      // formId gehört nicht zu diesem Event
      return NextResponse.json(
        { error: 'Formular gehört nicht zu diesem Event oder existiert nicht' },
        { status: 400 },
      );
    }

    const selectedFormIds = selectedForms.map((f) => f.id);

    // Datumsbereich bestimmen
    const fromDateFromParam = parseDateOnly(fromParam);
    const toDateFromParam = parseDateOnly(toParam);

    let fromDate: Date | null = fromDateFromParam;
    let toDate: Date | null = toDateFromParam;

    if (!fromDate && event.startDate) {
      fromDate = event.startDate;
    }
    if (!toDate && event.endDate) {
      toDate = event.endDate;
    }

    const createdAtFilter: { gte?: Date; lte?: Date } = {};
    if (fromDate) {
      createdAtFilter.gte = fromDate;
    }
    if (toDate) {
      const endOfDay = new Date(toDate);
      endOfDay.setHours(23, 59, 59, 999);
      createdAtFilter.lte = endOfDay;
    }

    const whereLeads: Record<string, unknown> = {
      formId: { in: selectedFormIds },
    };

    if (Object.keys(createdAtFilter).length > 0) {
      whereLeads.createdAt = createdAtFilter;
    }

    // Leads für diesen Event + Formulare
    const leads = await prisma.lead.findMany({
      where: whereLeads,
      orderBy: { createdAt: 'asc' },
    });

    const totalLeads = leads.length;
    const leadIds = leads.map((l) => l.id);

    // LeadFieldValues separat laden (statt via Relation)
    type LeadValueRow = {
      id: number;
      leadId: number;
      fieldId: number;
      value: string | null;
    };

    let leadValues: LeadValueRow[] = [];
    if (leadIds.length > 0) {
      leadValues = await prisma.leadFieldValue.findMany({
        where: { leadId: { in: leadIds } },
        select: {
          id: true,
          leadId: true,
          fieldId: true,
          value: true,
        },
      });
    }

    // Map: leadId -> LeadValueRow[]
    const valuesByLeadId = new Map<number, LeadValueRow[]>();
    for (const v of leadValues) {
      const list = valuesByLeadId.get(v.leadId) ?? [];
      list.push(v);
      valuesByLeadId.set(v.leadId, list);
    }

    // Felder (FormField) für diese Formulare
    const fields = await prisma.formField.findMany({
      where: {
        formId: { in: selectedFormIds },
      },
      select: {
        id: true,
        formId: true,
        key: true,
        label: true,
        type: true,
        order: true,
      },
    });

    // Hilfs-Maps: Forms & Fields nach Form
    const formsById = new Map<number, { id: number; name: string }>();
    for (const f of allForms) {
      formsById.set(f.id, f);
    }

    const fieldsByFormId = new Map<number, typeof fields>();
    for (const field of fields) {
      const list = fieldsByFormId.get(field.formId) ?? [];
      list.push(field);
      fieldsByFormId.set(field.formId, list);
    }

    // Lead-Count pro Formular (nur Leads mit formId != null)
    const leadCountByFormId = new Map<number, number>();
    for (const lead of leads) {
      if (lead.formId == null) continue;
      const current = leadCountByFormId.get(lead.formId) ?? 0;
      leadCountByFormId.set(lead.formId, current + 1);
    }

    //
    // 1) Funnel: Leads pro Tag & Stunde
    //
    const byDayMap = new Map<string, number>();
    const byHourArray: { hour: number; leadCount: number }[] = Array.from(
      { length: 24 },
      (_, hour) => ({ hour, leadCount: 0 }),
    );

    for (const lead of leads) {
      const createdAt = lead.createdAt;
      const dayKey = formatDateKey(createdAt);
      byDayMap.set(dayKey, (byDayMap.get(dayKey) ?? 0) + 1);

      const hour = createdAt.getHours();
      if (hour >= 0 && hour < 24) {
        byHourArray[hour].leadCount += 1;
      }
    }

    const byDay = Array.from(byDayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, leadCount]) => ({ date, leadCount }));

    const activeDays = byDay.length;
    const avgLeadsPerDay = activeDays > 0 ? totalLeads / activeDays : 0;

    let peakHour: number | null = null;
    let peakHourLeadCount: number | null = null;
    for (const entry of byHourArray) {
      if (entry.leadCount > 0) {
        if (peakHourLeadCount === null || entry.leadCount > peakHourLeadCount) {
          peakHourLeadCount = entry.leadCount;
          peakHour = entry.hour;
        }
      }
    }

    //
    // 2) Feld-Analytics
    //
    type FieldAgg = {
      fieldId: number;
      formId: number;
      label: string;
      type: string;
      filledLeadIds: Set<number>;
      totalTextLength: number;
      textValueCount: number;
      selectOptionCounts: Map<string, number>;
    };

    const fieldAggById = new Map<number, FieldAgg>();

    for (const field of fields) {
      fieldAggById.set(field.id, {
        fieldId: field.id,
        formId: field.formId,
        label: field.label,
        type: field.type,
        filledLeadIds: new Set<number>(),
        totalTextLength: 0,
        textValueCount: 0,
        selectOptionCounts: new Map<string, number>(),
      });
    }

    // Alle LeadValues durchgehen
    for (const lead of leads) {
      const leadValueList = valuesByLeadId.get(lead.id) ?? [];
      if (leadValueList.length === 0) continue;

      for (const value of leadValueList) {
        const agg = fieldAggById.get(value.fieldId);
        if (!agg) continue;

        const rawValue = value.value ?? '';
        const trimmed = rawValue.trim();
        if (!trimmed) continue;

        // Feld gilt für diesen Lead als "gefüllt"
        agg.filledLeadIds.add(lead.id);

        const typeUpper = agg.type?.toUpperCase?.() ?? '';

        if (typeUpper === 'TEXT' || typeUpper === 'TEXTAREA') {
          agg.totalTextLength += trimmed.length;
          agg.textValueCount += 1;
        }

        if (typeUpper === 'SINGLE_SELECT' || typeUpper === 'MULTI_SELECT') {
          if (typeUpper === 'MULTI_SELECT') {
            const parts = trimmed.split(',');
            for (const part of parts) {
              const option = part.trim();
              if (!option) continue;
              const current = agg.selectOptionCounts.get(option) ?? 0;
              agg.selectOptionCounts.set(option, current + 1);
            }
          } else {
            const current = agg.selectOptionCounts.get(trimmed) ?? 0;
            agg.selectOptionCounts.set(trimmed, current + 1);
          }
        }
      }
    }

    const perField: {
      fieldId: number;
      formId: number;
      formName: string;
      label: string;
      type: string;
      totalLeads: number;
      filledLeads: number;
      fillRate: number;
      avgTextLength: number | null;
    }[] = [];

    const selectDistributions: {
      fieldId: number;
      formId: number;
      label: string;
      options: { value: string; count: number }[];
    }[] = [];

    for (const agg of fieldAggById.values()) {
      const form = formsById.get(agg.formId);
      const formName = form?.name ?? `Formular #${agg.formId}`;
      const totalLeadsForForm = leadCountByFormId.get(agg.formId) ?? 0;
      const filledLeads = agg.filledLeadIds.size;

      const fillRate = totalLeadsForForm > 0 ? filledLeads / totalLeadsForForm : 0;

      const avgTextLength =
        agg.textValueCount > 0 ? agg.totalTextLength / agg.textValueCount : null;

      perField.push({
        fieldId: agg.fieldId,
        formId: agg.formId,
        formName,
        label: agg.label,
        type: agg.type,
        totalLeads: totalLeadsForForm,
        filledLeads,
        fillRate,
        avgTextLength,
      });

      const typeUpper = agg.type?.toUpperCase?.() ?? '';
      if (
        (typeUpper === 'SINGLE_SELECT' || typeUpper === 'MULTI_SELECT') &&
        agg.selectOptionCounts.size > 0
      ) {
        const options = Array.from(agg.selectOptionCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([value, count]) => ({ value, count }));

        selectDistributions.push({
          fieldId: agg.fieldId,
          formId: agg.formId,
          label: agg.label,
          options,
        });
      }
    }

    //
    // 3) Lead-Quality
    //
    type LeadQualityFormAgg = {
      formId: number;
      formName: string;
      leadCount: number;
      scoreSum: number;
      minScore: number | null;
      maxScore: number | null;
    };

    const leadQualityByFormId = new Map<number, LeadQualityFormAgg>();
    const scoreBuckets: Record<ScoreBucketKey, number> = {
      '0-20': 0,
      '21-40': 0,
      '41-60': 0,
      '61-80': 0,
      '81-100': 0,
    };

    let globalScoreSum = 0;
    let globalScoreCount = 0;

    for (const lead of leads) {
      if (lead.formId == null) {
        // Ohne Formular können wir keine Feldanzahl bestimmen
        continue;
      }

      const formId = lead.formId;
      const formFields = fieldsByFormId.get(formId) ?? [];
      const maxFields = formFields.length;

      let filledFieldsCount = 0;
      if (maxFields > 0) {
        const seenFieldIds = new Set<number>();
        const leadValueList = valuesByLeadId.get(lead.id) ?? [];

        for (const value of leadValueList) {
          const fieldId = value.fieldId;
          if (seenFieldIds.has(fieldId)) continue;

          const rawValue = value.value ?? '';
          if (!rawValue.trim()) continue;

          const fieldBelongsToForm = formFields.some((f) => f.id === fieldId);
          if (!fieldBelongsToForm) continue;

          seenFieldIds.add(fieldId);
        }

        filledFieldsCount = seenFieldIds.size;
      }

      const score = maxFields > 0 ? (filledFieldsCount / maxFields) * 100 : 0;

      globalScoreSum += score;
      globalScoreCount += 1;

      const bucket = getScoreBucket(score);
      scoreBuckets[bucket] += 1;

      let agg = leadQualityByFormId.get(formId);
      if (!agg) {
        const form = formsById.get(formId);
        agg = {
          formId,
          formName: form?.name ?? `Formular #${formId}`,
          leadCount: 0,
          scoreSum: 0,
          minScore: null,
          maxScore: null,
        };
        leadQualityByFormId.set(formId, agg);
      }

      agg.leadCount += 1;
      agg.scoreSum += score;
      agg.minScore = agg.minScore === null ? score : Math.min(agg.minScore, score);
      agg.maxScore = agg.maxScore === null ? score : Math.max(agg.maxScore, score);
    }

    const leadQualityPerForm = Array.from(leadQualityByFormId.values()).map((agg) => ({
      formId: agg.formId,
      formName: agg.formName,
      leadCount: agg.leadCount,
      avgScore: agg.leadCount > 0 ? agg.scoreSum / agg.leadCount : 0,
      minScore: agg.minScore ?? 0,
      maxScore: agg.maxScore ?? 0,
    }));

    const leadQualityDistribution = (Object.keys(scoreBuckets) as ScoreBucketKey[])
      .filter((key) => scoreBuckets[key] > 0)
      .map((key) => ({
        bucket: key,
        leadCount: scoreBuckets[key],
      }));

    const globalAvgScore =
      globalScoreCount > 0 ? globalScoreSum / globalScoreCount : 0;

    //
    // Response
    //
    const responseBody = {
      event: {
        id: event.id,
        name: event.name,
      },
      filters: {
        formIds: selectedFormIds,
        from: fromDate ? formatDateKey(fromDate) : null,
        to: toDate ? formatDateKey(toDate) : null,
      },
      funnel: {
        byDay,
        byHour: byHourArray,
        activeDays,
        avgLeadsPerDay,
        peakHour,
        peakHourLeadCount,
      },
      fields: {
        perField,
        selectDistributions,
      },
      leadQuality: {
        perForm: leadQualityPerForm,
        distribution: leadQualityDistribution,
        globalAvgScore,
      },
    };

    return NextResponse.json(responseBody, { status: 200 });
  } catch (err) {
    console.error('Error in /api/admin/events/[id]/analytics', err);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}
