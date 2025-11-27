'use client';

import React, { useState } from 'react';

export type FieldType =
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

export interface SelectOption {
  value: string;
  label: string;
}

export interface FormFieldRuntime {
  id: number;
  key: string;
  label: string;
  type: FieldType;
  isRequired: boolean;
  isReadOnly: boolean;

  placeholder?: string | null;
  helpText?: string | null;
  defaultValue?: string | null;
  options?: SelectOption[] | null;

  order?: number | null;
}

export interface FormRuntimeProps {
  fields: FormFieldRuntime[];
  onSubmit?: (values: Record<string, unknown>) => void;
  submitLabel?: string;
}

type FormValues = Record<string, unknown>;
type FormErrors = Record<string, string>;

function getInitialValueForField(field: FormFieldRuntime): unknown {
  switch (field.type) {
    case 'BOOLEAN':
      return false;
    case 'MULTI_SELECT':
      return [];
    default:
      return field.defaultValue ?? '';
  }
}

export function FormRuntime({
  fields,
  onSubmit,
  submitLabel = 'Absenden',
}: FormRuntimeProps) {
  const sortedFields = [...fields].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0),
  );

  const [values, setValues] = useState<FormValues>(() => {
    const initial: FormValues = {};
    for (const field of sortedFields) {
      initial[field.key] = getInitialValueForField(field);
    }
    return initial;
  });

  const [errors, setErrors] = useState<FormErrors>({});

  const handleChange = (field: FormFieldRuntime, rawValue: unknown) => {
    setValues((prev) => ({
      ...prev,
      [field.key]: rawValue,
    }));
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    for (const field of sortedFields) {
      const value = values[field.key];

      if (field.isRequired) {
        let isEmpty = false;

        switch (field.type) {
          case 'BOOLEAN':
            // required + false = Fehler
            isEmpty = value !== true;
            break;
          case 'MULTI_SELECT':
            isEmpty = !Array.isArray(value) || value.length === 0;
            break;
          default:
            isEmpty =
              value === null ||
              value === undefined ||
              (typeof value === 'string' && value.trim().length === 0);
        }

        if (isEmpty) {
          newErrors[field.key] = 'Dieses Feld ist erforderlich.';
          continue;
        }
      }

      if (value && typeof value === 'string') {
        if (field.type === 'EMAIL') {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            newErrors[field.key] =
              'Bitte gib eine gültige E-Mail-Adresse ein.';
          }
        }

        if (field.type === 'NUMBER') {
          if (isNaN(Number(value))) {
            newErrors[field.key] = 'Bitte gib eine gültige Zahl ein.';
          }
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    if (onSubmit) {
      onSubmit(values);
    }

    if (typeof window !== 'undefined') {
      console.log('[FormRuntime] Submit', values);
    }
  };

  const renderField = (field: FormFieldRuntime) => {
    const value = values[field.key];
    const error = errors[field.key];
    const options = field.options ?? [];

    const commonProps = {
      id: field.key,
      name: field.key,
      placeholder: field.placeholder ?? undefined,
      'aria-invalid': !!error,
      'aria-describedby': error ? `${field.key}-error` : undefined,
      disabled: field.isReadOnly,
    };

    switch (field.type) {
      case 'TEXT':
      case 'EMAIL':
      case 'NUMBER':
      case 'PHONE':
      case 'DATE':
      case 'DATETIME': {
        let inputType = 'text';

        if (field.type === 'EMAIL') inputType = 'email';
        if (field.type === 'NUMBER') inputType = 'number';
        if (field.type === 'PHONE') inputType = 'tel';
        if (field.type === 'DATE') inputType = 'date';
        if (field.type === 'DATETIME') inputType = 'datetime-local';

        return (
          <input
            {...commonProps}
            type={inputType}
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => handleChange(field, e.target.value)}
          />
        );
      }

      case 'TEXTAREA':
        return (
          <textarea
            {...commonProps}
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => handleChange(field, e.target.value)}
            rows={3}
          />
        );

      case 'BOOLEAN':
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              {...commonProps}
              type="checkbox"
              checked={value === true}
              onChange={(e) => handleChange(field, e.target.checked)}
            />
            {field.helpText && (
              <span style={{ fontSize: '0.8rem', color: '#555' }}>
                {field.helpText}
              </span>
            )}
          </div>
        );

      case 'SINGLE_SELECT':
        return (
          <select
            {...commonProps}
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => handleChange(field, e.target.value)}
          >
            <option value="">Bitte wählen...</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'MULTI_SELECT':
        return (
          <select
            {...commonProps}
            multiple
            value={Array.isArray(value) ? (value as string[]) : []}
            onChange={(e) => {
              const selectedValues = Array.from(
                e.target.selectedOptions,
              ).map((opt) => opt.value);
              handleChange(field, selectedValues);
            }}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      default:
        return (
          <div style={{ fontSize: '0.8rem', color: '#999' }}>
            Unbekannter Feldtyp <code>{field.type}</code>
          </div>
        );
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {sortedFields.map((field) => {
        const error = errors[field.key];

        return (
          <div key={field.id} style={{ marginBottom: '1rem' }}>
            {field.type !== 'BOOLEAN' && (
              <label
                htmlFor={field.key}
                style={{
                  display: 'block',
                  marginBottom: '0.25rem',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                }}
              >
                {field.label}
                {field.isRequired && (
                  <span style={{ color: 'red' }}> *</span>
                )}
              </label>
            )}

            {renderField(field)}

            {field.type !== 'BOOLEAN' && field.helpText && (
              <p style={{ fontSize: '0.75rem', color: '#666' }}>
                {field.helpText}
              </p>
            )}

            {error && (
              <p
                id={`${field.key}-error`}
                style={{ fontSize: '0.75rem', color: 'red' }}
              >
                {error}
              </p>
            )}
          </div>
        );
      })}

      <div>
        <button type="submit">{submitLabel}</button>
      </div>
    </form>
  );
}
