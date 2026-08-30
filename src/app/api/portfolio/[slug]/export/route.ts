import { NextRequest, NextResponse } from "next/server";
import { hasKv } from "@/lib/kv";
import { getUserIdFromSessionCookie } from "@/lib/firebase/admin";
import { resolveHostedDoc, stripDrafts } from "@/lib/loadHostedDoc";
import type { PortfolioData } from "@/types/schema";
export const runtime = "nodejs";

// GET /api/portfolio/[slug]/export — 5f-a: the bridge's export half
// (A -> B migration, or a public visitor grabbing the live JSON). Slug-keyed
// (the /u/ page's loader), never caller-cookie-keyed — the legacy
// GET /api/portfolio?public=1 flag stays as documented but is broken by
// design for export (FIX-A known gap); this route replaces it.
//
// LEAK RULE: this URL is a public surface — EVERY denial below is the same
// 404 (never 401/403), so a stranger cannot distinguish "private doc" from
// "nonexistent slug" (the exact rule the /u/ page renders by). Modes:
//   ?full=1          -> owner-only WHOLE sanitized doc (drafts included —
//                       the owner's A->B migration path)
//   no flag/?public=1 -> public shape (drafts stripped); `full` wins when
//                       both flags are present

// 5f-a — the filename embeds the slug only when it is already in the
// registry slug charset ([a-z0-9-]); legacy uid slugs (case-sensitive
// Firebase ids, arbitrary charset) fall back to a neutral name. The kept
// charset admits no quotes/semicolons/newlines, so the header cannot be
// injected through the param.
function exportFilename(slug: string): string {
  return /^[a-z0-9-]+$/.test(slug) ? `${slug}-portfolio.json` : "portfolio.json";
}

// One 404 shape for every denial — same status, same body, no distinction.
function notFoundResponse() {
  return NextResponse.json({ error: "not-found" }, { status: 404 });
}

// NextResponse.json sets Content-Type: application/json; the attachment
// disposition is what turns the fetch into a download.
function exportResponse(doc: PortfolioData, slug: string) {
  return NextResponse.json(doc, {
    headers: {
      "Content-Disposition": `attachment; filename="${exportFilename(slug)}"`,
    },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  // Hosted-only — an export URL is a public surface and a B deploy has no
  // hosted docs: 404 (never the seed fallback the legacy GET route uses).
  if (!hasKv()) return notFoundResponse();
  const { slug } = await params;
  const wantFull = new URL(request.url).searchParams.get("full") === "1";
  try {
    // Same loader as the /u/ page: registry-first resolution, sanitized
    // RETURN only, never seeds. A miss is a 404 — no existence leak.
    const loaded = await resolveHostedDoc(slug);
    if (!loaded) return notFoundResponse();
    if (wantFull) {
      // Owner-only: the doc's owner is the uid the registry resolved (the
      // 5e-h gate's identity). No session or not the owner -> 404, NOT
      // 401/403 — a stranger can't distinguish "private doc" from "wrong
      // owner". getUserIdFromSessionCookie fails closed.
      const uid = await getUserIdFromSessionCookie(request as unknown as Request);
      if (!uid || uid !== loaded.ownerUid) return notFoundResponse();
      return exportResponse(loaded.doc, slug);
    }
    // Public shape — identical rule to the /u/ render: absence of
    // 'public' is private (5e-a default). Sanitization already ran in
    // the loader; strip drafts before the JSON leaves the server.
    if (loaded.doc.visibility !== "public") return notFoundResponse();
    return exportResponse(stripDrafts(loaded.doc), slug);
  } catch (e) {
    // KV failures are 500s (same as the /u/ page) — never a 404, which
    // would read as "no such portfolio".
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
