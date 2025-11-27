// web/app/(admin)/admin/events/[id]/analytics/page.tsx
'use client';

import { use, useEffect, useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

type FunnelDay = { date: string; leadCount: number };
type FunnelHour = { hour: number; leadCount: number };

type FieldStat = {
  fieldId: number;
  formId: number;
  formName: string;
  label: string;
  type: string;
  totalLeads: number;
  filledLeads: number;
  fillRate: number;
  avgTextLength: number | null;
};

type SelectDistribution = {
  fieldId: number;
  formId: number;
  label: string;
  options: { value: string; count: number }[];
};

type LeadQualityForm = {
  formId: number;
  formName: string;
  leadCount: number;
  avgScore: number;
  minScore: number;
  maxScore: number;
};

type LeadQualityDistributionEntry = {
  bucket: string;
  leadCount: number;
};

type EventAnalyticsResponse = {
  event: {
    id: number;
    name: string;
  };
  filters: {
    formIds: number[];
    from: string | null;
    to: string | null;
  };
  funnel: {
    byDay: FunnelDay[];
    byHour: FunnelHour[];
    activeDays: number;
    avgLeadsPerDay: number;
    peakHour: number | null;
    peakHourLeadCount: number | null;
  };
  fields: {
    perField: FieldStat[];
    selectDistributions: SelectDistribution[];
  };
  leadQuality: {
    perForm: LeadQualityForm[];
    distribution: LeadQualityDistributionEntry[];
    globalAvgScore: number;
  };
};

type PageProps = {
  // Next 15/16: params ist ein Promise
  params: Promise<{ id: string }>;
};

function formatDateLabel(dateStr: string): string {
  // erwartet YYYY-MM-DD, gibt z.B. 01.02 zurück
  const [year, month, day] = dateStr.split('-');
  if (!year || !month || !day) return dateStr;
  return `${day}.${month}.`;
}

function formatHourLabel(hour: number): string {
  return `${hour.toString().padStart(2, '0')}:00`;
}

type FieldSortKey =
  | 'formName'
  | 'label'
  | 'type'
  | 'fillRate'
  | 'filledLeads'
  | 'avgTextLength';

type LeadSortKey =
  | 'formName'
  | 'leadCount'
  | 'avgScore'
  | 'minScore'
  | 'maxScore';

export default function EventAnalyticsPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const eventId = Number.parseInt(resolvedParams.id, 10);

  const [data, setData] = useState<EventAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [fieldSortKey, setFieldSortKey] = useState<FieldSortKey>('fillRate');
  const [fieldSortDir, setFieldSortDir] = useState<'asc' | 'desc'>('desc');

  const [leadSortKey, setLeadSortKey] = useState<LeadSortKey>('avgScore');
  const [leadSortDir, setLeadSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/admin/events/${eventId}/analytics`);
        if (!res.ok) {
          throw new Error(`Fehler beim Laden (Status ${res.status})`);
        }
        const json = (await res.json()) as EventAnalyticsResponse;
        setData(json);
      } catch (err: any) {
        console.error(err);
        setError(err?.message ?? 'Unbekannter Fehler');
      } finally {
        setLoading(false);
      }
    }

    if (Number.isFinite(eventId)) {
      load();
    } else {
      setError('Ungültige Event-ID');
      setLoading(false);
    }
  }, [eventId]);

  const dayChartData = useMemo(() => {
    if (!data) return [];
    return data.funnel.byDay.map((d) => ({
      ...d,
      dateLabel: formatDateLabel(d.date),
    }));
  }, [data]);

  const hourChartData = useMemo(() => {
    if (!data) return [];
    // alle 24 Stunden anzeigen, damit der Verlauf konsistent ist
    const map = new Map<number, number>();
    data.funnel.byHour.forEach((entry) => {
      map.set(entry.hour, entry.leadCount);
    });

    const arr: { hour: number; hourLabel: string; leadCount: number }[] = [];
    for (let h = 0; h < 24; h += 1) {
      const count = map.get(h) ?? 0;
      arr.push({
        hour: h,
        hourLabel: formatHourLabel(h),
        leadCount: count,
      });
    }
    return arr;
  }, [data]);

  const sortedFields = useMemo(() => {
    if (!data) return [];
    const copy = [...data.fields.perField];

    copy.sort((a, b) => {
      const dirFactor = fieldSortDir === 'asc' ? 1 : -1;

      switch (fieldSortKey) {
        case 'formName': {
          return dirFactor * a.formName.localeCompare(b.formName);
        }
        case 'label': {
          return dirFactor * a.label.localeCompare(b.label);
        }
        case 'type': {
          return dirFactor * a.type.localeCompare(b.type);
        }
        case 'fillRate': {
          return dirFactor * (a.fillRate - b.fillRate);
        }
        case 'filledLeads': {
          return dirFactor * (a.filledLeads - b.filledLeads);
        }
        case 'avgTextLength': {
          const aVal = a.avgTextLength ?? 0;
          const bVal = b.avgTextLength ?? 0;
          return dirFactor * (aVal - bVal);
        }
        default:
          return 0;
      }
    });

    return copy;
  }, [data, fieldSortKey, fieldSortDir]);

  const topFieldsByFillRate = useMemo(() => {
    if (!data) return [];
    const withLeads = data.fields.perField.filter((f) => f.totalLeads > 0);
    const sorted = [...withLeads].sort((a, b) => b.fillRate - a.fillRate);
    return sorted.slice(0, 10).map((f) => ({
      name: `${f.formName}: ${f.label}`,
      fillRatePercent: Math.round(f.fillRate * 100),
    }));
  }, [data]);

  const bottomFieldsByFillRate = useMemo(() => {
    if (!data) return [];
    const withLeads = data.fields.perField.filter((f) => f.totalLeads > 0);
    const sorted = [...withLeads].sort((a, b) => a.fillRate - b.fillRate);
    return sorted.slice(0, 10).map((f) => ({
      name: `${f.formName}: ${f.label}`,
      fillRatePercent: Math.round(f.fillRate * 100),
    }));
  }, [data]);

  const leadQualityBucketData = useMemo(() => {
    if (!data) return [];
    const order = ['0-20', '21-40', '41-60', '61-80', '81-100'];
    const map = new Map<string, number>();
    data.leadQuality.distribution.forEach((d) => {
      map.set(d.bucket, d.leadCount);
    });
    return order.map((bucket) => ({
      bucket,
      label: `${bucket}%`,
      leadCount: map.get(bucket) ?? 0,
    }));
  }, [data]);

  const sortedLeadQualityPerForm = useMemo(() => {
    if (!data) return [];
    const copy = [...data.leadQuality.perForm];

    copy.sort((a, b) => {
      const dirFactor = leadSortDir === 'asc' ? 1 : -1;
      switch (leadSortKey) {
        case 'formName':
          return dirFactor * a.formName.localeCompare(b.formName);
        case 'leadCount':
          return dirFactor * (a.leadCount - b.leadCount);
        case 'avgScore':
          return dirFactor * (a.avgScore - b.avgScore);
        case 'minScore':
          return dirFactor * (a.minScore - b.minScore);
        case 'maxScore':
          return dirFactor * (a.maxScore - b.maxScore);
        default:
          return 0;
      }
    });

    return copy;
  }, [data, leadSortKey, leadSortDir]);

  const leadQualityChartData = useMemo(() => {
    if (!data) return [];
    return data.leadQuality.perForm.map((f) => ({
      formName: f.formName,
      avgScore: Math.round(f.avgScore),
    }));
  }, [data]);

  function handleFieldSort(key: FieldSortKey) {
    setFieldSortKey((prevKey) => {
      if (prevKey === key) {
        // Richtung toggeln
        setFieldSortDir((prevDir) => (prevDir === 'asc' ? 'desc' : 'asc'));
        return prevKey;
      }
      // Neues Feld → default: desc für numerische, asc für Strings
      if (key === 'fillRate' || key === 'filledLeads' || key === 'avgTextLength') {
        setFieldSortDir('desc');
      } else {
        setFieldSortDir('asc');
      }
      return key;
    });
  }

  function renderFieldSortIndicator(key: FieldSortKey) {
    if (fieldSortKey !== key) return null;
    return (
      <span className="ml-1 text-gray-400">
        {fieldSortDir === 'asc' ? '▲' : '▼'}
      </span>
    );
  }

  function handleLeadSort(key: LeadSortKey) {
    setLeadSortKey((prevKey) => {
      if (prevKey === key) {
        setLeadSortDir((prevDir) => (prevDir === 'asc' ? 'desc' : 'asc'));
        return prevKey;
      }
      if (key === 'leadCount' || key === 'avgScore' || key === 'minScore' || key === 'maxScore') {
        setLeadSortDir('desc');
      } else {
        setLeadSortDir('asc');
      }
      return key;
    });
  }

  function renderLeadSortIndicator(key: LeadSortKey) {
    if (leadSortKey !== key) return null;
    return (
      <span className="ml-1 text-gray-400">
        {leadSortDir === 'asc' ? '▲' : '▼'}
      </span>
    );
  }

  if (loading) {
    return <div className="p-6">Lade Analytics…</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">Fehler: {error}</div>;
  }

  if (!data) {
    return <div className="p-6">Keine Daten.</div>;
  }

  const { event, funnel, leadQuality } = data;

  return (
    <div className="p-6 space-y-8">
      {/* Page Title */}
      <h1 className="text-3xl font-bold">
        Analytics – {event.name}
      </h1>

      {/* KPI Section */}
      <section>
        <h2 className="text-xl font-semibold mb-3">KPI Übersicht</h2>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="p-4 rounded border shadow-sm bg-white">
            <div className="text-sm text-gray-500">Aktive Tage</div>
            <div className="text-2xl font-bold">{funnel.activeDays}</div>
          </div>

          <div className="p-4 rounded border shadow-sm bg-white">
            <div className="text-sm text-gray-500">Ø Leads / Tag</div>
            <div className="text-2xl font-bold">
              {funnel.avgLeadsPerDay.toFixed(1)}
            </div>
          </div>

          <div className="p-4 rounded border shadow-sm bg-white">
            <div className="text-sm text-gray-500">Peak Stunde</div>
            <div className="text-2xl font-bold">
              {funnel.peakHour !== null ? formatHourLabel(funnel.peakHour) : '–'}
            </div>
          </div>

          <div className="p-4 rounded border shadow-sm bg-white">
            <div className="text-sm text-gray-500">Peak Leads / Stunde</div>
            <div className="text-2xl font-bold">
              {funnel.peakHourLeadCount ?? '–'}
            </div>
          </div>

          <div className="p-4 rounded border shadow-sm bg-white">
            <div className="text-sm text-gray-500">Globaler Lead-Score</div>
            <div className="text-2xl font-bold">
              {leadQuality.globalAvgScore.toFixed(1)}%
            </div>
          </div>
        </div>
      </section>

      {/* Funnel: Leads pro Tag */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xl font-semibold">Leads pro Tag</h2>
          <span className="text-xs text-gray-500">
            Zeitraum: {data.filters.from ?? '–'} bis {data.filters.to ?? '–'}
          </span>
        </div>

        {dayChartData.length === 0 ? (
          <p className="text-gray-500">Keine Leads im gewählten Zeitraum.</p>
        ) : (
          <div className="w-full h-72 rounded border bg-white shadow-sm p-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dayChartData}
                margin={{ top: 10, right: 20, left: 0, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="dateLabel"
                  tick={{ fontSize: 12 }}
                  interval={Math.max(Math.floor(dayChartData.length / 10), 0)}
                />
                <YAxis allowDecimals={false} />
                <Tooltip
                  formatter={(value: any) => [`${value} Leads`, 'Leads']}
                  labelFormatter={(label: any, payload: any) => {
                    const originalDate = payload?.[0]?.payload?.date ?? label;
                    return `Datum: ${originalDate}`;
                  }}
                />
                <Bar dataKey="leadCount" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Funnel: Leads pro Stunde */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Leads pro Stunde (aggregiert)</h2>

        {hourChartData.every((d) => d.leadCount === 0) ? (
          <p className="text-gray-500">
            Keine Leads vorhanden – Stundenverteilung nicht berechenbar.
          </p>
        ) : (
          <div className="w-full h-64 rounded border bg-white shadow-sm p-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={hourChartData}
                margin={{ top: 10, right: 20, left: 0, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hourLabel" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} />
                <Tooltip
                  formatter={(value: any) => [`${value} Leads`, 'Leads']}
                  labelFormatter={(label: any) => `Stunde: ${label}`}
                />
                <Bar dataKey="leadCount" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Feld-Analytics */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Feld-Analytics</h2>

        {/* Top / Flop Charts */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="rounded border bg-white shadow-sm p-3 h-72">
            <h3 className="text-sm font-semibold mb-2">Top 10 Felder nach Fill-Rate</h3>
            {topFieldsByFillRate.length === 0 ? (
              <p className="text-gray-500 text-sm">Keine Felddaten verfügbar.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topFieldsByFillRate}
                  layout="vertical"
                  margin={{ top: 10, right: 20, left: 80, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 10 }}
                    width={160}
                  />
                  <Tooltip
                    formatter={(value: any) => [`${value}%`, 'Fill-Rate']}
                  />
                  <Bar dataKey="fillRatePercent" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="rounded border bg-white shadow-sm p-3 h-72">
            <h3 className="text-sm font-semibold mb-2">Bottom 10 Felder nach Fill-Rate</h3>
            {bottomFieldsByFillRate.length === 0 ? (
              <p className="text-gray-500 text-sm">Keine Felddaten verfügbar.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={bottomFieldsByFillRate}
                  layout="vertical"
                  margin={{ top: 10, right: 20, left: 80, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 10 }}
                    width={160}
                  />
                  <Tooltip
                    formatter={(value: any) => [`${value}%`, 'Fill-Rate']}
                  />
                  <Bar dataKey="fillRatePercent" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Feld-Tabelle */}
        <div className="rounded border bg-white shadow-sm overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-3 py-2 text-left cursor-pointer whitespace-nowrap"
                  onClick={() => handleFieldSort('formName')}
                >
                  Formular
                  {renderFieldSortIndicator('formName')}
                </th>
                <th
                  className="px-3 py-2 text-left cursor-pointer whitespace-nowrap"
                  onClick={() => handleFieldSort('label')}
                >
                  Feld
                  {renderFieldSortIndicator('label')}
                </th>
                <th
                  className="px-3 py-2 text-left cursor-pointer whitespace-nowrap"
                  onClick={() => handleFieldSort('type')}
                >
                  Typ
                  {renderFieldSortIndicator('type')}
                </th>
                <th
                  className="px-3 py-2 text-right cursor-pointer whitespace-nowrap"
                  onClick={() => handleFieldSort('fillRate')}
                >
                  Fill-Rate
                  {renderFieldSortIndicator('fillRate')}
                </th>
                <th
                  className="px-3 py-2 text-right cursor-pointer whitespace-nowrap"
                  onClick={() => handleFieldSort('filledLeads')}
                >
                  Ausgefüllte Leads
                  {renderFieldSortIndicator('filledLeads')}
                </th>
                <th className="px-3 py-2 text-right whitespace-nowrap">
                  Total Leads (Form)
                </th>
                <th
                  className="px-3 py-2 text-right cursor-pointer whitespace-nowrap"
                  onClick={() => handleFieldSort('avgTextLength')}
                >
                  Ø Textlänge
                  {renderFieldSortIndicator('avgTextLength')}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedFields.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-4 text-center text-gray-500"
                  >
                    Keine Felddaten verfügbar.
                  </td>
                </tr>
              ) : (
                sortedFields.map((field) => {
                  const fillRatePercent = Math.round(field.fillRate * 100);
                  const avgLen =
                    field.avgTextLength != null
                      ? field.avgTextLength.toFixed(1)
                      : '–';

                  return (
                    <tr key={field.fieldId} className="border-t">
                      <td className="px-3 py-2 whitespace-nowrap">
                        {field.formName}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {field.label}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {field.type}
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        {field.totalLeads === 0 ? '–' : `${fillRatePercent}%`}
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        {field.filledLeads}
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        {field.totalLeads}
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        {avgLen}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Lead Quality */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Lead Quality</h2>

        {/* Score-Distribution + Score pro Formular */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Bucket-Verteilung */}
          <div className="rounded border bg-white shadow-sm p-3 h-72">
            <h3 className="text-sm font-semibold mb-2">Score-Verteilung (Buckets)</h3>
            {leadQualityBucketData.every((b) => b.leadCount === 0) ? (
              <p className="text-gray-500 text-sm">
                Keine Lead-Daten vorhanden – Score-Verteilung nicht berechenbar.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={leadQualityBucketData}
                  margin={{ top: 10, right: 20, left: 0, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis allowDecimals={false} />
                  <Tooltip
                    formatter={(value: any) => [`${value} Leads`, 'Leads']}
                    labelFormatter={(label: any) => `Score-Bucket: ${label}`}
                  />
                  <Bar dataKey="leadCount" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Score pro Formular */}
          <div className="rounded border bg-white shadow-sm p-3 h-72">
            <h3 className="text-sm font-semibold mb-2">Ø Lead-Score pro Formular</h3>
            {leadQualityChartData.length === 0 ? (
              <p className="text-gray-500 text-sm">
                Keine Lead-Quality-Daten vorhanden.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={leadQualityChartData}
                  layout="vertical"
                  margin={{ top: 10, right: 20, left: 80, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis
                    type="category"
                    dataKey="formName"
                    tick={{ fontSize: 10 }}
                    width={160}
                  />
                  <Tooltip
                    formatter={(value: any) => [`${value}%`, 'Ø Score']}
                  />
                  <Bar dataKey="avgScore" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Lead-Quality-Tabelle */}
        <div className="rounded border bg-white shadow-sm overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-3 py-2 text-left cursor-pointer whitespace-nowrap"
                  onClick={() => handleLeadSort('formName')}
                >
                  Formular
                  {renderLeadSortIndicator('formName')}
                </th>
                <th
                  className="px-3 py-2 text-right cursor-pointer whitespace-nowrap"
                  onClick={() => handleLeadSort('leadCount')}
                >
                  Leads
                  {renderLeadSortIndicator('leadCount')}
                </th>
                <th
                  className="px-3 py-2 text-right cursor-pointer whitespace-nowrap"
                  onClick={() => handleLeadSort('avgScore')}
                >
                  Ø Score
                  {renderLeadSortIndicator('avgScore')}
                </th>
                <th
                  className="px-3 py-2 text-right cursor-pointer whitespace-nowrap"
                  onClick={() => handleLeadSort('minScore')}
                >
                  Min. Score
                  {renderLeadSortIndicator('minScore')}
                </th>
                <th
                  className="px-3 py-2 text-right cursor-pointer whitespace-nowrap"
                  onClick={() => handleLeadSort('maxScore')}
                >
                  Max. Score
                  {renderLeadSortIndicator('maxScore')}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedLeadQualityPerForm.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-4 text-center text-gray-500"
                  >
                    Keine Lead-Quality-Daten vorhanden.
                  </td>
                </tr>
              ) : (
                sortedLeadQualityPerForm.map((row) => (
                  <tr key={row.formId} className="border-t">
                    <td className="px-3 py-2 whitespace-nowrap">
                      {row.formName}
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      {row.leadCount}
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      {row.avgScore.toFixed(1)}%
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      {row.minScore.toFixed(1)}%
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      {row.maxScore.toFixed(1)}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
