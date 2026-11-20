/**
 * Pholo, the approved mascot (brief v5 §10b, §17): the artwork is the approved files, each
 * movement starts only on its trigger and stops after its fixed length (or on Stop), nothing
 * moves when motion is off, and no movement can flash.
 */
import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { withPrefs } from './helpers';

const approved = (file: string) =>
  readFileSync(`src/assets/illustrations/mascot/${file}.svg`, 'utf8')
    .replace(/^[\s\S]*?<svg[^>]*>/, '')
    .replace(/<\/svg>\s*$/, '');

test('the still poses are the approved artwork, unchanged', async ({ page }) => {
  await page.goto('/kids/');
  const hello = await page.locator('[data-pholo="hello"] .pholo__still').first().innerHTML();
  const norm = (s: string) =>
    s
      .replace(/\s+/g, ' ')
      .replace(/><\/(ellipse|circle)>/g, '/>')
      .trim();
  // The browser rewrites some markup (self-closing tags), so compare the drawing commands
  for (const d of approved('hello').match(/ d="[^"]+"/g) ?? []) expect(norm(hello)).toContain(d);
  await page.goto('/kids/calm-corner/');
  const calm = await page.locator('[data-pholo="calm"] .pholo__still').first().innerHTML();
  for (const d of approved('calm').match(/ d="[^"]+"/g) ?? []) expect(calm).toContain(d);
});

test('arriving: Pholo waves once per visit, then holds still', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/kids/');
  const pholo = page.locator('.kids-hero [data-pholo]');
  await expect(pholo).toHaveAttribute('data-playing', '');
  await expect(pholo).not.toHaveAttribute('data-playing', { timeout: 8000 }); // about 6 s
  await page.reload();
  await page.waitForTimeout(500);
  await expect(pholo).not.toHaveAttribute('data-playing'); // same visit: no second greeting
});

for (const [label, setup] of [
  [
    'the device asks for reduced motion',
    async (p: import('@playwright/test').Page) => p.emulateMedia({ reducedMotion: 'reduce' }),
  ],
  [
    'Reduce motion is on',
    async (p: import('@playwright/test').Page) => withPrefs(p, { motion: 'reduced' }),
  ],
  [
    'Calm colours are on',
    async (p: import('@playwright/test').Page) => withPrefs(p, { theme: 'calm' }),
  ],
] as const) {
  test(`no movement when ${label}`, async ({ page }) => {
    await setup(page);
    await page.goto('/kids/');
    const pholo = page.locator('.kids-hero [data-pholo]');
    await page.waitForTimeout(400);
    await expect(pholo).not.toHaveAttribute('data-playing');
    await pholo.click();
    await expect(pholo).not.toHaveAttribute('data-playing');
    await expect(pholo.locator('.pholo__still')).toBeVisible();
  });
}

test('celebrating: Pholo jumps when a child finishes, and only then', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/kids/what-do-you-love/');
  const pholo = page.locator('[data-pholo="celebrate"]').first();
  await expect(pholo).not.toHaveAttribute('data-playing');
  await page.locator('[aria-controls="love-trains"]').click();
  for (const card of await page.locator('#love-trains summary').all()) await card.click();
  await expect(page.locator('[data-pholo="celebrate"][data-playing]')).toHaveCount(1);
  await expect(page.locator('[data-pholo="celebrate"][data-playing]')).toHaveCount(0, {
    timeout: 5000,
  });
});

test('switching motion off mid-way stops Pholo at once', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/kids/calm-corner/');
  await page.locator('[data-breathe-start]').click();
  const pholo = page.locator('[data-breathe] [data-pholo="calm"]');
  await expect(pholo).toHaveAttribute('data-playing', '');
  await page.getByRole('button', { name: 'Comfort & access' }).click();
  await page.getByRole('switch', { name: /Reduce motion/ }).check();
  await expect(pholo).not.toHaveAttribute('data-playing');
});

test('no movement can flash: every fade and blink takes at least a third of a second', async ({
  page,
}) => {
  for (const path of [
    '/kids/',
    '/kids/calm-corner/',
    '/kids/what-do-you-love/',
    '/parent-coach/',
  ]) {
    await page.goto(path);
    const fast = await page.evaluate(() =>
      [...document.querySelectorAll('.pholo animate, .pholo animateTransform')]
        .map((a) => {
          const dur = parseFloat(a.getAttribute('dur') ?? '0');
          const steps = (a.getAttribute('values') ?? '').split(';').length - 1;
          return { what: a.getAttribute('attributeName'), cycle: dur, steps };
        })
        // a full on-off cycle shorter than 1/3 s would be more than 3 flashes a second
        .filter((a) => a.cycle > 0 && a.cycle < 0.34),
    );
    expect(fast, path).toEqual([]);
  }
});

test('the movements really move: the arm waves and the breathing circle grows', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/kids/');
  await page.waitForTimeout(400);
  const angle = await page.evaluate(() => {
    const move = document.querySelector('.kids-hero [data-pholo] .pholo__move')!;
    const arm = [...move.querySelectorAll('g')].find((g) =>
      g.querySelector(':scope > animateTransform[type="rotate"]'),
    ) as SVGGElement;
    return [...arm.transform.animVal].map((t) => t.angle)[0] ?? 0;
  });
  expect(Math.abs(angle)).toBeGreaterThan(2);

  await page.goto('/kids/calm-corner/');
  const radius = () =>
    page.evaluate(
      () =>
        (document.querySelector('[data-breathe] .pholo__move circle') as SVGCircleElement).r.animVal
          .value,
    );
  const before = await radius();
  await page.locator('[data-breathe-start]').click();
  await page.waitForTimeout(1500);
  expect(await radius()).not.toBe(before);
});

test('nothing waits on a timer: every movement is held until its trigger', async ({ page }) => {
  await page.goto('/kids/');
  const free = await page.evaluate(
    () =>
      [...document.querySelectorAll('.pholo animate, .pholo animateTransform')].filter(
        (a) => !/_go.begin/.test(a.getAttribute('begin') ?? ''),
      ).length,
  );
  expect(free).toBe(0);
});
