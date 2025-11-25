// app/api/admin/events/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const events = await prisma.event.findMany({
      orderBy: { startDate: 'desc' },
    });

    return NextResponse.json(
      {
        success: true,
        data: { events },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error fetching events', error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message ?? 'Could not fetch events',
      },
      { status: 500 }
    );
  }
}
