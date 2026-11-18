/**
 * Comfort & access: axe passes with each setting on, settings persist across pages and
 * reloads, reset works, the panel works by keyboard, and identity-first wording swaps every
 * switchable term.
 */
import { expect, test } from '@playwright/test';
import { expectNoAxeViolations, withPrefs, type ComfortPrefsForTests } from './helpers';

const SAMPLE = ['/', '/donate/', '/stories/', '/kids/', '/kids/what-do-you-love/'];
const SETTINGS: [string, Partial<ComfortPrefsForTests>][] = [
  ['calm colours', { theme: 'calm' }],
  ['high contrast', { theme: 'contrast' }],
  ['dim', { theme: 'dim' }],
  ['largest text', { text: 150 }],
  ['reading spacing', { spacing: true }],
  ['simplified page', { simple: true }],
  ['reduce motion', { motion: 'reduced' }],
  ['strong focus', { focus: 'strong' }],
  ['identity-first wording', { identityFirst: true }],
];

test.describe('axe with each comfort setting', () => {
  // The settings change colours and spacing, not layout logic: desktop size is enough here.
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 1000, 'desktop only');
  // One test per setting and page: short tests that run in parallel and name the exact page.
  for (const [name, prefs] of SETTINGS) {
    for (const path of SAMPLE) {
      test(`${name}: ${path}`, async ({ page }) => {
        await withPrefs(page, prefs);
        await page.goto(path);
        await expectNoAxeViolations(page, `${path} with ${name}`);
      });
    }
  }
});

test('panel: opens, works by keyboard, Esc closes and returns focus', async ({ page }) => {
  await page.goto('/about/');
  const opener = page.locator('[data-comfort-open]');
  await opener.focus();
  await page.keyboard.press('Enter');
  const dialog = page.locator('[data-comfort]');
  await expect(dialog).toBeVisible();
  await expect(page.locator('#cp-title')).toBeFocused();
  await page.locator('#cp-spacing').check();
  await expect(page.locator('html')).toHaveAttribute('data-spacing', 'on');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
});

test('settings persist across pages and reloads, and reset clears them', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-comfort-open]').click();
  await page.locator('#cp-theme-contrast').check();
  await page.locator('#cp-text-130').check();
  await page.locator('[data-comfort-close]').first().click();

  await page.goto('/contact/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'contrast');
  await expect(page.locator('html')).toHaveAttribute('data-text', '130');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'contrast');

  await page.locator('[data-comfort-open]').click();
  await page.locator('[data-comfort-reset]').click();
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'contrast');
  await expect(page.locator('html')).not.toHaveAttribute('data-text', /./);
});

test('identity-first wording swaps every switchable term', async ({ page }) => {
  await page.goto('/'); // the home page uses <Term>
  const terms = page.locator('.term');
  expect(await terms.count()).toBeGreaterThan(0);
  await page.locator('[data-comfort-open]').click();
  await page.locator('#cp-identityFirst').check();
  for (const term of await terms.all()) {
    const wanted = await term.getAttribute('data-if');
    await expect(term).toHaveText(wanted!);
  }
});
