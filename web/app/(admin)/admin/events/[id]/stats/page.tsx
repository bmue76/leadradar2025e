// web/app/(admin)/admin/events/[id]/stats/page.tsx
'use client';

import React, { use, useEffect, useState } from 'react';
import Link from 'next/link';
import EventLeadsExportControls from '../EventLeadsExportControls';

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

type EventInfo = {
  id: number;
  name: string;
  startDate: string | null;
  endDate: string | null;
};

type EventStatsResponse = {
  event: EventInfo;
  totals: Totals;
  byForm: FormStats[];
  byDay: DayStats[];
};

type PageProps = {
  // Next 15/16: params ist ein Promise
  params: Promise<{ id: string }>;
};

export default function EventStatsPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const eventId = Number.parseInt(resolvedParams.id, 10);

  const [data, setData] = useState<EventStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/admin/events/${eventId}/stats`);
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          let msg = `Fehler beim Laden der Event-Statistik (Status ${res.status})`;
          try {
            const json = text ? JSON.parse(text) : null;
            if (json?.error) {
              msg = json.error;
            }
          } catch {
            // ignore JSON parse error
          }
          throw new Error(msg);
        }

        const json = (await res.json()) as EventStatsResponse;
        setData(json);
      } catch (err: any) {
        setError(err.message ?? 'Unbekannter Fehler');
      } finally {
        setLoading(false);
      }
    }

    if (!Number.isNaN(eventId)) {
      load();
    } else {
      setError('Ungültige Event-ID');
      setLoading(false);
    }
  }, [eventId]);

  if (loading) {
    return <div className="p-6">Lade Event-Statistik…</div>;
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="mb-4 text-red-600">Fehler: {error}</p>
        <Link href="/admin/events" className="text-blue-600 hover:underline">
          Zurück zur Event-Übersicht
        </Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <p className="mb-4 text-red-600">Keine Daten gefunden.</p>
        <Link href="/admin/events" className="text-blue-600 hover:underline">
          Zurück zur Event-Übersicht
        </Link>
      </div>
    );
  }

  const { event, totals, byForm, byDay } = data;

  const period = event.startDate
    ? `${new Date(event.startDate).toLocaleDateString()}${
        event.endDate ? ` – ${new Date(event.endDate).toLocaleDateString()}` : ''
      }`
    : '—';

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="mb-1 text-2xl font-bold">
            Event-Statistik: {event.name}
          </h1>
          <p className="text-sm text-gray-600">Zeitraum: {period}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/events"
            className="rounded border px-3 py-1 text-sm hover:bg-gray-50"
          >
            ← Events
          </Link>
          <Link
            href={`/admin/events/${event.id}/forms`}
            className="rounded border px-3 py-1 text-sm hover:bg-gray-50"
          >
            Formulare
          </Link>
        </div>
      </div>

      {/* Totals */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded border p-4">
          <div className="mb-1 text-xs uppercase text-gray-500">
            Leads total
          </div>
          <div className="text-2xl font-bold">{totals.leadCountTotal}</div>
        </div>
        <div className="rounded border p-4">
          <div className="mb-1 text-xs uppercase text-gray-500">
            Leads letzte 7 Tage
          </div>
          <div className="text-2xl font-bold">{totals.leadCountLast7Days}</div>
        </div>
        <div className="rounded border p-4">
          <div className="mb-1 text-xs uppercase text-gray-500">
            Leads heute
          </div>
          <div className="text-2xl font-bold">{totals.leadCountToday}</div>
        </div>
      </div>

      {/* Leads nach Formular */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Leads nach Formular</h2>
        {byForm.length === 0 ? (
          <p className="text-sm text-gray-600">
            Für dieses Event sind noch keine Formulare mit Leads vorhanden.
          </p>
        ) : (
          <div className="overflow-x-auto rounded border">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 text-left">
                <tr>
                  <th className="p-2">Formular</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Leads total</th>
                  <th className="p-2">Leads 7 Tage</th>
                  <th className="p-2">Leads heute</th>
                </tr>
              </thead>
              <tbody>
                {byForm.map((f) => (
                  <tr key={f.formId} className="border-t">
                    <td className="p-2">
                      <Link
                        href={`/admin/forms/${f.formId}/leads`}
                        className="text-blue-600 hover:underline"
                      >
                        {f.formName}
                      </Link>
                    </td>
                    <td className="p-2">{f.status}</td>
                    <td className="p-2 font-semibold">{f.leadCountTotal}</td>
                    <td className="p-2">{f.leadCountLast7Days}</td>
                    <td className="p-2">{f.leadCountToday}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Leads nach Tag */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Leads nach Tag</h2>
        {byDay.length === 0 ? (
          <p className="text-sm text-gray-600">
            Für den gewählten Zeitraum sind keine Leads vorhanden.
          </p>
        ) : (
          <div className="overflow-x-auto rounded border">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 text-left">
                <tr>
                  <th className="p-2">Datum</th>
                  <th className="p-2">Leads</th>
                </tr>
              </thead>
              <tbody>
                {byDay.map((d) => (
                  <tr key={d.date} className="border-t">
                    <td className="p-2">
                      {new Date(d.date + 'T00:00:00Z').toLocaleDateString()}
                    </td>
                    <td className="p-2">{d.leadCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Event-Leads Export */}
      <EventLeadsExportControls />
    </div>
  );
}
