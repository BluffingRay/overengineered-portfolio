// One-shot maintenance script — hide the TEST portfolios without deleting
// anything: every account + doc stays for future sign-in/verification, but
// the docs flip to private (visibility 'private', showcase removed). That
// removes them from the showcase gallery, the sitemap, and /u/<slug>
// (404 for non-owners) while keeping each account's slug claim intact.
//
// Direct-KV by design: three of the test accounts (browser-gate ones) have
// no recorded passwords, so the API path can't reach them. Only entries
// whose slug is on the KNOWN TEST SLUGS list are touched — real users are
// structurally unreachable for this script.
//
// Env: the KV trio from the shell env OR a raw KEY=VALUE scan of
// .env.local (no dotenv expansion — the $-in-env gotcha). Values are
// never printed.
// Run: npx tsx scripts/hide-test-docs.ts
import { readFileSync } from 'node:fs';
import { kvGet, kvPut } from '../src/lib/kv';
import { PORTFOLIO_INDEX_KEY } from '../src/lib/portfolioIndex';
import type { PortfolioData } from '../src/types/schema';

const TEST_SLUGS = new Set([
  'sweep-gate', // 6a-gate@test.local
  'onboard-tester', // 5ed-onboard@test.local
  '5g-showcase', // 5g-showcase@test.local
  '5f-bridge-a', // 5f-bridge-a@test.local
  '5f-bridge-b', // 5f-bridge-b@test.local
  'fixc-demo', // fixc@test.local
  // One-shot addition: the /u/demo seat seeded by the (since-removed)
  // 6-b seed script — owned by 6b-demo@test.local whose password is
  // known history. If a REAL user ever claims slug 'demo' after this,
  // remove this entry from the set.
  'demo',
]);

function envValue(name: string): string | undefined {
  if (process.env[name]) return process.env[name];
  try {
    for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
      const t = line.trim();
      if (t.startsWith('#') || !t.includes('=')) continue;
      const eq = t.indexOf('=');
      if (t.slice(0, eq) === name) return t.slice(eq + 1).trim();
    }
  } catch {
    // no .env.local — shell env is the only source
  }
  return undefined;
}

async function main() {
  for (const name of ['CLOUDFLARE_ACCOUNT_ID', 'KV_NAMESPACE_ID', 'CLOUDFLARE_API_TOKEN']) {
    const value = envValue(name);
    if (!value) {
      console.error(`hide-test-docs: missing ${name} (shell env or .env.local)`);
      process.exit(1);
    }
    process.env[name] = value; // programmatic injection — never printed
  }

  const rawIndex = await kvGet(PORTFOLIO_INDEX_KEY);
  if (!rawIndex) {
    console.log('no portfolios:index — nothing to hide');
    return;
  }
  const index = JSON.parse(rawIndex) as Record<
    string,
    { slug?: string; visibility?: string; showcase?: boolean; updatedAt?: number }
  >;

  const targets = Object.entries(index).filter(
    ([, entry]) => entry.slug && TEST_SLUGS.has(entry.slug),
  );
  console.log(
    `test entries found: ${targets.map(([, e]) => e.slug).join(', ') || 'none'}`,
  );

  for (const [uid, entry] of targets) {
    // 1. index entry -> private, not showcased (slug kept: the account can
    //    re-publicize later after verification)
    entry.visibility = 'private';
    delete entry.showcase;

    // 2. the doc itself -> private (the /u/ gate reads the doc, the
    //    showcase/sitemap read the index — both must agree)
    const docKey = `portfolio:${uid}:default`;
    const rawDoc = await kvGet(docKey);
    if (rawDoc) {
      const doc = JSON.parse(rawDoc) as PortfolioData;
      if (doc.visibility !== 'private' || doc.showcase === true) {
        doc.visibility = 'private';
        delete doc.showcase;
        await kvPut(docKey, JSON.stringify(doc));
        console.log(`hidden doc: ${docKey} (slug ${entry.slug})`);
      } else {
        console.log(`already private: ${docKey} (slug ${entry.slug})`);
      }
    } else {
      console.log(`no doc at ${docKey} (slug ${entry.slug}) — index only`);
    }
  }

  await kvPut(PORTFOLIO_INDEX_KEY, JSON.stringify(index));
  console.log('index updated');

  // Post-check: no test slug may remain public anywhere.
  const after = JSON.parse((await kvGet(PORTFOLIO_INDEX_KEY))!) as Record<
    string,
    { slug?: string; visibility?: string }
  >;
  const leaked = Object.values(after).filter(
    (e) => e.slug && TEST_SLUGS.has(e.slug) && e.visibility !== 'private',
  );
  if (leaked.length) {
    console.error(`FAIL: still-public test entries: ${leaked.map((e) => e.slug).join(', ')}`);
    process.exit(1);
  }
  console.log('ALL PASS — every test portfolio is private; accounts kept for future verification');
}

main().catch((e) => {
  console.error(`hide-test-docs: ${(e as Error).message}`);
  process.exit(1);
});
