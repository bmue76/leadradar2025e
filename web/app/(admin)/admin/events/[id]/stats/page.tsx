// web/app/(admin)/admin/events/[id]/stats/page.tsx
'use client';

import React, { useEffect, useState, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { PDFDocument, StandardFonts } from 'pdf-lib';

// Recharts für die Diagramme
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';

// ---- Typen für API-Response ----

type EventInfo = {
  id: number;
  name: string;
  startDate: string | null;
  endDate: string | null;
};

type Totals = {
  leadCountTotal: number;
  leadCountToday: number;
  leadCountLast7Days: number;
  formCount: number;
};

type ByDayItem = {
  date: string; // ISO-String (z.B. "2025-11-25")
  leadCount: number;
};

type ByFormItem = {
  formId: number;
  formName: string;
  leadCount: number;
};

type EventStatsResponse = {
  event: EventInfo;
  totals: Totals;
  byDay: ByDayItem[];
  byForm: ByFormItem[];
};

// ---- Typen für die Charts ----

type LeadsByDayChartDatum = {
  date: string;      // ISO-Date aus Backend
  dateLabel: string; // z.B. "25.11."
  leadCount: number;
};

type LeadsByFormChartDatum = {
  formId: number;
  formName: string;
  leadCount: number;
};

// ---- Props von Next.js (App Router mit Promise-Params) ----

type PageProps = {
  params: Promise<{ id: string }>;
};

// ---- Hilfsfunktionen ----

function formatDateLabel(isoDate: string): string {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) {
    return isoDate;
  }
  // Kurzformat: z.B. "25.11."
  return d.toLocaleDateString('de-CH', {
    day: '2-digit',
    month: '2-digit',
  });
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

  // Sehr einfache Delimiter-Erkennung
  let delimiter = ';';
  if (lines[0].includes(',') && !lines[0].includes(';')) {
    delimiter = ',';
  }

  const rows = lines.map((line) => line.split(delimiter));
  return rows;
}

// ---- Chart-Komponenten ----

function LeadsByDayChart({ data }: { data: LeadsByDayChartDatum[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-500">
        Noch keine Leads erfasst – es stehen keine Tagesdaten zur Verfügung.
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="dateLabel" />
          <YAxis allowDecimals={false} />
          <Tooltip
            formatter={(value: number) => [`${value} Leads`, 'Leads']}
            labelFormatter={(label: string, payload: any) => {
              const originalDate = payload?.[0]?.payload?.date;
              if (!originalDate) return label;
              return new Date(originalDate).toLocaleDateString('de-CH', {
                weekday: 'short',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              });
            }}
          />
          <Line
            type="monotone"
            dataKey="leadCount"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function LeadsByFormChart({ data }: { data: LeadsByFormChartDatum[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-500">
        Keine Formular-Leads vorhanden.
      </div>
    );
  }

  // Optional: Top 5 Formulare nach Leads
  const sorted = [...data].sort((a, b) => b.leadCount - a.leadCount);
  const top = sorted.slice(0, 5);

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={top} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="formName"
            width={120}
          />
          <Tooltip
            formatter={(value: number) => [`${value} Leads`, 'Leads']}
          />
          <Bar dataKey="leadCount" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---- Hauptseite ----

export default function EventStatsPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const eventId = Number.parseInt(resolvedParams.id, 10);

  const router = useRouter();

  const [stats, setStats] = useState<EventStatsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Chart-Daten
  const [chartByDay, setChartByDay] = useState<LeadsByDayChartDatum[]>([]);
  const [chartByForm, setChartByForm] = useState<LeadsByFormChartDatum[]>([]);

  // Ref für das Leads-pro-Tag-Chart (für PDF mit Chart)
  const chartContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadStats() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/admin/events/${eventId}/stats`);
        if (!res.ok) {
          throw new Error(
            `Event-Statistiken konnten nicht geladen werden (Status ${res.status})`,
          );
        }

        const data: EventStatsResponse = await res.json();

        if (!isMounted) return;

        setStats(data);

        // Chart-Daten aufbereiten
        const byDayChartData: LeadsByDayChartDatum[] = (data.byDay || []).map(
          (item) => ({
            date: item.date,
            dateLabel: formatDateLabel(item.date),
            leadCount: item.leadCount,
          }),
        );

        const byFormChartData: LeadsByFormChartDatum[] = (data.byForm || []).map(
          (item) => ({
            formId: item.formId,
            formName: item.formName,
            leadCount: item.leadCount,
          }),
        );

        setChartByDay(byDayChartData);
        setChartByForm(byFormChartData);
      } catch (err: any) {
        console.error(err);
        if (!isMounted) return;
        setError(err.message || 'Unbekannter Fehler beim Laden der Statistiken');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    if (Number.isFinite(eventId)) {
      loadStats();
    } else {
      setError('Ungültige Event-ID');
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [eventId]);

  async function handleExportEventLeadsXlsx() {
    try {
      const url = `/api/admin/events/${eventId}/leads/export`;
      const rows = await fetchCsvAsArray(url);
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'Leads');
      const filename = `event-${eventId}-leads.xlsx`;
      XLSX.writeFile(wb, filename);
    } catch (err: any) {
      console.error(err);
      alert(
        err?.message ??
          'Fehler beim Erzeugen des XLSX-Exports für die Event-Leads.',
      );
    }
  }

  function handleExportEventStatsXlsx() {
    if (!stats) return;

    const { event, totals, byDay, byForm } = stats;

    const wb = XLSX.utils.book_new();

    // Sheet 1: Übersicht / Totals
    const overviewData: (string | number)[][] = [
      ['Event-ID', event.id],
      ['Event-Name', event.name],
    ];

    if (event.startDate) {
      overviewData.push([
        'Startdatum',
        new Date(event.startDate).toLocaleDateString('de-CH'),
      ]);
    }
    if (event.endDate) {
      overviewData.push([
        'Enddatum',
        new Date(event.endDate).toLocaleDateString('de-CH'),
      ]);
    }

    overviewData.push(
      ['Leads total', totals.leadCountTotal],
      ['Leads heute', totals.leadCountToday],
      ['Leads letzte 7 Tage', totals.leadCountLast7Days],
      ['Anzahl Formulare', totals.formCount],
    );

    const overviewWs = XLSX.utils.aoa_to_sheet(overviewData);
    XLSX.utils.book_append_sheet(wb, overviewWs, 'Übersicht');

    // Sheet 2: Leads pro Tag
    const byDayData: (string | number)[][] = [
      ['Datum', 'Leads'],
      ...byDay.map((item) => [
        new Date(item.date).toLocaleDateString('de-CH'),
        item.leadCount,
      ]),
    ];
    const byDayWs = XLSX.utils.aoa_to_sheet(byDayData);
    XLSX.utils.book_append_sheet(wb, byDayWs, 'Leads pro Tag');

    // Sheet 3: Leads pro Formular
    const byFormData: (string | number)[][] = [
      ['Formular-ID', 'Formular-Name', 'Leads'],
      ...byForm.map((item) => [item.formId, item.formName, item.leadCount]),
    ];
    const byFormWs = XLSX.utils.aoa_to_sheet(byFormData);
    XLSX.utils.book_append_sheet(wb, byFormWs, 'Leads pro Formular');

    const filename = `event-${event.id}-report.xlsx`;
    XLSX.writeFile(wb, filename);
  }

  async function handleExportEventStatsPdfBasis() {
    try {
      if (!stats) return;

      const { event, totals, byDay, byForm } = stats;

      const pdfDoc = await PDFDocument.create();
      let page = pdfDoc.addPage();
      let { height } = page.getSize();

      const marginLeft = 50;
      let y = height - 50;

      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const lineHeight = 14;

      function addLine(text: string, options?: { bold?: boolean; size?: number }) {
        const size = options?.size ?? 10;
        const isBold = options?.bold ?? false;

        if (y < 50) {
          // Neue Seite
          page = pdfDoc.addPage();
          const sizeInfo = page.getSize();
          height = sizeInfo.height;
          y = height - 50;
        }

        page.drawText(text, {
          x: marginLeft,
          y,
          size,
          font: isBold ? boldFont : font,
        });

        y -= lineHeight;
      }

      // Titel
      addLine(`Event-Report: ${event.name}`, { bold: true, size: 16 });
      addLine(`Event-ID: ${event.id}`, { size: 10 });

      const startLabel = event.startDate
        ? new Date(event.startDate).toLocaleDateString('de-CH')
        : '-';
      const endLabel = event.endDate
        ? new Date(event.endDate).toLocaleDateString('de-CH')
        : '-';

      addLine(`Zeitraum: ${startLabel} – ${endLabel}`, { size: 10 });
      addLine(''); // Leerzeile

      // KPIs
      addLine('Kern-Kennzahlen', { bold: true, size: 12 });
      addLine(`Leads total: ${totals.leadCountTotal}`);
      addLine(`Leads heute: ${totals.leadCountToday}`);
      addLine(`Leads letzte 7 Tage: ${totals.leadCountLast7Days}`);
      addLine(`Anzahl Formulare: ${totals.formCount}`);
      addLine('');
      addLine(''); // etwas Abstand

      // Tabelle: Leads pro Tag
      addLine('Leads pro Tag', { bold: true, size: 12 });
      if (byDay.length === 0) {
        addLine('Keine Tagesdaten vorhanden.');
      } else {
        addLine('Datum        Leads', { bold: true });
        byDay.forEach((item) => {
          const dateStr = new Date(item.date).toLocaleDateString('de-CH');
          const line = `${dateStr.padEnd(12)}${item.leadCount}`;
          addLine(line);
        });
      }
      addLine('');
      addLine('');

      // Tabelle: Leads pro Formular
      addLine('Leads pro Formular', { bold: true, size: 12 });
      if (byForm.length === 0) {
        addLine('Keine Formular-Leads vorhanden.');
      } else {
        addLine('Formular-Name                      Leads', {
          bold: true,
        });
        byForm.forEach((item) => {
          const name = (item.formName ?? '').slice(0, 30);
          const paddedName = name.padEnd(30);
          const line = `${paddedName}  ${item.leadCount}`;
          addLine(line);
        });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as unknown as BlobPart], {
        type: 'application/pdf',
      });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `event-${event.id}-report.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error(err);
      alert(
        err?.message ??
          'Fehler beim Erzeugen des PDF-Reports für dieses Event.',
      );
    }
  }

  // Hilfsfunktion: Chart-SVG -> PNG-Bytes (für PDF mit Chart)
  async function captureChartPngBytes(): Promise<Uint8Array> {
    const container = chartContainerRef.current;
    if (!container) {
      throw new Error('Chart-Container nicht verfügbar.');
    }

    const svg = container.querySelector('svg');
    if (!svg) {
      throw new Error('Kein SVG für das Chart gefunden.');
    }

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);

    // In Base64-Daten-URL umwandeln
    const svgBase64 = window.btoa(unescape(encodeURIComponent(svgString)));
    const imgSrc = `data:image/svg+xml;base64,${svgBase64}`;

    return await new Promise<Uint8Array>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width || 800;
          canvas.height = img.height || 400;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas-Kontext nicht verfügbar.'));
            return;
          }
          ctx.drawImage(img, 0, 0);

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(
                  new Error(
                    'Canvas konnte nicht in PNG umgewandelt werden.',
                  ),
                );
                return;
              }
              const reader = new FileReader();
              reader.onloadend = () => {
                const buffer = reader.result as ArrayBuffer;
                resolve(new Uint8Array(buffer));
              };
              reader.onerror = () =>
                reject(
                  new Error(
                    'Fehler beim Lesen des PNG aus dem Canvas.',
                  ),
                );
              reader.readAsArrayBuffer(blob);
            },
            'image/png',
            1,
          );
        } catch (err) {
          reject(err as Error);
        }
      };
      img.onerror = () =>
        reject(new Error('Chart-Bild konnte nicht geladen werden.'));
      img.src = imgSrc;
    });
  }

  // PDF-Report mit eingebettetem Chart
  async function handleExportEventStatsPdfWithChart() {
    try {
      if (!stats) return;

      const chartPngBytes = await captureChartPngBytes();
      const { event, totals } = stats;

      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage();
      const { width, height } = page.getSize();

      const marginLeft = 50;
      let y = height - 50;

      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const lineHeight = 14;

      function addLine(text: string, options?: { bold?: boolean; size?: number }) {
        const size = options?.size ?? 10;
        const isBold = options?.bold ?? false;

        page.drawText(text, {
          x: marginLeft,
          y,
          size,
          font: isBold ? boldFont : font,
        });

        y -= lineHeight;
      }

      // Titel & KPIs auf Seite 1
      addLine(`Event-Report: ${event.name}`, { bold: true, size: 16 });
      addLine(`Event-ID: ${event.id}`, { size: 10 });

      const startLabel = event.startDate
        ? new Date(event.startDate).toLocaleDateString('de-CH')
        : '-';
      const endLabel = event.endDate
        ? new Date(event.endDate).toLocaleDateString('de-CH')
        : '-';

      addLine(`Zeitraum: ${startLabel} – ${endLabel}`, { size: 10 });
      addLine('');

      addLine('Kern-Kennzahlen', { bold: true, size: 12 });
      addLine(`Leads total: ${totals.leadCountTotal}`);
      addLine(`Leads heute: ${totals.leadCountToday}`);
      addLine(`Leads letzte 7 Tage: ${totals.leadCountLast7Days}`);
      addLine(`Anzahl Formulare: ${totals.formCount}`);
      addLine('');
      addLine('Leads pro Tag (Chart)', { bold: true, size: 12 });
      y -= 10;

      // Chart-Bild einbetten – falls zu wenig Platz: neue Seite
      const pngImage = await pdfDoc.embedPng(chartPngBytes);
      const maxChartWidth = width - marginLeft * 2;
      const scale = maxChartWidth / pngImage.width;
      const pngDims = pngImage.scale(scale);

      let chartY = y - pngDims.height;
      if (chartY < 50) {
        // Neue Seite für das Chart, falls zu wenig Platz
        const chartPage = pdfDoc.addPage();
        const chartPageSize = chartPage.getSize();
        const chartPageHeight = chartPageSize.height;
        chartPage.drawImage(pngImage, {
          x: marginLeft,
          y: chartPageHeight - 60 - pngDims.height,
          width: pngDims.width,
          height: pngDims.height,
        });
      } else {
        page.drawImage(pngImage, {
          x: marginLeft,
          y: chartY,
          width: pngDims.width,
          height: pngDims.height,
        });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as unknown as BlobPart], {
        type: 'application/pdf',
      });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `event-${event.id}-report-chart.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error(err);
      alert(
        err?.message ??
          'Fehler beim Erzeugen des PDF-Reports mit Chart für dieses Event.',
      );
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <div className="text-sm text-gray-500">Lade Event-Statistiken…</div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="space-y-4 p-4">
        <div className="text-sm text-red-600">{error ?? 'Keine Daten vorhanden.'}</div>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm hover:bg-gray-50"
        >
          Zurück
        </button>
      </div>
    );
  }

  const { event, totals } = stats;

  return (
    <div className="space-y-6 p-4">
      {/* Header / Breadcrumb */}
      <div className="flex flex-col justify-between gap-2 md:flex-row md:items-center">
        <div>
          <h1 className="text-xl font-semibold">
            Event-Statistiken: {event.name}
          </h1>
          <p className="text-sm text-gray-500">
            ID {event.id}
            {event.startDate
              ? ` · ${new Date(event.startDate).toLocaleDateString('de-CH')} – ${
                  event.endDate
                    ? new Date(event.endDate).toLocaleDateString('de-CH')
                    : ''
                }`
              : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/events"
            className="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm hover:bg-gray-50"
          >
            Zurück zur Event-Übersicht
          </Link>
          <button
            type="button"
            onClick={handleExportEventLeadsXlsx}
            className="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm hover:bg-gray-50"
          >
            Event-Leads als XLSX
          </button>
          <button
            type="button"
            onClick={handleExportEventStatsXlsx}
            className="rounded-md bg-gray-900 px-3 py-1 text-sm font-medium text-white hover:bg-gray-800"
          >
            Event-Report als XLSX
          </button>
          <button
            type="button"
            onClick={handleExportEventStatsPdfBasis}
            className="rounded-md bg-gray-900 px-3 py-1 text-sm font-medium text-white hover:bg-gray-800"
          >
            Event-Report als PDF (Basis)
          </button>
          <button
            type="button"
            onClick={handleExportEventStatsPdfWithChart}
            className="rounded-md bg-gray-900 px-3 py-1 text-sm font-medium text-white hover:bg-gray-800"
          >
            Event-Report als PDF (mit Chart)
          </button>
        </div>
      </div>

      {/* KPI-Kacheln */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="text-xs font-medium text-gray-500">Leads total</div>
          <div className="mt-2 text-2xl font-semibold">
            {totals.leadCountTotal}
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="text-xs font-medium text-gray-500">Leads heute</div>
          <div className="mt-2 text-2xl font-semibold">
            {totals.leadCountToday}
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="text-xs font-medium text-gray-500">
            Leads letzte 7 Tage
          </div>
          <div className="mt-2 text-2xl font-semibold">
            {totals.leadCountLast7Days}
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="text-xs font-medium text-gray-500">
            Anzahl Formulare
          </div>
          <div className="mt-2 text-2xl font-semibold">
            {totals.formCount}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <div
          ref={chartContainerRef}
          className="space-y-3 rounded-lg border border-gray-200 bg-white p-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Leads pro Tag</h2>
            <span className="text-xs text-gray-400">
              Zeitraum gemäss Event
            </span>
          </div>
          <LeadsByDayChart data={chartByDay} />
        </div>

        <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center justify_between">
            <h2 className="text-sm font-semibold">Leads pro Formular (Top 5)</h2>
            <span className="text-xs text-gray-400">
              Basis: Anzahl Leads je Formular
            </span>
          </div>
          <LeadsByFormChart data={chartByForm} />
        </div>
      </div>
    </div>
  );
}
