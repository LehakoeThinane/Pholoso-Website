/**
 * Kids' World (brief §7 and §17): child safety, sound off by default, celebrations and the
 * breathing animation only when motion is allowed, Read it to me everywhere, and the games.
 * (The static rules, such as no Donate text and no direct external links, are also enforced
 * on the built HTML by scripts/check-dist.mjs.)
 */
import { expect, test } from '@playwright/test';
import { kidsPages, withPrefs } from './helpers';

test('every Kids’ World page: no fundraising, no forms, Read it to me, help note, named buttons', async ({
  page,
}) => {
  // Pretend the browser can speak, so the Read it to me button is shown.
  await page.addInitScript(() => {
    if (!('speechSynthesis' in window)) {
      Object.defineProperty(window, 'speechSynthesis', {
        value: { speak() {}, cancel() {}, getVoices: () => [] },
      });
    }
  });
  for (const path of kidsPages()) {
    await page.goto(path);
    const main = page.locator('body');
    await expect(main, path).not.toContainText(/donat/i);
    await expect(page.locator('form'), path).toHaveCount(0);
    await expect(page.locator('.read-to-me[data-listen="main"]'), path).toBeVisible();
    await expect(page.locator('.kids-footer'), path).toContainText('Tell a grown-up you trust');
    for (const link of await page.locator('a[href^="http"]').all()) {
      const href = (await link.getAttribute('href'))!;
      expect(href.startsWith('http://localhost'), `${path} links out: ${href}`).toBe(true);
    }
    for (const b of await page.locator('.pic-btn, .kids-toggle:visible').all()) {
      expect((await b.innerText()).trim(), `${path}: picture button needs words`).not.toBe('');
    }
  }
});

test('sound is off until a child turns it on, and Calm colours turn it off', async ({ page }) => {
  await page.goto('/kids/');
  const html = page.locator('html');
  const sound = page.locator('[data-kids-toggle="sound"]');
  await expect(html).not.toHaveAttribute('data-sound', 'on');
  await expect(sound).toHaveAttribute('aria-pressed', 'false');
  await sound.click();
  await expect(html).toHaveAttribute('data-sound', 'on');
  await page.locator('[data-kids-toggle="calm"]').click();
  await expect(html).toHaveAttribute('data-theme', 'calm');
  await expect(html).not.toHaveAttribute('data-sound', 'on');
  await page.goto('/kids/feelings/');
  await expect(html).toHaveAttribute('data-theme', 'calm');
});

async function finishTrains(page: import('@playwright/test').Page) {
  await page.goto('/kids/what-do-you-love/');
  await page.locator('[aria-controls="love-trains"]').click();
  for (const card of await page.locator('#love-trains summary').all()) await card.click();
  await expect(page.locator('#love-trains [data-flip-done]')).toBeVisible();
}

test('finishing a game celebrates with a short star burst when motion is allowed', async ({
  page,
}) => {
  await finishTrains(page);
  await expect(page.locator('.celebrate__star')).toHaveCount(8);
  await expect(page.locator('.celebrate__star')).toHaveCount(0, { timeout: 1500 });
});

test('no celebration with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await finishTrains(page);
  await expect(page.locator('.celebrate__star')).toHaveCount(0);
});

test('no celebration with Calm colours', async ({ page }) => {
  await withPrefs(page, { theme: 'calm' });
  await finishTrains(page);
  await expect(page.locator('.celebrate__star')).toHaveCount(0);
});

test('breathing shape animates only after Start, and Stop stops it', async ({ page }) => {
  await page.goto('/kids/calm-corner/');
  const shape = page.locator('[data-breathe-shape]');
  const anim = () => shape.evaluate((el) => getComputedStyle(el).animationName);
  expect(await anim()).toBe('none');
  await page.locator('[data-breathe-start]').click();
  expect(await anim()).toBe('kids-breathe');
  await page.locator('[data-breathe-stop]').click();
  expect(await anim()).toBe('none');
  await expect(page.locator('[data-breathe-start]')).toBeFocused();
});

test('breathing under reduced motion: no movement, the numbers count instead', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/kids/calm-corner/');
  await page.locator('[data-breathe-start]').click();
  const shape = page.locator('[data-breathe-shape]');
  expect(await shape.evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
  await expect(page.locator('[data-breathe-count]')).toHaveText(/^[1-4]$/);
  await expect(page.locator('[data-breathe-status]')).toContainText('Breathe in');
});

test('no animation can flash: nothing repeats faster than three times a second', async ({
  page,
}) => {
  for (const path of ['/kids/', '/kids/calm-corner/', '/kids/what-do-you-love/']) {
    await page.goto(path);
    const fast = await page.evaluate(() =>
      document
        .getAnimations()
        .filter((a) => {
          const t = a.effect?.getTiming();
          const d = Number(t?.duration);
          return t && (t.iterations ?? 1) > 1 && d > 0 && d < 334;
        })
        .map((a) => (a as CSSAnimation).animationName ?? 'animation'),
    );
    expect(fast, path).toEqual([]);
  }
});

test('feelings check-in sends nothing', async ({ page }) => {
  const posts: string[] = [];
  page.on('request', (r) => {
    if (r.method() !== 'GET') posts.push(r.url());
  });
  await page.goto('/kids/feelings/');
  for (const face of await page.locator('[data-pick]').all()) await face.click();
  expect(posts).toEqual([]);
});

test('the mascot waves when tapped', async ({ page }) => {
  await page.goto('/kids/');
  const mascot = page.locator('[data-mascot]');
  await expect(mascot).toBeEnabled();
  await mascot.click();
  await expect(mascot).toHaveClass(/is-waving/);
});
