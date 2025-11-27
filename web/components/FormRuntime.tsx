// web/components/FormRuntime.tsx
'use client';

import { FormEvent, useMemo, useState } from 'react';

export type RuntimeFormStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

export type RuntimeForm = {
  id: number;
  eventId: number | null;
  name: string;
  description: string | null;

  status: RuntimeFormStatus;
  isDefault: boolean;
  isTemplate: boolean;

  displayTitle: string | null;
  displaySubtitle: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
};

export type RuntimeFieldType =
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

export type RuntimeField = {
  id: number;
  formId: number;
  key: string;
  label: string;
  type: RuntimeFieldType | string;

  isRequired: boolean;
  isReadOnly: boolean;
  isOcrField: boolean;
  order: number;

  placeholder: string | null;
  helpText: string | null;
  defaultValue: string | null;

  // Auswahloptionen / Zusatz-Config (aus JSON)
  options: any;
  config: any;
};

export type FormRuntimeMode = 'preview' | 'live';

type FormRuntimeProps = {
  form: RuntimeForm;
  fields: RuntimeField[];
  mode?: FormRuntimeMode;
  onSubmitted?: () => void;
};

export function FormRuntime({
  form,
  fields,
  mode = 'preview',
  onSubmitted,
}: FormRuntimeProps) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const field of fields) {
      initial[field.key] = field.defaultValue ?? '';
    }
    return initial;
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isPreview = mode === 'preview';

  const title = useMemo(
    () => (form.displayTitle && form.displayTitle.trim() !== ''
      ? form.displayTitle.trim()
      : form.name),
    [form.displayTitle, form.name],
  );

  const subtitle = form.displaySubtitle ?? '';

  const primaryColor =
    (form.primaryColor && form.primaryColor.trim()) || '#111827'; // default: fast schwarz
  const accentColor =
    (form.accentColor && form.accentColor.trim()) || '#2563EB'; // default: blau

  const handleChange = (fieldKey: string, newValue: string) => {
    setValues((prev) => ({
      ...prev,
      [fieldKey]: newValue,
    }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (isPreview) {
      setSuccess('Dies ist eine Vorschau – die Daten werden nicht gespeichert.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/forms/${form.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values,
        }),
      });

      const data = (await res.json().catch(() => null)) as
        | { error?: string }
        | Record<string, unknown>
        | null;

      if (!res.ok) {
        throw new Error(
          (data as { error?: string })?.error ??
            `Fehler beim Senden (Status ${res.status})`,
        );
      }

      setSuccess('Lead wurde erfolgreich erfasst.');
      if (onSubmitted) {
        onSubmitted();
      }
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : 'Unbekannter Fehler beim Senden',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const renderOptions = (field: RuntimeField) => {
    if (!field.options) return [];
    if (Array.isArray(field.options)) return field.options;

    // Falls Optionen z.B. als { items: [...] } gespeichert sind
    if (Array.isArray((field.options as any).items)) {
      return (field.options as any).items;
    }

    return [];
  };

  const renderFieldControl = (field: RuntimeField) => {
    const commonClasses =
      'w-full rounded border border-gray-300 px-3 py-2 text-sm';
    const value = values[field.key] ?? '';

    switch (field.type) {
      case 'TEXT':
      case 'EMAIL':
      case 'PHONE':
      case 'NUMBER':
      case 'DATE':
      case 'DATETIME': {
        const typeMap: Record<string, string> = {
          TEXT: 'text',
          EMAIL: 'email',
          PHONE: 'tel',
          NUMBER: 'number',
          DATE: 'date',
          DATETIME: 'datetime-local',
        };
        const inputType = typeMap[field.type] ?? 'text';

        return (
          <input
            type={inputType}
            className={commonClasses}
            value={value}
            onChange={(e) => handleChange(field.key, e.target.value)}
            placeholder={field.placeholder ?? ''}
            readOnly={field.isReadOnly}
          />
        );
      }

      case 'TEXTAREA':
        return (
          <textarea
            className={`${commonClasses} min-h-[80px]`}
            value={value}
            onChange={(e) => handleChange(field.key, e.target.value)}
            placeholder={field.placeholder ?? ''}
            readOnly={field.isReadOnly}
          />
        );

      case 'SINGLE_SELECT': {
        const options = renderOptions(field);
        return (
          <select
            className={commonClasses}
            value={value}
            onChange={(e) => handleChange(field.key, e.target.value)}
            disabled={field.isReadOnly}
          >
            <option value="">Bitte auswählen…</option>
            {options.map((opt: any) => (
              <option key={opt.value ?? opt.label} value={opt.value ?? opt.label}>
                {opt.label ?? opt.value ?? ''}
              </option>
            ))}
          </select>
        );
      }

      case 'MULTI_SELECT': {
        const options = renderOptions(field);
        const selectedValues = value ? value.split(',') : [];

        const toggleValue = (val: string) => {
          const set = new Set(selectedValues);
          if (set.has(val)) {
            set.delete(val);
          } else {
            set.add(val);
          }
          handleChange(field.key, Array.from(set).join(','));
        };

        return (
          <div className="space-y-1">
            {options.map((opt: any) => {
              const val = opt.value ?? opt.label ?? '';
              const isChecked = selectedValues.includes(String(val));
              return (
                <label
                  key={val}
                  className="flex items-center gap-2 text-sm text-gray-700"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300"
                    checked={isChecked}
                    onChange={() => toggleValue(String(val))}
                    disabled={field.isReadOnly}
                  />
                  <span>{opt.label ?? opt.value ?? ''}</span>
                </label>
              );
            })}
          </div>
        );
      }

      case 'BOOLEAN':
        return (
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300"
              checked={value === 'true'}
              onChange={(e) =>
                handleChange(field.key, e.target.checked ? 'true' : 'false')
              }
              disabled={field.isReadOnly}
            />
            <span>{field.placeholder ?? ''}</span>
          </label>
        );

      default:
        // Fallback als normales Textfeld
        return (
          <input
            type="text"
            className={commonClasses}
            value={value}
            onChange={(e) => handleChange(field.key, e.target.value)}
            placeholder={field.placeholder ?? ''}
            readOnly={field.isReadOnly}
          />
        );
    }
  };

  return (
    <div className="max-w-xl w-full mx-auto">
      {/* Branding-Header */}
      <div className="mb-6 flex flex-col items-center gap-4 border-b pb-4">
        {form.logoUrl && (
          <img
            src={form.logoUrl}
            alt="Logo"
            className="max-h-16 object-contain"
          />
        )}

        <div className="text-center space-y-1">
          <h1
            className="text-2xl font-semibold"
            style={{ color: primaryColor }}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-gray-600">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span
            className="inline-block h-3 w-6 rounded border border-gray-300"
            style={{ backgroundColor: primaryColor }}
          />
          <span
            className="inline-block h-3 w-6 rounded border border-gray-300"
            style={{ backgroundColor: accentColor }}
          />
        </div>

        {isPreview && (
          <div className="rounded border border-yellow-300 bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
            Vorschau-Modus – Eingaben werden nicht gespeichert.
          </div>
        )}
      </div>

      {/* Formular-Felder */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {fields.map((field) => (
          <div key={field.id} className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <label className="block text-sm font-medium text-gray-800">
                {field.label}
                {field.isRequired && (
                  <span className="ml-1 text-red-600">*</span>
                )}
              </label>
              {field.isOcrField && (
                <span className="text-[10px] uppercase tracking-wide text-purple-600 border border-purple-200 rounded px-1 py-0.5">
                  OCR
                </span>
              )}
            </div>

            {renderFieldControl(field)}

            {field.helpText && (
              <p className="text-xs text-gray-500">{field.helpText}</p>
            )}
          </div>
        ))}

        {/* Meldungen */}
        {error && (
          <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800">
            {success}
          </div>
        )}

        {/* Submit-Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            style={{
              backgroundColor: primaryColor,
            }}
          >
            {isPreview
              ? 'Vorschau – nicht senden'
              : submitting
                ? 'Sende…'
                : 'Lead absenden'}
          </button>
        </div>
      </form>
    </div>
  );
}
