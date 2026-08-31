import { NextRequest, NextResponse } from 'next/server';
import { hasKv } from '@/lib/kv';
import { isAdminConfigured, verifySessionCookie } from '@/lib/firebase/admin';
import { isHosted } from '@/lib/hosted/isHosted';
import { normalizeSlug } from '@/types/schema';
import { readIndex } from '@/lib/portfolioIndex';

/**
 * Centralized hosted/API guard — the single place that knows the
 * hosted check (hasKv + isAdminConfigured + LOCAL override) and how to
 * pull the uid from a NextRequest without the `as unknown as Request` cast
 * that was copy-pasted 8 times.
 */

export function hasHosted(): boolean {
  return isHosted();
}

export function requireHostedResponse(): NextResponse | null {
  if (!hasHosted()) {
    // Keep 503 shape that existing callers expect (portfolio PUT/DELETE etc.)
    return NextResponse.json({ error: 'not-hosted' }, { status: 503 });
  }
  return null;
}

export function hasKvOnly(): boolean {
  return hasKv();
}

export function isAuthenticatedOnly(): boolean {
  return isAdminConfigured();
}

/**
 * Extract the hosted session uid from a NextRequest/Request.
 * Uses the NextRequest cookie jar when present (req.cookies), falling
 * back to raw header parsing via verifySessionCookie path.
 * Never throws — returns null on missing/invalid session.
 */
export async function getRequestUid(req: Request | NextRequest): Promise<string | null> {
  try {
    // NextRequest cookies API (preferred)
    const fromJar = (req as unknown as { cookies?: { get?: (name: string) => { value: string } | undefined } }).cookies?.get?.('hosted-session')?.value;
    if (fromJar) {
      try {
        const decoded = await verifySessionCookie(fromJar);
        return decoded.uid;
      } catch {
        return null;
      }
    }
    // Fallback: raw header parsing via the same verify path
    const header = req.headers.get('cookie');
    if (!header) return null;
    const parts = header.split(';').map((s) => s.trim());
    for (const part of parts) {
      if (part.startsWith('hosted-session=')) {
        const raw = decodeURIComponent(part.slice('hosted-session='.length));
        if (!raw) return null;
        try {
          const decoded = await verifySessionCookie(raw);
          return decoded.uid;
        } catch {
          return null;
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Require a valid session — returns the uid or a 401 response.
 * Convenience for routes that are owner-only.
 */
export async function requireAuth(req: Request | NextRequest): Promise<{ uid: string | null; response: NextResponse | null }> {
  const uid = await getRequestUid(req);
  if (!uid) {
    return { uid: null, response: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) };
  }
  return { uid, response: null };
}

export function slugValidationError(): NextResponse {
  return NextResponse.json({ error: 'invalid-slug' }, { status: 400 });
}

export function slugTakenError(): NextResponse {
  return NextResponse.json({ error: 'slug-taken' }, { status: 409 });
}

/**
 * Validate a slug claim and check uniqueness against the registry.
 * Returns the canonical slug or an error response.
 */
export async function assertSlugAvailable(
  rawSlug: unknown,
  uid: string | null,
): Promise<{ slug: string | null; error: NextResponse | null }> {
  if (typeof rawSlug === 'string') {
    if (rawSlug.trim() === '') return { slug: null, error: null };
    const claim = normalizeSlug(rawSlug);
    if (!claim) return { slug: null, error: slugValidationError() };
    if (uid) {
      const index = await readIndex();
      const taken = Object.entries(index).some(([otherUid, entry]) => otherUid !== uid && entry.slug === claim);
      if (taken) return { slug: null, error: slugTakenError() };
    }
    return { slug: claim, error: null };
  } else if (rawSlug) {
    return { slug: null, error: slugValidationError() };
  }
  return { slug: null, error: null };
}

export function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}
