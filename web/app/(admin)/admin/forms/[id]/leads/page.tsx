// web/app/(admin)/admin/forms/[id]/leads/page.tsx
'use client';

import React, { use, useEffect, useMemo, useState } from 'react';

type FormItem = {
  id: number;
  name: string;
  eventId: number | null;
};

type SimpleField = {
  id: number;
  key: string;
  label: string;
  order: number;
};

type LeadRow = {
  id: number;
  createdAt: string; // ISO-String
  values: Record<string, string>; // key = fieldKey
};

type PageProps = {
  // Next 15/16: params ist ein Promise
  params: Promise<{ id: string }>;
};

type LeadStatsPerDay = {
  key: string;   // YYYY-MM-DD
  label: string; // DD.MM.YYYY
  count: number;
};

export default function FormLeadsPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const formId = Number.parseInt(resolvedParams.id, 10);

  const [form, setForm] = useState<FormItem | null>(null);
  const [fields, setFields] = useState<SimpleField[]>([]);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    if (!Number.isFinite(formId) || formId <= 0) {
      setLoadError('Ungültige Formular-ID');
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        setIsLoading(true);
        setLoadError(null);

        const res = await fetch(`/api/admin/forms/${formId}/leads`);
        const data = await res.json().catch(() => null);

        if (!res.ok) {
          const msg =
            data && typeof data === 'object' && typeof (data as any).error === 'string'
              ? (data as any).error
              : `Leads konnten nicht geladen werden (Status ${res.status})`;
          if (!cancelled) setLoadError(msg);
          return;
        }

        if (!cancelled && data && typeof data === 'object') {
          setForm((data as any).form as FormItem);
          setFields(((data as any).fields ?? []) as SimpleField[]);
          setLeads(((data as any).leads ?? []) as LeadRow[]);
        }
      } catch (err: any) {
        console.error('Error loading leads', err);
        if (!cancelled) {
          setLoadError(err?.message ?? 'Unbekannter Fehler beim Laden');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [formId]);

  function formatDateTime(iso: string) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('de-CH');
  }

  const eventId = form?.eventId;
  const totalLeads = leads.length;

  const handleExportCsv = () => {
    if (!Number.isFinite(formId) || formId <= 0) return;
    // Browser direkt auf die Export-API schicken → Download startet
    window.location.href = `/api/admin/forms/${formId}/leads/export`;
  };

  // einfache Statistik: Leads pro Tag
  const leadsPerDay: LeadStatsPerDay[] = useMemo(() => {
    const map = new Map<string, LeadStatsPerDay>();

    for (const lead of leads) {
      const d = new Date(lead.createdAt);
      if (Number.isNaN(d.getTime())) continue;

      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');

      const key = `${yyyy}-${mm}-${dd}`;
      const label = `${dd}.${mm}.${yyyy}`;

      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(key, { key, label, count: 1 });
      }
    }

    const arr = Array.from(map.values());
    arr.sort((a, b) => a.key.localeCompare(b.key));
    return arr;
  }, [leads]);

  const maxCount = leadsPerDay.reduce((max, item) => (item.count > max ? item.count : max), 0) || 1;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '1.5rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>
            Leads für Formular
          </h1>
          <p style={{ color: '#555' }}>
            Formular-ID:{' '}
            {Number.isFinite(formId) && formId > 0 ? (
              <strong>{formId}</strong>
            ) : (
              <span style={{ color: '#d32f2f' }}>Ungültig</span>
            )}
            {form && (
              <>
                {' · '}
                <strong>{form.name}</strong>
              </>
            )}
          </p>
        </div>

        <nav style={{ alignSelf: 'center', fontSize: '0.9rem' }}>
          {eventId && (
            <a
              href={`/admin/events/${eventId}/forms`}
              style={{ marginRight: '1rem', color: '#1976d2' }}
            >
              ← Zurück zu Formularen
            </a>
          )}
          <a href={`/admin/forms/${formId}/preview`} style={{ marginRight: '1rem', color: '#1976d2' }}>
            Formular-Vorschau
          </a>
          <a href={`/admin/forms/${formId}/fields`} style={{ marginRight: '1rem', color: '#1976d2' }}>
            Felder verwalten
          </a>
          <a href="/admin" style={{ color: '#1976d2' }}>
            Admin-Übersicht
          </a>
        </nav>
      </header>

      {isLoading && <p>Lade Leads …</p>}

      {loadError && (
        <div
          style={{
            background: '#ffebee',
            border: '1px solid #ffcdd2',
            color: '#c62828',
            padding: '0.75rem 1rem',
            borderRadius: 6,
            marginBottom: '1rem',
          }}
        >
          {loadError}
        </div>
      )}

      {!isLoading && !loadError && leads.length === 0 && (
        <div
          style={{
            background: '#e3f2fd',
            border: '1px solid #bbdefb',
            color: '#1565c0',
            padding: '0.75rem 1rem',
            borderRadius: 6,
            marginBottom: '1rem',
          }}
        >
          Für dieses Formular wurden noch keine Leads erfasst.
        </div>
      )}

      {/* Toolbar: Zusammenfassung + Buttons */}
      {!isLoading && !loadError && totalLeads > 0 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.75rem',
            fontSize: '0.9rem',
          }}
        >
          <div>
            <strong>{totalLeads}</strong> Leads erfasst
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setShowStats((prev) => !prev)}
              style={{
                backgroundColor: '#eeeeee',
                color: '#333',
                border: '1px solid #ccc',
                borderRadius: 4,
                padding: '0.35rem 0.8rem',
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              {showStats ? 'Statistik verbergen' : 'Statistik anzeigen'}
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              style={{
                backgroundColor: '#1976d2',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                padding: '0.4rem 0.9rem',
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              CSV exportieren
            </button>
          </div>
        </div>
      )}

      {/* einfache Statistik */}
      {!isLoading && !loadError && totalLeads > 0 && showStats && (
        <section
          style={{
            marginBottom: '1rem',
            padding: '0.75rem 1rem',
            borderRadius: 6,
            border: '1px solid #e0e0e0',
            background: '#fafafa',
          }}
        >
          <h2
            style={{
              fontSize: '1rem',
              fontWeight: 600,
              marginBottom: '0.5rem',
            }}
          >
            Statistik
          </h2>
          <p style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: '#555' }}>
            Insgesamt <strong>{totalLeads}</strong> Leads.
          </p>

          {leadsPerDay.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: '#777' }}>
              Keine auswertbaren Datumsangaben vorhanden.
            </p>
          ) : (
            <div>
              <p style={{ fontSize: '0.85rem', color: '#555', marginBottom: '0.35rem' }}>
                Leads pro Tag:
              </p>
              <div>
                {leadsPerDay.map((item) => {
                  const widthPercent = (item.count / maxCount) * 100;
                  return (
                    <div
                      key={item.key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: '0.25rem',
                        fontSize: '0.8rem',
                      }}
                    >
                      <div style={{ width: 90, color: '#555' }}>{item.label}</div>
                      <div
                        style={{
                          flex: 1,
                          background: '#e3f2fd',
                          borderRadius: 4,
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${widthPercent}%`,
                            minWidth: item.count > 0 ? '10%' : 0,
                            padding: '0.15rem 0.5rem',
                            background: '#1976d2',
                            color: '#fff',
                            textAlign: 'right',
                          }}
                        >
                          {item.count}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {leads.length > 0 && (
        <section>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.9rem',
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    textAlign: 'left',
                    borderBottom: '1px solid #ddd',
                    padding: '0.4rem',
                    whiteSpace: 'nowrap',
                  }}
                >
                  #
                </th>
                <th
                  style={{
                    textAlign: 'left',
                    borderBottom: '1px solid #ddd',
                    padding: '0.4rem',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Erfasst am
                </th>
                {fields.map((f) => (
                  <th
                    key={f.id}
                    style={{
                      textAlign: 'left',
                      borderBottom: '1px solid #ddd',
                      padding: '0.4rem',
                    }}
                  >
                    {f.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leads.map((lead, index) => (
                <tr key={lead.id}>
                  <td
                    style={{
                      borderBottom: '1px solid #eee',
                      padding: '0.4rem',
                      color: '#666',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {index + 1}
                  </td>
                  <td
                    style={{
                      borderBottom: '1px solid #eee',
                      padding: '0.4rem',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {formatDateTime(lead.createdAt)}
                  </td>
                  {fields.map((f) => (
                    <td
                      key={f.id}
                      style={{
                        borderBottom: '1px solid #eee',
                        padding: '0.4rem',
                        maxWidth: 220,
                      }}
                    >
                      {lead.values?.[f.key] ?? ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
