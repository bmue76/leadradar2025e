// web/app/(admin)/admin/events/[id]/EventLeadsExportControls.tsx
'use client';

import { FormEvent, useState } from 'react';
import { useParams } from 'next/navigation';

function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function EventLeadsExportControls() {
  const params = useParams();
  const eventIdRaw = params?.id;

  const eventId =
    typeof eventIdRaw === 'string'
      ? parseInt(eventIdRaw, 10)
      : Array.isArray(eventIdRaw)
      ? parseInt(eventIdRaw[0], 10)
      : NaN;

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!Number.isFinite(eventId)) {
    return (
      <div className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-800">
        Fehler: Ungültige Event-ID im Pfad.
      </div>
    );
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const params = new URLSearchParams();
    params.set('format', 'csv');

    if (from.trim()) {
      params.set('from', from.trim());
    }
    if (to.trim()) {
      params.set('to', to.trim());
    }

    const url =
      `/api/admin/events/${eventId}/leads/export?` + params.toString();

    try {
      setIsExporting(true);
      window.location.href = url;
    } catch (err) {
      console.error('CSV-Export-Fehler', err);
      setError('Beim Starten des Exports ist ein Fehler aufgetreten.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleQuickRange = (range: 'all' | 'today' | 'last7') => {
    setError(null);
    const today = new Date();

    if (range === 'all') {
      setFrom('');
      setTo('');
      return;
    }

    if (range === 'today') {
      const d = formatDateForInput(today);
      setFrom(d);
      setTo(d);
      return;
    }

    if (range === 'last7') {
      const end = formatDateForInput(today);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 6); // inkl. heute = 7 Tage
      const start = formatDateForInput(startDate);
      setFrom(start);
      setTo(end);
    }
  };

  return (
    <section className="mt-8 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="mb-2 text-lg font-semibold">Event-Leads exportieren</h2>
      <p className="mb-4 text-sm text-gray-600">
        Exportiere alle Leads dieses Events als CSV. Du kannst einen Zeitraum
        wählen oder einen Schnellfilter verwenden. Ohne Datumsangaben wird der
        gesamte Event-Zeitraum exportiert.
      </p>

      {/* Quick-Range Buttons */}
      <div className="mb-4 flex flex-wrap gap-2 text-xs">
        <span className="self-center text-gray-500">Schnellfilter:</span>
        <button
          type="button"
          onClick={() => handleQuickRange('all')}
          className="rounded border border-gray-300 px-2 py-1 hover:bg-gray-50"
        >
          Gesamter Event
        </button>
        <button
          type="button"
          onClick={() => handleQuickRange('last7')}
          className="rounded border border-gray-300 px-2 py-1 hover:bg-gray-50"
        >
          Letzte 7 Tage
        </button>
        <button
          type="button"
          onClick={() => handleQuickRange('today')}
          className="rounded border border-gray-300 px-2 py-1 hover:bg-gray-50"
        >
          Heute
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 md:flex-row md:items-end"
      >
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="from" className="text-sm font-medium">
            Von (inklusive)
          </label>
          <input
            id="from"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded border border-gray-300 px-2 py-1 text-sm"
          />
          <span className="text-xs text-gray-500">
            Optional. Format: YYYY-MM-DD
          </span>
        </div>

        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="to" className="text-sm font-medium">
            Bis (inklusive)
          </label>
          <input
            id="to"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded border border-gray-300 px-2 py-1 text-sm"
          />
          <span className="text-xs text-gray-500">
            Optional. Format: YYYY-MM-DD
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <button
            type="submit"
            disabled={isExporting}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isExporting ? 'Export läuft…' : 'CSV exportieren'}
          </button>
          <span className="text-xs text-gray-500">
            Die Datei wird als CSV heruntergeladen.
          </span>
        </div>
      </form>

      {error && (
        <div className="mt-3 rounded border border-red-300 bg-red-50 p-2 text-sm text-red-800">
          {error}
        </div>
      )}
    </section>
  );
}
