// Shared helpers for the browser tests.
const { expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const fs = require('fs');

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/** Fails on any WCAG A/AA violation in the current page state. */
async function expectNoAxeViolations(page, label = '') {
  const res = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  const summary = res.violations.map(v => `${v.id} (${v.nodes.length}): ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')}`);
  expect(summary, `axe violations ${label}`).toEqual([]);
}

/** Fails the test on any uncaught error or console error. */
function watchErrors(page) {
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  return errors;
}

/** Saves Comfort & access settings before the page loads, as a returning visitor would have. */
async function presetComfort(page, settings) {
  await page.addInitScript(s => {
    try { localStorage.setItem('pholoso-comfort', JSON.stringify(Object.assign({ v: 1 }, s))); } catch (e) {}
  }, settings);
}

/** Replaces the browser's speech engine with a recorder, so read-aloud can be tested headless. */
async function fakeSpeech(page) {
  await page.addInitScript(() => {
    const spoken = [];
    window.__spoken = spoken;
    class FakeUtterance { constructor(text) { this.text = text; this.rate = 1; this.lang = ''; this.voice = null; } }
    let pending = null;
    const synth = {
      speaking: false,
      getVoices: () => [{ lang: 'en-US', name: 'Generic', default: true }, { lang: 'en-ZA', name: 'South African English', default: false }],
      speak(u) { spoken.push({ text: u.text, rate: u.rate, voice: u.voice && u.voice.name }); pending = setTimeout(() => u.onend && u.onend(), 20); },
      cancel() { clearTimeout(pending); },
      pause() {}, resume() {},
      addEventListener() {},
      onvoiceschanged: null,
    };
    Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
    window.SpeechSynthesisUtterance = FakeUtterance;
  });
}

function graphRequests() {
  const raw = fs.readFileSync(process.env.MOCK_GRAPH_LOG, 'utf8');
  return raw.split('\n').filter(Boolean).map(l => JSON.parse(l));
}

module.exports = { expectNoAxeViolations, watchErrors, presetComfort, fakeSpeech, graphRequests };
