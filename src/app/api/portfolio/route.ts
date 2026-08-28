import { NextResponse } from "next/server";
import { initialData } from "@/data/initialData";
import { prepareDocument } from "@/lib/storage";
import { kvGet, kvPut, HOSTED_PORTFOLIO_KEY } from "@/lib/kv";

export const runtime = "nodejs";

// GET /api/portfolio — hosted JSON (KV) with local fallback for Product B.
// Public read for now (5c will add owner check + ?public=1 vs ?full=1 filtering).
export async function GET() {
  // If KV not configured, fall back to baked initialData so Product B still works without env.
  const hasKv = !!(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.KV_NAMESPACE_ID && process.env.CLOUDFLARE_API_TOKEN);
  if (!hasKv) {
    return NextResponse.json(initialData);
  }
  try {
    const raw = await kvGet(HOSTED_PORTFOLIO_KEY);
    if (!raw) return NextResponse.json(initialData);
    const parsed = JSON.parse(raw);
    const doc = prepareDocument(parsed);
    return NextResponse.json(doc ?? initialData);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// PUT /api/portfolio — persist hosted JSON (authed in 5c, open for 5a wiring verification).
export async function PUT(request: Request) {
  const hasKv = !!(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.KV_NAMESPACE_ID && process.env.CLOUDFLARE_API_TOKEN);
  if (!hasKv) {
    return NextResponse.json({ error: "KV not configured" }, { status: 503 });
  }
  try {
    const body = await request.json();
    const doc = prepareDocument(body);
    if (!doc) {
      return NextResponse.json({ error: "Invalid PortfolioData" }, { status: 400 });
    }
    await kvPut(HOSTED_PORTFOLIO_KEY, JSON.stringify(doc));
    return NextResponse.json(doc);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
