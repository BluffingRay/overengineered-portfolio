import { NextRequest, NextResponse } from "next/server";
import { hasKv } from "@/lib/kv";
import { filterShowcase, pageOf, readIndex } from "@/lib/portfolioIndex";
import { isAdminConfigured } from "@/lib/firebase/admin";
import { getRequestUid } from "@/lib/api/guard";
export const runtime = "nodejs";

// 5g-a — "Other portfolios" feed, now PUBLIC and paginated. Hosted-only
// gate stays; the 401 is gone — signed-out visitors get the same
// filterShowcase feed with '' as excludeUid: uids are never empty, so
// nothing is excluded and the filter is exactly the public + showcase +
// slug rule (every entry is public-by-definition — slug/title/updatedAt
// only, uid stripped below). filterShowcase is the single showcase filter
// (updatedAt desc) — this route only strips `uid` (never leak internal
// ids), paginates via pageOf, and forwards the rest. An index read
// failure is a 500 (same as other index consumers).
//
// Response shape (breaking for the one consumer — DashboardView, updated
// in this chunk): { entries: [{ slug, title, updatedAt }], page, hasMore }.
const PAGE_SIZE = 24;

export async function GET(request: NextRequest) {
  if (!hasKv() || !isAdminConfigured()) {
    return NextResponse.json({ error: "not-hosted" }, { status: 503 });
  }
  const uid = (await getRequestUid(request)) ?? "";
  // 1-based, default 1; garbage (`?page=abc` -> NaN) clamps to 1 inside
  // pageOf, so unparseable input degrades to page 1, never a crash.
  const page = Number.parseInt(request.nextUrl.searchParams.get("page") ?? "", 10);
  try {
    const index = await readIndex();
    const feed = filterShowcase(index, uid).map((entry) => ({
      slug: entry.slug,
      title: entry.title,
      updatedAt: entry.updatedAt,
    }));
    const { items, page: safePage, hasMore } = pageOf(feed, page, PAGE_SIZE);
    return NextResponse.json({ entries: items, page: safePage, hasMore });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
