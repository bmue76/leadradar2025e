// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import type { User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
} from "@/lib/session";

export const runtime = "nodejs";

type LoginRequestBody = {
  email?: string;
  password?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as LoginRequestBody;
    const email = body.email?.trim().toLowerCase();
    const password = body.password;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const invalidResponse = NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 }
    );

    const user = (await prisma.user.findUnique({
      where: { email },
    })) as (User & { passwordHash: string | null; isActive: boolean }) | null;

    if (!user || !user.passwordHash || user.isActive === false) {
      return invalidResponse;
    }

    const isPasswordValid = await verifyPassword(password, user.passwordHash);

    if (!isPasswordValid) {
      return invalidResponse;
    }

    // ✅ lastLoginAt aktualisieren
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
      },
    });

    // Session-Token erstellen
    const token = await createSessionToken({
      userId: user.id,
      role: user.role,
    });

    const response = NextResponse.json({ success: true });

    // HTTP-only Cookie setzen
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 Tage
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
