// web/app/forms/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  FormRuntime,
  RuntimeForm,
  RuntimeField,
} from '@/components/FormRuntime';

type PublicFormResponse = {
  form: RuntimeForm;
  fields: RuntimeField[];
  error?: string;
};

export default function PublicFormPage() {
  const params = useParams<{ id: string }>();
  const formId = Number.parseInt(params.id, 10);

  const [form, setForm] = useState<RuntimeForm | null>(null);
  const [fields, setFields] = useState<RuntimeField[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (Number.isNaN(formId)) {
      setError('Ungültige Formular-ID.');
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/forms/${formId}`);
        const data = (await res.json().catch(() => null)) as
          | PublicFormResponse
          | { error?: string }
          | null;

        if (!res.ok) {
          throw new Error(
            (data as { error?: string })?.error ??
              `Formular konnte nicht geladen werden (Status ${res.status})`,
          );
        }

        if (!data || !('form' in data) || !('fields' in data)) {
          throw new Error('Unerwartete Antwort vom Server.');
        }

        setForm((data as PublicFormResponse).form);
        setFields((data as PublicFormResponse).fields);
      } catch (err) {
        console.error(err);
        setError(
          err instanceof Error
            ? err.message
            : 'Unbekannter Fehler beim Laden des Formulars.',
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [formId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-600">Formular wird geladen…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <p className="font-semibold mb-1">Fehler</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700">
          <p>Formular wurde nicht gefunden.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center py-10 px-4">
      <div className="w-full max-w-xl">
        <div className="mb-4 text-xs text-gray-400 text-center">
          {/* Kleiner Tech-Hinweis – optional */}
          <span>LeadRadar – digitale Leaderfassung</span>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <FormRuntime form={form} fields={fields} mode="live" />
        </div>
      </div>
    </div>
  );
}
