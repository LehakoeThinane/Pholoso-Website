// Internal link check for the built site (brief §17: internal links 100%).
// Works offline, straight from dist/: every same-site href and src must resolve to a built
// file, and every #fragment must match an id on the target page.
// Links to other websites are not checked here (CI reports them separately, without failing).
// Usage: node scripts/check-links.mjs [distDir]
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const dist = process.argv[2] ?? 'dist';
const SITE = 'https://pholoso.africa';

const walk = (dir) =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

if (!existsSync(dist)) {
  console.error(`check-links: "${dist}" not found. Run a build first.`);
  process.exit(1);
}
const pages = walk(dist).filter((f) => f.endsWith('.html'));

/** The URL path a built file is served at: dist/about/index.html -> /about/ */
const urlOf = (file) =>
  '/' +
  relative(dist, file)
    .split(sep)
    .join('/')
    .replace(/(^|\/)index\.html$/, '$1');

/** The built file for a URL path, or null. */
function fileFor(path) {
  const clean = decodeURIComponent(path.replace(/[?#].*$/, ''));
  const candidates = clean.endsWith('/')
    ? [join(dist, clean, 'index.html')]
    : [join(dist, clean), join(dist, clean, 'index.html'), join(dist, `${clean}.html`)];
  return candidates.find((c) => existsSync(c) && statSync(c).isFile()) ?? null;
}

const idCache = new Map();
function idsIn(file) {
  if (!idCache.has(file)) {
    const html = readFileSync(file, 'utf8');
    idCache.set(file, new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
  }
  return idCache.get(file);
}

const problems = [];
let checked = 0;
for (const page of pages) {
  const html = readFileSync(page, 'utf8');
  const base = new URL(urlOf(page), SITE);
  for (const m of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
    const raw = m[1];
    if (/^(mailto|tel|data|javascript):/i.test(raw)) continue;
    const url = new URL(raw, base);
    if (url.origin !== SITE) continue; // other websites: reported separately
    const target =
      url.pathname === base.pathname && raw.startsWith('#') ? page : fileFor(url.pathname);
    checked++;
    if (!target) {
      problems.push(`${urlOf(page)} -> ${raw} (no such page or file)`);
      continue;
    }
    if (url.hash && url.hash !== '#' && target.endsWith('.html')) {
      const id = decodeURIComponent(url.hash.slice(1));
      if (!idsIn(target).has(id)) problems.push(`${urlOf(page)} -> ${raw} (no id="${id}" there)`);
    }
  }
}

if (problems.length) {
  console.error(
    `check-links: ${problems.length} broken internal link(s)\n  ${problems.join('\n  ')}`,
  );
  process.exit(1);
}
console.log(`check-links: ${checked} internal links on ${pages.length} pages, all resolve.`);
