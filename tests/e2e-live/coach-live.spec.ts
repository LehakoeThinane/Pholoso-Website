/**
 * Parent Coach, live mode (brief v4 §7b, §17): the browser talks to the PHP API, which asks a
 * mock of the AI provider. Sessions live on the server at /parent-coach/s/<id>/, survive a
 * reload, and work without JavaScript as plain forms.
 */
import { expect, test, type Page } from '@playwright/test';
import { expectNoAxeViolations } from '../e2e/helpers';

const log = (page: Page) => page.getByRole('log', { name: 'Conversation' });

async function choose(page: Page, answer: string): Promise<void> {
  const replies = await log(page).locator('.cmsg--coach').count();
  await page.getByRole('button', { name: answer, exact: true }).click();
  await expect(log(page).locator('.cmsg--coach')).toHaveCount(replies + 1);
  await expect(log(page)).toHaveAttribute('aria-busy', 'false');
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

test('onboarding creates a server session; the arc runs on the AI; reload keeps it', async ({
  page,
}) => {
  const external: string[] = [];
  page.on('request', (r) => {
    if (!r.url().startsWith('http://127.0.0.1:4398/')) external.push(r.url());
  });
  await page.goto('/parent-coach/start/');
  const ob = page.locator('[data-onboard]');
  await ob.getByLabel('Your first name or nickname').fill('Sam');
  await page.getByRole('button', { name: 'Continue' }).click();
  await ob.getByLabel('First name or nickname', { exact: true }).fill('Luna');
  await page.getByRole('button', { name: 'Continue' }).click();
  await ob.getByLabel('ADHD', { exact: true }).check();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Start' }).click();
  await page.waitForURL(/\/parent-coach\/s\/[0-9a-f-]{36}\/$/);

  await expect(page.getByRole('heading', { name: 'Welcome, Sam!' })).toBeVisible();
  await expect(page.getByText('Replies are written by AI.')).toBeVisible();
  await choose(page, 'Luna has a meltdown');
  await expect(log(page).getByText('That sounds really hard.')).toBeVisible();
  await choose(page, 'Yes, show me');
  await expect(log(page).getByText('A strategy to try')).toBeVisible();
  await expect(log(page).getByText('Next-up activity')).toBeVisible(); // the library title
  await expect(page.getByLabel('Your message')).toHaveAttribute('placeholder', 'Answer for offer…');

  await page.reload();
  await expect(log(page).getByText('Next-up activity')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Yes, let’s try it' })).toBeVisible();

  for (const a of [
    'Yes, let’s try it',
    'Building with blocks',
    'The lounge',
    'Get upset',
    'I’m ready to try',
  ])
    await choose(page, a);
  await expect(log(page).getByText('Your plan')).toBeVisible();
  await page.getByRole('button', { name: /Skip: I’ll start over/ }).click();
  await expect(log(page).getByText('You’ve got this.')).toBeVisible();
  await page.getByLabel('5 stars').check();
  await expectNoAxeViolations(page, 'live chat at the end');
  await page.reload();
  await expect(page.getByLabel('5 stars')).toBeChecked();
  expect(external, 'the browser only talks to this website').toEqual([]);
});

test('danger words end coaching on the server too', async ({ page }) => {
  await page.goto('/parent-coach/start/');
  for (let i = 0; i < 2; i++) await page.getByRole('button', { name: 'Skip' }).click();
  await page.getByRole('button', { name: 'Start' }).click();
  await page.waitForURL(/\/parent-coach\/s\//);
  await page.getByLabel('Your message').fill('I think he swallowed pills');
  await page.getByLabel('Your message').press('Enter');
  await expect(log(page).getByRole('heading', { name: 'Need help now?' })).toBeVisible();
  await page.reload();
  await expect(log(page).getByRole('heading', { name: 'Need help now?' })).toBeVisible();
  await expect(page.getByLabel('Your message')).toBeHidden();
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('onboarding and the chat work as plain forms', async ({ page }) => {
    await page.goto('/parent-coach/start/');
    const form = page.locator('form.onboard--plain');
    await form.getByLabel(/^Your first name or nickname/).fill('Sam');
    await form.getByLabel(/^Your child’s first name or nickname/).fill('Luna');
    await form.getByLabel('Autism', { exact: true }).check();
    await page.getByRole('button', { name: 'Start' }).click();
    await page.waitForURL(/\/parent-coach\/s\/[0-9a-f-]{36}\/$/);
    await expect(page.getByRole('heading', { name: 'Welcome, Sam!' })).toBeVisible();
    await expect(page.getByText('The coach needs JavaScript for now')).toBeHidden();

    await page.getByRole('button', { name: 'Luna has a meltdown' }).click();
    await expect(log(page).getByText('That sounds really hard.')).toBeVisible();
    await page.getByLabel('Your message').fill('Yes please');
    await page.getByRole('button', { name: 'Send' }).click();
    await expect(log(page).getByText('A strategy to try')).toBeVisible();
  });
});
