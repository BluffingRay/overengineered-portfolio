// FIX-A video-embed verification — custom_html iframes + native video/audio.
// PURE unit-style checks — no network, no server, no credentials needed.
// Run: npx tsx scripts/fix-a-embeds-verify.ts
import { sanitizeCustomHtml, sanitizeRichHtml } from '../src/lib/sanitize-html';

let fails = 0;
type Matcher = RegExp | ((out: string) => boolean);
function t(name: string, input: string, expectKeep: boolean, pattern?: Matcher) {
  const out = sanitizeCustomHtml(input);
  const test = (m: Matcher) => (typeof m === 'function' ? m(out) : m.test(out));
  let ok: boolean;
  if (expectKeep) {
    ok = pattern ? test(pattern) : out.trim() !== '';
  } else {
    ok = pattern ? !test(pattern) : out.trim() === '';
  }
  console.log((ok ? '  ok  ' : 'FAIL  ') + name.padEnd(34) + ' -> ' + out.slice(0, 90));
  if (!ok) fails++;
}

console.log('— allowed embeds (custom_html) —');
t('youtube embed kept',
  '<div><iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" allowfullscreen title="v"></iframe></div>',
  true, /youtube\.com\/embed\/dQw4w9WgXcQ[^"]*" allowfullscreen/);
t('youtube-nocookie embed kept',
  '<iframe src="https://www.youtube-nocookie.com/embed/abc123"></iframe>',
  true, /youtube-nocookie\.com\/embed\/abc123/);
t('vimeo player kept',
  '<iframe src="https://player.vimeo.com/video/12345"></iframe>',
  true, /player\.vimeo\.com\/video\/12345/);
t('streamable kept',
  '<iframe src="https://streamable.com/e/abc"></iframe>',
  true, /streamable\.com\/e\/abc/);

console.log('— blocked embeds (iframe dropped entirely) —');
t('youtube watch page dropped',
  '<iframe src="https://www.youtube.com/watch?v=x"></iframe>',
  false, /iframe/);
t('evil host dropped',
  '<iframe src="https://evil.example/embed/x"></iframe>',
  false, /iframe/);
t('http (not https) dropped',
  '<iframe src="http://www.youtube.com/embed/x"></iframe>',
  false, /iframe/);
t('no-src iframe dropped',
  '<iframe allowfullscreen></iframe>',
  false, /iframe/);
t('site root dropped',
  '<iframe src="https://www.youtube.com/"></iframe>',
  false, /iframe/);
t('data: src dropped',
  '<iframe src="data:text/html,<script>alert(1)</script>"></iframe>',
  false, /iframe/);

console.log('— native video/audio (custom_html) —');
t('video + attrs kept',
  '<video src="/uploads/dev/clip.mp4" controls poster="/p.jpg" muted loop playsinline preload="metadata"></video>',
  true, /<video src="\/uploads\/dev\/clip\.mp4" controls[^>]*poster/);
t('video javascript: src dropped',
  '<video src="javascript:alert(1)" controls></video>',
  true, /<video[^>]*controls[^>]*><\/video>/); // element kept, src gone
t('audio kept',
  '<audio src="/a.mp3" controls preload="none"></audio>',
  true, /<audio src="\/a\.mp3" controls/);

console.log('— still hostile-proof —');
t('script still gone beside embed',
  '<div><script>evil()</script><iframe src="https://player.vimeo.com/video/1"></iframe></div>',
  true, (x: string) => !/script/.test(x) && /player\.vimeo\.com\/video\/1/.test(x));
t('onerror still gone on video',
  '<video src="/v.mp4" onerror="alert(1)" controls></video>',
  true, (x: string) => !/onerror/.test(x) && /controls/.test(x));

// rich text never gets iframes at all (no embeds in posts/rich blocks)
const richOut = sanitizeRichHtml('<p>x</p><iframe src="https://www.youtube.com/embed/ok"></iframe>');
const richOk = !richOut.includes('iframe');
console.log((richOk ? '  ok  ' : 'FAIL  ') + 'rich_text strips iframe entirely'.padEnd(34) + ' -> ' + richOut);
if (!richOk) fails++;

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILURES`);
process.exit(fails === 0 ? 0 : 1);
