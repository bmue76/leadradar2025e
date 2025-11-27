// web/app/(admin)/admin/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

// ---- Typen ----

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

type EventsStatsResponse = {
  events: EventStats[];
};

type TopEventsChartDatum = {
  eventId: number;
  eventName: string;
  leadCountTotal: number;
};

// Quick-Filter für den CSV-/XLSX-Export
type QuickFilter = 'all' | 'today' | 'last7days';

// ---- Hilfsfunktionen ----

function formatDateRange(start: string | null, end: string | null): string {
  if (!start && !end) return '';
  if (start && !end) {
    return new Date(start).toLocaleDateString('de-CH');
  }
  if (!start && end) {
    return new Date(end).toLocaleDateString('de-CH');
  }
  return `${new Date(start!).toLocaleDateString('de-CH')} – ${new Date(
    end!,
  ).toLocaleDateString('de-CH')}`;
}

async function fetchCsvAsArray(url: string): Promise<string[][]> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`CSV konnte nicht geladen werden (Status ${res.status})`);
  }

  const text = await res.text();
  const trimmed = text.trim();
  if (!trimmed) {
    return [];
  }

  const lines = trimmed.split(/\r?\n/);

  // Einfache Delimiter-Erkennung
  let delimiter = ';';
  if (lines[0].includes(',') && !lines[0].includes(';')) {
    delimiter = ',';
  }

  const rows = lines.map((line) => line.split(delimiter));
  return rows;
}

// ---- Komponenten ----

function GlobalLeadsExportControls() {
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');

  function buildExportUrl(): string {
    const params = new URLSearchParams();

    if (quickFilter === 'today') {
      params.set('quick', 'today');
    } else if (quickFilter === 'last7days') {
      params.set('quick', 'last7days');
    } else {
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);
    }

    return `/api/admin/leads/export${
      params.toString() ? `?${params.toString()}` : ''
    }`;
  }

  function handleExportCsv() {
    const url = buildExportUrl();
    // Klassischer Download via GET
    window.location.href = url;
  }

  async function handleExportXlsx() {
    try {
      const url = buildExportUrl();
      const rows = await fetchCsvAsArray(url);
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'Leads');
      const filename = 'leads-global.xlsx';
      XLSX.writeFile(wb, filename);
    } catch (err: any) {
      console.error(err);
      alert(
        err?.message ??
          'Fehler beim Erzeugen des globalen XLSX-Exports für die Leads.',
      );
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Globaler Lead-Export</h2>
          <p className="text-xs text-gray-500">
            Export über alle Events – wähle Zeitraum oder Schnellfilter.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-gray-50"
          >
            CSV exportieren
          </button>
          <button
            type="button"
            onClick={handleExportXlsx}
            className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800"
          >
            XLSX exportieren
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">
            Von (Datum)
          </label>
          <input
            type="date"
            className="rounded-md border border-gray-300 px-2 py-1 text-sm"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setQuickFilter('all');
            }}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">
            Bis (Datum)
          </label>
          <input
            type="date"
            className="rounded-md border border-gray-300 px-2 py-1 text-sm"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setQuickFilter('all');
            }}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">
            Schnellfilter
          </label>
          <select
            className="rounded-md border border-gray-300 px-2 py-1 text-sm"
            value={quickFilter}
            onChange={(e) =>
              setQuickFilter(e.target.value as QuickFilter)
            }
          >
            <option value="all">Kein Schnellfilter (Datum nutzen)</option>
            <option value="today">Heute</option>
            <option value="last7days">Letzte 7 Tage</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function TopEventsChart({ events }: { events: EventStats[] }) {
  if (!events || events.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-500">
        Noch keine Event-Leads vorhanden – es können noch keine Charts
        angezeigt werden.
      </div>
    );
  }

  // Alle Events, absteigend nach totalen Leads
  const sorted = [...events].sort(
    (a, b) => b.leadCountTotal - a.leadCountTotal,
  );

  const data: TopEventsChartDatum[] = sorted.map((e) => ({
    eventId: e.id,
    eventName: e.name,
    leadCountTotal: e.leadCountTotal,
  }));

  return (
    <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">
          Leads pro Event (alle Events)
        </h2>
        <span className="text-xs text-gray-400">
          Sortiert nach totalen Leads
        </span>
      </div>

      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="eventName"
              width={140}
            />
            <Tooltip
              formatter={(value: number) => [`${value} Leads`, 'Leads']}
            />
            <Bar dataKey="leadCountTotal" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ---- Hauptseite Dashboard ----

export default function AdminDashboardPage() {
  const [events, setEvents] = useState<EventStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadEventsStats() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch('/api/admin/events/stats');
        if (!res.ok) {
          throw new Error(
            `Event-Statistiken konnten nicht geladen werden (Status ${res.status})`,
          );
        }

        const data: EventsStatsResponse = await res.json();
        if (!isMounted) return;

        setEvents(data.events ?? []);
      } catch (err: any) {
        console.error(err);
        if (!isMounted) return;
        setError(
          err.message ??
            'Unbekannter Fehler beim Laden der Event-Statistiken',
        );
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadEventsStats();

    return () => {
      isMounted = false;
    };
  }, []);

  const totalEvents = events.length;
  const totalLeads = events.reduce(
    (sum, e) => sum + e.leadCountTotal,
    0,
  );
  const totalLeadsToday = events.reduce(
    (sum, e) => sum + e.leadCountToday,
    0,
  );
  const totalLeadsLast7 = events.reduce(
    (sum, e) => sum + e.leadCountLast7Days,
    0,
  );

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex flex-col justify-between gap-2 md:flex-row md:items-center">
        <div>
          <h1 className="text-xl font-semibold">Admin-Dashboard</h1>
          <p className="text-sm text-gray-500">
            Übersicht über Events, Leads und globale Exporte.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/events"
            className="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm hover:bg-gray-50"
          >
            Zu den Events
          </Link>
        </div>
      </div>

      {/* Fehler / Loading */}
      {loading && (
        <div className="text-sm text-gray-500">
          Lade Event-Statistiken…
        </div>
      )}
      {error && (
        <div className="text-sm text-red-600">
          {error}
        </div>
      )}

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="text-xs font-medium text-gray-500">
            Anzahl Events
          </div>
          <div className="mt-2 text-2xl font-semibold">
            {totalEvents}
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="text-xs font-medium text-gray-500">
            Leads total (alle Events)
          </div>
          <div className="mt-2 text-2xl font-semibold">
            {totalLeads}
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="text-xs font-medium text-gray-500">
            Leads heute
          </div>
          <div className="mt-2 text-2xl font-semibold">
            {totalLeadsToday}
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="text-xs font-medium text-gray-500">
            Leads letzte 7 Tage
          </div>
          <div className="mt-2 text-2xl font-semibold">
            {totalLeadsLast7}
          </div>
        </div>
      </div>

      {/* Globaler Export + Chart */}
      <div className="grid gap-6 lg:grid-cols-2">
        <GlobalLeadsExportControls />
        <TopEventsChart events={events} />
      </div>

      {/* Event-Tabelle */}
      <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            Events & Kennzahlen
          </h2>
          <span className="text-xs text-gray-400">
            Übersicht über alle Events
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-xs font-medium text-gray-600">
                <th className="px-3 py-2">Event</th>
                <th className="px-3 py-2">Zeitraum</th>
                <th className="px-3 py-2 text-right">
                  Leads total
                </th>
                <th className="px-3 py-2 text-right">
                  Leads heute
                </th>
                <th className="px-3 py-2 text-right">
                  Leads letzte 7 Tage
                </th>
                <th className="px-3 py-2 text-right">
                  Formulare
                </th>
                <th className="px-3 py-2 text-right">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 && !loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-4 text-center text-xs text-gray-500"
                  >
                    Noch keine Events erfasst.
                  </td>
                </tr>
              ) : (
                events.map((event) => (
                  <tr
                    key={event.id}
                    className="border-b last:border-0 hover:bg-gray-50"
                  >
                    <td className="px-3 py-2">
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {event.name}
                        </span>
                        <span className="text-xs text-gray-500">
                          ID {event.id}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-600">
                      {formatDateRange(
                        event.startDate,
                        event.endDate,
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {event.leadCountTotal}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {event.leadCountToday}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {event.leadCountLast7Days}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {event.formCount}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/admin/events/${event.id}/stats`}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Stats
                        </Link>
                        <Link
                          href={`/admin/events/${event.id}/forms`}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Formulare
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
