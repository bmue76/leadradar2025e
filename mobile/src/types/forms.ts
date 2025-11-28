// src/types/forms.ts

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

// Wert, wie er im Lead-State und Payload verwendet wird
export type LeadValue = string | boolean | string[] | null;

export interface FormField {
  id: number;
  formId: number;
  key: string;
  label: string;
  type: FieldType | string; // string, falls Backend mal unbekannte Typen liefert
  placeholder?: string | null;
  helpText?: string | null;
  options?: string[] | null;
  required?: boolean | null;
  order?: number | null;
}

export interface LeadForm {
  id: number;
  name: string;
  description?: string | null;
  fields: FormField[];
}
