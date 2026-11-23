/**
 * Forms in the browser (brief §17). The PHP handler is not running under `astro preview`, so
 * a successful send is simulated with a mocked response; the handler's own rules (consent,
 * email, honeypot, rate limit) are tested in tests/php/ against real PHP.
 */
import { expect, test, type Page } from '@playwright/test';

const FORMS = [
  { path: '/contact/', form: '#contact-form' },
  { path: '/donate/', form: 'form[data-form="receipt"]' },
  { path: '/resources/', form: 'form[data-form="newsletter"]' }, // the footer no longer has one
];

for (const { path, form } of FORMS) {
  test(`${path}: empty submit shows a focused error summary whose links focus each field`, async ({
    page,
  }) => {
    await page.goto(path);
    const f = page.locator(form);
    await f.locator('button[type="submit"]').click();
    const summary = f.locator('[data-error-summary]');
    await expect(summary).toBeVisible();
    await expect(summary).toBeFocused();
    const links = summary.locator('a');
    const count = await links.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const link = links.nth(i);
      const id = (await link.getAttribute('href'))!.slice(1);
      await link.click();
      await expect(page.locator(`[id="${id}"]`)).toBeFocused();
      await expect(page.locator(`[id="${id}"]`)).toHaveAttribute('aria-invalid', 'true');
    }
  });
}

async function mockHandler(page: Page, body: object) {
  await page.route('**/contact.php', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) }),
  );
}

test('contact: a valid message shows the success status and clears the form', async ({ page }) => {
  await mockHandler(page, { ok: true, message: 'Thank you. Your message has been sent.' });
  await page.goto('/contact/?topic=story');
  const f = page.locator('#contact-form');
  await expect(f.locator('select[name="topic"]')).toHaveValue('story');
  await f.locator('[name="email"]').fill('parent@example.com');
  await f.locator('[name="message"]').fill('I would like to share our story.');
  await f.locator('[name="consent"]').check();
  await f.locator('button[type="submit"]').click();
  const status = f.locator('[role="status"]');
  await expect(status).toHaveAttribute('data-state', 'success');
  await expect(status).toContainText('Thank you');
  await expect(f.locator('[name="message"]')).toHaveValue('');
});

test('contact: server-side errors are shown like client-side ones', async ({ page }) => {
  await mockHandler(page, {
    ok: false,
    message: 'Please check your answers.',
    errors: { email: 'Enter a valid email address, like name@example.com.' },
  });
  await page.goto('/contact/');
  const f = page.locator('#contact-form');
  await f.locator('[name="topic"]').selectOption({ index: 1 });
  await f.locator('[name="email"]').fill('parent@example.com');
  await f.locator('[name="message"]').fill('Hello');
  await f.locator('[name="consent"]').check();
  await f.locator('button[type="submit"]').click();
  await expect(f.locator('[data-error-summary]')).toBeFocused();
  await expect(f.locator('[name="email"]')).toHaveAttribute('aria-invalid', 'true');
});

test('every form links to the privacy notice', async ({ page }) => {
  for (const { path, form } of FORMS) {
    await page.goto(path);
    await expect(page.locator(form).locator('a[href="/privacy/"]').first()).toBeAttached();
  }
});
