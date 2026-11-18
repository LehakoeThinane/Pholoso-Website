/** Everything works without JavaScript (brief §4.4 and §17). */
import { expect, test } from '@playwright/test';

test.use({ javaScriptEnabled: false });

test('navigation is visible and JS-only controls are hidden', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#site-nav')).toBeVisible();
  await expect(page.locator('.site-header__menu-button')).toBeHidden();
  await expect(page.locator('[data-comfort-open]')).toBeHidden();
});

test('approach: all interest panels shown, picker hidden', async ({ page }) => {
  await page.goto('/approach/');
  const panels = page.locator('[data-interest-panel]');
  expect(await panels.count()).toBe(6);
  for (const p of await panels.all()) await expect(p).toBeVisible();
  await expect(page.locator('[data-explorer-picker]')).toBeHidden();
});

test('stories: all stories shown, filter bar hidden', async ({ page }) => {
  await page.goto('/stories/');
  await expect(page.locator('[data-filter-target]')).toBeHidden();
  for (const s of await page.locator('[data-category]').all()) await expect(s).toBeVisible();
});

test("Kids' World games show everything and cards still open", async ({ page }) => {
  await page.goto('/kids/what-do-you-love/');
  await expect(page.locator('[data-picker]')).toBeHidden();
  for (const p of await page.locator('.love-panel').all()) await expect(p).toBeVisible();
  await page.locator('#love-trains summary').first().click();
  await expect(page.locator('#love-trains .flip__back').first()).toBeVisible();

  await page.goto('/kids/feelings/');
  for (const f of await page.locator('.feeling').all()) await expect(f).toBeVisible();

  await page.goto('/kids/calm-corner/');
  await expect(page.locator('.breathe__steps')).toBeVisible();
  await expect(page.locator('[data-breathe-start]')).toBeHidden();
});

test('forms post to the handler as normal HTML forms', async ({ page }) => {
  await page.goto('/contact/');
  const form = page.locator('#contact-form');
  await expect(form).toHaveAttribute('method', /post/i);
  await expect(form).toHaveAttribute('action', /contact\.php$/);
});
