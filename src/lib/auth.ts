import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is required but not set");
const secret = new TextEncoder().encode(process.env.JWT_SECRET);

// All in seconds (Next's cookie maxAge unit, and JWT claim unit).
export const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // sliding window, refreshed on visit
export const ABSOLUTE_MAX_AGE = 90 * 24 * 60 * 60; // hard cap since the ORIGINAL login
export const RENEW_AFTER = 24 * 60 * 60; // don't re-sign more than once a day

export interface JWTPayload {
  userId: string;
  username: string;
  role: string;
  groupId: string | null;
  teamId: string | null;
  tokenVersion: number;
  loginAt: number; // epoch secs of the ORIGINAL login — carried across renewals
  persist: boolean; // "이 기기에서 로그인 유지" choice — carried across renewals
  iat?: number; // set by setIssuedAt; drives the renewal throttle
}

// The one place cookie options exist. Every set/clear goes through these two
// helpers — login, signup, logout, /me renewal, password change, middleware.
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
} as const;

export function setAuthCookie(response: NextResponse, token: string, persist: boolean) {
  // No maxAge => session cookie, dies with the browser. That's the opt-out
  // (shared/borrowed device) path, and it must survive renewal.
  response.cookies.set(
    "token",
    token,
    persist ? { ...COOKIE_OPTIONS, maxAge: SESSION_MAX_AGE } : COOKIE_OPTIONS
  );
}

export function clearAuthCookie(response: NextResponse) {
  // path MUST match the path the cookie was set with, or the delete no-ops.
  response.cookies.set("token", "", { ...COOKIE_OPTIONS, maxAge: 0 });
}

export async function signToken(payload: JWTPayload): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now) // jose does not set iat on its own
    .setExpirationTime(now + SESSION_MAX_AGE)
    .sign(secret);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    const p = payload as unknown as JWTPayload;
    // Absolute 90-day cap, enforced here so every getSession() caller and the
    // Edge middleware get it for free with no DB read. Legacy pre-migration
    // tokens have no loginAt/iat — grandfathered in, they self-expire via the
    // original 7d exp instead.
    const loginAt = p.loginAt ?? p.iat ?? 0;
    if (loginAt && Math.floor(Date.now() / 1000) - loginAt > ABSOLUTE_MAX_AGE) return null;
    return p;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;
  return verifyToken(token);
}
