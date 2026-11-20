/**
 * Parent Guide, Phase 1 (brief §7b, §17): every scripted path works with and without
 * JavaScript, answers and message actions work by keyboard, the conversation log announces
 * replies, danger words show "Need help now?", settings stay on the device, and nothing is
 * sent anywhere.
 */
import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { expectNoAxeViolations, watch } from './helpers';

interface Data {
  topics: { id: string; steps: unknown[] }[];
}
const data = JSON.parse(readFileSync('dist/parent-guide/guides.json', 'utf8')) as Data;
const allSteps = data.topics.flatMap((t) =>
  t.steps.map((_, i) => `/parent-guide/${t.id}/${i + 1}/`),
);

/** Fails the test if the page sends anything other than a GET to this website. */
function noSending(page: Page) {
  const sent: string[] = [];
  page.on('request', (r) => {
    if (r.method() !== 'GET') sent.push(`${r.method()} ${r.url()}`);
  });
  return () => expect(sent, 'requests that send data').toEqual([]);
}

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('every step can be reached from the opening page by following answers', async ({ page }) => {
    test.setTimeout(90_000); // visits every step page (34 and growing)
    const seen = new Set<string>();
    const queue = ['/parent-guide/'];
    while (queue.length) {
      const path = queue.shift()!;
      if (seen.has(path)) continue;
      seen.add(path);
      const response = await page.goto(path);
      expect(response?.status(), path).toBe(200);
      const hrefs = await page
        .locator('[data-guide-log] a.choice')
        .evaluateAll((links) => links.map((a) => a.getAttribute('href')!));
      for (const href of hrefs) if (!seen.has(href)) queue.push(href);
    }
    for (const step of allSteps) expect(seen, `reachable: ${step}`).toContain(step);
  });

  test('answers are links; settings, message box and actions are hidden', async ({ page }) => {
    await page.goto('/parent-guide/meltdowns/2/');
    await expect(page.locator('a.choice').first()).toBeVisible();
    await expect(page.locator('[data-guide-composer]')).toBeHidden();
    await expect(page.getByText('Settings', { exact: true })).toBeHidden();
    await expect(page.getByRole('button', { name: 'Helpful' })).toBeHidden();
    await expect(page.getByText('Something else', { exact: true })).toBeHidden();
    // Info still opens (native <details>), with "Need help now?"
    await page.getByText('Info', { exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Need help now?' })).toBeVisible();
    await page.getByRole('link', { name: /Ask about something else/ }).click();
    await expect(page).toHaveURL(/\/parent-guide\/$/);
  });
});

test.describe('with JavaScript', () => {
  test('a conversation: answers continue on the same page, focus moves to the new answers', async ({
    page,
  }) => {
    const w = watch(page);
    const assertNothingSent = noSending(page);
    await page.goto('/parent-guide/');
    const log = page.getByRole('log', { name: 'Conversation' });
    await expect(log).toHaveAttribute('aria-live', 'polite');

    await log.getByRole('button', { name: 'Sleep and routines' }).click();
    await expect(page).toHaveURL(/\/parent-guide\/$/);
    await expect(log.locator('.msg--you')).toHaveText(/Sleep and routines/);
    await expect(log.getByText('What is hardest about bedtime for your child?')).toBeVisible();
    await expect(log.getByRole('button', { name: 'Falling asleep' })).toBeFocused();
    await expect(log.getByText('Draft – under review').first()).toBeVisible();

    // Keyboard: Enter on the focused answer
    await page.keyboard.press('Enter');
    await expect(log.getByText(/hard to switch off at night/)).toBeVisible();
    await expect(log.getByRole('button', { name: 'Help me make a bedtime routine' })).toBeFocused();
    // Earlier answers are put away, so only the latest can be used
    await expect(log.getByRole('button', { name: 'Falling asleep' })).toBeHidden();

    await expectNoAxeViolations(page, 'guide after two replies');
    assertNothingSent();
    w.assertClean();
  });

  test('step pages work the same way', async ({ page }) => {
    await page.goto('/parent-guide/school/1/');
    await page.getByRole('button', { name: 'Your child is struggling in class' }).click();
    await expect(page).toHaveURL(/\/school\/1\/$/);
    await expect(page.getByText(/School-Based Support Team/)).toBeVisible();
    await page.getByRole('button', { name: 'Ask about something else' }).click();
    await expect(page.getByRole('button', { name: 'Meltdowns and big feelings' })).toBeFocused();
  });

  test('the message box searches the guide on the device and keeps focus', async ({ page }) => {
    const assertNothingSent = noSending(page);
    await page.goto('/parent-guide/');
    const box = page.getByLabel('Type your message');
    await box.fill('He will not go to bed at night');
    await box.press('Enter');
    const log = page.getByRole('log');
    await expect(log.getByText('Here is what I found in this guide.')).toBeVisible();
    await expect(log.getByRole('button', { name: 'Sleep and routines' }).last()).toBeVisible();
    await expect(box).toBeFocused();
    await expect(box).toHaveValue('');
    assertNothingSent();
  });

  test('"Something else" moves to the message box', async ({ page }) => {
    await page.goto('/parent-guide/sensory/1/');
    await page.getByRole('button', { name: 'Something else' }).click();
    await expect(page.getByLabel('Type your message')).toBeFocused();
  });

  for (const words of [
    'my son is not breathing',
    'I think she is being abused',
    'I want to hurt myself',
  ]) {
    test(`danger words show "Need help now?": ${words}`, async ({ page }) => {
      await page.goto('/parent-guide/');
      const box = page.getByLabel('Type your message');
      await box.fill(words);
      await box.press('Enter');
      const log = page.getByRole('log');
      await expect(log.getByRole('heading', { name: 'Need help now?' })).toBeVisible();
      await expect(log.getByText(/call your local emergency number/)).toBeVisible();
      await expect(log.getByText('Here is what I found in this guide.')).toHaveCount(0);
    });
  }

  test('settings personalise the guide, stay on the device, and clear', async ({ page }) => {
    await page.goto('/parent-guide/meltdowns/1/');
    await page.getByText('Settings', { exact: true }).click();
    await page.getByLabel('Your first name').fill('Thandi');
    await page.getByLabel('Your child’s first name or nickname').fill('Luna');
    await page.getByLabel('Something your child loves').fill('trains, music');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('When Luna has a big feeling')).toBeVisible();
    expect(
      await page.evaluate(() => JSON.parse(localStorage.getItem('pholoso-guide') ?? '{}').child),
    ).toBe('Luna');

    // Remembered on the next page, including the greeting and the interest
    await page.goto('/parent-guide/');
    await expect(page.getByText('Welcome, Thandi!')).toBeVisible();
    await page.goto('/parent-guide/meltdowns/2/');
    await expect(page.getByText('offer water, rest or trains.')).toBeVisible();

    await page.getByText('Settings', { exact: true }).click();
    await page.getByRole('button', { name: 'Clear everything' }).click();
    await expect(page.getByText('offer water, rest or something they love.')).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('pholoso-guide'))).toBeNull();
  });

  test('message actions: helpful and not helpful are toggles; Escape closes Info', async ({
    page,
  }) => {
    await page.goto('/parent-guide/sleep/2/');
    const helpful = page.getByRole('button', { name: 'Helpful', exact: true });
    const unhelpful = page.getByRole('button', { name: 'Not helpful' });
    await helpful.click();
    await expect(helpful).toHaveAttribute('aria-pressed', 'true');
    await unhelpful.click();
    await expect(unhelpful).toHaveAttribute('aria-pressed', 'true');
    await expect(helpful).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByRole('link', { name: /Report a problem/ })).toHaveAttribute(
      'href',
      '/contact/?topic=general',
    );

    const info = page.getByText('Info', { exact: true });
    await info.click();
    await expect(page.getByRole('heading', { name: 'About this guide' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('heading', { name: 'About this guide' })).toBeHidden();
    await expect(info).toBeFocused();
  });

  test('step pages pass axe with Info and Settings open', async ({ page }) => {
    await page.goto('/parent-guide/assessment/3/');
    await page.getByText('Settings', { exact: true }).click();
    await expectNoAxeViolations(page, 'settings open');
    await page.getByText('Info', { exact: true }).click();
    await expectNoAxeViolations(page, 'info open');
  });
});

test.describe('the demo', () => {
  test('never plays by itself; Play shows each step; Turn off motion shows them all', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    const demo = page.locator('[data-demo]');
    const steps = demo.locator('[data-demo-step]');
    // Still at first: every step shown, nothing moving
    for (const s of await steps.all()) await expect(s).toBeVisible();
    await expect(demo.getByRole('button', { name: 'Turn off motion' })).toBeHidden();

    await demo.getByRole('button', { name: 'Play demo' }).click();
    await expect(steps.nth(2)).toBeHidden(); // replaying from the first step
    await expect(demo.getByRole('button', { name: 'Turn off motion' })).toBeVisible();
    await demo.getByRole('button', { name: 'Turn off motion' }).click();
    for (const s of await steps.all()) await expect(s).toBeVisible();
    await expect(demo.getByRole('button', { name: 'Replay' })).toBeFocused();
    // Preview builds point to the Parent Coach (practice mode); production, with the coach
    // off, points to the Parent Guide
    await expect(demo.getByRole('link', { name: 'Try Pholoso Parent Coach' })).toHaveAttribute(
      'href',
      '/parent-coach/',
    );
  });

  test('with reduced motion, every step is shown and there is nothing to play', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const demo = page.locator('[data-demo]');
    for (const s of await demo.locator('[data-demo-step]').all()) await expect(s).toBeVisible();
    await expect(demo.getByRole('button', { name: 'Play demo' })).toBeHidden();
  });
});
