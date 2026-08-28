// FIX-A regression guard: attack suite + TipTap round-trip + seed stability.
// PURE unit-style checks — no network, no server, no credentials needed.
// Run: npx tsx scripts/fix-a-verify.ts
import {
  sanitizeRichHtml,
  sanitizeCustomHtml,
  sanitizePortfolioDocument,
} from '../src/lib/sanitize-html';
import { prepareDocument } from '../src/lib/storage';
import { readFileSync } from 'node:fs';

let failures = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    console.log(`  ok  ${name}`);
  } else {
    failures++;
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

console.log('— attack suite (rich html) —');
const attacks: Array<[string, string]> = [
  ['script tag', '<p>hi</p><script>alert(1)</script>'],
  ['img onerror', '<p>hi</p><img src="x" onerror="alert(1)">'],
  ['svg onload', '<svg onload="alert(1)"></svg><p>x</p>'],
  ['javascript: link', '<a href="javascript:alert(1)">c</a>'],
  ['data: url img', '<img src="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">'],
  ['iframe', '<p>x</p><iframe src="https://evil.example"></iframe>'],
  ['inline event', '<p onclick="alert(1)">x</p>'],
  ['style position:fixed', '<p style="position:fixed;top:0;left:0;width:100vw">overlay</p>'],
  ['style url()', '<p style="background:url(javascript:alert(1))">x</p>'],
  ['style expression()', '<p style="width:expression(alert(1))">x</p>'],
  ['form', '<form action="https://evil.example"><input type="text"></form><p>x</p>'],
  ['input type=text smuggle', '<input type="text" value="steal">'],
];
for (const [name, payload] of attacks) {
  const out = sanitizeRichHtml(payload);
  const safe =
    !/script/i.test(out) &&
    !/onerror|onload|onclick/i.test(out) &&
    !/javascript:/i.test(out) &&
    !/iframe|svg|form/i.test(out) &&
    !/position:fixed|url\(|expression\(/i.test(out);
  check(name, safe, out);
}

console.log('— TipTap serialization survival —');
const editorHtml = [
  '<h2>heading</h2>',
  '<p>plain <strong>bold</strong> <em>it</em> <u>ul</u> <s>st</s> <sub>sub</sub> <sup>sup</sup></p>',
  '<p style="text-align: center">centered</p>',
  '<p><span style="font-size: 20px">big</span> <span style="color: #ff0000">red</span> <mark data-color="#ffff00">marked</mark></p>',
  '<ul data-type="taskList"><li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked="checked"><span></span></label><div><p>done task</p></div></li><li data-type="taskItem" data-checked=""><label><input type="checkbox"><span></span></label><div><p>open task</p></div></li></ul>',
  '<ul><li>bullet</li></ul><ol><li>ordered</li></ol>',
  '<blockquote><p>quote</p></blockquote>',
  '<table><tbody><tr><th colspan="1">H</th></tr><tr><td data-colwidth="100,50" colspan="2">cell</td></tr></tbody></table>',
  '<img src="https://cdn.example/pic.png" alt="pic" title="t" data-width="40" data-layout="left" style="display:block;float:left;margin:0.25rem 0.75rem 0.5rem 0;width:40%;">',
  '<p data-clear="both">after float</p>',
  '<a href="https://example.com" target="_blank" rel="noopener noreferrer nofollow">link</a>',
  '<p><br></p><hr>',
].join('');
const kept = sanitizeRichHtml(editorHtml);
check('h2', kept.includes('<h2>heading</h2>'), kept);
check('inline marks', /<strong>bold<\/strong>.*<sub>sub<\/sub>/.test(kept), kept);
check('text-align', kept.includes('text-align: center'), kept);
check('font-size + color', kept.includes('font-size: 20px') && kept.includes('color: #ff0000'), kept);
check('highlight mark data-color', kept.includes('<mark data-color="#ffff00">'), kept);
check('task list ul data-type', kept.includes('<ul data-type="taskList">'), kept);
check('task item data-checked', kept.includes('data-type="taskItem"') && kept.includes('data-checked'), kept);
check('task checkbox', kept.includes('type="checkbox"'), kept);
check('tables', kept.includes('<th') && kept.includes('data-colwidth="100,50"') && kept.includes('colspan'), kept);
check('image attrs', kept.includes('data-width="40"') && kept.includes('data-layout="left"'), kept);
check('image style float+width', kept.includes('float:left') && kept.includes('width:40%'), kept);
check('clear-float paragraph', kept.includes('<p data-clear="both">'), kept);
check('link rel/target', kept.includes('target="_blank"') && kept.includes('rel="noopener'), kept);
check('br/hr', kept.includes('<br') && kept.includes('<hr'), kept);

console.log('— empty handling —');
check('empty -> <p></p>', sanitizeRichHtml('') === '<p></p>');
check('whitespace -> <p></p>', sanitizeRichHtml('   ') === '<p></p>');
check('all-stripped -> <p></p>', sanitizeRichHtml('<script>x</script>') === '<p></p>');
check('custom empty -> ""', sanitizeCustomHtml('') === '');

console.log('— custom_html —');
const custom = '<div class="p-4"><p>ok</p><script>alert(1)</script><iframe src="x"></iframe><a href="javascript:x">y</a></div>';
const customOut = sanitizeCustomHtml(custom);
check(
  'custom keeps div + strips script/iframe/jsurl',
  customOut.includes('<div class="p-4"><p>ok</p>') && !/script|iframe|javascript:/i.test(customOut),
  customOut,
);

console.log('— full document (real seed must round-trip byte-stable) —');
const seed = JSON.parse(readFileSync('content/portfolio.json', 'utf8'));
const doc = prepareDocument(seed);
if (!doc) throw new Error('seed failed prepareDocument');
const before = JSON.stringify(doc);
sanitizePortfolioDocument(doc);
const after = JSON.stringify(doc);
check('legit seed round-trips byte-stable', before === after);
if (before !== after) {
  for (let i = 0; i < Math.max(before.length, after.length); i++) {
    if (before[i] !== after[i]) {
      console.log('  first diff at', i);
      console.log('  before:', before.slice(Math.max(0, i - 60), i + 60));
      console.log('  after: ', after.slice(Math.max(0, i - 60), i + 60));
      break;
    }
  }
}

console.log('— document URL sanitization —');
const hostile = prepareDocument({
  version: 3,
  skin: 'clean',
  theme: {},
  cards: [
    { id: 'c1', name: 'card', description: 'd', href: 'javascript:alert(1)', demoUrl: 'javascript:x', githubUrl: 'https://ok.github.dev', customUrl: 'javascript:y' },
  ],
  tabs: [
    {
      id: 't1',
      label: 'home',
      blocks: [
        {
          id: 'b1', type: 'featured_hero', heading: 'h', subheading: 's',
          ctaLabel: 'cta', ctaHref: 'javascript:alert(1)', thumbnail: '',
          secondaryAction: { label: 'sec', url: 'javascript:z' },
        },
        { id: 'b2', type: 'rich_text', content: '<p>ok</p><img src="x" onerror="e">' },
        { id: 'b3', type: 'custom_html', html: '<p>ok</p><script>bad()</script>' },
      ],
    },
  ],
  posts: [{ id: 'p1', title: 't', content: '<p>post</p><script>evil()</script>', status: 'published' }],
  socials: [{ id: 's1', platform: 'github', url: 'javascript:social' }],
});
if (!hostile) throw new Error('hostile doc failed prepareDocument');
sanitizePortfolioDocument(hostile);
const hero = hostile.tabs[0].blocks[0];
check(
  'hero ctaHref neutralized',
  hero.type === 'featured_hero' && hero.ctaHref === '',
  JSON.stringify(hero.type === 'featured_hero' ? hero.ctaHref : null),
);
check('hero secondary dropped', hero.type === 'featured_hero' && hero.secondaryAction === undefined);
check(
  'card javascript: hrefs neutralized (required field -> empty)',
  hostile.cards.every((c) => c.href === '' || isSafe(c.href)),
  JSON.stringify(hostile.cards[0].href),
);
check('card githubUrl (https) kept', hostile.cards[0].githubUrl === 'https://ok.github.dev');
check('social url -> #', hostile.socials?.[0].url === '#', JSON.stringify(hostile.socials?.[0].url));
const rich = hostile.tabs[0].blocks.find((b) => b.type === 'rich_text');
check(
  'rich img onerror stripped',
  rich?.type === 'rich_text' ? !rich.content.includes('onerror') : false,
  rich?.type === 'rich_text' ? rich.content : '',
);
const custom2 = hostile.tabs[0].blocks.find((b) => b.type === 'custom_html');
check(
  'custom script stripped',
  custom2?.type === 'custom_html' ? !custom2.html.includes('script') : false,
  custom2?.type === 'custom_html' ? custom2.html : '',
);
check(
  'post content cleaned',
  hostile.posts?.[0] !== undefined && hostile.posts[0].content.includes('post') && !hostile.posts[0].content.includes('script'),
  hostile.posts?.[0].content,
);

function isSafe(u: unknown) {
  return typeof u === 'string' && /^(https?:\/\/|mailto:|tel:|\/|#)/i.test(u.trim());
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
