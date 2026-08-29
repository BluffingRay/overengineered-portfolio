import { NextRequest, NextResponse } from "next/server";
import { hasKv } from "@/lib/kv";
import { filterShowcase, readIndex } from "@/lib/portfolioIndex";
import { getUserIdFromSessionCookie, isAdminConfigured } from "@/lib/firebase/admin";
export const runtime = "nodejs";

// 5e-c "Other portfolios" feed. Hosted-only + authed (same gates as the
// slug route). filterShowcase is the single showcase filter (public +
// showcase + slug + not-caller, updatedAt desc) — this route only strips
// `uid` (never leak internal ids) and forwards the rest as-is. An index
// read failure is a 500 (same as other index consumers).
export async function GET(request: NextRequest) {
  if (!hasKv() || !isAdminConfigured()) {
    return NextResponse.json({ error: "not-hosted" }, { status: 503 });
  }
  const uid = await getUserIdFromSessionCookie(request as unknown as Request);
  if (!uid) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const index = await readIndex();
    const showcase = filterShowcase(index, uid).map((entry) => ({
      slug: entry.slug,
      title: entry.title,
      updatedAt: entry.updatedAt,
    }));
    return NextResponse.json(showcase);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
