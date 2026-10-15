// Contact form and updates sign-up, end to end through contact.php (FORM-01, PRIV-01).
const { test, expect } = require('@playwright/test');
const { expectNoAxeViolations, graphRequests } = require('./helpers');

async function fillValid(page, marker) {
  await page.getByLabel('Your name').fill('Thandi Test');
  await page.getByLabel(/^Email/).fill('thandi@example.com');
  await page.getByLabel('I am a…').selectOption('Parent or caregiver');
  await page.getByLabel('Your message').fill(`Hello from the browser test ${marker}`);
  await page.locator('#consent_popia').check();
  await page.locator('#consent_guardian').check();
  await page.waitForTimeout(1100); // the server's minimum time-to-submit in tests is 1 second
}

test('empty form: accessible error summary, inline errors, nothing sent', async ({ page }) => {
  await page.goto('/#contact');
  await page.getByRole('button', { name: 'Send with care' }).click();
  const summary = page.locator('#errSummary');
  await expect(summary).toBeVisible();
  await expect(summary).toBeFocused();
  await expect(summary.locator('li')).toHaveCount(3);
  await expect(page.locator('#message')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#err-consent_guardian')).toBeVisible();
  await expectNoAxeViolations(page, 'form errors');
  await summary.getByRole('link', { name: 'Please write your message.' }).click();
  await expect(page.locator('#message')).toBeFocused();
  await expect(page.locator('#formStatus')).toBeHidden();
});

test('valid enquiry: success only after Microsoft accepts it', async ({ page }) => {
  const marker = 'OK-' + Date.now();
  await page.goto('/#contact');
  await fillValid(page, marker);
  await page.getByRole('button', { name: 'Send with care' }).click();
  const status = page.locator('#formStatus');
  await expect(status).toHaveText(/Thank you. Your message has been sent/);
  await expect(status).toBeFocused();
  const sent = graphRequests().find(r => r.body.message.body.content.includes(marker));
  expect(sent, 'request reached the Graph mock').toBeTruthy();
  expect(sent.body.message.replyTo[0].emailAddress.address).toBe('thandi@example.com');
  await expect(page.getByLabel('Your message')).toHaveValue('');
});

test.describe('without Microsoft 365 credentials', () => {
  test.use({ baseURL: 'http://127.0.0.1:8092' });
  test('fails honestly with a working email link, and keeps what was typed', async ({ page }) => {
    await page.goto('/#contact');
    await fillValid(page, 'NOCONFIG');
    await page.getByRole('button', { name: 'Send with care' }).click();
    const status = page.locator('#formStatus');
    await expect(status).toHaveText("We couldn't send your message. Please email know@pholoso.africa directly.");
    await expect(status).toBeFocused();
    await expect(status.getByRole('link', { name: 'know@pholoso.africa' })).toHaveAttribute('href', 'mailto:know@pholoso.africa');
    await expect(page.getByLabel('Your message')).toHaveValue(/NOCONFIG/);
    await expect(page.locator('body')).not.toContainText('Thank you. Your message has been sent');
  });

  test('updates sign-up also fails honestly', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Get email updates').fill('reader@example.com');
    await page.getByLabel(/Yes, email me updates/).check();
    await page.waitForTimeout(1100);
    await page.getByRole('button', { name: 'Join' }).click();
    await expect(page.locator('#newsStatus')).toHaveText("We couldn't send your request. Please email know@pholoso.africa directly.");
  });
});

test('updates sign-up needs consent, then sends a tagged request', async ({ page }) => {
  await page.goto('/');
  const email = `reader-${Date.now()}@example.com`;
  await page.getByLabel('Get email updates').fill(email);
  await page.getByRole('button', { name: 'Join' }).click();
  await expect(page.locator('#newsStatus')).toHaveText('Please tick the box to confirm you would like updates.');
  await page.getByLabel(/Yes, email me updates/).check();
  await page.waitForTimeout(1100);
  await page.getByRole('button', { name: 'Join' }).click();
  await expect(page.locator('#newsStatus')).toHaveText(/We have received your request/);
  const sent = graphRequests().find(r => r.body.message.body.content.includes(email));
  expect(sent.body.message.subject).toBe('Updates sign-up request from the website');
});

test('the privacy notice is linked from every form and the footer', async ({ page }) => {
  await page.goto('/#contact');
  await expect(page.locator('#storyForm a[href="#privacy"]')).toHaveCount(2);
  await expect(page.locator('#newsForm a[href="#privacy"]')).toHaveCount(1);
  await expect(page.locator('footer a[href="#privacy"]').first()).toBeVisible();
  await page.locator('#storyForm a[href="#privacy"]').first().click();
  await expect(page.locator('html')).toHaveAttribute('data-page', 'privacy');
  await expect(page.locator('#privacy h1')).toHaveText('How we handle your information');
});
