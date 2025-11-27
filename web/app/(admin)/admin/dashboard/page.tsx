// web/app/(admin)/admin/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import GlobalLeadsExportControls from './GlobalLeadsExportControls';

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

export default function AdminDashboardPage() {
  const [events, setEvents] = useState<EventStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch('/api/admin/events/stats');
        if (!res.ok) {
          throw new Error(
            `Fehler beim Laden der Event-Statistiken (Status ${res.status})`,
          );
        }

        const data = (await res.json()) as EventsStatsResponse;
        setEvents(data.events ?? []);
      } catch (err: any) {
        setError(err.message ?? 'Unbekannter Fehler');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return <div className="p-6">Lade Dashboard…</div>;
  }

  if (error) {
    return (
      <div className="p-6 text-red-600">
        Fehler: {error}
      </div>
    );
  }

  // Aggregationen
  const now = new Date();

  const totalLeads = events.reduce(
    (sum, ev) => sum + ev.leadCountTotal,
    0,
  );
  const totalLeadsLast7Days = events.reduce(
    (sum, ev) => sum + ev.leadCountLast7Days,
    0,
  );
  const totalLeadsToday = events.reduce(
    (sum, ev) => sum + ev.leadCountToday,
    0,
  );

  const activeEvents = events.filter((ev) => {
    if (!ev.endDate) return true; // kein Enddatum => aktiv
    const end = new Date(ev.endDate);
    // aktiv, wenn Enddatum heute oder in Zukunft
    return end >= new Date(now.getFullYear(), now.getMonth(), now.getDate());
  });

  const activeEventsCount = activeEvents.length;
  const totalEventsCount = events.length;

  const topEvents = [...events]
    .sort((a, b) => b.leadCountTotal - a.leadCountTotal)
    .slice(0, 5);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">LeadRadar Dashboard</h1>
          <p className="text-sm text-gray-600">
            Überblick über Events & Leads
          </p>
        </div>
        <Link
          href="/admin/events"
          className="rounded border px-3 py-1 text-sm hover:bg-gray-50"
        >
          Events verwalten
        </Link>
      </div>

      {/* KPI-Kacheln */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded border p-4">
          <div className="mb-1 text-xs uppercase text-gray-500">
            Leads total
          </div>
          <div className="text-2xl font-bold">{totalLeads}</div>
        </div>
        <div className="rounded border p-4">
          <div className="mb-1 text-xs uppercase text-gray-500">
            Leads letzte 7 Tage
          </div>
          <div className="text-2xl font-bold">{totalLeadsLast7Days}</div>
        </div>
        <div className="rounded border p-4">
          <div className="mb-1 text-xs uppercase text-gray-500">
            Leads heute
          </div>
          <div className="text-2xl font-bold">{totalLeadsToday}</div>
        </div>
        <div className="rounded border p-4">
          <div className="mb-1 text-xs uppercase text-gray-500">
            Aktive Events
          </div>
          <div className="text-2xl font-bold">
            {activeEventsCount}
            <span className="ml-1 text-sm text-gray-500">
              / {totalEventsCount}
            </span>
          </div>
        </div>
      </div>

      {/* Globaler Leads-Export */}
      <GlobalLeadsExportControls />

      {/* Top-Events nach Leads */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Top-Events nach Leads</h2>
          <Link
            href="/admin/events"
            className="text-sm text-blue-600 hover:underline"
          >
            Alle Events
          </Link>
        </div>

        {events.length === 0 ? (
          <p className="text-sm text-gray-600">
            Noch keine Events mit Statistiken vorhanden.
          </p>
        ) : topEvents.length === 0 ? (
          <p className="text-sm text-gray-600">
            Es sind Events vorhanden, aber noch keine Leads erfasst.
          </p>
        ) : (
          <div className="overflow-x-auto rounded border">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 text-left">
                <tr>
                  <th className="p-2">Event</th>
                  <th className="p-2">Zeitraum</th>
                  <th className="p-2">Formulare</th>
                  <th className="p-2">Leads total</th>
                  <th className="p-2">Leads 7 Tage</th>
                  <th className="p-2">Leads heute</th>
                  <th className="p-2">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {topEvents.map((ev) => {
                  const period = ev.startDate
                    ? `${new Date(ev.startDate).toLocaleDateString()}${
                        ev.endDate
                          ? ` – ${new Date(ev.endDate).toLocaleDateString()}`
                          : ''
                      }`
                    : '—';

                  return (
                    <tr key={ev.id} className="border-t">
                      <td className="p-2">{ev.name}</td>
                      <td className="p-2">{period}</td>
                      <td className="p-2">{ev.formCount}</td>
                      <td className="p-2 font-semibold">
                        {ev.leadCountTotal}
                      </td>
                      <td className="p-2">{ev.leadCountLast7Days}</td>
                      <td className="p-2">{ev.leadCountToday}</td>
                      <td className="p-2 space-x-2">
                        <Link
                          href={`/admin/events/${ev.id}/forms`}
                          className="text-blue-600 hover:underline"
                        >
                          Formulare
                        </Link>
                        <Link
                          href={`/admin/events/${ev.id}/stats`}
                          className="text-blue-600 hover:underline"
                        >
                          Stats
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Alle Events (Kurzliste) */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Alle Events (Kurzüberblick)</h2>
        {events.length === 0 ? (
          <p className="text-sm text-gray-600">
            Noch keine Events vorhanden.
          </p>
        ) : (
          <div className="overflow-x-auto rounded border">
            <table className="min-w-full text-xs sm:text-sm">
              <thead className="bg-gray-100 text-left">
                <tr>
                  <th className="p-2">Event</th>
                  <th className="p-2">Zeitraum</th>
                  <th className="p-2">Formulare</th>
                  <th className="p-2">Leads total</th>
                  <th className="p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => {
                  const period = ev.startDate
                    ? `${new Date(ev.startDate).toLocaleDateString()}${
                        ev.endDate
                          ? ` – ${new Date(ev.endDate).toLocaleDateString()}`
                          : ''
                      }`
                    : '—';

                  const isActive = activeEvents.some(
                    (a) => a.id === ev.id,
                  );

                  return (
                    <tr key={ev.id} className="border-t">
                      <td className="p-2">
                        <Link
                          href={`/admin/events/${ev.id}/stats`}
                          className="text-blue-600 hover:underline"
                        >
                          {ev.name}
                        </Link>
                      </td>
                      <td className="p-2">{period}</td>
                      <td className="p-2">{ev.formCount}</td>
                      <td className="p-2">{ev.leadCountTotal}</td>
                      <td className="p-2">
                        {isActive ? (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">
                            aktiv
                          </span>
                        ) : (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                            abgeschlossen
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
