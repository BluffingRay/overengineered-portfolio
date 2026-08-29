import { NextRequest, NextResponse } from "next/server";
import { hasKv, kvGet, portfolioKeyFor } from "@/lib/kv";
import { getUserIdFromSessionCookie, isAdminConfigured } from "@/lib/firebase/admin";
import { prepareDocument } from "@/lib/storage";
export const runtime = "nodejs";

// 5e-c dashboard hero-card meta. Hosted-only + authed (same gates as the
// slug route). The caller's own DOC is the source of truth (the index is a
// derived registry a failed index write can leave stale); no doc — missing,
// unreadable, or unparseable — answers with the exists:false defaults (the
// slug route's "no fallback" vocabulary; a KV outage reads as "no portfolio
// yet", never as a broken dashboard).
export async function GET(request: NextRequest) {
  if (!hasKv() || !isAdminConfigured()) {
    return NextResponse.json({ error: "not-hosted" }, { status: 503 });
  }
  const uid = await getUserIdFromSessionCookie(request as unknown as Request);
  if (!uid) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const raw = await kvGet(portfolioKeyFor(uid));
    const doc = raw ? prepareDocument(JSON.parse(raw)) : null;
    if (!doc) {
      return NextResponse.json({ exists: false, slug: null, visibility: "private", showcase: false });
    }
    return NextResponse.json({
      exists: true,
      slug: doc.slug ?? null,
      visibility: doc.visibility ?? "private",
      showcase: doc.showcase === true,
    });
  } catch {
    return NextResponse.json({ exists: false, slug: null, visibility: "private", showcase: false });
  }
}
