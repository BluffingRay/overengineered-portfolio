// Playground verify — PURE checks only: no servers, no DOM, no .env
// reads (safe next to the dev server). Covers: the memory store
// (mutate/undo/redo/reset semantics + isolation), the context default
// (the global store is untouched by playground mutations), the
// playground JSON (valid v3, byte-stable through both pipeline layers,
// same content contract as the demo), and the onboarding pointer block.
// Run: npx tsx scripts/playground-verify.ts
import { readFileSync } from 'node:fs';
import { prepareDocument } from '../src/lib/storage';
import { sanitizePortfolioDocument } from '../src/lib/sanitize-html';
import { buildInitialDoc } from '../src/lib/onboarding';
import { createPlaygroundStore } from '../src/playground/store';

let failures = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    console.log(`  ok  ${name}`);
  } else {
    failures++;
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

// ---------------- memory store ----------------
console.log('— playground memory store —');
const store = createPlaygroundStore();
const seededTitle = store.getSnapshot().tabs[0]?.label;
check('store seeds from the playground JSON', typeof seededTitle === 'string' && seededTitle.length > 0);

const before = JSON.stringify(store.getSnapshot());
store.mutate((current) => ({
  ...current,
  tabs: [{ ...current.tabs[0], label: 'EDITED' }, ...current.tabs.slice(1)],
}));
check('mutate changes the in-memory doc', store.getSnapshot().tabs[0]?.label === 'EDITED');
check('mutate enables undo', store.getHistory().canUndo === true);
store.undo();
check('undo restores the pre-mutation doc', JSON.stringify(store.getSnapshot()) === before);
check('undo disables canUndo at the floor', store.getHistory().canUndo === false);
store.redo();
check('redo re-applies the mutation', store.getSnapshot().tabs[0]?.label === 'EDITED');
store.reset();
check(
  'reset restores the pristine seed',
  JSON.stringify(store.getSnapshot()) === before,
);

// server snapshot is a stable pristine doc (hydration contract)
check(
  'server snapshot equals the pristine seed',
  JSON.stringify(store.getServerSnapshot()) === before,
);

// ---------------- isolation from the real store ----------------
console.log('— isolation —');
// The playground store never imports the storage layer: assert by source
// that no storage/save/localStorage reference exists in the module.
const storeSrc = readFileSync('src/playground/store.ts', 'utf8');
check(
  'store.ts never imports @/lib/storage (no shared state by construction)',
  !/from ['"]@\/lib\/storage['"]/.test(storeSrc),
);
check(
  'store.ts never touches web storage APIs',
  !/window\.localStorage|window\.sessionStorage|localStorage\.|sessionStorage\./.test(storeSrc),
);

// ---------------- playground JSON ----------------
console.log('— playground JSON —');
const raw = readFileSync('content/playground.json', 'utf8');
const parsed = JSON.parse(raw);
const prepared = prepareDocument(parsed);
check('playground doc is a valid v3 document', prepared !== null && prepared.version === 3);
check(
  'byte-stable through prepareDocument',
  prepared !== null && JSON.stringify(prepared) === JSON.stringify(parsed),
);
check(
  'byte-stable through the DOMPurify pipeline',
  prepared !== null && JSON.stringify(sanitizePortfolioDocument(prepared)) === JSON.stringify(prepared),
);
check('no "raymar" anywhere (it is the demo, not the owner)', !/raymar/i.test(raw));
check(
  'posts present + published (the blog block needs them)',
  (prepared?.posts ?? []).some((post) => post.status === 'published'),
);

// ---------------- onboarding pointer ----------------
console.log('— onboarding pointer —');
const onboardingDoc = buildInitialDoc({
  name: 'Test User',
  role: 'Dev',
  slug: 'test-user',
  design: 'default',
});
const firstRich = onboardingDoc.tabs[0].blocks.find(
  (block): block is Extract<typeof onboardingDoc.tabs[0]['blocks'][number], { type: 'rich_text' }> =>
    block.type === 'rich_text',
);
check(
  'generated portfolio links the playground under the hero',
  firstRich?.content.includes('href="/playground"') === true,
);
const onboardingPrepared = prepareDocument(onboardingDoc);
check('onboarding doc is valid v3', onboardingPrepared !== null && onboardingPrepared.version === 3);
const onboardingClean = sanitizePortfolioDocument(onboardingPrepared ?? onboardingDoc);
const cleanRich = onboardingClean.tabs[0].blocks.find(
  (block): block is Extract<typeof onboardingDoc.tabs[0]['blocks'][number], { type: 'rich_text' }> =>
    block.type === 'rich_text',
);
check(
  'pointer link survives the sanitizer (new-tab attrs kept)',
  cleanRich?.content.includes('target="_blank"') === true,
);

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
