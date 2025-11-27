// web/app/(admin)/admin/forms/[id]/preview/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FormRuntime } from '@/app/components/forms/FormRuntime';
import type {
  FormFieldRuntime,
  SelectOption,
} from '@/app/components/forms/FormRuntime';

// Feldtypen – muss zu deinem Prisma-Enum FieldType passen
const FIELD_TYPES = [
  'TEXT',
  'TEXTAREA',
  'SINGLE_SELECT',
  'MULTI_SELECT',
  'NUMBER',
  'EMAIL',
  'PHONE',
  'DATE',
  'DATETIME',
  'BOOLEAN',
] as const;

type FieldType = (typeof FIELD_TYPES)[number];

type FormField = {
  id: number;
  formId: number;
  key: string;
  label: string;
  type: FieldType | string;
  isRequired: boolean;
  isReadOnly: boolean;
  isOcrField: boolean;
  order: number;
  placeholder: string | null;
  helpText: string | null;
  defaultValue: string | null;
  options?: unknown;
  config?: unknown;
  createdAt: string;
  updatedAt: string;
};

function normalizeFieldType(value: string | null | undefined): FieldType {
  if (value && FIELD_TYPES.includes(value as FieldType)) {
    return value as FieldType;
  }
  return 'TEXT';
}

/**
 * Hilfsfunktion: mappt ein API-FormField in ein Runtime-FormField
 * für die Formular-Vorschau.
 */
function mapFormFieldToRuntimeField(field: FormField): FormFieldRuntime {
  let options: SelectOption[] | null = null;

  if (field.options) {
    if (Array.isArray(field.options)) {
      options = field.options as SelectOption[];
    } else if (typeof field.options === 'string') {
      try {
        const parsed = JSON.parse(field.options);
        if (Array.isArray(parsed)) {
          options = parsed as SelectOption[];
        }
      } catch {
        // ignorieren, wenn JSON nicht parsbar
      }
    }
  }

  return {
    id: field.id,
    key: field.key,
    label: field.label,
    type: normalizeFieldType(
      typeof field.type === 'string' ? field.type : String(field.type),
    ),
    isRequired: field.isRequired,
    isReadOnly: field.isReadOnly,
    placeholder: field.placeholder,
    helpText: field.helpText,
    defaultValue: field.defaultValue,
    options: options,
    order: field.order,
  };
}

export default function FormPreviewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const formId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [fields, setFields] = useState<FormField[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Felder laden
  useEffect(() => {
    if (!formId) {
      setLoading(false);
      setError('Keine Formular-ID in der URL gefunden.');
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/admin/forms/${formId}/fields`, {
          method: 'GET',
          cache: 'no-store',
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          const message: string =
            data.error || `Fehler beim Laden (${res.status})`;

          console.error(
            '[FormPreviewPage] Fehler beim Laden der Felder:',
            message,
            'Status:',
            res.status,
            'FormId:',
            formId,
          );

          setError(message);
          return;
        }

        const data = await res.json();
        const list: FormField[] = Array.isArray(data)
          ? data
          : Array.isArray(data.fields)
          ? data.fields
          : [];

        list.sort((a, b) => a.order - b.order || a.id - b.id);

        setFields(list);
      } catch (err: any) {
        console.error('Error loading fields', err);
        setError(err.message || 'Felder konnten nicht geladen werden');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [formId]);

  if (!formId) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold mb-4">Formular-Vorschau</h1>
        <p className="text-red-600">
          Keine gültige Formular-ID in der URL gefunden.
        </p>
      </div>
    );
  }

  const runtimeFields: FormFieldRuntime[] = fields.map(
    mapFormFieldToRuntimeField,
  );

  const renderErrorMessage = (msg: string) => {
    if (msg === 'Invalid form id') {
      return 'Ungültige Formular-ID. Vermutlich wird ein Formular aufgerufen, das nicht (mehr) existiert oder der Link ist falsch (z.B. Event-ID statt Formular-ID).';
    }
    return msg;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Formular-Vorschau</h1>
          <p className="text-sm text-gray-600">
            Formular-ID:{' '}
            <code className="px-1 py-0.5 bg-gray-100 rounded">
              {formId}
            </code>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Diese Vorschau rendert das Formular basierend auf den aktuell
            definierten Feldern. Eingaben werden noch nicht als Leads
            gespeichert.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push(`/admin/forms/${formId}/fields`)}
            className="inline-flex items-center rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50"
          >
            ← Zur Feldverwaltung
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50"
          >
            Zurück
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {renderErrorMessage(error)}
        </div>
      )}

      {loading ? (
        <div className="border rounded-lg bg-white shadow-sm px-4 py-6 text-sm text-gray-600">
          Formular-Felder werden geladen...
        </div>
      ) : fields.length === 0 ? (
        <div className="border rounded-lg bg-white shadow-sm px-4 py-6 text-sm text-gray-600">
          Für dieses Formular sind noch keine Felder definiert. Lege zuerst
          Felder in der Feldverwaltung an, um eine Vorschau zu sehen.
        </div>
      ) : (
        <section className="border rounded-lg bg-white shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Live-Vorschau</h2>
            <span className="text-xs text-gray-500">
              Test-Submit loggt die Werte nur in der Konsole.
            </span>
          </div>

          <div className="max-w-xl border border-gray-200 rounded-md p-4 bg-gray-50">
            <FormRuntime
              fields={runtimeFields}
              submitLabel="Test-Submit (nur Vorschau)"
              onSubmit={(values) => {
                console.log(
                  '[Admin Form Preview Page] Form submit values:',
                  values,
                );
                alert(
                  'Vorschau-Submit ausgeführt. Die Werte findest du in der Browser-Konsole.',
                );
              }}
            />
          </div>

          <p className="text-xs text-gray-500">
            Hinweis: Diese Runtime-Vorschau bildet die Basis für die spätere
            Lead-Erfassung (Web & Mobile). In einem späteren Teilprojekt
            werden wir hier die eigentliche Lead-Speicherung und API-Anbindung
            ergänzen.
          </p>
        </section>
      )}
    </div>
  );
}
