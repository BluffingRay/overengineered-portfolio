import { NextRequest, NextResponse } from "next/server";
import {
  createSessionCookie,
  getAdminAuth,
  getSessionMaxAgeMs,
  isAdminConfigured,
  parseSessionCookie,
  serializeClearSessionCookie,
  serializeSessionCookie,
  verifySessionCookie,
} from "@/lib/firebase/admin";
export const runtime = "nodejs";

// GET /api/auth/session — returns session status (for useAuth)
export async function GET(req: NextRequest) {
  if (!isAdminConfigured()) {
    return NextResponse.json({ authenticated: false, reason: "admin_not_configured" });
  }
  const cookie = parseSessionCookie(req as unknown as Request);
  if (!cookie) return NextResponse.json({ authenticated: false });
  try {
    const decoded = await verifySessionCookie(cookie);
    const email = typeof decoded.email === "string" ? decoded.email : null;
    return NextResponse.json({ authenticated: true, uid: decoded.uid, email });
  } catch {
    return NextResponse.json({ authenticated: false });
  }
}

// POST /api/auth/session — mint HttpOnly session cookie from Firebase idToken
// Body: { idToken: string }
export async function POST(req: NextRequest) {
  if (!isAdminConfigured()) {
    return NextResponse.json({ error: "admin_not_configured" }, { status: 503 });
  }
  let idToken: string | null = null;
  try {
    const body: unknown = await req.json();
    if (body && typeof body === "object" && "idToken" in body) {
      const candidate = (body as { idToken: unknown }).idToken;
      if (typeof candidate === "string") idToken = candidate;
    }
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (!idToken) return NextResponse.json({ error: "missing_idToken" }, { status: 400 });
  try {
    const expiresIn = getSessionMaxAgeMs();
    const sessionCookie = await createSessionCookie(idToken, expiresIn);
    const cookieStr = serializeSessionCookie(sessionCookie, expiresIn);
    const res = NextResponse.json({ ok: true });
    res.headers.set("Set-Cookie", cookieStr);
    return res;
  } catch (e) {
    const message = e instanceof Error ? e.message : "invalid_token";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

// DELETE /api/auth/session — logout (server-clears cookie)
export async function DELETE(req: NextRequest) {
  const cookie = parseSessionCookie(req as unknown as Request);
  if (cookie && isAdminConfigured()) {
    try {
      const decoded = await verifySessionCookie(cookie);
      await getAdminAuth().revokeRefreshTokens(decoded.uid);
    } catch {
      // Ignore revoke failures
    }
  }
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", serializeClearSessionCookie());
  return res;
}
