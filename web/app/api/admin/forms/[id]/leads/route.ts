// web/app/api/admin/forms/[id]/leads/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function parseFormIdFromUrl(request: NextRequest): number | null {
  const url = new URL(request.url);
  const match = url.pathname.match(/\/api\/admin\/forms\/(\d+)\/leads/);
  if (!match) return null;
  const id = Number(match[1]);
  if (!Number.isFinite(id) || id <= 0) return null;
  return id;
}

// GET /api/admin/forms/:id/leads
export async function GET(request: NextRequest) {
  const formId = parseFormIdFromUrl(request);
  if (!formId) {
    return NextResponse.json({ error: 'Invalid form id' }, { status: 400 });
  }

  try {
    // Formular holen (für Name, eventId, etc.)
    const form = await prisma.form.findUnique({
      where: { id: formId },
      select: {
        id: true,
        name: true,
        eventId: true,
      },
    });

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    // Felder dieses Formulars
    const fields = await prisma.formField.findMany({
      where: { formId },
      select: {
        id: true,
        key: true,
        label: true,
        order: true,
      },
      orderBy: {
        order: 'asc',
      },
    });

    // Leads für dieses Formular
    const leads = await prisma.lead.findMany({
      where: { formId },
      select: {
        id: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (leads.length === 0) {
      return NextResponse.json(
        {
          form,
          fields,
          leads: [],
        },
        { status: 200 },
      );
    }

    const leadIds = leads.map((l) => l.id);

    // Roh-Werte aus LeadFieldValue
    const values = await prisma.leadFieldValue.findMany({
      where: {
        leadId: { in: leadIds },
      },
      select: {
        id: true,
        leadId: true,
        fieldId: true,
        value: true,
      },
    });

    const fieldById = new Map(
      fields.map((f) => [f.id, { id: f.id, key: f.key, label: f.label }]),
    );

    // Leads so aufbereiten, dass pro Lead ein values-Objekt nach fieldKey entsteht
    const normalizedLeads = leads.map((lead) => {
      const valuesForLead = values.filter((v) => v.leadId === lead.id);
      const valueMap: Record<string, string> = {};

      for (const v of valuesForLead) {
        const field = fieldById.get(v.fieldId);
        if (!field) continue;
        valueMap[field.key] = v.value;
      }

      return {
        id: lead.id,
        createdAt: lead.createdAt.toISOString(),
        values: valueMap,
      };
    });

    return NextResponse.json(
      {
        form,
        fields,
        leads: normalizedLeads,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error('Error in GET /api/admin/forms/[id]/leads:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
