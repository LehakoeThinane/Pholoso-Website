/**
 * Pholoso Parent Coach, Stage 1 (brief v4 §7b, §17), in practice mode: onboarding (with and
 * without skips, with two children), the full coaching arc to the closing card and rating,
 * each stage-2 branch rejoining the arc, free text, changing placeholders, message actions by
 * keyboard, reload restoring the session, danger words ending coaching, and nothing sent.
 */
import { expect, test, type Page } from '@playwright/test';
import { expectNoAxeViolations, watch } from './helpers';

interface Kid {
  name: string;
  age?: string;
  differences?: string[];
}

/** Fills in onboarding and starts a session. */
async function onboard(page: Page, parent: string | null, kids: Kid[] | null): Promise<void> {
  await page.goto('/parent-coach/start/');
  if (parent) {
    await page.getByLabel('Your first name or nickname').fill(parent);
    await page.getByRole('button', { name: 'Continue' }).click();
  } else await page.getByRole('button', { name: 'Skip' }).click();

  if (kids) {
    for (const [i, kid] of kids.entries()) {
      if (i > 0) await page.getByRole('button', { name: 'Add another child' }).click();
      await page.getByLabel('First name or nickname', { exact: true }).nth(i).fill(kid.name);
      if (kid.age) await page.getByLabel('Age', { exact: true }).nth(i).fill(kid.age);
    }
    await page.getByRole('button', { name: 'Continue' }).click();
    for (const kid of kids) {
      await expect(page.getByRole('heading', { name: `Tell me about ${kid.name}` })).toBeVisible();
      if (kid.differences?.length) {
        for (const d of kid.differences) await page.getByLabel(d, { exact: true }).check();
        await page.getByRole('button', { name: 'Continue' }).click();
      } else await page.getByRole('button', { name: 'Skip' }).click();
    }
  } else await page.getByRole('button', { name: 'Skip' }).click();

  await expect(
    page.getByRole('heading', { name: 'An important note before you begin' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Start' }).click();
  await page.waitForURL(/\/parent-coach\/chat\/\?s=[0-9a-f-]+$/);
}

const log = (page: Page) => page.getByRole('log', { name: 'Conversation' });
const box = (page: Page) => page.getByLabel('Your message');

/** Taps a suggested answer and waits until the next reply has finished arriving. */
async function choose(page: Page, answer: string): Promise<void> {
  const replies = await log(page).locator('.cmsg--coach').count();
  await page.getByRole('button', { name: answer, exact: true }).click();
  await expect(log(page).locator('.cmsg--coach')).toHaveCount(replies + 1);
  await expect(log(page)).toHaveAttribute('aria-busy', 'false');
}

test.beforeEach(async ({ page }) => {
  // Replies arrive all at once (no block-by-block reveal), so the tests run quickly
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

test('landing page: what it is, three promises, and Get started', async ({ page }) => {
  await page.goto('/parent-coach/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Pholoso Parent Coach');
  for (const promise of ['Free, always', 'Checked by professionals', 'Your information is yours'])
    await expect(page.getByRole('heading', { name: promise })).toBeVisible();
  await expect(page.getByText(/practice script, not from AI/).first()).toBeVisible();
  await page.getByRole('link', { name: 'Get started' }).first().click();
  await expect(page).toHaveURL(/\/parent-coach\/start\/$/);
});

test('onboarding: Continue waits for an answer; progress grows with each child', async ({
  page,
}) => {
  await page.goto('/parent-coach/start/');
  const cont = page.getByRole('button', { name: 'Continue' });
  await expect(cont).toHaveAttribute('aria-disabled', 'true');
  await expect(page.getByText('Step 1 of 3')).toBeVisible();
  await page.getByLabel('Your first name or nickname').fill('Sam');
  await expect(cont).toHaveAttribute('aria-disabled', 'false');
  await cont.click();
  await expect(page.getByRole('heading', { name: 'Your children' })).toBeFocused();
  await page.getByLabel('First name or nickname', { exact: true }).fill('Luna');
  await page.getByRole('button', { name: 'Add another child' }).click();
  await page.getByLabel('First name or nickname', { exact: true }).nth(1).fill('Thabo');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText('Step 3 of 5')).toBeVisible();
  // "None that I know of" clears the other answers
  await page.getByLabel('ADHD', { exact: true }).check();
  await page.getByLabel('None that I know of').check();
  await expect(page.getByLabel('ADHD', { exact: true })).not.toBeChecked();
  await expectNoAxeViolations(page, 'onboarding');
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page.getByRole('heading', { name: 'Your children' })).toBeVisible();
});

test('the full coaching arc, from onboarding to the closing card and rating', async ({ page }) => {
  const w = watch(page);
  const sent: string[] = [];
  page.on('request', (r) => r.method() !== 'GET' && sent.push(r.url()));

  await onboard(page, 'Sam', [{ name: 'Luna', age: '7', differences: ['ADHD'] }]);
  await expect(page.getByRole('heading', { name: 'Welcome, Sam!' })).toBeVisible();
  await expect(log(page).getByText('what usually happens with Luna?')).toBeVisible();
  // First answers: big buttons in the conversation
  await expect(log(page).getByRole('button', { name: 'Luna has a meltdown' })).toBeVisible();
  const placeholders = [await box(page).getAttribute('placeholder')];

  await choose(page, 'Luna has a meltdown');
  await expect(box(page)).toBeFocused(); // focus stays in the message box
  await expect(log(page).getByText(/brain that works with ADHD/)).toBeVisible();
  // Later answers: chips above the message box
  await expect(
    page.getByRole('list', { name: 'Suggested answers' }).getByRole('button'),
  ).toHaveCount(4);
  placeholders.push(await box(page).getAttribute('placeholder'));

  await choose(page, 'Yes, show me');
  await expect(log(page).getByText('A strategy to try')).toBeVisible();
  await expect(log(page).getByText('Next-up activity')).toBeVisible();
  placeholders.push(await box(page).getAttribute('placeholder'));

  await choose(page, 'Yes, let’s try it');
  placeholders.push(await box(page).getAttribute('placeholder'));
  await choose(page, 'Building with blocks');
  placeholders.push(await box(page).getAttribute('placeholder'));
  await choose(page, 'The lounge');
  await expect(log(page).getByText('Say this')).toBeVisible();
  await expect(log(page).locator('.cblock__quote')).toHaveText(
    '“Screen time is finished. Now it’s building with blocks time.”',
  );
  await expect(log(page).getByText('How to introduce it')).toBeVisible();
  await expect(log(page).getByText('Your plan for Luna')).toBeVisible();
  for (const step of ['When it’s calm', 'When screen time ends', 'Right after'])
    await expect(log(page).getByText(step, { exact: true })).toBeVisible();
  placeholders.push(await box(page).getAttribute('placeholder'));
  expect(new Set(placeholders).size, 'the placeholder changes with each question').toBe(
    placeholders.length,
  );

  await choose(page, 'Get upset');
  await expect(log(page).getByText('Get Luna on board')).toBeVisible();
  await choose(page, 'I’m ready to try');
  await expect(log(page).getByText('Save your progress')).toBeVisible();

  await page.getByRole('button', { name: /Skip: I’ll start over/ }).click();
  await expect(log(page).getByText('You’ve got this.')).toBeVisible();
  await expect(page.getByLabel('Your message')).toBeHidden(); // the message box is removed
  const rating = page.getByRole('group', { name: 'How did this session go?' });
  await rating.getByLabel('4 stars').check();
  await expectNoAxeViolations(page, 'chat at the end');

  // Reload restores the conversation, including the rating
  await page.reload();
  await expect(log(page).getByText('Your plan for Luna')).toBeVisible();
  await expect(page.getByLabel('4 stars')).toBeChecked();

  await page.getByRole('button', { name: 'Start a new conversation' }).click();
  await expect(log(page).getByRole('button', { name: 'Luna has a meltdown' })).toBeVisible();
  expect(sent, 'nothing is sent in practice mode').toEqual([]);
  w.assertClean();
});

for (const branch of [
  'Yes, show me',
  'We’ve tried everything already',
  'I want to understand Luna better',
  'What can I do in the moment?',
]) {
  test(`stage 2 branch rejoins the arc: ${branch}`, async ({ page }) => {
    await onboard(page, null, [{ name: 'Luna' }]);
    await choose(page, 'Luna bargains for more time');
    await choose(page, branch);
    await expect(log(page).getByText('A strategy to try')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Yes, let’s try it' })).toBeVisible();
  });
}

test('skipping everything works, and free text is accepted at each stage', async ({ page }) => {
  await onboard(page, null, null);
  await expect(page.getByRole('heading', { name: 'Welcome!' })).toBeVisible();
  await expect(log(page).getByText('what usually happens with your child?')).toBeVisible();
  for (const text of [
    'She cries and throws the tablet',
    'yes please',
    'ok',
    'Lego',
    'by the window',
  ]) {
    const replies = await log(page).locator('.cmsg--coach').count();
    await box(page).fill(text);
    await box(page).press('Enter');
    await expect(log(page).locator('.cmsg--coach')).toHaveCount(replies + 1);
    await expect(box(page)).toBeFocused();
  }
  await expect(log(page).locator('.cblock__quote')).toHaveText(
    '“Screen time is finished. Now it’s lego time.”',
  );
});

test('two children: the coach asks which child first', async ({ page }) => {
  await onboard(page, 'Sam', [{ name: 'Luna' }, { name: 'Thabo', differences: ['Autism'] }]);
  await expect(log(page).getByText('Which child would you like to focus on today?')).toBeVisible();
  await choose(page, 'Thabo');
  await choose(page, 'Thabo has a meltdown');
  await expect(log(page).getByText(/many children with autism/)).toBeVisible();
});

test('message actions work by keyboard; Bad response asks what went wrong', async ({ page }) => {
  await onboard(page, 'Sam', [{ name: 'Luna' }]);
  const actions = log(page).getByRole('group', { name: 'Message actions' }).first();
  const good = actions.getByRole('button', { name: 'Good response' });
  await good.focus();
  await page.keyboard.press('Enter');
  await expect(good).toHaveAttribute('aria-pressed', 'true');
  const bad = actions.getByRole('button', { name: 'Bad response' });
  await bad.focus();
  await page.keyboard.press('Enter');
  await expect(bad).toHaveAttribute('aria-pressed', 'true');
  await expect(good).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByRole('group', { name: 'What went wrong? (optional)' })).toBeVisible();
  await expect(page.getByLabel('It was not accurate')).toBeFocused();
  await page.getByRole('button', { name: 'Send feedback' }).click();
  await expect(
    page.getByText('Thank you. Your feedback helps us improve the coach.'),
  ).toBeVisible();
});

test('danger words end the coaching and show Need help now?', async ({ page }) => {
  await onboard(page, 'Sam', [{ name: 'Luna' }]);
  await box(page).fill('He hits me and I think he is not breathing properly');
  await box(page).press('Enter');
  await expect(log(page).getByRole('heading', { name: 'Need help now?' })).toBeVisible();
  await expect(page.getByLabel('Your message')).toBeHidden();
  await page.reload();
  await expect(log(page).getByRole('heading', { name: 'Need help now?' })).toBeVisible();
  await expect(page.getByLabel('Your message')).toBeHidden();
});

test('opening the chat without onboarding goes to onboarding', async ({ page }) => {
  await page.goto('/parent-coach/chat/');
  await expect(page).toHaveURL(/\/parent-coach\/start\/$/);
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('onboarding points to the written Parent Guide', async ({ page }) => {
    await page.goto('/parent-coach/start/');
    await expect(page.getByText('The coach needs JavaScript for now')).toBeVisible();
    await expect(page.getByRole('main').getByRole('link', { name: 'Parent Guide' })).toBeVisible();
    await expect(page.getByLabel('Your first name or nickname')).toBeHidden();
  });
});
