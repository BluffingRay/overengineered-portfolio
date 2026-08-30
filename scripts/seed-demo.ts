// 6-b demo seed — rerunnable sync of content/portfolio.json into the
// dedicated demo account at /u/demo. Never spawns a server (hits the
// user's running one at SEED_BASE_URL) and never prints credential values.
//
// Inputs: DEMO_EMAIL + DEMO_PASSWORD from the shell env OR parsed from
// .env.local by the raw KEY=VALUE parser below (NO dotenv expansion —
// the $-in-env gotcha: values are read verbatim). Firebase web keys come
// from the same sources. SEED_BASE_URL defaults to http://localhost:3000.
//
// Flow: guard env -> firebase client sign-in (creates the account on
// first run) -> idToken -> POST /api/auth/session (hosted-session cookie)
// -> PUT /api/portfolio {seed, slug 'demo', public, showcased} -> verify
// the confirmed doc -> GET /u/demo -> GET /api/portfolio/showcase.
//
// NOTE: the SERVER must run with DEMO_EMAIL set (the PUT route resolves
// the demo uid from it) — route handlers read env at startup, so set the
// var and RESTART next dev or the slug claim 400s. Run:
//   npx tsx scripts/seed-demo.ts
import { readFileSync, writeFileSync } from "node:fs";
import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import type { PortfolioData } from "../src/types/schema";

const BASE = process.env.SEED_BASE_URL || "http://localhost:3000";

/** Shell env first, then a raw KEY=VALUE scan of .env.local (no expansion). */
function envValue(name: string): string | undefined {
  if (process.env[name]) return process.env[name];
  try {
    const raw = readFileSync(".env.local", "utf8");
    for (const line of raw.split("\n")) {
      const t = line.trim();
      if (t.startsWith("#") || !t.includes("=")) continue;
      const eq = t.indexOf("=");
      if (t.slice(0, eq) === name) {
        return t.slice(eq + 1).trim().replace(/^"|"$/g, "");
      }
    }
  } catch {
    // no .env.local — shell env is the only source then
  }
  return undefined;
}

function fail(message: string): never {
  console.error(`seed-demo: ${message}`);
  process.exit(1);
}

const DEMO_EMAIL = envValue("DEMO_EMAIL");
const DEMO_PASSWORD = envValue("DEMO_PASSWORD");
const apiKey = envValue("NEXT_PUBLIC_FIREBASE_API_KEY");
const authDomain = envValue("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN");
const projectId = envValue("NEXT_PUBLIC_FIREBASE_PROJECT_ID");

if (!DEMO_EMAIL || !DEMO_PASSWORD) {
  fail(
    "DEMO_EMAIL and DEMO_PASSWORD must be set (shell env or .env.local). " +
      "See .env.example. Never commit real values.",
  );
}
if (!apiKey || !authDomain || !projectId) {
  fail(
    "NEXT_PUBLIC_FIREBASE_API_KEY / _AUTH_DOMAIN / _PROJECT_ID must be set " +
      "(shell env or .env.local) for the Firebase client sign-in.",
  );
}

// ---------------------------------------------------------------------------
// Everything below only uses the credentials as inputs — nothing is printed.
// ---------------------------------------------------------------------------

async function main() {
  if (!getApps().length) {
    initializeApp({ apiKey: apiKey!, authDomain: authDomain!, projectId: projectId! });
  }
  const auth = getAuth();

  let user;
  try {
    user = await signInWithEmailAndPassword(auth, DEMO_EMAIL!, DEMO_PASSWORD!)
      .then((cred) => cred.user);
  } catch (e) {
    // NOTE: with Firebase's email-enumeration protection (kept ON in this
    // project), a nonexistent account ALSO returns auth/invalid-credential,
    // never auth/user-not-found — so both codes fall through to the
    // provisioning attempt below.
    const code = (e as { code?: string }).code ?? "";
    if (code === "auth/user-not-found" || code === "auth/invalid-credential") {
      console.log("demo account not signed in — trying to provision it (first run)");
      try {
        user = await createUserWithEmailAndPassword(auth, DEMO_EMAIL!, DEMO_PASSWORD!)
          .then((cred) => cred.user);
      } catch (signupError) {
        const signupCode = (signupError as { code?: string }).code ?? "";
        if (signupCode === "auth/email-already-in-use") {
          fail("the demo account already exists but the password is wrong — fix DEMO_PASSWORD.");
        }
        if (signupCode === "auth/weak-password") {
          fail("DEMO_PASSWORD is too weak for Firebase (min 6 characters).");
        }
        fail(`could not create the demo account (${(signupError as Error).message}).`);
      }
    } else {
      fail(`demo sign-in failed (${(e as Error).message}).`);
    }
  }
  console.log("signed in as the demo account");

  const idToken = await user!.getIdToken();

  // fix-c/5f-a house pattern: mint the HttpOnly session cookie server-side.
  const sessionRes = await fetch(`${BASE}/api/auth/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (sessionRes.status !== 200) {
    fail(`session mint failed (${sessionRes.status}) — is the hosted stack configured?`);
  }
  const cookie =
    (sessionRes.headers.getSetCookie?.() ?? [])[0]?.split(";")[0] ?? "";
  if (!cookie) fail("no hosted-session cookie returned by /api/auth/session.");

  const seed = JSON.parse(
    readFileSync("content/portfolio.json", "utf8"),
  ) as PortfolioData;

  // Hosted metadata is injected here, never committed in the file itself.
  const putRes = await fetch(`${BASE}/api/portfolio`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ ...seed, slug: "demo", visibility: "public", showcase: true }),
  });
  const confirmed = (await putRes.json().catch(() => ({}))) as Partial<PortfolioData>;
  if (putRes.status !== 200) {
    fail(
      `PUT /api/portfolio failed (${putRes.status}) — ${JSON.stringify(confirmed)}. ` +
        "If the error is invalid-slug: the SERVER needs DEMO_EMAIL set (and a " +
        "restart — route handlers read env at startup) for the demo claim to pass.",
    );
  }
  if (confirmed.slug !== "demo" || confirmed.visibility !== "public" || confirmed.showcase !== true) {
    fail(
      `confirmed doc is not the expected demo shape (slug=${JSON.stringify(confirmed.slug)}, ` +
        `visibility=${JSON.stringify(confirmed.visibility)}, showcase=${JSON.stringify(confirmed.showcase)}). ` +
        "Same hint: the server needs DEMO_EMAIL + a restart.",
    );
  }
  console.log("hosted doc saved: slug 'demo', public, showcased");

  const pageRes = await fetch(`${BASE}/u/demo`);
  if (pageRes.status !== 200) {
    fail(`GET /u/demo returned ${pageRes.status} — expected 200.`);
  }
  console.log("/u/demo renders (200)");

  const showcaseRes = await fetch(`${BASE}/api/portfolio/showcase`);
  const showcaseJson = (await showcaseRes.json().catch(() => ({}))) as {
    entries?: Array<{ slug?: string }>;
  };
  const listed = (showcaseJson.entries ?? []).some((entry) => entry.slug === "demo");
  if (!listed) {
    fail(
      "the demo entry is missing from /api/portfolio/showcase — check the " +
        "portfolios:index registry (a later save heals it; rerun this script).",
    );
  }
  console.log("showcase lists the demo entry");
  // User requirement (6-b): hand the user the demo account's credentials
  // via a gitignored local file — never committed, never printed.
  writeFileSync(
    "demo-credentials.local.txt",
    `email: ${DEMO_EMAIL}\npassword: ${DEMO_PASSWORD}\n` +
      "(gitignored — for signing in as the demo account at /u/demo)\n",
  );
  console.log("credentials written to demo-credentials.local.txt (gitignored)");
  console.log("demo seed synced — rerun any time to re-sync content/portfolio.json.");
}

main().catch((e) => fail((e as Error).message));
