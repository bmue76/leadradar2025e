// app/api/admin/users/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      orderBy: { id: 'asc' },
    });

    return NextResponse.json(
      {
        success: true,
        data: { users },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error fetching users', error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message ?? 'Could not fetch users',
      },
      { status: 500 }
    );
  }
}
