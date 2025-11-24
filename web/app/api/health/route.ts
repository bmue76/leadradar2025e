import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'leadradar2025e-web',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
  });
}
