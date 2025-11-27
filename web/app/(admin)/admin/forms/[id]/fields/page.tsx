// web/app/(admin)/admin/forms/[id]/fields/page.tsx
'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';

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

type NewFieldState = {
  key: string;
  label: string;
  type: FieldType;
  isRequired: boolean;
  order: number | '';
};

const initialNewField: NewFieldState = {
  key: '',
  label: '',
  type: 'TEXT',
  isRequired: false,
  order: '',
};

function normalizeFieldType(value: string | null | undefined): FieldType {
  if (value && FIELD_TYPES.includes(value as FieldType)) {
    return value as FieldType;
  }
  return 'TEXT';
}

export default function FormFieldsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const formId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [fields, setFields] = useState<FormField[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Formular-State für "neu" + "bearbeiten"
  const [newField, setNewField] = useState<NewFieldState>(initialNewField);
  const [editingFieldId, setEditingFieldId] = useState<number | null>(null);

  // Felder laden
  useEffect(() => {
    if (!formId) return;

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
          throw new Error(
            data.error || `Fehler beim Laden (${res.status})`,
          );
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

  const handleChangeNew = (
    field: keyof NewFieldState,
    value: string | boolean,
  ) => {
    setNewField((prev) => ({
      ...prev,
      [field]:
        field === 'order'
          ? value === ''
            ? ''
            : Number.parseInt(String(value), 10) || ''
          : value,
    }));
  };

  const resetForm = () => {
    setNewField(initialNewField);
    setEditingFieldId(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formId) return;

    if (!newField.key.trim() || !newField.label.trim()) {
      alert('Bitte key und Label ausfüllen.');
      return;
    }

    if (!FIELD_TYPES.includes(newField.type)) {
      alert('Bitte einen gültigen Feldtyp wählen.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const orderValue =
        typeof newField.order === 'number' && !Number.isNaN(newField.order)
          ? newField.order
          : fields.length + 1;

      const payload = {
        key: newField.key.trim(),
        label: newField.label.trim(),
        type: newField.type,
        isRequired: newField.isRequired,
        order: orderValue,
      };

      if (editingFieldId == null) {
        // CREATE (POST)
        const res = await fetch(`/api/admin/forms/${formId}/fields`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(
            data.error || `Fehler beim Anlegen (${res.status})`,
          );
        }

        const created: FormField = await res.json();

        setFields((prev) =>
          [...prev, created].sort(
            (a, b) => a.order - b.order || a.id - b.id,
          ),
        );
      } else {
        // UPDATE (PATCH)
        const res = await fetch(
          `/api/admin/forms/${formId}/fields/${editingFieldId}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          },
        );

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(
            data.error || `Fehler beim Aktualisieren (${res.status})`,
          );
        }

        const updated: FormField = await res.json();

        setFields((prev) =>
          prev
            .map((f) => (f.id === updated.id ? updated : f))
            .sort((a, b) => a.order - b.order || a.id - b.id),
        );
      }

      // Formular zurücksetzen (egal ob neu oder bearbeiten)
      resetForm();
    } catch (err: any) {
      console.error('Error creating/updating field', err);
      setError(
        err.message ||
          (editingFieldId == null
            ? 'Feld konnte nicht angelegt werden'
            : 'Feld konnte nicht aktualisiert werden'),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEditClick = (field: FormField) => {
    setEditingFieldId(field.id);
    setNewField({
      key: field.key,
      label: field.label,
      type: normalizeFieldType(
        typeof field.type === 'string' ? field.type : String(field.type),
      ),
      isRequired: field.isRequired,
      order: field.order,
    });
  };

  const handleDelete = async (fieldId: number) => {
    if (!formId) return;
    const ok = window.confirm('Feld wirklich löschen?');
    if (!ok) return;

    try {
      const res = await fetch(
        `/api/admin/forms/${formId}/fields/${fieldId}`,
        {
          method: 'DELETE',
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.error || `Fehler beim Löschen (${res.status})`,
        );
      }

      setFields((prev) => prev.filter((f) => f.id !== fieldId));

      // Wenn wir gerade dieses Feld bearbeitet haben → Formular resetten
      if (editingFieldId === fieldId) {
        resetForm();
      }
    } catch (err: any) {
      console.error('Error deleting field', err);
      alert(err.message || 'Feld konnte nicht gelöscht werden');
    }
  };

  if (!formId) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold mb-4">Form-Felder</h1>
        <p className="text-red-600">
          Keine gültige Formular-ID in der URL gefunden.
        </p>
      </div>
    );
  }

  const isEditing = editingFieldId != null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Form-Felder verwalten</h1>
          <p className="text-sm text-gray-600">
            Formular-ID:{' '}
            <code className="px-1 py-0.5 bg-gray-100 rounded">
              {formId}
            </code>
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50"
        >
          ← Zurück
        </button>
      </div>

      {/* Neues Feld anlegen / Feld bearbeiten */}
      <section className="border rounded-lg p-4 bg-white shadow-sm space-y-4">
        <h2 className="text-lg font-semibold">
          {isEditing ? 'Feld bearbeiten' : 'Neues Feld hinzufügen'}
        </h2>

        {error && (
          <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end"
        >
          <div className="flex flex-col">
            <label className="text-xs font-medium text-gray-700 mb-1">
              Key (technischer Name)
            </label>
            <input
              type="text"
              className="border rounded px-2 py-1 text-sm"
              value={newField.key}
              onChange={(e) => handleChangeNew('key', e.target.value)}
              placeholder="z.B. company"
              required
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xs font-medium text-gray-700 mb-1">
              Label (Anzeige)
            </label>
            <input
              type="text"
              className="border rounded px-2 py-1 text-sm"
              value={newField.label}
              onChange={(e) => handleChangeNew('label', e.target.value)}
              placeholder="z.B. Firma"
              required
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xs font-medium text-gray-700 mb-1">
              Feldtyp
            </label>
            <select
              className="border rounded px-2 py-1 text-sm"
              value={newField.type}
              onChange={(e) =>
                setNewField((prev) => ({
                  ...prev,
                  type: e.target.value as FieldType,
                }))
              }
            >
              {FIELD_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-xs font-medium text-gray-700 mb-1">
              Reihenfolge
            </label>
            <input
              type="number"
              className="border rounded px-2 py-1 text-sm"
              value={newField.order}
              onChange={(e) => handleChangeNew('order', e.target.value)}
              placeholder={fields.length ? String(fields.length + 1) : '1'}
              min={1}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="new-required"
              type="checkbox"
              className="h-4 w-4"
              checked={newField.isRequired}
              onChange={(e) =>
                handleChangeNew('isRequired', e.target.checked)
              }
            />
            <label
              htmlFor="new-required"
              className="text-xs font-medium text-gray-700"
            >
              Pflichtfeld
            </label>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {saving
                ? isEditing
                  ? 'Speichern...'
                  : 'Anlegen...'
                : isEditing
                ? 'Änderungen speichern'
                : 'Feld anlegen'}
            </button>

            {isEditing && (
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
              >
                Abbrechen
              </button>
            )}
          </div>
        </form>
      </section>

      {/* Feld-Liste */}
      <section className="border rounded-lg bg-white shadow-sm">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Felder</h2>
          {loading && (
            <span className="text-xs text-gray-500">Lade Felder...</span>
          )}
        </div>

        {fields.length === 0 && !loading ? (
          <div className="px-4 py-6 text-sm text-gray-600">
            Noch keine Felder angelegt. Lege oben dein erstes Feld an.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">
                    Reihenfolge
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">
                    Key
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">
                    Label
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">
                    Typ
                  </th>
                  <th className="px-3 py-2 text-center font-medium text-gray-700">
                    Pflicht
                  </th>
                  <th className="px-3 py-2 text-center font-medium text-gray-700">
                    OCR
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-700">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody>
                {fields.map((field) => (
                  <tr key={field.id} className="border-b last:border-b-0">
                    <td className="px-3 py-2">{field.order}</td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {field.key}
                    </td>
                    <td className="px-3 py-2">{field.label}</td>
                    <td className="px-3 py-2">{field.type}</td>
                    <td className="px-3 py-2 text-center">
                      {field.isRequired ? 'Ja' : 'Nein'}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {field.isOcrField ? 'Ja' : 'Nein'}
                    </td>
                    <td className="px-3 py-2 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => handleEditClick(field)}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        Bearbeiten
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(field.id)}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        Löschen
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
