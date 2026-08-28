// Phase 5a — KV store for hosted JSON (throwaway Cloudflare, 0 cold start).
// Swappable seam: same PortfolioData blob that localStorage holds now,
// but behind GET/PUT /api/portfolio when KV env is present.
// Doc stays URL-only, prepareDocument migrates; this file only does raw string get/put.

const KV_API = "https://api.cloudflare.com/client/v4";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name} for KV store`);
  return v;
}

function kvUrl(key: string): string {
  const accountId = requireEnv("CLOUDFLARE_ACCOUNT_ID");
  const namespaceId = requireEnv("KV_NAMESPACE_ID");
  return `${KV_API}/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${encodeURIComponent(key)}`;
}

function kvHeaders(): Record<string, string> {
  const token = requireEnv("CLOUDFLARE_API_TOKEN");
  return { Authorization: `Bearer ${token}` };
}

export async function kvGet(key: string): Promise<string | null> {
  const res = await fetch(kvUrl(key), { headers: kvHeaders(), cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`KV GET ${key} failed ${res.status}: ${txt.slice(0, 200)}`);
  }
  return await res.text();
}

export async function kvPut(key: string, value: string): Promise<void> {
  const res = await fetch(kvUrl(key), {
    method: "PUT",
    headers: { ...kvHeaders(), "Content-Type": "text/plain" },
    body: value,
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`KV PUT ${key} failed ${res.status}: ${txt.slice(0, 200)}`);
  }
}

// Hosted portfolio key — single-tenant MVP. Per-user later: `portfolio:${userId}:${slug}`
export const HOSTED_PORTFOLIO_KEY = "portfolio:default";
