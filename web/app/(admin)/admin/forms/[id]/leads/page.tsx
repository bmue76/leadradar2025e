// web/app/(admin)/admin/forms/[id]/leads/page.tsx
'use client';

import React, { use, useEffect, useState } from 'react';

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

export default function FormLeadsPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const formId = Number.parseInt(resolvedParams.id, 10);

  const [form, setForm] = useState<FormItem | null>(null);
  const [fields, setFields] = useState<SimpleField[]>([]);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

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
