// web/app/api/admin/form-templates/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type FormStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

type TemplateItem = {
  id: number;
  name: string;
  description: string | null;
  status: FormStatus;
  isTemplate: boolean;
  displayTitle: string | null;
  displaySubtitle: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
};

/**
 * GET /api/admin/form-templates
 * Liefert alle Formular-Vorlagen (Form.isTemplate = true).
 */
export async function GET(_req: NextRequest) {
  try {
    const templates = await prisma.form.findMany({
      where: {
        isTemplate: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const mapped: TemplateItem[] = templates.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      status: t.status as FormStatus,
      isTemplate: t.isTemplate,
      displayTitle: t.displayTitle,
      displaySubtitle: t.displaySubtitle,
      logoUrl: t.logoUrl,
      primaryColor: t.primaryColor,
      accentColor: t.accentColor,
    }));

    return NextResponse.json({ templates: mapped });
  } catch (error) {
    console.error('Fehler beim Laden der Form-Templates', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden der Formular-Vorlagen' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/form-templates
 * Legt eine neue Formular-Vorlage an (ohne Felder).
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Ungültiger JSON-Body' },
      { status: 400 },
    );
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json(
      { error: 'Body muss ein Objekt sein' },
      { status: 400 },
    );
  }

  const payload = body as {
    name?: string;
    description?: string | null;
    displayTitle?: string | null;
    displaySubtitle?: string | null;
    logoUrl?: string | null;
    primaryColor?: string | null;
    accentColor?: string | null;
  };

  const name = (payload.name ?? '').trim();
  if (!name) {
    return NextResponse.json(
      { error: 'Name ist erforderlich' },
      { status: 400 },
    );
  }

  try {
    const created = await prisma.form.create({
      data: {
        name,
        description:
          typeof payload.description === 'string'
            ? payload.description.trim()
            : null,
        status: 'DRAFT',
        isDefault: false,
        isTemplate: true,
        eventId: null, // Vorlagen gehören zu keinem Event
        displayTitle:
          typeof payload.displayTitle === 'string'
            ? payload.displayTitle.trim()
            : null,
        displaySubtitle:
          typeof payload.displaySubtitle === 'string'
            ? payload.displaySubtitle.trim()
            : null,
        logoUrl:
          typeof payload.logoUrl === 'string'
            ? payload.logoUrl.trim()
            : null,
        primaryColor:
          typeof payload.primaryColor === 'string'
            ? payload.primaryColor.trim()
            : null,
        accentColor:
          typeof payload.accentColor === 'string'
            ? payload.accentColor.trim()
            : null,
      },
    });

    const template: TemplateItem = {
      id: created.id,
      name: created.name,
      description: created.description,
      status: created.status as FormStatus,
      isTemplate: created.isTemplate,
      displayTitle: created.displayTitle,
      displaySubtitle: created.displaySubtitle,
      logoUrl: created.logoUrl,
      primaryColor: created.primaryColor,
      accentColor: created.accentColor,
    };

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error('Fehler beim Anlegen einer Formular-Vorlage', error);
    return NextResponse.json(
      { error: 'Fehler beim Anlegen der Formular-Vorlage' },
      { status: 500 },
    );
  }
}
