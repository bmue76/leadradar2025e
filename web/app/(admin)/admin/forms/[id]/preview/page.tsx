// web/app/(admin)/admin/forms/[id]/preview/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  FormRuntime,
  RuntimeForm,
  RuntimeField,
} from '@/components/FormRuntime';

type AdminFormResponse = {
  form: RuntimeForm;
  fields: RuntimeField[];
};

export default function FormPreviewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const formId = Number.parseInt(params.id, 10);

  const [form, setForm] = useState<RuntimeForm | null>(null);
  const [fields, setFields] = useState<RuntimeField[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const goBack = () => {
    if (form?.eventId) {
      router.push(`/admin/events/${form.eventId}/forms`);
    } else {
      router.push('/admin/events');
    }
  };

  useEffect(() => {
    if (Number.isNaN(formId)) {
      setError('Ungültige Formular-ID');
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/forms/${formId}`);
        const data = (await res.json().catch(() => null)) as
          | AdminFormResponse
          | { error?: string }
          | null;

        if (!res.ok) {
          throw new Error(
            (data as { error?: string })?.error ??
              `Formular konnte nicht geladen werden (Status ${res.status})`,
          );
        }

        if (!data || !('form' in data) || !('fields' in data)) {
          throw new Error('Unerwartete Antwort vom Server');
        }

        setForm((data as AdminFormResponse).form);
        setFields((data as AdminFormResponse).fields);
      } catch (err) {
        console.error(err);
        setError(
          err instanceof Error
            ? err.message
            : 'Unbekannter Fehler beim Laden des Formulars',
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [formId]);

  if (loading) {
    return (
      <div className="p-6">
        <button
          type="button"
          onClick={goBack}
          className="mb-4 px-3 py-1 rounded border border-gray-300 text-sm"
        >
          ← Zurück
        </button>
        <p>Formular-Vorschau wird geladen…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 space-y-4">
        <button
          type="button"
          onClick={goBack}
          className="px-3 py-1 rounded border border-gray-300 text-sm"
        >
          ← Zurück
        </button>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="p-6 space-y-4">
        <button
          type="button"
          onClick={goBack}
          className="px-3 py-1 rounded border border-gray-300 text-sm"
        >
          ← Zurück
        </button>
        <p>Formular nicht gefunden.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={goBack}
            className="px-3 py-1 rounded border border-gray-300 text-sm"
          >
            ← Zurück zur Formularliste
          </button>

          <div className="text-xs text-gray-500 text-right">
            <div>Formular-ID: {form.id}</div>
            <div>Status: {form.status}</div>
            <div>
              Typ: {form.isTemplate ? 'Vorlage (Template)' : 'Event-Formular'}
            </div>
          </div>
        </div>

        <h1 className="text-xl font-semibold">
          Formular-Vorschau mit Branding
        </h1>
        <p className="text-sm text-gray-600">
          Dies ist eine interaktive Vorschau. Eingaben werden{' '}
          <span className="font-semibold">nicht</span> gespeichert.
        </p>

        <div className="mt-4 rounded-lg border border-gray-200 bg-white p-6">
          <FormRuntime form={form} fields={fields} mode="preview" />
        </div>
      </div>
    </div>
  );
}
