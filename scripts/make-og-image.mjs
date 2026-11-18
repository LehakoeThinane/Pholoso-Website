// Generates public/og-image.png (1200×630), the image shown when a page is shared.
// Brand green background, the logo on a paper panel, the tagline in Atkinson Hyperlegible,
// and a gold bar along the bottom. Rendered with Playwright so the self-hosted font is used.
// Run after changing the logo or tagline, then commit the PNG:
//   node scripts/make-og-image.mjs          (BROWSER_CHANNEL=msedge|chrome to use an installed browser)
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('..', import.meta.url);
const read64 = (rel) => readFileSync(fileURLToPath(new URL(rel, root))).toString('base64');
const font = read64(
  'node_modules/@fontsource/atkinson-hyperlegible/files/atkinson-hyperlegible-latin-700-normal.woff2',
);
const logo = read64('src/assets/brand/logo.png');
const tagline = 'Every mind learns differently. Education should be built that way.';

// This HTML exists only inside the headless browser, never on the website.
const html = `<!doctype html><html><head><style>
@font-face { font-family: A; font-weight: 700; src: url(data:font/woff2;base64,${font}) format('woff2'); }
* { margin: 0; box-sizing: border-box; }
body { width: 1200px; height: 630px; background: #134B42; font-family: A, sans-serif; position: relative; overflow: hidden; }
.glow { position: absolute; inset: 0; background: radial-gradient(ellipse 70% 60% at 12% 0%, rgba(255,255,255,.06), transparent 70%), linear-gradient(180deg, #134B42, #0E3A33); }
.panel { position: absolute; left: 80px; top: 80px; padding: 28px 40px; background: #FBF9F4; border-radius: 18px; }
.panel img { display: block; width: 420px; height: auto; }
h1 { position: absolute; left: 80px; right: 60px; top: 280px; color: #FFFFFF; font-size: 58px; line-height: 1.15; font-weight: 700; }
.bar { position: absolute; left: 0; right: 0; bottom: 0; height: 28px; background: #EEA838; }
</style></head><body><div class="glow"></div>
<div class="panel"><img src="data:image/png;base64,${logo}" alt=""></div>
<h1>${tagline}</h1><div class="bar"></div></body></html>`;

const browser = await chromium.launch(
  process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {},
);
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html);
await page.evaluate(() => document.fonts.ready);
const out = fileURLToPath(new URL('public/og-image.png', root));
await page.screenshot({ path: out, type: 'png' });
await browser.close();
console.log(`wrote ${out}`);
