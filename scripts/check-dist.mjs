// Checks the built site in dist/ against the Content-Security-Policy and privacy rules:
//   - no inline <script> (JSON-LD is allowed), no <style> elements, no style="" attributes
//   - no inline event handlers (onclick="…") and no javascript: URLs
//   - no resources loaded from other origins (scripts, styles, images, fonts, frames)
// Usage: node scripts/check-dist.mjs [distDir]
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const dist = process.argv[2] ?? 'dist';
const SITE_ORIGIN = 'https://pholoso.africa';

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

let files;
try {
  files = walk(dist);
} catch {
  console.error(`check-dist: "${dist}" not found. Run a build first.`);
  process.exit(1);
}

const problems = [];
const report = (file, msg) => problems.push(`${relative(dist, file)}: ${msg}`);

for (const file of files.filter((f) => f.endsWith('.html'))) {
  const html = readFileSync(file, 'utf8');

  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const attrs = m[1];
    const body = m[2].trim();
    if (/type\s*=\s*["']?application\/ld\+json/i.test(attrs)) continue;
    if (!/\bsrc\s*=/.test(attrs)) report(file, `inline <script>: ${body.slice(0, 60)}…`);
    else if (body) report(file, 'external <script> with inline content');
  }
  if (/<style\b/i.test(html)) report(file, '<style> element');
  if (/\sstyle\s*=/i.test(html)) report(file, 'style="" attribute');
  if (/\son[a-z]+\s*=/i.test(html.replace(/<script[\s\S]*?<\/script>/gi, '')))
    report(file, 'inline event handler attribute (on…=)');
  if (/javascript:/i.test(html)) report(file, 'javascript: URL');

  // Resources that load automatically must come from this site.
  const resource =
    /<(?:script|img|source|iframe|audio|video|embed)\b[^>]*\s(?:src|srcset)\s*=\s*["']([^"']+)["']|<link\b[^>]*\srel=["'](?:stylesheet|preload|modulepreload|icon|manifest)["'][^>]*\shref\s*=\s*["']([^"']+)["']/gi;
  for (const m of html.matchAll(resource)) {
    const urls = (m[1] ?? m[2] ?? '').split(',').map((s) => s.trim().split(/\s+/)[0]);
    for (const u of urls) {
      if (/^(https?:)?\/\//i.test(u) && !u.startsWith(SITE_ORIGIN)) {
        report(file, `third-party resource: ${u}`);
      }
    }
  }
}

for (const file of files.filter((f) => f.endsWith('.css'))) {
  const css = readFileSync(file, 'utf8');
  for (const m of css.matchAll(/url\(\s*["']?((?:https?:)?\/\/[^"')]+)/gi)) {
    if (!m[1].startsWith(SITE_ORIGIN)) report(file, `third-party url() in CSS: ${m[1]}`);
  }
  if (/@import\s+url\(\s*["']?(https?:)?\/\//i.test(css)) report(file, 'remote @import in CSS');
}

// Photo budget (brief §12): every AVIF/WebP photo at most 150 KB at its largest size.
const PHOTO_MAX = 150 * 1024;
let largestPhoto = 0;
for (const file of files.filter((f) => /\.(avif|webp)$/.test(f))) {
  const size = statSync(file).size;
  largestPhoto = Math.max(largestPhoto, size);
  if (size > PHOTO_MAX) report(file, `photo is ${Math.round(size / 1024)} KB (limit 150 KB)`);
}

// Every built HTML page must have exactly one <h1>, a title and a description; every indexable
// page also a canonical URL (noindex pages, like the 404 page, must not have one).
for (const file of files.filter((f) => f.endsWith('.html'))) {
  const html = readFileSync(file, 'utf8');
  if ((html.match(/<h1[\s>]/g) ?? []).length !== 1) report(file, 'must have exactly one <h1>');
  if (!/<title>[^<]+<\/title>/.test(html)) report(file, 'missing <title>');
  if (!/<meta name="description" content="[^"]+"/.test(html))
    report(file, 'missing meta description');
  const noindex = /<meta name="robots" content="noindex"/.test(html);
  const canonical = /<link rel="canonical" href="https:\/\/pholoso\.africa\//.test(html);
  if (!noindex && !canonical) report(file, 'missing canonical URL');
  if (noindex && canonical) report(file, 'noindex page must not declare a canonical URL');
}

// Kids' World child-safety rules (brief §7). Checked on every page under /kids/.
const sep = /[\\/]/;
for (const file of files.filter((f) => f.endsWith('.html'))) {
  const parts = relative(dist, file).split(sep);
  if (parts[0] !== 'kids') continue;
  const isGate = parts[1] === 'ask-a-grown-up';
  const html = readFileSync(file, 'utf8');
  const body = (html.split('<body')[1] ?? '').replace(/<dialog[\s\S]*?<\/dialog>/gi, '');
  const text = body.replace(/<[^>]+>/g, ' ');

  if (/\bdonat/i.test(body)) report(file, "Kids' World page mentions donating");
  if (/<form\b/i.test(body))
    report(file, "Kids' World page has a form (no data collection from children)");
  if (/\b(subscribe|sign up for updates|newsletter)\b/i.test(text))
    report(file, "Kids' World page has a sign-up or newsletter");
  if (/\bshare (this|on)\b/i.test(text)) report(file, "Kids' World page has share buttons");
  if (!/data-listen="main"/.test(body)) report(file, 'missing the "Read it to me" button');
  if (!/Tell a grown-up you trust/.test(text)) report(file, 'missing the "Need help now?" note');

  for (const m of body.matchAll(/<a\b[^>]*\shref\s*=\s*["']([^"']+)["']/gi)) {
    const href = m[1];
    const leaves = /^(https?:)?\/\//i.test(href) && !href.startsWith(SITE_ORIGIN);
    if ((leaves || /^(mailto|tel):/i.test(href)) && !isGate)
      report(file, `links straight out of Kids' World (use GrownUpLink): ${href}`);
  }
  // Picture buttons and toggles must have words, not only a picture.
  for (const m of body.matchAll(
    /<(a|button)\b[^>]*class="[^"]*(pic-btn|kids-toggle|picker__button|face-button)[^"]*"[^>]*>([\s\S]*?)<\/\1>/gi,
  )) {
    const words = m[3]
      .replace(/<svg[\s\S]*?<\/svg>/gi, '')
      .replace(/<[^>]+>/g, '')
      .trim();
    if (!words) report(file, `picture button without words (${m[2]})`);
  }
}

// Printables: each PDF at most 300 KB (brief §7).
for (const file of files.filter((f) => f.endsWith('.pdf'))) {
  const size = statSync(file).size;
  if (size > 300 * 1024) report(file, `printable is ${Math.round(size / 1024)} KB (limit 300 KB)`);
}

// Flashing (WCAG 2.3.1): no CSS animation may repeat faster than three times a second.
for (const file of files.filter((f) => f.endsWith('.css'))) {
  const css = readFileSync(file, 'utf8');
  for (const m of css.matchAll(/animation(?:-duration)?\s*:[^;}]*?(\d*\.?\d+)(m?s)\b[^;}]*/gi)) {
    const seconds = m[2] === 'ms' ? Number(m[1]) / 1000 : Number(m[1]);
    const repeats = /infinite|\b[2-9]\d*\b(?![.\d]*m?s)/.test(m[0]);
    if (repeats && seconds > 0.01 && seconds < 0.34)
      report(file, `animation repeats faster than 3 times a second: ${m[0].trim()}`);
  }
}

if (problems.length) {
  console.error(`check-dist: ${problems.length} problem(s)\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log(
  `check-dist: ${files.length} files checked, no inline scripts/styles, no third-party resources, ` +
    `largest photo ${Math.round(largestPhoto / 1024)} KB.`,
);
