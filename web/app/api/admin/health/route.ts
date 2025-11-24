import { ok } from '@/lib/api/response';

export async function GET() {
  return ok({
    status: 'ok',
    service: 'leadradar2025e-web',
    scope: 'admin',
    timestamp: new Date().toISOString(),
  });
}
