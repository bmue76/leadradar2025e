// src/types/leads.ts

// Rohdaten aus der Admin-API (DTO)

export type LeadFieldValueDto = {
  id: number;
  leadId: number;
  fieldId: number;
  value: string;
  field?:
    | {
        id: number;
        formId: number;
        key: string;
        label: string;
        type: string;
        options?: string[] | null;
      }
    | null;
};

export type LeadWithFieldValuesDto = {
  id: number;
  eventId: number | null;
  formId: number | null;
  createdAt: string; // ISO-String
  updatedAt: string; // ISO-String
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  notes: string | null;
  fieldValues: LeadFieldValueDto[];
};

// UI-Modelle für die App

export type LeadSummary = {
  id: number;
  title: string;
  subtitle?: string;
  createdAtLabel: string;
};

export type LeadDetailField = {
  id?: number;
  label: string;
  value: string;
};

export type LeadDetail = {
  id: number;
  title: string;
  createdAtLabel: string;
  baseFields: LeadDetailField[];
  dynamicFields: LeadDetailField[];
};
