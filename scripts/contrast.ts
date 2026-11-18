// Checks the contrast of every colour pair the site uses, in every theme, straight from
// src/styles/tokens.css. Fails (exit 1) if any pair is below its minimum:
//   text 4.5:1 (WCAG 1.4.3), UI boundaries and focus rings 3:1 (WCAG 1.4.11),
//   and 7:1 for body text and links in the High contrast theme (spec §7.2, WCAG 1.4.6).
// Usage: node scripts/contrast.ts   (Node 22.18+ runs TypeScript directly)
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');

/** Parses the declarations of one rule block, chosen by its exact selector. */
function block(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`Selector not found in tokens.css: ${selector}`);
  const body = css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start));
  const out: Record<string, string> = {};
  for (const m of body.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    out[m[1]!] = m[2]!.trim();
  }
  return out;
}

const root = block(':root');
const themes: Record<string, Record<string, string>> = {
  standard: root,
  calm: { ...root, ...block("[data-theme='calm']") },
  contrast: { ...root, ...block("[data-theme='contrast']") },
  dim: { ...root, ...block("[data-theme='dim']") },
};

function resolve(tokens: Record<string, string>, name: string, depth = 0): string {
  const raw = tokens[name];
  if (raw === undefined) throw new Error(`Unknown token ${name}`);
  const ref = raw.match(/^var\((--[\w-]+)\)$/);
  if (ref && depth < 10) return resolve(tokens, ref[1]!, depth + 1);
  if (!/^#[0-9a-f]{6}$/i.test(raw)) throw new Error(`${name} is not a 6-digit hex colour: ${raw}`);
  return raw.toLowerCase();
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const TEXT = 4.5;
const UI = 3;

// [foreground, background, minimum, what it is]
type Pair = [string, string, number, string];
const pairs: Pair[] = [
  // Page and surfaces
  ['--color-text', '--color-bg', TEXT, 'body text'],
  ['--color-text', '--color-surface', TEXT, 'body text on alt sections'],
  ['--color-text-muted', '--color-bg', TEXT, 'secondary text'],
  ['--color-text-muted', '--color-surface', TEXT, 'secondary text on alt sections'],
  ['--color-link', '--color-bg', TEXT, 'links'],
  ['--color-link', '--color-surface', TEXT, 'links on alt sections'],
  ['--color-error', '--color-bg', TEXT, 'error messages'],
  ['--color-error', '--color-surface', TEXT, 'error messages on alt sections'],
  ['--color-success', '--color-bg', TEXT, 'success messages'],
  ['--color-border', '--color-bg', UI, 'form field and card borders'],
  ['--color-border', '--color-surface', UI, 'borders on alt sections'],
  ['--color-focus', '--color-bg', UI, 'focus ring'],
  ['--color-focus', '--color-surface', UI, 'focus ring on alt sections'],
  // Buttons and badges
  ['--color-btn-text', '--color-btn-bg', TEXT, 'green button'],
  ['--color-cta-text', '--color-cta-bg', TEXT, 'gold button / gold band'],
  ['--color-bg', '--color-text', TEXT, 'pressed toggle buttons'],
  ['--color-bg', '--color-link', TEXT, 'info notice icon'],
  ['--color-bg', '--color-error', TEXT, 'error notice icon'],
  ['--color-bg', '--color-success', TEXT, 'success notice icon'],
  // Dark sections
  ['--color-dark-text', '--color-dark-bg', TEXT, 'text in dark sections'],
  ['--color-dark-text-muted', '--color-dark-bg', TEXT, 'secondary text in dark sections'],
  ['--color-dark-link', '--color-dark-bg', TEXT, 'links in dark sections'],
  ['--color-dark-text', '--color-dark-surface', TEXT, 'text on dark cards'],
  ['--color-dark-link', '--color-dark-surface', TEXT, 'links on dark cards'],
  ['--color-dark-text-muted', '--color-dark-bg', UI, 'borders in dark sections'],
  ['--color-dark-focus', '--color-dark-bg', UI, 'focus ring in dark sections'],
  ['--color-dark-bg', '--color-dark-text', TEXT, 'pressed toggles in dark sections'],
  // Gold band
  ['--color-on-cta-focus', '--color-cta-bg', UI, 'focus ring on the gold band'],
  // Kids' World: text, links and focus rings sit directly on the playful backgrounds
  ...(['sky', 'coral', 'leaf', 'lilac', 'sunshine', 'gold'] as const).flatMap((c): Pair[] => [
    ['--color-text', `--kids-${c}`, TEXT, `kids' text on ${c}`],
    ['--color-link', `--kids-${c}`, TEXT, `kids' links on ${c}`],
    ['--color-focus', `--kids-${c}`, UI, `focus ring on ${c}`],
  ]),
];

const aaaPairs: Pair[] = [
  ['--color-text', '--color-bg', 7, 'body text (AAA)'],
  ['--color-link', '--color-bg', 7, 'links (AAA)'],
];

/** Blends a colour towards white (amount > 0) or black (amount < 0), like a gloss layer. */
function blend(hex: string, amount: number): string {
  const target = amount >= 0 ? 255 : 0;
  const a = Math.abs(amount);
  return (
    '#' +
    [1, 3, 5]
      .map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * (1 - a) + target * a))
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('')
  );
}

let failures = 0;

// Gloss (Standard theme only): text must keep its contrast at the lightest and darkest
// points of each sheen. The strengths are read from tokens.css.
{
  const t = themes.standard!;
  const highlight = Number(root['--gloss-highlight']);
  const band = Number(root['--gloss-band-highlight']);
  if (!(highlight >= 0) || !(band >= 0)) throw new Error('Gloss strengths not found in tokens.css');
  const c = (n: string) => resolve(t, n);
  const glossPairs: [string, string, number, string][] = [
    [
      c('--color-btn-text'),
      blend(c('--color-btn-bg'), highlight),
      TEXT,
      'green button, top of sheen',
    ],
    [
      c('--color-cta-text'),
      blend(c('--color-cta-bg'), highlight),
      TEXT,
      'gold button, top of sheen',
    ],
    [
      c('--color-cta-text'),
      blend(c('--color-cta-bg'), -0.06),
      TEXT,
      'gold button, bottom of sheen',
    ],
    [c('--color-dark-text'), blend(c('--color-dark-bg'), band), TEXT, 'dark band text, highlight'],
    [
      c('--color-dark-text-muted'),
      blend(c('--color-dark-bg'), band),
      TEXT,
      'dark band muted text, highlight',
    ],
    [c('--color-dark-link'), blend(c('--color-dark-bg'), band), TEXT, 'dark band links, highlight'],
    [
      c('--color-dark-focus'),
      blend(c('--color-dark-bg'), band),
      UI,
      'dark band focus ring, highlight',
    ],
    [c('--color-cta-text'), blend(c('--color-cta-bg'), 0.18), TEXT, 'gold band, highlight'],
  ];
  const lines = glossPairs.map(([fg, bg, min, what]) => {
    const r = ratio(fg, bg);
    if (r < min) failures++;
    return `  ${r >= min ? 'ok  ' : 'FAIL'} ${r.toFixed(2).padStart(5)} ≥ ${min}  ${what} (${fg} on ${bg})`;
  });
  console.log(`standard gloss\n${lines.join('\n')}`);
}
for (const [theme, tokens] of Object.entries(themes)) {
  const list = theme === 'contrast' ? [...pairs, ...aaaPairs] : pairs;
  const lines: string[] = [];
  for (const [fg, bg, min, what] of list) {
    const r = ratio(resolve(tokens, fg), resolve(tokens, bg));
    const ok = r >= min;
    if (!ok) failures++;
    lines.push(
      `  ${ok ? 'ok  ' : 'FAIL'} ${r.toFixed(2).padStart(5)} ≥ ${min}  ${what} (${fg} on ${bg})`,
    );
  }
  console.log(`${theme}\n${lines.join('\n')}`);
}

if (failures) {
  console.error(`\ncontrast: ${failures} pair(s) below the minimum`);
  process.exit(1);
}
console.log('\ncontrast: all pairs pass');
