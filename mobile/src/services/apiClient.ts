// src/services/apiClient.ts
import { Platform } from 'react-native';
import type { ApiEvent, ApiForm } from '../types/api';

// =======================
// BASE_URL-Konfiguration
// =======================

// 1) Env-Override (empfohlen):
// In .env im Ordner /mobile kannst du EXPO_PUBLIC_API_BASE_URL setzen.
// Beispiel: EXPO_PUBLIC_API_BASE_URL=http://192.168.1.111:3000
const ENV_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

// 2) Plattformabhängige Defaults (falls ENV nicht gesetzt ist)
const DEFAULT_IOS_BASE_URL = 'http://192.168.1.111:3000'; // <- deine LAN-IP
const DEFAULT_ANDROID_BASE_URL = 'http://10.0.2.2:3000';
const DEFAULT_WEB_BASE_URL = 'http://localhost:3000';

// Effektive BASE_URL, die vom gesamten Mobile-Client verwendet wird
export const BASE_URL =
  ENV_BASE_URL ??
  (Platform.OS === 'ios'
    ? DEFAULT_IOS_BASE_URL
    : Platform.OS === 'android'
    ? DEFAULT_ANDROID_BASE_URL
    : DEFAULT_WEB_BASE_URL);

// Debug-Logs, damit wir sehen, was wirklich verwendet wird
console.log('[apiClient] ENV_BASE_URL =', ENV_BASE_URL);
console.log('[apiClient] BASE_URL =', BASE_URL);

// =======================
// Endpunkt-Konstanten
// =======================

export const EVENTS_ENDPOINT = '/api/admin/events';
export const FORMS_ENDPOINT = '/api/admin/forms';

// =======================
// Fehler-Typ
// =======================

export class ApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// =======================
// Generischer Request-Helper
// =======================

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${path}`;
  console.log('[apiClient] request', url, options.method ?? 'GET');

  // Dev-Admin-Header: tut so, als wäre immer User 1 eingeloggt
  const devAdminHeaders = {
    'x-user-id': '1', // <- falls dein Backend einen anderen Header erwartet, hier anpassen
  };

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...devAdminHeaders,
        ...(options.headers ?? {}),
      },
      ...options,
    });
  } catch (error: any) {
    console.log('[apiClient] Network error for', url, error);

    throw new ApiError(
      `Netzwerkfehler beim Aufruf von ${url}: ${
        error?.message ?? String(error)
      }`,
    );
  }

  const contentType = response.headers.get('content-type') ?? '';
  let data: unknown;

  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    const text = await response.text();
    data = text ? { message: text } : null;
  }

  if (!response.ok) {
    const message =
      typeof data === 'object' &&
      data !== null &&
      'error' in data &&
      typeof (data as any).error === 'string'
        ? (data as any).error
        : typeof data === 'object' &&
          data !== null &&
          'message' in data &&
          typeof (data as any).message === 'string'
        ? (data as any).message
        : `API-Fehler (${response.status})`;

    console.log('[apiClient] HTTP error for', url, response.status, data);

    throw new ApiError(message, response.status);
  }

  console.log('[apiClient] response OK for', url);
  return data as T;
}

// =======================
// Format-Helper für API
// =======================

function normalizeEventsResponse(raw: unknown): ApiEvent[] {
  if (Array.isArray(raw)) {
    return raw as ApiEvent[];
  }

  if (raw && typeof raw === 'object' && Array.isArray((raw as any).events)) {
    return (raw as any).events as ApiEvent[];
  }

  console.error('Unerwartetes Events-Format:', raw);
  throw new ApiError('Unerwartetes API-Format für Events.');
}

function normalizeFormsResponse(raw: unknown): ApiForm[] {
  if (Array.isArray(raw)) {
    return raw as ApiForm[];
  }

  if (raw && typeof raw === 'object' && Array.isArray((raw as any).forms)) {
    return (raw as any).forms as ApiForm[];
  }

  console.error('Unerwartetes Forms-Format:', raw);
  throw new ApiError('Unerwartetes API-Format für Formulare.');
}

// =======================
// High-Level-API-Methoden
// =======================

export async function fetchEvents(): Promise<ApiEvent[]> {
  const raw = await request<unknown>(EVENTS_ENDPOINT);
  return normalizeEventsResponse(raw);
}

export async function fetchForms(): Promise<ApiForm[]> {
  const raw = await request<unknown>(FORMS_ENDPOINT);
  return normalizeFormsResponse(raw);
}
