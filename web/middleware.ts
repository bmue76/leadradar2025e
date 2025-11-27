// middleware.ts
import { NextRequest, NextResponse } from "next/server";
import {
  verifySessionToken,
  SESSION_COOKIE_NAME,
} from "@/lib/session";

/**
 * Diese Middleware läuft für alle /admin und /api/admin Routen
 * (siehe config.matcher unten).
 *
 * Sie prüft, ob ein gültiges Session-Cookie existiert.
 * - Web-Routen (/admin/...) -> Redirect auf /login wenn nicht eingeloggt
 * - API-Routen (/api/admin/...) -> 401 JSON
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;

  // Wenn kein Token -> redirect / 401
  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const session = await verifySessionToken(token);

  if (!session) {
    // Ungültiger/abgelaufener Token -> Cookie löschen + redirect/401
    if (pathname.startsWith("/api/")) {
      const res = NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
      res.cookies.set(SESSION_COOKIE_NAME, "", {
        httpOnly: true,
        path: "/",
        maxAge: 0,
      });
      return res;
    }

    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", pathname);

    const res = NextResponse.redirect(loginUrl);
    res.cookies.set(SESSION_COOKIE_NAME, "", {
      httpOnly: true,
      path: "/",
      maxAge: 0,
    });
    return res;
  }

  // Hier könnten wir später noch Infos weitergeben (z.B. Header)
  return NextResponse.next();
}

// Diese Middleware greift nur für /admin und /api/admin
export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
