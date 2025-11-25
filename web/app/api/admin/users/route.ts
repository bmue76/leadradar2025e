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

    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Ein Benutzer mit dieser E-Mail existiert bereits." },
        { status: 409 }
      );
    }

    // Passwort hashen (wie beim Login: bcryptjs)
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
