// web/app/(admin)/admin/forms/[id]/preview/page.tsx
'use client';

import React, { use, useEffect, useState } from 'react';
import { FormRuntime } from '@/app/components/forms/FormRuntime';

type FormStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

type FormItem = {
  id: number;
  eventId: number | null;
  name: string;
  description: string | null;
  status: FormStatus;
};

// Feldtypen – analog zu FormRuntime
type FieldType =
  | 'TEXT'
  | 'TEXTAREA'
  | 'SINGLE_SELECT'
  | 'MULTI_SELECT'
  | 'NUMBER'
  | 'EMAIL'
  | 'PHONE'
  | 'DATE'
  | 'DATETIME'
  | 'BOOLEAN';

type FormFieldItem = {
  id: number;
  formId: number;
  key: string;
  label: string;
  type: FieldType;
  isRequired: boolean;
  isReadOnly: boolean;
  isOcrField: boolean;
  order: number;
  placeholder: string | null;
  helpText: string | null;
  defaultValue: string | null;
  options: string[] | null; // DB-seitig aktuell string[]
  config: any | null;
};

type PageProps = {
  // Next 15/16: params ist ein Promise
  params: Promise<{ id: string }>;
};

export default function FormPreviewPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const formId = Number.parseInt(resolvedParams.id, 10);

  const [form, setForm] = useState<FormItem | null>(null);
  const [fields, setFields] = useState<FormFieldItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Formular + Felder laden
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

        // Formular laden
        const formRes = await fetch(`/api/admin/forms/${formId}`);
        if (!formRes.ok) {
          throw new Error(`Formular konnte nicht geladen werden (Status ${formRes.status})`);
        }
        const formData = await formRes.json();
        if (!cancelled) {
          setForm(formData as FormItem);
        }

        // Felder laden
        const fieldsRes = await fetch(`/api/admin/forms/${formId}/fields`);
        if (!fieldsRes.ok) {
          throw new Error(`Felder konnten nicht geladen werden (Status ${fieldsRes.status})`);
        }
        const fieldsData = await fieldsRes.json();
        if (!cancelled) {
          const list: FormFieldItem[] = Array.isArray(fieldsData)
            ? fieldsData
            : Array.isArray((fieldsData as any).fields)
            ? (fieldsData as any).fields
            : [];
          setFields(list);
        }
      } catch (err: any) {
        console.error('Error loading form/fields', err);
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

  async function handleSubmit(values: Record<string, unknown>) {
    setSubmitError(null);
    setSubmitSuccess(null);
    setFieldErrors({});

    if (!Number.isFinite(formId) || formId <= 0) {
      setSubmitError('Ungültige Formular-ID');
      return;
    }

    try {
      setIsSubmitting(true);

      const res = await fetch(`/api/forms/${formId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        // Feld-Validierungsfehler vom Server
        if (res.status === 400 && data && typeof data === 'object') {
          if (
            (data as any).error === 'Validation failed' &&
            (data as any).details &&
            typeof (data as any).details === 'object'
          ) {
            setFieldErrors((data as any).details as Record<string, string>);
            setSubmitError('Validierung fehlgeschlagen. Bitte Eingaben prüfen.');
            return;
          }

          if (typeof (data as any).error === 'string') {
            setSubmitError((data as any).error);
            return;
          }
        }

        const msg =
          (data && typeof data === 'object' && typeof (data as any).error === 'string'
            ? (data as any).error
            : null) ?? `Lead konnte nicht gespeichert werden (Status ${res.status})`;
        setSubmitError(msg);
        return;
      }

      // Erfolg
      const leadId = (data as any)?.leadId;
      setSubmitSuccess(
        leadId ? `Lead gespeichert (Test) – ID: ${leadId}` : 'Lead gespeichert (Test).'
      );
      console.log('Lead API response', data);
    } catch (err: any) {
      console.error('Error submitting lead preview', err);
      setSubmitError(err?.message ?? 'Unbekannter Fehler beim Speichern');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '1.5rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>
            Formular-Vorschau
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
          <a href={`/admin/forms/${formId}/fields`} style={{ marginRight: '1rem', color: '#1976d2' }}>
            ← Zurück zu Feldern
          </a>
          <a href="/admin" style={{ color: '#1976d2' }}>
            Admin-Übersicht
          </a>
        </nav>
      </header>

      {isLoading && <p>Lade Formular und Felder …</p>}

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

      {!isLoading && !loadError && fields.length === 0 && (
        <div
          style={{
            background: '#fff3e0',
            border: '1px solid #ffe0b2',
            color: '#e65100',
            padding: '0.75rem 1rem',
            borderRadius: 6,
            marginBottom: '1rem',
          }}
        >
          Für dieses Formular sind noch keine Felder definiert.
        </div>
      )}

      {submitError && (
        <div
          style={{
            background: '#ffebee',
            border: '1px solid #ffcdd2',
            color: '#c62828',
            padding: '0.7rem 1rem',
            borderRadius: 6,
            marginBottom: '0.75rem',
          }}
        >
          {submitError}
        </div>
      )}

      {submitSuccess && (
        <div
          style={{
            background: '#e8f5e9',
            border: '1px solid #c8e6c9',
            color: '#2e7d32',
            padding: '0.7rem 1rem',
            borderRadius: 6,
            marginBottom: '0.75rem',
          }}
        >
          {submitSuccess}
        </div>
      )}

      {Object.keys(fieldErrors).length > 0 && (
        <div
          style={{
            background: '#fff3e0',
            border: '1px solid #ffe0b2',
            color: '#e65100',
            padding: '0.7rem 1rem',
            borderRadius: 6,
            marginBottom: '0.75rem',
            fontSize: '0.9rem',
          }}
        >
          <strong>Feldfehler (Server):</strong>
          <ul style={{ marginTop: '0.4rem', paddingLeft: '1.2rem' }}>
            {Object.entries(fieldErrors).map(([key, msg]) => (
              <li key={key}>
                <code>{key}</code>: {msg}
              </li>
            ))}
          </ul>
        </div>
      )}

      {fields.length > 0 && (
        <section
          style={{
            borderRadius: 12,
            border: '1px solid #ddd',
            padding: '1.25rem 1.5rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
          }}
        >
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.75rem' }}>
            Live-Formular (Test-Submit)
          </h2>

          <p style={{ fontSize: '0.9rem', color: '#555', marginBottom: '0.75rem' }}>
            Diese Vorschau verwendet die gleiche Runtime wie später in der App. Beim Absenden wird
            ein Lead über die Lead-API gespeichert.
          </p>

          {/* Cast, damit TS mit dem options-Typ zufrieden ist */}
          <FormRuntime
            fields={fields as any}
            onSubmit={handleSubmit}
          />
        </section>
      )}
    </div>
  );
}
