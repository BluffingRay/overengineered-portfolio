import { NextRequest, NextResponse } from "next/server";
import { hasKv, kvGet, portfolioKeyFor } from "@/lib/kv";
import { readIndex } from "@/lib/portfolioIndex";
import { isAdminConfigured } from "@/lib/firebase/admin";
import { getRequestUid } from "@/lib/api/guard";
import { prepareDocument } from "@/lib/storage";
import { RESERVED_SLUGS, SLUG_PATTERN } from "@/types/schema";
export const runtime = "nodejs";

// GET /api/portfolio/slug?slug=<value> — 5e-a availability check for the
// onboarding/dashboard slug claim (consumed by 5e-d). Hosted-only + authed.
// The caller's own DOC is the source of truth for re-claiming their current
// slug; the INDEX is authoritative for others' claims (a doc whose index
// write failed is invisible to the scan until the next save heals — accepted
// alongside the registry race window, see src/lib/portfolioIndex.ts).
export async function GET(request: NextRequest) {
  if (!hasKv() || !isAdminConfigured()) {
    return NextResponse.json({ error: "not-hosted" }, { status: 503 });
  }
  const uid = await getRequestUid(request);
  if (!uid) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const raw = new URL(request.url).searchParams.get("slug");
  // Absent or blank param = nothing to check (same "empty/whitespace = absent"
  // vocabulary as the PUT claim path).
  if (raw === null || raw.trim() === "") {
    return NextResponse.json({ error: "missing-slug" }, { status: 400 });
  }
  // Mirror normalizeSlug's first steps (trim -> lowercase) so the reason can
  // be distinguished: bad chars/length vs reserved route path.
  const slug = raw.trim().toLowerCase();
  if (!SLUG_PATTERN.test(slug)) {
    return NextResponse.json({ available: false, reason: "invalid" });
  }
  if ((RESERVED_SLUGS as readonly string[]).includes(slug)) {
    return NextResponse.json({ available: false, reason: "reserved" });
  }
  try {
    // Own current slug = the caller's own doc; unreadable -> null (no fallback).
    let ownSlug: string | null = null;
    try {
      const rawDoc = await kvGet(portfolioKeyFor(uid));
      const doc = rawDoc ? prepareDocument(JSON.parse(rawDoc)) : null;
      ownSlug = doc?.slug ?? null;
    } catch {
      ownSlug = null;
    }
    // Re-claiming your own current slug is always fine — short-circuit
    // before the index scan.
    if (slug === ownSlug) {
      return NextResponse.json({ available: true });
    }
    const index = await readIndex();
    const taken = Object.entries(index).some(
      ([otherUid, entry]) => otherUid !== uid && entry.slug === slug,
    );
    if (taken) {
      return NextResponse.json({ available: false, reason: "taken" });
    }
    return NextResponse.json({ available: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
