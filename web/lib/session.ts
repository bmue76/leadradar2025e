// lib/session.ts
import { JWTPayload, SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE_NAME = "leadradar_session";

function getSecretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not set");
  }
  return new TextEncoder().encode(secret);
}

export type SessionPayload = {
  userId: number;
  role: string;
};

/**
 * Erstellt ein signiertes Session-Token (JWT) für den gegebenen User.
 */
export async function createSessionToken(user: SessionPayload): Promise<string> {
  const secretKey = getSecretKey();

  const jwt = await new SignJWT({
    sub: user.userId.toString(),
    role: user.role,
  } satisfies JWTPayload)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime("7d") // Session gültig für 7 Tage
    .sign(secretKey);

  return jwt;
}

/**
 * Prüft und dekodiert ein Session-Token.
 * Gibt null zurück, wenn Token ungültig oder abgelaufen ist.
 */
export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const secretKey = getSecretKey();
    const { payload } = await jwtVerify(token, secretKey);

    const sub = payload.sub;
    const role = payload.role;

    if (!sub || typeof sub !== "string" || !role || typeof role !== "string") {
      return null;
    }

    const userId = Number.parseInt(sub, 10);
    if (Number.isNaN(userId)) {
      return null;
    }

    return { userId, role };
  } catch (error) {
    // Verifikation fehlgeschlagen (ungültig, abgelaufen, manipuliert, etc.)
    return null;
  }
}
