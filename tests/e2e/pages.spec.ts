/**
 * Every page, at both sizes: loads without console errors or third-party requests, has
 * exactly one <h1>, passes axe, and the first Tab reaches a working skip link.
 */
import { expect, test } from '@playwright/test';
import { allPages, expectNoAxeViolations, watch } from './helpers';

for (const path of allPages()) {
  test.describe(path, () => {
    test('loads cleanly, one h1, no axe violations', async ({ page }) => {
      const w = watch(page);
      const response = await page.goto(path);
      expect(response?.status(), 'status').toBeLessThan(400);
      await expect(page.locator('h1')).toHaveCount(1);
      await expectNoAxeViolations(page, path);
      w.assertClean();
    });

    test('first Tab is the skip link, and it moves focus to the main content', async ({ page }) => {
      await page.goto(path);
      await page.keyboard.press('Tab');
      const skip = page.locator('.skip-link');
      await expect(skip).toBeFocused();
      await expect(skip).toBeVisible();
      await page.keyboard.press('Enter');
      await expect(page.locator('main#main')).toBeFocused();
    });
  });
}

test('legacy hash URLs from the old site redirect to the new pages', async ({ page }) => {
  for (const [hash, target] of [
    ['#involved', '/get-involved/'],
    ['#about', '/about/'],
    ['#stories', '/stories/'],
  ] as const) {
    await page.goto(`/${hash}`);
    await expect(page).toHaveURL(new RegExp(`${target}$`));
  }
});

test('home page: the two doors sit under the hero and lead the right way', async ({ page }) => {
  await page.goto('/');
  const doors = page.getByRole('navigation', { name: 'Choose your way in' });
  await expect(doors.getByRole('link', { name: /I’m a kid/ })).toHaveAttribute('href', '/kids/');
  await doors.getByRole('link', { name: /I’m a grown-up/ }).click();
  await expect(page).toHaveURL(/#help$/);
  await expect(page.getByRole('heading', { name: 'How can we help?' })).toBeInViewport();
  // Four rows that start from the visitor's situation
  const rows = page.locator('#help').getByRole('link');
  await expect(rows).toHaveCount(4);
  await expect(rows.first()).toHaveAttribute('href', '/parent-guide/');
  // The doors come straight after the hero
  const order = await page.evaluate(() => {
    const hero = document.querySelector('.hero');
    const doors = document.querySelector('.doors');
    return !!hero && !!doors && hero.nextElementSibling === doors;
  });
  expect(order).toBe(true);
});
