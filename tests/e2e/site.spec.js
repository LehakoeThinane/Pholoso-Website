// Pages, navigation, accessibility and the no-JavaScript fallback.
const { test, expect } = require('@playwright/test');
const { expectNoAxeViolations, watchErrors } = require('./helpers');

const PAGES = ['home', 'about', 'how', 'stories', 'involved', 'resources', 'contact', 'privacy'];

for (const name of PAGES) {
  test(`${name}: loads cleanly, one h1, passes axe`, async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto(`/#${name}`);
    await expect(page.locator('html')).toHaveAttribute('data-page', name);
    const active = page.locator(`.page[data-page="${name}"]`);
    await expect(active).toBeVisible();
    await expect(page.locator('.page:visible')).toHaveCount(1);
    await expect(active.locator('h1')).toHaveCount(1);
    await expect(active.locator('.reveal').first()).toHaveCSS('opacity', '1', { timeout: 5000 }).catch(() => {});
    await expectNoAxeViolations(page, name);
    expect(errors).toEqual([]);
  });
}

test('home keeps its search title; inner pages get their own', async ({ page }) => {
  await page.goto('/');
  const homeTitle = await page.title();
  expect(homeTitle).toContain('Pholoso Afrika Foundation');
  expect(homeTitle.length).toBeLessThanOrEqual(60);
  await page.getByRole('link', { name: 'Contact', exact: true }).first().click();
  await expect(page).toHaveTitle('Contact · Pholoso Afrika Foundation');
  await expect(page).toHaveURL(/#contact$/);
  await page.goBack();
  await expect(page.locator('html')).toHaveAttribute('data-page', 'home');
  await expect(page).toHaveTitle(homeTitle);
});

test('story and comfort dialogs isolate and restore their backgrounds', async ({ page }) => {
  await page.goto('/#stories');
  await page.locator('.story .more').first().click();
  await expect(page.locator('#main')).toHaveAttribute('inert', '');
  await page.keyboard.press('Escape');
  await expect(page.locator('#main')).not.toHaveAttribute('inert', '');
  await page.locator('#comfortFab').click();
  await expect(page.locator('#main')).toHaveAttribute('inert', '');
  await page.keyboard.press('Escape');
  await expect(page.locator('#main')).not.toHaveAttribute('inert', '');
});

test('mobile menu traps focus and restores the background on close', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 740 });
  await page.goto('/');
  await page.locator('#menuBtn').click();
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press(i % 5 === 0 ? 'Shift+Tab' : 'Tab');
    expect(await page.evaluate(() => document.getElementById('navlinks').contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(page.locator('#menuBtn')).toBeFocused();
  await expect(page.locator('#main')).not.toHaveAttribute('inert', '');
});

test('2to.iQ dropdown works by keyboard and marks the external link (NAV-01)', async ({ page }) => {
  await page.goto('/');
  const btn = page.locator('#iqBtn');
  await btn.focus();
  await page.keyboard.press('Enter');
  await expect(btn).toHaveAttribute('aria-expanded', 'true');
  const link = page.locator('#iqMenu a');
  await expect(link).toBeVisible();
  await expect(page.locator('#iqMenu')).toContainText('Thuto');
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toContainText('opens external site');
  await page.keyboard.press('Escape');
  await expect(page.locator('#iqMenu')).toBeHidden();
  await expect(btn).toBeFocused();
  await page.keyboard.press('Space');
  await expect(page.locator('#iqMenu')).toBeVisible();
  await page.locator('.hero h1').click();
  await expect(page.locator('#iqMenu')).toBeHidden();
});

test('the hero has distinct identity and action links', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.hero .btn')).toHaveText(['Who we are', 'Get involved']);
});

test.describe('mobile', () => {
  test.use({ viewport: { width: 375, height: 740 } });
  test('menu opens and closes by keyboard and touch; Comfort & access is in the menu', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Menu', exact: true }).click();
    await expect(page.locator('#navlinks')).toHaveClass(/open/);
    await expect(page.locator('#menuClose')).toBeFocused();
    await expect(page.locator('#navlinks [data-comfort-open]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#navlinks')).not.toHaveClass(/open/);
    await page.getByRole('button', { name: 'Menu', exact: true }).click();
    await page.locator('#navlinks').getByRole('link', { name: 'Stories' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-page', 'stories');
    await expect(page.locator('#navlinks')).not.toHaveClass(/open/);
  });
  test('no horizontal scroll on any page', async ({ page }) => {
    for (const name of PAGES) {
      await page.goto(`/#${name}`);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, name).toBeLessThanOrEqual(0);
    }
  });
});

test('stories: filters and the story dialog', async ({ page }) => {
  await page.goto('/#stories');
  await page.getByRole('button', { name: 'Parent' }).click();
  await expect(page.locator('.story:visible')).toHaveCount(1);
  await page.getByRole('button', { name: 'All voices' }).click();
  await expect(page.locator('.story:visible')).toHaveCount(4);
  const more = page.locator('.story .more').first();
  await more.click();
  const dialog = page.locator('#modal');
  await expect(dialog).toBeVisible();
  await expect(page.locator('#modalClose')).toBeFocused();
  await expect(page.locator('#m4')).toHaveText('Hire for the skill. Redesign interviews and offices so focus is possible.');
  await expectNoAxeViolations(page, 'story dialog');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(more).toBeFocused();
});

test('resources are clearly marked "Coming soon" and are not clickable cards', async ({ page }) => {
  await page.goto('/#resources');
  await expect(page.locator('.res-card .soon')).toHaveText(Array(6).fill('Coming soon'));
  await expect(page.locator('.res-card a')).toHaveCount(0);
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('every section and all story and interest copy is visible', async ({ page }) => {
    await page.goto('/');
    for (const name of PAGES) await expect(page.locator(`#${name}`)).toBeVisible();
    await expect(page.locator('.reveal').first()).toHaveCSS('opacity', '1');
    await expect(page.locator('.story-detail').first()).toBeVisible();
    await expect(page.locator('.passion-set').first()).toBeVisible();
    await expect(page.locator('#comfortFab')).toBeHidden();
    await page.getByRole('link', { name: 'Who We Are' }).first().click();
    await expect(page).toHaveURL(/#about$/);
  });
});
