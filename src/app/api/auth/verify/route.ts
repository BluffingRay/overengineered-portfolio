import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';

/**
 * Verifies a single admin password server-side, so the secret/hash never
 * ships to the browser. Supports:
 *  - a bcrypt hash (`ADMIN_PASSWORD` starting `$2…`) — production; compared
 *    with bcryptjs (slow, intended);
 *  - plaintext — allowed for local dev only (warns loudly in non-prod).
 *
 * On success returns an opaque session token; the client stores it under the
 * `portfolio-session` key. That token is NOT signed — a guardrail, not auth
 * (see AGENTS.md). The real protection is that the password lives server-side.
 */
export async function POST(request: Request) {
  let password: string | null = null;
  try {
    const body: unknown = await request.json();
    if (
      body &&
      typeof body === 'object' &&
      typeof (body as { password?: unknown }).password === 'string'
    ) {
      password = (body as { password: string }).password;
    }
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 });
  }

  const configured = process.env.ADMIN_PASSWORD;
  if (!configured || configured.trim() === '') {
    // Auth isn't set up — tell the client so it treats edit as open rather
    // than asking for a password that doesn't exist.
    return NextResponse.json({ ok: false, error: 'not_configured' }, { status: 400 });
  }
  if (!password) {
    return NextResponse.json({ ok: false, error: 'missing_password' }, { status: 400 });
  }

  let ok = false;
  try {
    if (configured.startsWith('$2')) {
      ok = await bcrypt.compare(password, configured);
    } else {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(
          '[auth] ADMIN_PASSWORD is plaintext — use a bcrypt hash for anything real.',
        );
      }
      ok = password === configured;
    }
  } catch {
    // Malformed hash etc. — treat as a failed attempt, never a crash.
    ok = false;
  }

  if (!ok) {
    return NextResponse.json({ ok: false, error: 'invalid' }, { status: 401 });
  }

  return NextResponse.json({ ok: true, token: randomUUID() });
}
