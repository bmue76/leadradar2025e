// web/app/(admin)/admin/events/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

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

export default function AdminEventsPage() {
  const [events, setEvents] = useState<EventStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/admin/events/stats');
        if (!res.ok) {
          throw new Error(`Fehler beim Laden der Event-Daten (Status ${res.status})`);
        }
        const data = await res.json();
        setEvents(data.events);
      } catch (err: any) {
        setError(err.message ?? 'Unbekannter Fehler');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <div className="p-4">Lade Events…</div>;
  }

  if (error) {
    return (
      <div className="p-4 text-red-600">
        Fehler: {error}
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Events & Statistiken</h1>

      {events.length === 0 ? (
        <p className="text-gray-600">Noch keine Events vorhanden.</p>
      ) : (
        <div className="overflow-x-auto rounded border">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 text-left">
              <tr>
                <th className="p-3">Event</th>
                <th className="p-3">Zeitraum</th>
                <th className="p-3">Formulare</th>
                <th className="p-3">Leads total</th>
                <th className="p-3">Leads 7 Tage</th>
                <th className="p-3">Leads heute</th>
                <th className="p-3">Aktion</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => {
                const period = ev.startDate
                  ? `${new Date(ev.startDate).toLocaleDateString()}`
                    + (ev.endDate ? ` – ${new Date(ev.endDate).toLocaleDateString()}` : '')
                  : '—';

                return (
                  <tr key={ev.id} className="border-t">
                    <td className="p-3">{ev.name}</td>
                    <td className="p-3">{period}</td>
                    <td className="p-3">{ev.formCount}</td>
                    <td className="p-3 font-semibold">{ev.leadCountTotal}</td>
                    <td className="p-3">{ev.leadCountLast7Days}</td>
                    <td className="p-3">{ev.leadCountToday}</td>
                    <td className="p-3 space-x-2">
                      <Link
                        href={`/admin/events/${ev.id}/forms`}
                        className="text-blue-600 hover:underline"
                      >
                        Formulare
                      </Link>
                      {/* zukünftige Statistik-Seite
                      <Link
                        href={`/admin/events/${ev.id}/stats`}
                        className="text-blue-600 hover:underline"
                      >
                        Stats
                      </Link>
                      */}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
