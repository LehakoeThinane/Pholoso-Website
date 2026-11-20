/**
 * Read it to me (brief v5 §10c, §17): every Kids' World page plays its recording (not the
 * browser's voice), the file downloads only when pressed, Pholo talks while it plays, and Pause
 * and Stop work. The Calm corner's breathing voice only plays when Sounds are on.
 */
import { expect, test } from '@playwright/test';
import { kidsPages, withPrefs } from './helpers';

const pages = () => kidsPages().filter((p) => !p.includes('/ask-a-grown-up/'));

test('every Kids’ World page has a Read it to me recording that exists', async ({
  page,
  request,
}) => {
  for (const path of pages()) {
    await page.goto(path);
    const button = page.locator('main [data-listen="main"]');
    await expect(button, path).toHaveCount(1);
    const src = await button.getAttribute('data-audio');
    expect(src, `${path} has a recording`).toMatch(/^\/audio\/en\/[a-z0-9-]+\.mp3$/);
    const r = await request.get(src!);
    expect(r.status(), src!).toBe(200);
    expect(r.headers()['content-type'], src!).toContain('audio/mpeg');
  }
});

test('nothing downloads until pressed; then it plays, Pholo talks, Pause and Stop work', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const mp3: string[] = [];
  page.on('request', (r) => r.url().endsWith('.mp3') && mp3.push(r.url()));
  await page.goto('/kids/calm-corner/');
  await page.waitForTimeout(500);
  expect(mp3, 'no recording loads by itself').toEqual([]);

  const read = page.locator('main [data-listen="main"]');
  const pause = page.getByRole('button', { name: 'Pause' });
  const slot = page.locator('[data-talk-slot]').first();
  await read.click();
  await expect(read).toHaveAttribute('aria-pressed', 'true');
  expect(mp3.some((u) => u.endsWith('/audio/en/kids-calm-corner.mp3'))).toBe(true);
  await expect(slot).toHaveClass(/is-talking/);
  await expect(slot.locator('.pholo--talker')).toHaveAttribute('data-playing', '');
  await expect(pause).toBeVisible();

  await pause.click();
  await expect(page.getByRole('button', { name: 'Carry on' })).toBeVisible();
  await expect(slot).not.toHaveClass(/is-talking/);
  await page.getByRole('button', { name: 'Carry on' }).click();
  await expect(slot).toHaveClass(/is-talking/);

  await page.locator('[data-read-control="stop"]').first().click();
  await expect(read).toHaveAttribute('aria-pressed', 'false');
  await expect(read).toBeFocused();
  await expect(page.locator('[data-read-control]').first()).toBeHidden();
  await expect(slot).not.toHaveClass(/is-talking/);
});

test('with reduced motion, the talking Pholo shows but does not move', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/kids/');
  await page.locator('main [data-listen="main"]').click();
  const slot = page.locator('[data-talk-slot]').first();
  await expect(slot).toHaveClass(/is-talking/);
  await expect(slot.locator('.pholo--talker')).not.toHaveAttribute('data-playing');
});

test('today’s fact has its own recording', async ({ page }) => {
  await page.goto('/kids/');
  const index = await page.evaluate(() =>
    [...document.querySelectorAll('[data-fact]')].findIndex((li) => !(li as HTMLElement).hidden),
  );
  await expect(page.locator('[data-fact-read]')).toHaveAttribute(
    'data-audio',
    `/audio/en/fact-${index}.mp3`,
  );
});

test('the breathing voice plays only when Sounds are on', async ({ page }) => {
  const mp3: string[] = [];
  page.on('request', (r) => r.url().includes('/audio/en/breathe-') && mp3.push(r.url()));
  await page.goto('/kids/calm-corner/');
  await page.locator('[data-breathe-start]').click();
  await page.waitForTimeout(800);
  expect(mp3).toEqual([]);
  await page.locator('[data-breathe-stop]').click();

  await withPrefs(page, { sound: true });
  await page.goto('/kids/calm-corner/');
  await page.locator('[data-breathe-start]').click();
  await expect.poll(() => mp3.length).toBeGreaterThan(0);
  expect(mp3[0]).toContain('/audio/en/breathe-in.mp3');
});
