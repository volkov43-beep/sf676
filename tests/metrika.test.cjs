const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const counter = html.match(/<!-- Yandex\.Metrika counter -->[\s\S]*?<!-- \/Yandex\.Metrika counter -->/g);
const fallback = html.match(/<!-- Yandex\.Metrika noscript fallback -->[\s\S]*?<!-- \/Yandex\.Metrika noscript fallback -->/g);
const script = counter?.[0].match(/<script[^>]*>([\s\S]*?)<\/script>/)?.[1];

test('one early head initializer and one body-only noscript pixel; original options', () => {
  assert.equal(counter?.length, 1);
  assert.equal(fallback?.length, 1);
  assert.ok(html.indexOf(counter[0]) < html.indexOf('<title>'));
  assert.ok(html.indexOf(counter[0]) < html.indexOf('</head>'));
  assert.ok(html.indexOf(fallback[0]) > html.indexOf('<body>'));
  assert.equal((html.match(/ym\(24910997,\s*'init'/g) || []).length, 1);
  assert.equal((html.match(/https:\/\/mc\.yandex\.ru\/metrika\/tag\.js/g) || []).length, 1);
  assert.equal((html.match(/https:\/\/mc\.yandex\.ru\/watch\/24910997/g) || []).length, 1);
  assert.equal((html.match(/24910997/g) || []).length, 2, 'init + no-JS pixel, not two counters');
  assert.match(fallback[0], /<img[^>]+style="position:absolute; left:-9999px;" alt=""/);
  assert.match(html, /<meta name="robots" content="noindex, nofollow">/);
});

function boot(existing = false) {
  const inserted = [];
  const first = {parentNode: {insertBefore(node, before) { assert.equal(before, first); inserted.push(node); }}};
  const document = {scripts: existing ? [{src:'https://mc.yandex.ru/metrika/tag.js'}] : [first],
    referrer:'https://example.test/source',createElement:tag=>({tagName:tag}),getElementsByTagName:()=>[first]};
  const context = {document,location:{href:'https://example.test/sf676/'}};
  context.window = context;
  vm.runInNewContext(script, context);
  return {context, inserted};
}
test('async SDK and exactly one queued initialization, even if the SDK is blocked', () => {
  const {context, inserted} = boot();
  assert.equal(inserted.length, 1);
  assert.equal(inserted[0].async, 1);
  assert.equal(inserted[0].src, 'https://mc.yandex.ru/metrika/tag.js');
  assert.equal(context.ym.a.length, 1);
  const [id, action, options] = Array.from(context.ym.a[0]);
  assert.equal(id,24910997); assert.equal(action,'init');
  assert.deepEqual(JSON.parse(JSON.stringify(options)), {webvisor:true,clickmap:true,ecommerce:'dataLayer',
    referrer:'https://example.test/source',url:'https://example.test/sf676/',accurateTrackBounce:true,trackLinks:true});
});
test('existing SDK is not inserted again; initialization is still queued once', () => {
  const {context, inserted} = boot(true);
  assert.equal(inserted.length, 0);
  assert.equal(context.ym.a.length, 1);
});
test('Webvisor exclusions and all 19 CTA remain present without custom goals or ecommerce events', () => {
  for (const cls of ['selector','payment-flow','request-dialog']) {
    assert.equal((html.match(new RegExp('class="'+cls+' ym-hide-content"','g')) || []).length, 1);
  }
  assert.equal((html.match(/data-request-form=/g)||[]).length,19);
  assert.equal(new Set([...html.matchAll(/data-source-cta="([^"]+)"/g)].map(m=>m[1])).size,19);
  assert.equal((html.match(/ym-hide-content/g)||[]).length,3);
  assert.doesNotMatch(html,/ym-(?:record-keys|show-content)|reachGoal|dataLayer\.push/);
});
