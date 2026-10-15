// Fast static checks for the site (no browser, no server). Run: node tests/check-site.mjs
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = f => fs.readFileSync(path.join(root, f));
const failures = [];
const check = (name, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${name}${!ok && detail ? ' -- ' + detail : ''}`);
  if (!ok) failures.push(name);
};

const raw = read('index.html');
const html = raw.toString('utf8');

check('index.html has no NUL bytes', !raw.includes(0));
check('index.html ends with </html>', /<\/html>\s*$/.test(html));
check('both embedded logos are intact', (html.match(/data:image\/png;base64,/g) || []).length === 2);

const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
scripts.forEach((code, i) => {
  let err = '';
  try { new Function(code); } catch (e) { err = e.message; }
  check(`inline script ${i + 1} parses`, !err, err);
});

const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => m[1]);
check('structured data present', ld.length >= 2);
ld.forEach((j, i) => {
  let data = null;
  try { data = JSON.parse(j); } catch (e) { /* reported below */ }
  check(`structured data block ${i + 1} is valid JSON`, !!data);
});
const faqLd = ld.map(j => { try { return JSON.parse(j); } catch { return null; } }).find(d => d && d['@type'] === 'FAQPage');
const visibleFaq = [...html.matchAll(/<details class="faq[^"]*"><summary>(.*?)<\/summary>/g)].map(m => m[1]);
check('FAQ markup matches the visible questions',
  !!faqLd && JSON.stringify(faqLd.mainEntity.map(q => q.name)) === JSON.stringify(visibleFaq));

const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
const desc = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
check(`title is 1-60 characters (${title.length})`, title.length > 0 && title.length <= 60);
check(`description is 1-155 characters (${desc.length})`, desc.length > 0 && desc.length <= 155);

const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
const dupes = ids.filter((x, i) => ids.indexOf(x) !== i);
check('no duplicate ids', dupes.length === 0, dupes.join(', '));

const pages = [...html.matchAll(/<section class="page" data-page="(\w+)"/g)].map(m => m[1]);
const navTargets = new Set([...html.matchAll(/data-nav="(\w+)"/g)].map(m => m[1]));
const missingPages = [...navTargets].filter(t => !pages.includes(t));
check('every nav target has a page', missingPages.length === 0, missingPages.join(', '));
check('every nav link has a real href', !/<a (?![^>]*href=)[^>]*data-nav=/.test(html));
const labelled = [...html.matchAll(/aria-(?:labelledby|describedby|controls)="([^"]+)"/g)].flatMap(m => m[1].split(/\s+/));
const dangling = labelled.filter(id => !ids.includes(id));
check('aria references point at real ids', dangling.length === 0, dangling.join(', '));

// Deployment set
const deploy = read('deploy-files.txt').toString().split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#'));
const missing = deploy.filter(f => !fs.existsSync(path.join(root, f)));
check('every file in deploy-files.txt exists', missing.length === 0, missing.join(', '));
const localRefs = [...html.matchAll(/(?:src|href|action)="([^"#:?]+)"/g)].map(m => m[1].replace(/^\//, ''))
  .filter(r => r && !r.startsWith('mailto') && !r.startsWith('data'));
const absRefs = [...html.matchAll(/https:\/\/pholoso\.africa\/([^"#?\s]+)/g)].map(m => m[1]);
const notDeployed = [...new Set([...localRefs, ...absRefs])].filter(r => !deploy.includes(r));
check('every file the page references is deployed', notDeployed.length === 0, notDeployed.join(', '));

// robots.txt and sitemap.xml
const robots = read('robots.txt').toString();
check('robots.txt has a User-agent group and the sitemap', /^User-agent: \*/m.test(robots) && /^Sitemap: https:\/\/pholoso\.africa\/sitemap\.xml$/m.test(robots));
const sitemap = read('sitemap.xml').toString();
check('sitemap.xml lists the homepage with lastmod',
  sitemap.startsWith('<?xml') && /<loc>https:\/\/pholoso\.africa\/<\/loc>/.test(sitemap) && /<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/.test(sitemap));

// .htaccess backstop rules
const ht = read('.htaccess').toString();
for (const needle of ['RedirectMatch 404 (?i)/\\.(?!well-known/)', 'docs|brand', 'config(\\.example)?\\.php', '\\.(md|markdown']) {
  check(`.htaccess blocks ${needle}`, ht.includes(needle));
}

console.log(failures.length ? `\n${failures.length} check(s) failed` : '\nall checks passed');
process.exit(failures.length ? 1 : 0);
