import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function getAdminConfig() {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;
  if (!projectId || !clientEmail || !privateKeyRaw) return null;
  // .env stores \n as literal backslash+n; convert to real newlines.
  const privateKey = privateKeyRaw.replace(/\\n/g, "\n");
  return { projectId, clientEmail, privateKey };
}

function ensureAdmin() {
  if (getApps().length) return getApps()[0]!;
  const cfg = getAdminConfig();
  if (!cfg) throw new Error("Firebase Admin not configured (FIREBASE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY)");
  return initializeApp({
    credential: cert({
      projectId: cfg.projectId,
      clientEmail: cfg.clientEmail,
      privateKey: cfg.privateKey,
    }),
  });
}

export function getAdminAuth() {
  const app = ensureAdmin();
  return getAuth(app);
}

export function isAdminConfigured(): boolean {
  return getAdminConfig() !== null;
}

// Session cookie helpers — 5c: HttpOnly + Secure + SameSite=Lax, 5-day expiry.
// FIX-H: named `hosted-session` (was `portfolio-session`) — the B shell keeps
// that name for its localStorage session key; different stores, no collision.
const SESSION_COOKIE_NAME = "hosted-session";
const SESSION_MAX_AGE_MS = 5 * 24 * 60 * 60 * 1000;

export function getSessionCookieName(): string {
  return SESSION_COOKIE_NAME;
}

export function getSessionMaxAgeMs(): number {
  return SESSION_MAX_AGE_MS;
}

export async function createSessionCookie(idToken: string, expiresInMs: number = SESSION_MAX_AGE_MS) {
  const auth = getAdminAuth();
  return await auth.createSessionCookie(idToken, { expiresIn: expiresInMs });
}

export async function verifySessionCookie(sessionCookie: string) {
  const auth = getAdminAuth();
  return await auth.verifySessionCookie(sessionCookie, true);
}

export async function getUserIdFromSessionCookie(req: Request): Promise<string | null> {
  const cookie = parseSessionCookie(req);
  if (!cookie) return null;
  try {
    const decoded = await verifySessionCookie(cookie);
    return decoded.uid;
  } catch {
    return null;
  }
}

export function serializeSessionCookie(sessionCookie: string, maxAgeMs: number = SESSION_MAX_AGE_MS): string {
  const maxAge = Math.floor(maxAgeMs / 1000);
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(sessionCookie)}; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=${maxAge}`;
}

export function serializeClearSessionCookie(): string {
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

function getCookie(req: Request, name: string): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;
  const parts = header.split(";").map((s) => s.trim());
  for (const part of parts) {
    if (part.startsWith(name + "=")) {
      return decodeURIComponent(part.slice(name.length + 1));
    }
  }
  return null;
}

export function parseSessionCookie(req: Request): string | null {
  return getCookie(req, SESSION_COOKIE_NAME);
}
