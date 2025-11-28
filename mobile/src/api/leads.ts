// src/api/leads.ts

import { apiClient } from './apiClient';
import { LeadWithFieldValuesDto } from '../types/leads';

// Form-Definition für Runtime-Rendering in der App

export type RuntimeFormField = {
  id: number;
  key: string;
  label: string;
  type: string;
  options?: string[] | null;
  required?: boolean;
  order?: number;
};

export type RuntimeForm = {
  id: number;
  name: string;
  eventId: number | null;
  fields: RuntimeFormField[];
};

// Payload für das Anlegen eines Leads

export type CreateLeadValuePayload = {
  fieldId: number;
  value: string;
};

export type CreateLeadPayload = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  notes?: string;
  values: CreateLeadValuePayload[];
};

// Formular für Lead-Erfassung laden
// GET /api/admin/forms/:id

export async function fetchLeadForm(formId: number): Promise<RuntimeForm> {
  const data = (await apiClient.get(
    `/api/admin/forms/${formId}`
  )) as RuntimeForm;
  return data;
}

// Lead für ein Formular speichern
// POST /api/admin/forms/:id/leads

export async function submitLead(
  formId: number,
  payload: CreateLeadPayload
): Promise<void> {
  await apiClient.post(`/api/admin/forms/${formId}/leads`, payload);
}

// Leads zu einem Formular laden
// GET /api/admin/forms/:id/leads

export type LeadsForFormResponse = {
  leads: LeadWithFieldValuesDto[];
};

export async function fetchLeadsForForm(
  formId: number
): Promise<LeadWithFieldValuesDto[]> {
  const data = (await apiClient.get(
    `/api/admin/forms/${formId}/leads`
  )) as Partial<LeadsForFormResponse>;

  return data.leads ?? [];
}
