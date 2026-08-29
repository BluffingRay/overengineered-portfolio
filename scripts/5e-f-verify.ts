// 5e-f portfolio-settings verify — PURE function checks only: no servers,
// no KV calls, no .env reads, no localStorage (safe to run alongside the
// dev server). Covers the applySettingsPatch matrix: valid full patch,
// same-slug no-op, invalid slug -> null, private + showcase-false -> keys
// ABSENT (never null), public + true -> keys set, other doc fields
// untouched by reference, input not mutated, and the JSON round-trip
// through prepareDocument staying byte-stable (the patched doc carries
// prepareDocument's own absent-defaults shape).
// NOTE: the Save flow (fresh ?full=1 -> patch -> PUT), the availability
// fetch and the clean-draft local-key branch are wiring, not
// pure-testable — covered by review + the orchestrator's browser gate,
// per docs/specs/5e-f-portfolio-settings.md.
// Run: npx tsx scripts/5e-f-verify.ts
import { applySettingsPatch } from '../src/lib/portfolioSettings';
import { prepareDocument } from '../src/lib/storage';
import { initialData } from '../src/data/initialData';
import { normalizeSlug } from '../src/types/schema';
import type { PortfolioData } from '../src/types/schema';

let failures = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    console.log(`  ok  ${name}`);
  } else {
    failures++;
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

// Base doc: the seed through prepareDocument — the canonical shape the
// sanitizer produces (seed itself is known to round-trip byte-stably,
// see fix-a-verify). A patched doc must behave exactly like this.
const base = prepareDocument(initialData);
if (base === null) {
  console.log('FAIL  seed passes prepareDocument (precondition)');
  process.exit(1);
}

console.log('— valid full patch (normalization + keys set) —');
const full = applySettingsPatch(base, { slug: 'Jane-Doe', visibility: 'public', showcase: true });
check('returns a doc (not null)', full !== null);
check('slug normalized (trim -> lowercase -> validated)', full?.slug === 'jane-doe', String(full?.slug));
check("visibility key set to 'public'", full !== null && 'visibility' in full && full.visibility === 'public');
check('showcase key set to true', full !== null && 'showcase' in full && full.showcase === true);
check('version/skin carried', full?.version === 3 && full?.skin === base.skin);
check('new object, not the input', full !== null && full !== base);

console.log('— same-slug no-op (re-claiming your own link) —');
const same = applySettingsPatch(full as PortfolioData, {
  slug: 'jane-doe', // pinned by the check above (full.slug === 'jane-doe')
  visibility: 'public',
  showcase: true,
});
check('same slug -> byte-identical output', JSON.stringify(same) === JSON.stringify(full));
// The seed has no slug, so patching one in is NOT a no-op — the true
// defaults no-op re-patches a doc that already carries those values.
const privateDoc = applySettingsPatch(base, { slug: 'jane-doe', visibility: 'private', showcase: false }) as PortfolioData;
check('defaults patch sets only the slug', JSON.stringify(privateDoc).includes('"slug":"jane-doe"'));
const sameDefault = applySettingsPatch(privateDoc, { slug: 'jane-doe', visibility: 'private', showcase: false });
check(
  'same values onto a doc already carrying them -> byte-identical (stored shape kept)',
  JSON.stringify(sameDefault) === JSON.stringify(privateDoc),
);

console.log('— invalid slug -> null (no PUT happens) —');
check('too short ("ab") -> null', applySettingsPatch(base, { slug: 'ab', visibility: 'public', showcase: true }) === null);
check('edge hyphens ("-x-") -> null', applySettingsPatch(base, { slug: '-x-', visibility: 'public', showcase: true }) === null);
check('reserved ("dashboard") -> null', applySettingsPatch(base, { slug: 'dashboard', visibility: 'public', showcase: true }) === null);
check('empty string -> null', applySettingsPatch(base, { slug: '', visibility: 'public', showcase: true }) === null);
check('matches normalizeSlug verdicts', ['ab', '-x-', 'dashboard', ''].every((s) => applySettingsPatch(base, { slug: s, visibility: 'private', showcase: false }) === null && normalizeSlug(s) === null));

console.log('— defaults -> keys ABSENT (never null, never explicit undefined) —');
const defaults = applySettingsPatch(base, { slug: 'jane-doe', visibility: 'private', showcase: false });
check('visibility key ABSENT', defaults !== null && !('visibility' in defaults), JSON.stringify(defaults && { v: defaults.visibility, s: defaults.showcase }));
check('showcase key ABSENT', defaults !== null && !('showcase' in defaults));
check('values read as undefined (not null)', defaults?.visibility === undefined && defaults?.showcase === undefined);
check('no "null" bytes in the JSON', defaults !== null && !JSON.stringify(defaults).includes('"visibility":null') && !JSON.stringify(defaults).includes('"showcase":null'));

console.log('— flipping a stored public/showcase doc back to defaults —');
const flippedBack = applySettingsPatch(full as PortfolioData, {
  slug: 'jane-doe', // pinned above + re-asserted below
  visibility: 'private',
  showcase: false,
});
check('visibility key deleted', flippedBack !== null && !('visibility' in flippedBack));
check('showcase key deleted', flippedBack !== null && !('showcase' in flippedBack));
check('slug kept through the flip', flippedBack?.slug === 'jane-doe');

console.log('— other fields untouched by reference —');
check('tabs same reference', full?.tabs === base.tabs);
check('theme same reference', full?.theme === base.theme);
check('cards same reference', full?.cards === base.cards);
check('posts same reference', full?.posts === base.posts);
check('socials same reference', full?.socials === base.socials);
check('footer same reference', full?.footer === base.footer);

console.log('— input never mutated —');
const before = JSON.stringify(base);
const baseKeys = Object.keys(base).join(',');
applySettingsPatch(base, { slug: 'Jane-Doe', visibility: 'public', showcase: true });
applySettingsPatch(base, { slug: 'jane-doe', visibility: 'private', showcase: false });
applySettingsPatch(base, { slug: 'ab', visibility: 'private', showcase: false });
check('base unchanged (value + key order)', JSON.stringify(base) === before && Object.keys(base).join(',') === baseKeys);
// prepareDocument's in-memory output carries explicit-undefined meta keys;
// the patcher must never turn THOSE into real values on the input either.
const cleanBase = prepareDocument(initialData) as PortfolioData;
check('prepared seed carries an explicit-undefined slug key (sanitizer shape)', 'slug' in cleanBase && cleanBase.slug === undefined);
applySettingsPatch(cleanBase, { slug: 'jane-doe', visibility: 'public', showcase: true });
check('patching did not give the INPUT a real slug', cleanBase.slug === undefined);
check(
  'fresh base still byte-identical to the first preparation',
  JSON.stringify(cleanBase) === before,
);

console.log('— JSON round-trip through prepareDocument (the KV/localStorage path) —');
const stored = JSON.parse(JSON.stringify(full)) as unknown;
check('revived patched doc passes prepareDocument', prepareDocument(stored) !== null);
check(
  'prepared revival deep-equals the patched doc (byte-stable)',
  JSON.stringify(prepareDocument(stored)) === JSON.stringify(full),
);
const storedDefaults = JSON.parse(JSON.stringify(defaults)) as unknown;
check('defaults revival: visibility key absent', !('visibility' in (storedDefaults as object)));
check('defaults revival: showcase key absent', !('showcase' in (storedDefaults as object)));
check(
  'defaults revival deep-equals the patched doc',
  JSON.stringify(prepareDocument(storedDefaults)) === JSON.stringify(defaults),
);

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
