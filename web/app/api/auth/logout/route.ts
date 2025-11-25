// app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(_req: NextRequest) {
  const res = NextResponse.json({ success: true });

  // Session-Cookie löschen
  res.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });

  return res;
}
