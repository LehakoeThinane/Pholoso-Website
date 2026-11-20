// Read-aloud texts for Kids' World (brief v5 §10c). Opens every built Kids' World page in a
// browser and saves, for each "Read it to me" button, exactly the text it reads, to
// content/audio/en/<id>.txt. Also: one text per "Did you know?" fact, and the Calm corner's
// breathing words. scripts/generate-audio.py then turns each text into an MP3.
//
//   pnpm build:preview && node scripts/audio-texts.mjs          (write the texts)
//   node scripts/audio-texts.mjs --check                        (CI: fail if any changed)
//
// The text rules must match textOf() in src/scripts/listen.ts.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '@playwright/test';

const CHECK = process.argv.includes('--check');
const PORT = 4395;
const OUT = 'content/audio/en';
mkdirSync(OUT, { recursive: true });

/** Every Kids' World page in dist/ (not the "Ask a grown-up" pages, which have no button). */
function pages(dir = 'dist/kids', base = '/kids/') {
  const out = [];
  if (existsSync(join(dir, 'index.html'))) out.push(base);
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory() && name !== 'ask-a-grown-up')
      out.push(...pages(p, `${base}${name}/`));
  }
  return out;
}

const server = spawn(
  process.execPath,
  ['node_modules/astro/bin/astro.mjs', 'preview', '--port', String(PORT)],
  {
    stdio: 'ignore',
  },
);
for (let i = 0; i < 60; i++) {
  try {
    if ((await fetch(`http://localhost:${PORT}/kids/`)).ok) break;
  } catch {
    /* not yet */
  }
  await new Promise((r) => setTimeout(r, 500));
}

const texts = new Map();
const channel = process.env.PW_CHANNEL;
const browser = await chromium.launch(channel ? { channel } : {});
try {
  const page = await browser.newPage();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const path of pages()) {
    await page.goto(`http://localhost:${PORT}${path}`);
    const found = await page.evaluate(() => {
      // Same rules as textOf() in src/scripts/listen.ts
      const textOf = (el) => {
        const clone = el.cloneNode(true);
        clone
          .querySelectorAll(
            'button, [hidden], .visually-hidden:not([data-read]), [aria-hidden="true"], form, dialog, [data-read-skip]',
          )
          .forEach((n) => n.remove());
        clone.querySelectorAll('details:not([open]) > :not(summary)').forEach((n) => n.remove());
        clone
          .querySelectorAll('h1, h2, h3, h4, p, li, dt, dd, figcaption, summary, label')
          .forEach((n) => n.append('\n'));
        return (clone.textContent ?? '')
          .split('\n')
          .map((line) => line.replace(/\s+/g, ' ').trim())
          .filter(Boolean)
          .map((line) => (/[.!?…:”"’]$/.test(line) ? line : `${line}.`))
          .join(' ');
      };
      const out = [...document.querySelectorAll('[data-audio-id]')].map((b) => {
        const key = b.getAttribute('data-listen');
        const target =
          key === 'main' ? document.getElementById('main') : document.getElementById(key);
        return [b.getAttribute('data-audio-id'), target ? textOf(target) : ''];
      });
      // "Did you know?" facts: all of them are on the page (one shown at a time)
      document
        .querySelectorAll('[data-fact]')
        .forEach((li, i) => out.push([`fact-${i}`, `Did you know? ${li.textContent.trim()}`]));
      return out;
    });
    for (const [id, text] of found) if (text) texts.set(id, text);
  }
} finally {
  await browser.close();
  server.kill();
}
texts.set('breathe-in', 'Breathe in…');
texts.set('breathe-out', 'and breathe out.');

let changed = 0;
for (const [id, text] of texts) {
  const file = join(OUT, `${id}.txt`);
  const old = existsSync(file) ? readFileSync(file, 'utf8').trim() : null;
  if (old !== text) {
    changed++;
    console.log(`${old === null ? 'new' : 'changed'}: ${id}`);
    if (!CHECK) writeFileSync(file, text + '\n');
  }
}
for (const name of readdirSync(OUT)) {
  if (name.endsWith('.txt') && !texts.has(name.slice(0, -4))) {
    changed++;
    console.log(`no longer used: ${name.slice(0, -4)}`);
  }
}
console.log(`audio texts: ${texts.size} in use, ${changed} new or changed`);
if (CHECK && changed) {
  console.error(
    'Read-aloud recordings are out of date: run scripts/audio-texts.mjs and scripts/generate-audio.py (docs/AUDIO.md).',
  );
  process.exit(1);
}
