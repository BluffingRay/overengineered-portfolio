import { NextRequest, NextResponse } from "next/server";
import { initialData } from "@/data/initialData";
import { prepareDocument } from "@/lib/storage";
import { kvGet, kvPut, HOSTED_PORTFOLIO_KEY } from "@/lib/kv";
import { getUserIdFromSessionCookie, isAdminConfigured } from "@/lib/firebase/admin";
import { sanitizePortfolioDocument } from "@/lib/sanitize-html";
import type { PortfolioData } from "@/types/schema";
export const runtime = "nodejs";

function portfolioKeyFor(uid: string | null): string {
  if (uid) return `portfolio:${uid}:default`;
  return HOSTED_PORTFOLIO_KEY;
}

function filterPublicDoc(doc: PortfolioData | null): PortfolioData | null {
  if (!doc) return doc;
  const filtered: PortfolioData = {
    ...doc,
    posts: (doc.posts ?? []).filter((p) => p.status === "published"),
  };
  return filtered;
}

function hasKv(): boolean {
  return !!(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.KV_NAMESPACE_ID && process.env.CLOUDFLARE_API_TOKEN);
}

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
      return NextResponse.json(filterPublicDoc(doc) ?? doc);
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
    const doc = prepareDocument(body);
    if (!doc) {
      return NextResponse.json({ error: "Invalid PortfolioData" }, { status: 400 });
    }
    // FIX-A: sanitize HTML (rich_text/custom_html/posts) + unsafe URLs
    // before persisting — the stored doc is the public render source.
    sanitizePortfolioDocument(doc);
    const key = portfolioKeyFor(uid);
    await kvPut(key, JSON.stringify(doc));
    return NextResponse.json(doc);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
