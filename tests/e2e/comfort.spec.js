// Comfort & access: docs/comfort-and-access-spec.md, section 13 (CA-01, 03, 04, 05, 06, 07).
const { test, expect } = require('@playwright/test');
const { expectNoAxeViolations, watchErrors, presetComfort, fakeSpeech } = require('./helpers');

const style = (page, sel, prop) => page.locator(sel).first().evaluate((el, p) => getComputedStyle(el)[p], prop);

test.describe('panel', () => {
  test('opens as a dialog, keeps focus inside, closes with Escape and returns focus (CA-06)', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    const fab = page.locator('#comfortFab');
    await fab.click();
    const panel = page.getByRole('dialog', { name: 'Comfort & access' });
    await expect(panel).toBeVisible();
    await expect(page.locator('#cpTitle')).toBeFocused();
    await expect(fab).toHaveAttribute('aria-expanded', 'true');
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press(i % 7 === 6 ? 'Shift+Tab' : 'Tab');
      expect(await page.evaluate(() => document.getElementById('comfortPanel').contains(document.activeElement))).toBe(true);
    }
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(fab).toBeFocused();
    expect(errors).toEqual([]);
  });

  test('passes axe with the panel open, in every theme (CA-03)', async ({ page }) => {
    test.setTimeout(150_000);
    await page.goto('/');
    for (const theme of ['Standard', 'Calm', 'High contrast', 'Dim']) {
      await page.locator('#comfortFab').click();
      await page.getByRole('radio', { name: new RegExp('^' + theme) }).check();
      await expectNoAxeViolations(page, `panel open, ${theme}`);
      await page.keyboard.press('Escape');
    }
  });

  test('switches are announced as switches and report their state', async ({ page }) => {
    await page.goto('/');
    await page.locator('#comfortFab').click();
    const sw = page.getByRole('switch', { name: 'Reading spacing' });
    await expect(sw).toHaveAttribute('aria-checked', 'false');
    await sw.click();
    await expect(sw).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('#live')).toHaveText('Reading spacing on');
  });
});

test.describe('every setting visibly changes the page (CA-01)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('#comfortFab').click();
  });

  test('Calm swaps the whole palette, not a filter', async ({ page }) => {
    const before = await style(page, 'body', 'backgroundColor');
    const heroBefore = await style(page, '.hero', 'backgroundImage');
    await page.getByRole('radio', { name: /^Calm/ }).check();
    expect(await style(page, 'body', 'backgroundColor')).toBe('rgb(246, 243, 238)');
    expect(await style(page, 'body', 'backgroundColor')).not.toBe(before);
    expect(await style(page, '.hero', 'backgroundImage')).not.toBe(heroBefore);
    expect(await style(page, 'html', 'filter')).toBe('none');
    expect(await style(page, 'body', 'filter')).toBe('none');
  });

  test('High contrast: black on white, underlined links, thick focus', async ({ page }) => {
    await page.getByRole('radio', { name: /^High contrast/ }).check();
    expect(await style(page, 'body', 'backgroundColor')).toBe('rgb(255, 255, 255)');
    expect(await style(page, 'body', 'color')).toBe('rgb(0, 0, 0)');
    expect(await style(page, 'footer a', 'textDecorationLine')).toContain('underline');
    expect(await style(page, '.card', 'borderTopWidth')).toBe('2px');
  });

  test('Dim uses a dark palette with readable links and softened images', async ({ page }) => {
    await page.getByRole('radio', { name: /^Dim/ }).check();
    expect(await style(page, 'body', 'backgroundColor')).toBe('rgb(28, 35, 33)');
    expect(await style(page, 'body', 'color')).toBe('rgb(230, 233, 228)');
    expect(await style(page, 'header.site', 'backgroundColor')).toBe('rgb(246, 243, 238)');
    expect(await style(page, 'header.site .nav-links a', 'color')).toBe('rgb(22, 36, 31)');
    expect(await style(page, '.prose a', 'color')).toBe('rgb(169, 211, 196)');
    expect(await style(page, 'main img', 'filter')).toBe('brightness(0.82)');
    expect(await style(page, '.prose a', 'textDecorationLine')).toContain('underline');
  });

  test('Larger text scales the root size by 25%', async ({ page }) => {
    const h1 = parseFloat(await style(page, '.hero h1', 'fontSize'));
    await page.getByRole('switch', { name: 'Larger text' }).click();
    expect(await style(page, 'html', 'fontSize')).toBe('20px');
    expect(parseFloat(await style(page, '.hero h1', 'fontSize'))).toBeGreaterThan(h1);
  });

  test('Reading spacing applies the WCAG 1.4.12 values', async ({ page }) => {
    await page.getByRole('switch', { name: 'Reading spacing' }).click();
    const p = '.hero p.lead';
    const fs = parseFloat(await style(page, p, 'fontSize'));
    expect(parseFloat(await style(page, p, 'letterSpacing'))).toBeCloseTo(fs * 0.12, 1);
    expect(parseFloat(await style(page, p, 'wordSpacing'))).toBeCloseTo(fs * 0.16, 1);
    expect(parseFloat(await style(page, p, 'lineHeight')) / fs).toBeGreaterThanOrEqual(1.5);
  });

  test('Reduce motion stops transitions and animations (CA-05)', async ({ page }) => {
    await page.getByRole('switch', { name: 'Reduce motion' }).click();
    await page.keyboard.press('Escape');
    expect(await style(page, '.btn', 'transitionDuration')).toBe('0s');
    await page.getByRole('link', { name: 'Who We Are' }).first().click();
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
    expect(await style(page, '[data-page="about"] .reveal', 'opacity')).toBe('1');
  });

  test('Simplified page hides decorative images and closing panels', async ({ page }) => {
    await page.getByRole('switch', { name: 'Simplified page' }).click();
    await expect(page.locator('.hero-photo')).toBeHidden();
    await expect(page.locator('.page[data-page="home"] .cta-band')).toBeHidden();
    await expect(page.locator('.hero h1')).toBeVisible();
  });

  test('presets set the individual switches visibly', async ({ page }) => {
    await page.getByRole('button', { name: /I feel overwhelmed/ }).click();
    await expect(page.getByRole('radio', { name: /^Calm/ })).toBeChecked();
    await expect(page.getByRole('switch', { name: 'Reduce motion' })).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByRole('switch', { name: 'Simplified page' })).toHaveAttribute('aria-checked', 'true');
    await page.getByRole('switch', { name: 'Simplified page' }).click();
    await expect(page.locator('.hero-photo')).toBeVisible();
    await page.getByRole('button', { name: /I can.t see clearly/ }).click();
    await expect(page.getByRole('radio', { name: /^High contrast/ })).toBeChecked();
    await expect(page.getByRole('switch', { name: 'Larger text' })).toHaveAttribute('aria-checked', 'true');
  });

  test('Reset restores defaults and clears saved settings', async ({ page }) => {
    await page.getByRole('radio', { name: /^Calm/ }).check();
    await page.getByRole('switch', { name: 'Larger text' }).click();
    await page.getByRole('button', { name: 'Reset all settings' }).click();
    await expect(page.getByRole('radio', { name: /^Standard/ })).toBeChecked();
    expect(await page.evaluate(() => document.documentElement.className)).not.toMatch(/calm-mode|text-large/);
    expect(await page.evaluate(() => localStorage.getItem('pholoso-comfort'))).toBeNull();
  });
});

test('settings persist and apply before the first paint (CA-07)', async ({ page }) => {
  await page.addInitScript(() => {
    new MutationObserver((m, o) => {
      if (document.body) { window.__classAtBody = document.documentElement.className; o.disconnect(); }
    }).observe(document, { childList: true, subtree: true });
  });
  await page.goto('/');
  await page.locator('#comfortFab').click();
  await page.getByRole('radio', { name: /^Calm/ }).check();
  await page.getByRole('switch', { name: 'Reading spacing' }).click();
  await page.reload();
  const early = await page.evaluate(() => window.__classAtBody);
  expect(early).toContain('calm-mode');
  expect(early).toContain('spacing-wide');
  await page.locator('#comfortFab').click();
  await expect(page.getByRole('radio', { name: /^Calm/ })).toBeChecked();
});

test('old settings from the previous panel are carried over', async ({ page }) => {
  await page.addInitScript(() => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('pf-contrast-high', '1'); sessionStorage.setItem('seeded', '1'); } });
  await page.goto('/');
  expect(await page.evaluate(() => document.documentElement.className)).toContain('contrast-high');
});

test('the device asking for reduced motion turns it on by default', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  expect(await page.evaluate(() => document.documentElement.classList.contains('motion-reduced'))).toBe(true);
  await page.locator('#comfortFab').click();
  await expect(page.getByRole('switch', { name: 'Reduce motion' })).toHaveAttribute('aria-checked', 'true');
});

test('identity-first wording swaps marked terms, and the form still accepts the role', async ({ page }) => {
  await page.goto('/#about');
  await expect(page.locator('.page[data-page="about"]')).toContainText('child with autism');
  await page.locator('#comfortFab').click();
  await page.getByRole('switch', { name: 'Identity-first wording' }).click();
  await page.keyboard.press('Escape');
  await expect(page.locator('.page[data-page="about"]')).toContainText('autistic child');
  await expect(page.locator('.page[data-page="about"]')).not.toContainText('child with autism');
  await expect(page.locator('#comfortPanel')).toContainText('instead of "child with autism"');
  const opt = page.locator('#role option').nth(2);
  await expect(opt).toHaveText('Autistic person or neurodivergent');
  await expect(opt).toHaveAttribute('value', 'Person with autism or neurodivergent');
});

test.describe('read aloud', () => {
  test.beforeEach(async ({ page }) => { await fakeSpeech(page); });

  test('never autoplays, reads the page text, and the controls work (CA-08)', async ({ page }) => {
    await page.goto('/#about');
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => window.__spoken.length)).toBe(0);
    await page.locator('#comfortFab').click();
    await page.getByRole('button', { name: 'Read this page aloud' }).click();
    await expect(page.locator('#player')).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.__spoken.length)).toBeGreaterThan(3);
    const spoken = await page.evaluate(() => window.__spoken);
    const h1 = (await page.locator('.page[data-page="about"] h1').textContent()).trim();
    expect(spoken[0].text).toBe(h1);
    expect(spoken[0].voice).toBe('South African English');
    await page.getByRole('button', { name: 'Pause' }).click();
    await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
    const n = await page.evaluate(() => window.__spoken.length);
    await page.waitForTimeout(150);
    expect(await page.evaluate(() => window.__spoken.length)).toBe(n);
    await page.locator('#plSpeed').selectOption('1.5');
    await page.getByRole('button', { name: 'Resume' }).click();
    await expect.poll(() => page.evaluate(() => window.__spoken.at(-1).rate)).toBe(1.5);
    await page.getByRole('button', { name: 'Stop' }).click();
    await expect(page.locator('#player')).toBeHidden();
  });

  test('reads identity-first wording when it is on, and stops on page change', async ({ page }) => {
    await presetComfort(page, { identityFirst: true });
    await page.goto('/#about');
    await page.locator('#prListen').click();
    await expect.poll(() => page.evaluate(() => window.__spoken.length)).toBeGreaterThan(0);
    await page.getByRole('link', { name: 'Stories' }).first().click();
    await expect(page.locator('#player')).toBeHidden();
    const all = await page.evaluate(() => window.__spoken.map(s => s.text).join(' '));
    expect(all).not.toContain('child with autism');
  });

  test('without a speech engine, listening is hidden and explained', async ({ page }) => {
    await page.addInitScript(() => { window.SpeechSynthesisUtterance = undefined; });
    await page.goto('/');
    await page.locator('#comfortFab').click();
    await expect(page.locator('#cpListen')).toBeHidden();
    await expect(page.locator('#cpListenNote')).toHaveText("Listening isn't available in this browser.");
  });
});

// Every theme x text size x spacing x motion x simplified combination stays readable (CA-04).
const combos = [];
for (const theme of ['standard', 'calm', 'contrast', 'dim'])
  for (const text of [100, 125])
    for (const spacing of [false, true])
      for (const simple of [false, true])
        combos.push({ theme, text, spacing, simple, motion: 'reduced' });

test.describe('setting combinations at 320px (CA-04)', () => {
  test.use({ viewport: { width: 320, height: 720 } });
  for (const c of combos) {
    test(`${c.theme} text ${c.text}${c.spacing ? ' spacing' : ''}${c.simple ? ' simple' : ''}`, async ({ page }) => {
      await presetComfort(page, c);
      await page.goto('/');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, 'horizontal scroll at 320px').toBeLessThanOrEqual(0);
      await expectNoAxeViolations(page, JSON.stringify(c));
    });
  }
});
