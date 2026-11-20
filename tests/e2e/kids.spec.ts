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

test('Pholo breathes only after Start, and Stop stops him', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/kids/calm-corner/');
  const pholo = page.locator('[data-breathe] [data-pholo="calm"]');
  await expect(pholo).not.toHaveAttribute('data-playing');
  await page.locator('[data-breathe-start]').click();
  await expect(pholo).toHaveAttribute('data-playing', '');
  await page.locator('[data-breathe-stop]').click();
  await expect(pholo).not.toHaveAttribute('data-playing');
  await expect(page.locator('[data-breathe-start]')).toBeFocused();
});

test('breathing under reduced motion: Pholo stays still, the numbers count instead', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/kids/calm-corner/');
  await page.locator('[data-breathe-start]').click();
  await expect(page.locator('[data-breathe] [data-pholo="calm"]')).not.toHaveAttribute(
    'data-playing',
  );
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

test('Pholo waves when tapped', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/kids/');
  const pholo = page.getByRole('button', { name: /^Wave to / });
  await pholo.evaluate((el) => el.removeAttribute('data-playing')); // after the greeting
  await pholo.click();
  await expect(pholo).toHaveAttribute('data-playing', '');
});

test('Kids’ World home: the multicolour title reads as plain words, and six colour doors', async ({
  page,
}) => {
  await page.goto('/kids/');
  await expect(page.getByRole('heading', { level: 1, name: 'Kids’ World' })).toBeVisible();
  const doors = page.getByRole('navigation', { name: 'Kids’ World activities' }).getByRole('link');
  await expect(doors).toHaveCount(6);
  for (const name of [
    'What I love',
    'Calm corner',
    'Make and do',
    'Kids like me',
    'Our gallery',
    'My feelings',
  ])
    await expect(doors.filter({ hasText: name })).toHaveCount(1);
  // The header's picture-button row is for the other pages
  await expect(page.getByRole('navigation', { name: 'Kids’ World', exact: true })).toHaveCount(0);
  await page.goto('/kids/calm-corner/');
  await expect(page.locator('.kids-header nav')).toBeVisible();
});

test('Kids’ World home: no doodle sits behind text', async ({ page }) => {
  await page.goto('/kids/');
  const overlaps = await page.evaluate(() => {
    const boxes = (sel: string) =>
      [...document.querySelectorAll(sel)]
        .filter((e) => (e as HTMLElement).offsetParent !== null || e instanceof SVGElement)
        .map((e) => e.getBoundingClientRect())
        .filter((r) => r.width > 0);
    const text = boxes('.welcome h1, .welcome__lead, .welcome .read-to-me, .welcome .bubble');
    const doodles = boxes('.sky__star, .sky__path');
    return doodles.filter((d) =>
      text.some(
        (t) => d.left < t.right && d.right > t.left && d.top < t.bottom && d.bottom > t.top,
      ),
    ).length;
  });
  expect(overlaps).toBe(0);
});
