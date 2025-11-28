// mobile/src/services/apiClient.ts
import { Platform } from 'react-native';

const LOCALHOST = 'http://localhost:3000';
const ANDROID_EMULATOR = 'http://10.0.2.2:3000';

// iOS & Web: localhost
// Android-Emulator: 10.0.2.2
export const BASE_URL =
  Platform.OS === 'android' ? ANDROID_EMULATOR : LOCALHOST;

export async function apiGet(path: string) {
  const url = `${BASE_URL}${path}`;

  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `API-Error ${res.status} (${res.statusText}) – URL: ${url} – Response: ${text}`
    );
  }

  return res.json();
}
