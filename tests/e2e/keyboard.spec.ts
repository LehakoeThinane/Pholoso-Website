/** Keyboard-only journeys: menu, story filters and the interest explorer (brief §17). */
import { expect, test } from '@playwright/test';

test('mobile menu opens and closes by keyboard; Esc returns focus to the button', async ({
  page,
  viewport,
}) => {
  test.skip((viewport?.width ?? 0) >= 992, 'the menu button only shows on small screens');
  await page.goto('/');
  const button = page.locator('.site-header__menu-button');
  const nav = page.locator('#site-nav');
  await expect(nav).toBeHidden();
  await button.focus();
  await page.keyboard.press('Enter');
  await expect(button).toHaveAttribute('aria-expanded', 'true');
  await expect(nav).toBeVisible();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Escape');
  await expect(button).toHaveAttribute('aria-expanded', 'false');
  await expect(button).toBeFocused();
  await expect(nav).toBeHidden();
});

test('story filters work by keyboard and announce the result', async ({ page }) => {
  await page.goto('/stories/');
  const bar = page.locator('[data-filter-target]');
  await expect(bar).toBeVisible();
  const parents = bar.locator('[data-filter="parents"]');
  await parents.focus();
  await page.keyboard.press('Enter');
  await expect(parents).toHaveAttribute('aria-pressed', 'true');
  const visible = page.locator('[data-category]:visible');
  await expect(visible).not.toHaveCount(0);
  for (const story of await visible.all()) {
    await expect(story).toHaveAttribute('data-category', 'parents');
  }
  await expect(bar.locator('[data-filter-status]')).toContainText('Showing');
  await bar.locator('[data-filter="all"]').press('Enter');
  await expect(page.locator('[data-category]:visible')).toHaveCount(
    await page.locator('[data-category]').count(),
  );
});

test('interest explorer shows one interest at a time, by keyboard', async ({ page }) => {
  await page.goto('/approach/');
  const buttons = page.locator('[data-interest]');
  const second = buttons.nth(1);
  await second.focus();
  await page.keyboard.press('Space');
  await expect(second).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-interest-panel]:visible')).toHaveCount(1);
  const slug = await second.getAttribute('data-interest');
  await expect(page.locator(`[data-interest-panel="${slug}"]`)).toBeVisible();
});

test('wide screens: four menu entries in one row, between the logo and Donate', async ({
  page,
  viewport,
}) => {
  test.skip((viewport?.width ?? 0) < 1116, 'one-row header is for wide screens');
  await page.goto('/about/');
  await expect(page.locator('.site-nav__list > li')).toHaveCount(4);
  const top = (sel: string) =>
    page
      .locator(sel)
      .first()
      .evaluate((e) => e.getBoundingClientRect().top);
  const row = Math.round((await top('.site-nav__list')) / 20);
  expect(Math.round((await top('.site-header__home')) / 20)).toBe(row);
  expect(Math.round((await top('.site-header__donate')) / 20)).toBe(row);
});

test('menu groups open by keyboard, one at a time; Esc closes and returns focus', async ({
  page,
  viewport,
}) => {
  await page.goto('/');
  if ((viewport?.width ?? 0) < 1116) await page.locator('.site-header__menu-button').click();
  const about = page.locator('[data-nav-group]', { hasText: 'About' }).first();
  const involved = page.locator('[data-nav-group]', { hasText: 'Get involved' });
  await about.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(about).toHaveAttribute('open', '');
  await expect(about.getByRole('link', { name: 'About us' })).toBeVisible();
  // Opening another group closes the first
  await involved.locator('summary').click();
  await expect(involved).toHaveAttribute('open', '');
  await expect(about).not.toHaveAttribute('open', '');
  // Escape closes the open group and returns focus to its heading
  await involved.getByRole('link', { name: 'Contact us' }).focus();
  await page.keyboard.press('Escape');
  await expect(involved).not.toHaveAttribute('open', '');
  await expect(involved.locator('summary')).toBeFocused();
  // A click elsewhere closes it too
  await involved.locator('summary').click();
  await page.locator('main h1').click();
  await expect(involved).not.toHaveAttribute('open', '');
});
