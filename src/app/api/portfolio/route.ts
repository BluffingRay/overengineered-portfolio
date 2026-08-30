import { NextRequest, NextResponse } from "next/server";
import { initialData } from "@/data/initialData";
import { prepareDocument } from "@/lib/storage";
import { kvDelete, kvGet, kvPut, HOSTED_PORTFOLIO_KEY, hasKv, portfolioKeyFor } from "@/lib/kv";
import { readIndex, removeFromIndex, updateIndexForDoc } from "@/lib/portfolioIndex";
import { assetPrefixForUid, purgeAssetPrefix } from "@/lib/r2Assets";
import { getUserIdFromSessionCookie, isAdminConfigured } from "@/lib/firebase/admin";
import { sanitizePortfolioDocument } from "@/lib/sanitize-html";
import { stripDrafts } from "@/lib/loadHostedDoc";
import { normalizeSlug } from "@/types/schema";
export const runtime = "nodejs";

// GET /api/portfolio — hosted JSON (KV) with local fallback for Product B.
// 5c: per-user when Firebase session present, else Hosted default. Query:
//   ?public=1  -> sanitized public JSON (drafts filtered), unauthed allowed
//   ?full=1    -> full JSON (includes drafts), requires valid session
export async function GET(request: NextRequest) {
  if (!hasKv()) {
    return NextResponse.json(initialData);
  }
  const url = new URL(request.url);
  const wantPublic = url.searchParams.get("public") === "1";
  const wantFull = url.searchParams.get("full") === "1";

  // When Firebase admin configured, enforce access model
  let uid: string | null = null;
  if (isAdminConfigured()) {
    uid = await getUserIdFromSessionCookie(request as unknown as Request);
    if (wantFull && !uid) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    // Public can be unauthed; full requires uid. For plain GET without flag,
    // if authed return full for owner, else public filtered for visitors.
  }

  try {
    const key = portfolioKeyFor(uid);
    const raw = await kvGet(key);
    // Fallback to legacy single-tenant key for migration
    let docRaw = raw;
    if (!docRaw && uid) {
      const legacy = await kvGet(HOSTED_PORTFOLIO_KEY);
      if (legacy) docRaw = legacy;
    }
    if (!docRaw) return NextResponse.json(initialData);
    const parsed = JSON.parse(docRaw);
    const doc = prepareDocument(parsed);
    if (!doc) return NextResponse.json(initialData);
    // FIX-A: KV may hold pre-sanitization docs (or direct API writes) —
    // clean at read time too, so every response is render-safe.
    sanitizePortfolioDocument(doc);
    if (wantPublic || (!wantFull && !uid && isAdminConfigured())) {
      // 5f-a — filterPublicDoc moved to the shared stripDrafts (src/lib/
      // loadHostedDoc.ts): same published-only filter, plus the /u/
      // page's publishedAt desc sort (the canonical public shape).
      return NextResponse.json(stripDrafts(doc));
    }
    return NextResponse.json(doc);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// PUT /api/portfolio — persist hosted JSON. 5c: server is authority.
// authenticate -> authorize (owner) -> validate/prepareDocument -> sanitize -> persist -> return confirmed.
export async function PUT(request: NextRequest) {
  if (!hasKv()) {
    return NextResponse.json({ error: "KV not configured" }, { status: 503 });
  }
  let uid: string | null = null;
  if (isAdminConfigured()) {
    uid = await getUserIdFromSessionCookie(request as unknown as Request);
    if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();

    // 5e-a: slug claim. "Present" = non-empty string — undefined/null/empty/
    // whitespace-only is absent (no claim, no 400: clearing the slug is never
    // rejected). Present but invalid rejects loudly (server is authority —
    // the doc sanitizer silently drops, the API 400s); a non-string truthy
    // value is also a rejected claim (it can never normalize).
    let claim: string | null = null;
    if (typeof body?.slug === "string") {
      if (body.slug.trim() !== "") {
        claim = normalizeSlug(body.slug);
        if (!claim) {
          return NextResponse.json({ error: "invalid-slug" }, { status: 400 });
        }
      }
    } else if (body?.slug) {
      return NextResponse.json({ error: "invalid-slug" }, { status: 400 });
    }

    // 5e-a: slug uniqueness — 409 against the registry BEFORE persist.
    // Null uid = legacy no-admin path: no identity, no registry interaction.
    if (claim && uid) {
      const index = await readIndex();
      const taken = Object.entries(index).some(
        ([otherUid, entry]) => otherUid !== uid && entry.slug === claim,
      );
      if (taken) {
        return NextResponse.json({ error: "slug-taken" }, { status: 409 });
      }
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
    // the save — the next save heals the index; race window accepted alongside
    // last-save-wins (see src/lib/portfolioIndex.ts).
    if (uid) {
      const indexed = await updateIndexForDoc(uid, doc);
      if (!indexed) {
        console.warn("[portfolio] index update failed for", uid, "— next save heals");
      }
    }
    return NextResponse.json(doc);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// DELETE /api/portfolio — 5e-i: delete the caller's OWN hosted portfolio
// (real data deletion: assets -> doc -> registry). Same template as the
// meta route: hosted-only, session-cookie identity only, nothing to
// validate — no client input reaches key selection (the uid comes from
// the verified cookie, never the body), so cross-user deletion is
// impossible by construction.
// Layers are independent and run in order: a failed asset purge must NOT
// abort the doc/registry deletion (the doc + public page are the
// privacy-critical parts) — every layer's outcome is reported instead.
export async function DELETE(request: NextRequest) {
  if (!hasKv() || !isAdminConfigured()) {
    return NextResponse.json({ error: "not-hosted" }, { status: 503 });
  }
  const uid = await getUserIdFromSessionCookie(request as unknown as Request);
  if (!uid) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const warnings: string[] = [];
  // (a) Assets — same prefix derivation as /api/upload (shared helpers);
  // best-effort: failures arrive as a warning, never a throw.
  const purge = await purgeAssetPrefix(`uploads/${assetPrefixForUid(uid)}/`);
  if (purge.warning) warnings.push(purge.warning);
  // (b) Doc — the privacy-critical layer. A real failure here must NOT
  // read as success (the client would wipe local state while the doc —
  // and its public page — live on), so this is the only layer that fails
  // the request; the registry still runs (layers are independent).
  let deleted = true;
  try {
    await kvDelete(portfolioKeyFor(uid));
  } catch (e) {
    deleted = false;
    warnings.push(`The portfolio document could not be deleted (${(e as Error).message}).`);
  }
  // (c) Registry — never fails the request (same contract as the save
  // path): a stale entry just 404s its link until a later write heals it.
  const removed = await removeFromIndex(uid);
  if (!removed) {
    warnings.push("The portfolio registry entry could not be removed.");
    console.warn("[portfolio] registry removal failed for", uid);
  }
  return NextResponse.json(
    { deleted, assets: purge.assets, ...(warnings.length > 0 ? { warnings } : {}) },
    { status: deleted ? 200 : 500 },
  );
}
