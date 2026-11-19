/** Shared helpers for the browser tests. */
import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

/** Every page in the built sitemap, plus the pages kept out of it on purpose. */
export function allPages(): string[] {
  const xml = readFileSync('dist/sitemap-0.xml', 'utf8');
  const fromSitemap = [...xml.matchAll(/<loc>https:\/\/pholoso\.africa(\/[^<]*)<\/loc>/g)].map(
    (m) => m[1]!,
  );
  return [...fromSitemap, '/thank-you/', '/404.html', '/styleguide/'];
}

export const kidsPages = () => allPages().filter((p) => p.startsWith('/kids/'));

/**
 * Watches a page for console errors, uncaught exceptions and requests to other websites.
 * Call before navigating; call `assertClean()` at the end of the test.
 */
export function watch(page: Page) {
  const problems: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(`console: ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`exception: ${e.message}`));
  page.on('request', (r) => {
    const url = new URL(r.url());
    if (url.hostname !== 'localhost' && url.protocol !== 'data:') {
      problems.push(`third-party request: ${r.url()}`);
    }
  });
  return {
    assertClean: () => expect(problems, problems.join('\n')).toEqual([]),
  };
}

/** WCAG 2.0–2.2 A and AA, plus axe best practices (brief §17). */
export const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

export async function expectNoAxeViolations(page: Page, context = ''): Promise<void> {
  // Let entrance animations finish first: mid-fade, text is partly transparent and axe would
  // measure the wrong contrast. (Endless animations, such as the breathing shape, are skipped.)
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .every((a) => a.playState !== 'running' || a.effect?.getTiming().iterations === Infinity),
  );
  const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  const summary = violations
    .map(
      (v) =>
        `${v.id} (${v.impact}): ${v.help}\n` +
        v.nodes
          .slice(0, 5)
          .map((n) => `    ${n.target.join(' ')}`)
          .join('\n'),
    )
    .join('\n');
  expect(violations, `${context}\n${summary}`).toEqual([]);
}

/** Saves Comfort & access settings before the page loads, as a returning visitor would have. */
export async function withPrefs(page: Page, prefs: Partial<ComfortPrefsForTests>): Promise<void> {
  await page.addInitScript((p) => {
    window.localStorage.setItem('pholoso-comfort', JSON.stringify({ v: 1, ...p }));
  }, prefs);
}

export interface ComfortPrefsForTests {
  theme: 'standard' | 'calm' | 'contrast' | 'dim';
  text: 100 | 115 | 130 | 150;
  spacing: boolean;
  guide: boolean;
  motion: 'reduced' | 'full';
  simple: boolean;
  images: boolean;
  focus: 'strong' | 'normal';
  identityFirst: boolean;
  sound: boolean;
  gloss: boolean;
}
