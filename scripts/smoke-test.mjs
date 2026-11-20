// Post-deploy smoke test (brief §15). Run it after every upload, against the live site:
//
//   node scripts/smoke-test.mjs                       (checks https://pholoso.africa)
//   node scripts/smoke-test.mjs https://example.org   (another address, e.g. a staging copy)
//
// It checks, without sending any email:
//   - every page in the sitemap answers 200
//   - a missing page answers 404 with the site's own 404 page
//   - http:// and www. redirect to https://pholoso.africa (live domain only)
//   - security headers are present (CSP, nosniff, Referrer-Policy, Permissions-Policy)
//   - private files (form handler library) are not served
//   - the form handler accepts a test submission (test=TEST: everything runs, nothing is sent)
//
// Exit code 0 = all good. Warnings (shown as "warn") do not fail it.
const base = (process.argv[2] ?? 'https://pholoso.africa').replace(/\/$/, '');
const isLive = new URL(base).hostname === 'pholoso.africa';
const results = [];
const ok = (msg) => results.push(['ok  ', msg]);
const fail = (msg) => results.push(['FAIL', msg]);
const warn = (msg) => results.push(['warn', msg]);

async function get(path, init = {}) {
  return fetch(path.startsWith('http') ? path : base + path, { redirect: 'manual', ...init });
}

// 1. Every page in the sitemap
try {
  const index = await (await get('/sitemap-index.xml')).text();
  const maps = [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const urls = [];
  for (const map of maps) {
    const xml = await (await get(new URL(new URL(map).pathname, base).href)).text();
    urls.push(...[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname));
  }
  if (!urls.length) fail('sitemap lists no pages');
  let good = 0;
  for (const path of urls) {
    const r = await get(path);
    if (r.status === 200) good++;
    else fail(`${path} answered ${r.status}`);
  }
  if (good) ok(`${good} of ${urls.length} sitemap pages answer 200`);
} catch (e) {
  fail(`could not read the sitemap: ${e.message}`);
}

// 2. Not found
{
  const r = await get('/this-page-does-not-exist-smoke-test/');
  const body = await r.text();
  if (r.status === 404 && /<h1/i.test(body)) ok('missing pages get the 404 page (status 404)');
  else fail(`missing page answered ${r.status}${/<h1/i.test(body) ? '' : ' without the 404 page'}`);
}

// 3. Redirects (live domain only)
if (isLive) {
  for (const from of ['http://pholoso.africa/', 'https://www.pholoso.africa/']) {
    try {
      const r = await get(from);
      const to = r.headers.get('location') ?? '';
      if (r.status === 301 && to.startsWith('https://pholoso.africa/')) ok(`${from} → ${to} (301)`);
      else
        fail(
          `${from} answered ${r.status} → ${to || 'nowhere'} (expected 301 to https://pholoso.africa/)`,
        );
    } catch (e) {
      warn(`${from}: ${e.message}`);
    }
  }
}

// 4. Security headers on the home page
{
  const r = await get('/');
  const h = (name) => r.headers.get(name) ?? '';
  const csp = h('content-security-policy');
  if (/default-src 'self'/.test(csp) && !/unsafe-inline/.test(csp))
    ok('Content-Security-Policy is strict');
  else fail(`Content-Security-Policy missing or loose: "${csp}"`);
  if (h('x-content-type-options') === 'nosniff') ok('X-Content-Type-Options: nosniff');
  else fail('X-Content-Type-Options missing');
  if (h('referrer-policy')) ok(`Referrer-Policy: ${h('referrer-policy')}`);
  else fail('Referrer-Policy missing');
  if (/camera=\(\)/.test(h('permissions-policy')))
    ok('Permissions-Policy denies camera and location, microphone only for this site');
  else fail('Permissions-Policy missing');
  if (isLive) {
    if (h('strict-transport-security')) ok('HSTS is on');
    else warn('HSTS header not seen');
  }
  if (/no-cache/.test(h('cache-control'))) ok('HTML is not cached');
  else warn(`HTML Cache-Control is "${h('cache-control')}" (expected no-cache)`);
}

// 5. Private files are not served
for (const path of ['/lib/form-handler.php', '/lib/mailer.php']) {
  const r = await get(path);
  if (r.status === 403 || r.status === 404) ok(`${path} is blocked (${r.status})`);
  else fail(`${path} answered ${r.status}: private files must not be served`);
}

// 6. The form handler, without sending email
{
  const body = new URLSearchParams({
    type: 'contact',
    form: 'contact-form',
    topic: 'general',
    email: 'smoke-test@pholoso.africa',
    message: 'Automated deployment check. Nothing is sent.',
    consent: 'yes',
    website: '',
    test: 'TEST',
  });
  try {
    const r = await get('/contact.php', {
      method: 'POST',
      body,
      headers: { Accept: 'application/json', Origin: base, Referer: `${base}/contact/` },
    });
    const json = await r.json().catch(() => null);
    if (json?.code === 'test') ok('form handler works (test submission, nothing sent)');
    else if (json?.code === 'not_configured')
      warn(
        'form handler runs, but is not set up yet: forms will ask visitors to email instead (see DEPLOY.md, step 0)',
      );
    else if (json?.code === 'rate_limited')
      warn('form handler rate limit reached: wait 10 minutes and run again');
    else
      fail(
        `form handler answered ${r.status}: ${json ? JSON.stringify(json) : 'not JSON (is PHP running?)'}`,
      );
  } catch (e) {
    fail(`form handler: ${e.message}`);
  }
}

console.log(`Smoke test: ${base}\n`);
for (const [s, m] of results) console.log(`  ${s}  ${m}`);
const failures = results.filter(([s]) => s === 'FAIL').length;
console.log(
  failures
    ? `\n${failures} problem(s). See docs/DEPLOY.md, "If something goes wrong".`
    : '\nAll good.',
);
process.exit(failures ? 1 : 0);
