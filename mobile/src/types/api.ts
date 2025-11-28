// src/types/api.ts

// Formular-Status (spiegelt das Backend-Enum FormStatus)
export type FormStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

// Event-Typ für Mobile-Client
export interface ApiEvent {
  id: number;
  name: string;
  startDate: string | null;
  endDate: string | null;
  // nicht zwingend in jedem Endpoint enthalten → optional
  location?: string | null;
  status?: string | null;
}

// Formular-Typ für Mobile-Client
export interface ApiForm {
  id: number;
  name: string;
  // FK zum Event (kann null sein, z. B. generische Formulare)
  eventId: number | null;
  // Bequeme Anzeige im Mobile-Client (wenn vom Backend mitgeliefert)
  eventName?: string | null;
  status?: FormStatus | string | null;
}
