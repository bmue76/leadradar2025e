// DEV-SETUP: /api/admin vorläufig ohne Auth, damit Mobile-App (Teilprojekt 5.2)
// Events & Forms laden kann. Echte Auth wird in einem späteren Teilprojekt ergänzt.


// web/middleware.ts
import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ✅ Teilprojekt 5.2: Admin-API für Mobile-App ohne Auth zulassen
  //    Gilt für alle Routen unter /api/admin/*
  if (pathname.startsWith('/api/admin')) {
    return NextResponse.next();
  }

  // ⚠️ Hier könntest du später deine echte Auth für /admin-Seiten einbauen.
  //    Für jetzt machen wir gar nichts weiter.
  return NextResponse.next();
}

// Optional: Nur auf bestimmten Pfaden ausführen (sonst überall)
export const config = {
  matcher: ['/api/:path*', '/admin/:path*'],
};
