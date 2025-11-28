// src/utils/leadMappers.ts

import {
  LeadDetail,
  LeadDetailField,
  LeadSummary,
  LeadWithFieldValuesDto,
} from '../types/leads';

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return `${date.toLocaleDateString('de-CH')} ${date.toLocaleTimeString(
    'de-CH',
    { hour: '2-digit', minute: '2-digit' }
  )}`;
}

export function mapLeadToSummary(lead: LeadWithFieldValuesDto): LeadSummary {
  const parts: string[] = [];
  if (lead.firstName) parts.push(lead.firstName);
  if (lead.lastName) parts.push(lead.lastName);

  let title = parts.join(' ');
  if (lead.company) {
    title = title ? `${title} – ${lead.company}` : lead.company;
  }
  if (!title) {
    title = `Lead #${lead.id}`;
  }

  const createdAtLabel = formatDateTime(lead.createdAt);
  const subtitle = `Erfasst am ${createdAtLabel}`;

  return {
    id: lead.id,
    title,
    subtitle,
    createdAtLabel,
  };
}

export function mapLeadToDetail(lead: LeadWithFieldValuesDto): LeadDetail {
  const createdAtLabel = formatDateTime(lead.createdAt);

  const baseFields: LeadDetailField[] = [];

  if (lead.firstName) {
    baseFields.push({ label: 'Vorname', value: lead.firstName });
  }
  if (lead.lastName) {
    baseFields.push({ label: 'Nachname', value: lead.lastName });
  }
  if (lead.email) {
    baseFields.push({ label: 'E-Mail', value: lead.email });
  }
  if (lead.phone) {
    baseFields.push({ label: 'Telefon', value: lead.phone });
  }
  if (lead.company) {
    baseFields.push({ label: 'Firma', value: lead.company });
  }
  if (lead.notes) {
    baseFields.push({ label: 'Notizen', value: lead.notes });
  }

  const dynamicFields: LeadDetailField[] = (lead.fieldValues ?? [])
    .filter((fv) => fv.value && fv.value.trim().length > 0)
    .map((fv) => {
      const label =
        fv.field?.label ||
        fv.field?.key ||
        `Feld ${fv.fieldId.toString()}`;

      return {
        id: fv.id,
        label,
        value: fv.value,
      };
    });

  const title = mapLeadToSummary(lead).title;

  return {
    id: lead.id,
    title,
    createdAtLabel,
    baseFields,
    dynamicFields,
  };
}
