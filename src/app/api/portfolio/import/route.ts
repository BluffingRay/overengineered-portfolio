import { NextRequest, NextResponse } from "next/server";
import { hasKv, kvPut, portfolioKeyFor } from "@/lib/kv";
import { readIndex, updateIndexForDoc } from "@/lib/portfolioIndex";
import { getUserIdFromSessionCookie, isAdminConfigured } from "@/lib/firebase/admin";
import { prepareDocument } from "@/lib/storage";
import { sanitizePortfolioDocument } from "@/lib/sanitize-html";
export const runtime = "nodejs";

// POST /api/portfolio/import — 5f-a: the bridge's import half (the Product
// B -> A path: an exported JSON doc lands in the signed-in user's hosted
// account). The SAME 5-step template as PUT /api/portfolio (authenticate ->
// validate/sanitize -> persist -> registry -> return the confirmed doc),
// MINUS PUT's slug-claim logic: an import NEVER claims, conflicts (a 409
// mid-import is a dead-end UX), or inherits a slug — the settings panel
// owns slug claims afterwards (5e-f). This is the only 401 in the bridge:
// an auth gate on a mutation, exactly like PUT.
//
// IDENTITY OVERLAY (5f-a, review finding): import replaces the account's
// CONTENT, never its IDENTITY. The body's `slug` is stripped, then the
// caller's EXISTING registry values (slug / visibility / showcase) are
// written back over the file's when present — deriveIndexEntry+merge
// REPLACE the whole entry, so without this an import would silently clear
// the caller's live /u/<slug> link, and importing someone else's PUBLIC
// export would auto-publish their account (prepareDocument defaults a
// file with no explicit visibility to... the file's own values; absent =
// private, but a public EXPORT is explicit). A fresh account (no registry
// entry yet — the B->A migration birth) has nothing to preserve, so the
// file's declared values stand: a true B export carries none and lands
// private/not-shown.

export async function POST(request: NextRequest) {
  // Hosted-only — both halves of the hosted stack must be present (a B
  // deploy has no per-user KV and no sessions to authenticate against).
  if (!hasKv() || !isAdminConfigured()) {
    return NextResponse.json({ error: "not-hosted" }, { status: 503 });
  }
  const uid = await getUserIdFromSessionCookie(request as unknown as Request);
  if (!uid) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();

    // The body must be a JSON object — an array or primitive can never be
    // a PortfolioData document. (No new size cap beyond Next's body
    // limits — same as PUT.)
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid PortfolioData" }, { status: 400 });
    }

    // Identity overlay (see header). The registry read fails CLOSED (a KV
    // outage throws -> the catch 500s the import before any persist — the
    // same posture as PUT's own readIndex use for the 409 check).
    delete (body as Record<string, unknown>).slug;
    const existing = (await readIndex())[uid];
    if (existing) {
      if (existing.slug) (body as Record<string, unknown>).slug = existing.slug;
      if (existing.visibility) {
        (body as Record<string, unknown>).visibility = existing.visibility;
      }
      // Unconditional (review finding): a falsy showcase must ALSO win, or
      // an opted-out user importing a showcase-opted-in export silently
      // joins the gallery. prepareDocument re-derives: true stays, false
      // drops to the absent default.
      (body as Record<string, unknown>).showcase = existing.showcase === true;
    }

    const doc = prepareDocument(body);
    if (!doc) {
      return NextResponse.json({ error: "Invalid PortfolioData" }, { status: 400 });
    }
    // FIX-A: sanitize HTML (rich_text/custom_html/posts) + unsafe URLs
    // before persisting — the stored doc is the public render source.
    sanitizePortfolioDocument(doc);
    const key = portfolioKeyFor(uid);
    await kvPut(key, JSON.stringify(doc));
    // 5e-a: maintain the per-uid registry (read-modify-write). Never fails
    // the save — the next save heals the index; race window accepted
    // alongside last-save-wins (see src/lib/portfolioIndex.ts).
    const indexed = await updateIndexForDoc(uid, doc);
    if (!indexed) {
      console.warn("[portfolio] index update failed for", uid, "— next save heals");
    }
    return NextResponse.json(doc);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
