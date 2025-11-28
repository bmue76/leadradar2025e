// src/api/leads.ts

import { apiClient } from './apiClient';
import { LeadForm, LeadValue } from '../types/forms';

export interface LeadFieldValue {
  fieldKey: string;
  value: LeadValue;
}

export interface CreateLeadPayload {
  values: LeadFieldValue[];
}

export interface CreateLeadResponse {
  success: boolean;
  leadId?: number;
  message?: string;
}

/**
 * Formular inkl. Felder für die Lead-Erfassung laden.
 * Unterstützt sowohl Antworten der Form { form: LeadForm } als auch direkt LeadForm.
 */
export async function fetchLeadForm(formId: number): Promise<LeadForm> {
  const data: any = await apiClient.get<any>(`/api/admin/forms/${formId}`);

  let form: LeadForm | undefined;

  if (data && typeof data === 'object') {
    if ('form' in data && data.form) {
      form = data.form as LeadForm;
    } else if ('id' in data && 'fields' in data) {
      // Falls die API direkt das Formular-Objekt zurückgibt
      form = data as LeadForm;
    }
  }

  if (!form) {
    throw new Error('Unerwartete API-Antwort beim Laden des Formulars.');
  }

  return form;
}

/**
 * Lead zum Formular speichern.
 */
export async function submitLead(
  formId: number,
  payload: CreateLeadPayload,
): Promise<CreateLeadResponse> {
  const data: any = await apiClient.post<any, CreateLeadPayload>(
    `/api/admin/forms/${formId}/leads`,
    payload,
  );

  // Flexible Interpretation der Response
  if (data && typeof data === 'object') {
    if ('success' in data) {
      return data as CreateLeadResponse;
    }
    if ('id' in data) {
      return {
        success: true,
        leadId: data.id as number,
      };
    }
  }

  return { success: true };
}
