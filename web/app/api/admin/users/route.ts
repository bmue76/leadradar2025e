// web/app/api/admin/users/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isValidUserRole, type UserRole } from "@/lib/roles";
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

// GET: Liste aller Benutzer
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("[GET /api/admin/users] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST: Neuen Benutzer anlegen
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const rawEmail = typeof body.email === "string" ? body.email.trim() : "";
    const email = rawEmail.toLowerCase();
    const name =
      typeof body.name === "string" && body.name.trim().length > 0
        ? body.name.trim()
        : null;
    const rawRole =
      typeof body.role === "string" ? (body.role.trim() as UserRole) : "editor";
    const role: UserRole = isValidUserRole(rawRole) ? rawRole : "editor";
    const isActive =
      typeof body.isActive === "boolean" ? body.isActive : true;
    const password =
      typeof body.password === "string" ? body.password.trim() : "";

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email und Passwort sind erforderlich." },
        { status: 400 }
      );
    }

    if (!email.includes("@")) {
      return NextResponse.json(
        { error: "Ungültige E-Mail-Adresse." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Das Passwort muss mindestens 8 Zeichen lang sein." },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Ein Benutzer mit dieser E-Mail existiert bereits." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        email,
        name,
        role,
        isActive,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/admin/users] Error:", error);
    return NextResponse.json(
      {
        error:
          error?.message ??
          "Internal Server Error beim Anlegen des Benutzers.",
      },
      { status: 500 }
    );
  }
}

// PATCH: Benutzer aktualisieren (Name, Rolle, isActive, Passwort)
export async function PATCH(req: Request) {
  try {
    const body = await req.json();

    const rawId = body.id;
    const id =
      typeof rawId === "number"
        ? rawId
        : typeof rawId === "string"
        ? Number(rawId)
        : NaN;

    if (!Number.isInteger(id)) {
      return NextResponse.json(
        { error: "Ungültige Benutzer-ID." },
        { status: 400 }
      );
    }

    const data: {
      name?: string | null;
      role?: UserRole;
      isActive?: boolean;
      passwordHash?: string;
    } = {};

    if (typeof body.name === "string") {
      const trimmed = body.name.trim();
      data.name = trimmed.length > 0 ? trimmed : null;
    }

    if (typeof body.role === "string") {
      const rawRole = body.role.trim() as UserRole;
      if (isValidUserRole(rawRole)) {
        data.role = rawRole;
      }
    }

    if (typeof body.isActive === "boolean") {
      data.isActive = body.isActive;
    }

    const rawPassword =
      typeof body.password === "string" ? body.password.trim() : "";
    if (rawPassword.length > 0) {
      if (rawPassword.length < 8) {
        return NextResponse.json(
          {
            error:
              "Das neue Passwort muss mindestens 8 Zeichen lang sein.",
          },
          { status: 400 }
        );
      }
      const passwordHash = await bcrypt.hash(rawPassword, SALT_ROUNDS);
      data.passwordHash = passwordHash;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "Keine gültigen Felder für das Update übergeben." },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Benutzer wurde nicht gefunden." },
        { status: 404 }
      );
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ user }, { status: 200 });
  } catch (error: any) {
    console.error("[PATCH /api/admin/users] Error:", error);
    return NextResponse.json(
      {
        error:
          error?.message ??
          "Internal Server Error beim Aktualisieren des Benutzers.",
      },
      { status: 500 }
    );
  }
}
