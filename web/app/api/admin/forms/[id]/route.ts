// web/app/api/admin/forms/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function parseFormIdFromUrl(request: NextRequest): number | null {
  const url = new URL(request.url);
  const match = url.pathname.match(/\/api\/admin\/forms\/(\d+)/);
  if (!match) return null;
  const id = Number(match[1]);
  if (!Number.isFinite(id) || id <= 0) return null;
  return id;
}

// GET /api/admin/forms/:id
export async function GET(request: NextRequest) {
  const formId = parseFormIdFromUrl(request);
  if (!formId) {
    return NextResponse.json({ error: 'Invalid form id' }, { status: 400 });
  }

  try {
    const form = await prisma.form.findUnique({
      where: { id: formId },
    });

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    return NextResponse.json(form, { status: 200 });
  } catch (err) {
    console.error('Error in GET /api/admin/forms/[id]:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// PATCH /api/admin/forms/:id
export async function PATCH(request: NextRequest) {
  const formId = parseFormIdFromUrl(request);
  if (!formId) {
    return NextResponse.json({ error: 'Invalid form id' }, { status: 400 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { name, description, status, isDefault } = body ?? {};

  if (typeof name !== 'string' || !name.trim()) {
    return NextResponse.json(
      { error: 'Name is required and must be a non-empty string' },
      { status: 400 },
    );
  }

  if (status && !['DRAFT', 'ACTIVE', 'ARCHIVED'].includes(status)) {
    return NextResponse.json(
      { error: 'Invalid status value' },
      { status: 400 },
    );
  }

  if (isDefault != null && typeof isDefault !== 'boolean') {
    return NextResponse.json(
      { error: 'isDefault must be a boolean if provided' },
      { status: 400 },
    );
  }

  try {
    // Erst Formular holen, um eventId zu kennen
    const existing = await prisma.form.findUnique({
      where: { id: formId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    const dataToUpdate: any = {
      name: name.trim(),
      description: description ?? null,
      status: status ?? existing.status,
      isDefault: isDefault ?? existing.isDefault,
    };

    const updated = await prisma.$transaction(async (tx) => {
      // Falls dieses Formular als Standard markiert wird:
      if (isDefault === true && existing.eventId != null) {
        // alle anderen Formulare des Events auf false
        await tx.form.updateMany({
          where: {
            eventId: existing.eventId,
            NOT: { id: formId },
          },
          data: { isDefault: false },
        });
      }

      return tx.form.update({
        where: { id: formId },
        data: dataToUpdate,
      });
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (err) {
    console.error('Error in PATCH /api/admin/forms/[id]:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// DELETE /api/admin/forms/:id
export async function DELETE(request: NextRequest) {
  const formId = parseFormIdFromUrl(request);
  if (!formId) {
    return NextResponse.json({ error: 'Invalid form id' }, { status: 400 });
  }

  try {
    // Optional: hier könnte man prüfen, ob noch Leads existieren und ggf. ein 409 zurückgeben.
    await prisma.form.delete({
      where: { id: formId },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    console.error('Error in DELETE /api/admin/forms/[id]:', err);

    // Wenn Prisma z.B. wegen FK-Constraint scheitert, geben wir 409 aus
    if (err?.code === 'P2003') {
      return NextResponse.json(
        { error: 'Form cannot be deleted because related records exist' },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
