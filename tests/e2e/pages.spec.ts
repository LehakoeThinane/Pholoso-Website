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

test('home page: FAQs before the footer, matched by FAQ structured data for search engines', async ({
  page,
}) => {
  await page.goto('/');
  const questions = page.locator('#faq details summary');
  const count = await questions.count();
  expect(count).toBeGreaterThan(4);
  // The FAQ section is the last band before the footer
  await expect(page.locator('#main > .section').last()).toHaveAttribute('id', 'faq');
  const data = JSON.parse(
    (await page.locator('script[type="application/ld+json"]').first().textContent()) ?? '{}',
  );
  const types = data['@graph'].map((n: { '@type': string }) => n['@type']);
  expect(types).toEqual(['NGO', 'WebSite', 'WebPage', 'FAQPage']);
  const faq = data['@graph'][3].mainEntity as { name: string; acceptedAnswer: { text: string } }[];
  expect(faq.map((q) => q.name)).toEqual((await questions.allTextContents()).map((t) => t.trim()));
  for (const q of faq) expect(q.acceptedAnswer.text).not.toMatch(/\]\(|<|\*\*/); // plain text
  // The footer shows the email address and the registration numbers (no address or phone)
  const footer = page.locator('footer.site-footer');
  await expect(footer.getByText('Email:')).toBeVisible();
  await expect(footer.getByText('Address:')).toHaveCount(0);
  await expect(footer.getByText('Phone:')).toHaveCount(0);
  await expect(footer.getByText(/PBO 930090077/)).toBeVisible();
});

test('home page: the cookie note appears after 3 seconds, never takes focus, and stays closed', async ({
  page,
  context,
}) => {
  // A controlled clock: the timing is exact however slow the machine is
  const start = new Date('2026-01-05T08:00:00Z');
  await page.clock.install({ time: start });
  await page.clock.pauseAt(new Date(start.getTime() + 1000)); // time only moves when the test says
  await page.goto('/');
  const note = page.getByRole('complementary', { name: 'Cookies' });
  await page.clock.runFor(2500);
  await expect(note).toBeHidden(); // not before 3 seconds
  await page.clock.runFor(600);
  await expect(note).toBeVisible();
  await expect(note.getByRole('link', { name: 'Read our privacy notice' })).toHaveAttribute(
    'href',
    '/privacy/#cookies',
  );
  expect(
    await page.evaluate(() => document.activeElement?.closest('[data-cookie-notice]')),
  ).toBeNull();
  await page.clock.resume(); // the accessibility checker needs time to run normally
  await expectNoAxeViolations(page, 'cookie note');
  expect(await context.cookies()).toEqual([]); // it sets no cookies itself
  await note.getByRole('button', { name: 'OK, got it' }).click();
  await expect(note).toBeHidden();
  await page.reload();
  await page.waitForTimeout(3500); // well past 3 seconds: it must not come back
  await expect(note).toBeHidden(); // closed is remembered
});

test('Kids’ World floats on the grown-ups’ pages (not in the menu), never on Kids’ World pages', async ({
  page,
}) => {
  await page.goto('/about/');
  const float = page.locator('a.kids-float');
  await expect(float).toBeVisible();
  await expect(float).toHaveAccessibleName('Kids’ World');
  await expect(float).toHaveCSS('position', 'fixed');
  await expect(page.locator('#site-nav').getByRole('link', { name: 'Kids’ World' })).toHaveCount(0);
  await expect(page.locator('#site-nav').getByRole('link', { name: 'How we work' })).toHaveCount(0);
  await page.goto('/kids/');
  await expect(page.locator('a.kids-float')).toHaveCount(0);
});
