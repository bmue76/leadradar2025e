// src/api/apiClient.ts

const ENV_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

const RAW_BASE_URL = ENV_BASE_URL && ENV_BASE_URL.length > 0
  ? ENV_BASE_URL
  : 'http://localhost:3000';

const BASE_URL = RAW_BASE_URL.replace(/\/$/, '');

console.log('[apiClient] ENV_BASE_URL =', ENV_BASE_URL);
console.log('[apiClient] BASE_URL =', BASE_URL);

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const method = options.method ?? 'GET';

  console.log('[apiClient] request', method, url);

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });

  const text = await res.text();
  let data: any = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // Wenn keine valide JSON-Antwort zurückkommt, Text roh behalten
    data = text;
  }

  if (!res.ok) {
    console.log(
      '[apiClient] response ERROR',
      res.status,
      url,
      'body:',
      text,
    );
    const msg =
      (data && data.error) ||
      (typeof data === 'string' ? data : null) ||
      `Request fehlgeschlagen (Status ${res.status})`;
    throw new Error(msg);
  }

  console.log('[apiClient] response OK for', url);
  return data as T;
}

export const apiClient = {
  request,

  get<T>(path: string, init?: RequestInit) {
    return request<T>(path, {
      ...(init ?? {}),
      method: 'GET',
    });
  },

  post<T, B = any>(path: string, body?: B, init?: RequestInit) {
    return request<T>(path, {
      ...(init ?? {}),
      method: 'POST',
      body: body != null ? JSON.stringify(body) : undefined,
    });
  },

  put<T, B = any>(path: string, body?: B, init?: RequestInit) {
    return request<T>(path, {
      ...(init ?? {}),
      method: 'PUT',
      body: body != null ? JSON.stringify(body) : undefined,
    });
  },

  delete<T>(path: string, init?: RequestInit) {
    return request<T>(path, {
      ...(init ?? {}),
      method: 'DELETE',
    });
  },
};
