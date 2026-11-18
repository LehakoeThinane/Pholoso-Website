/*
 * Comfort & access: applies saved settings before the first paint so the page never
 * flashes in the default theme. Loaded render-blocking in <head> as an external file
 * (the Content-Security-Policy forbids inline scripts). Keep it tiny and dependency-free.
 *
 * Storage: localStorage "pholoso-comfort" = {"v":1, theme, text, spacing, motion, simple,
 * images, guide, focus, identityFirst}. Settings never leave the device.
 * The same key and format were used by the previous site, so saved choices carry over.
 * The panel itself lives in src/scripts/comfort.ts and uses the same attribute contract.
 */
(function () {
  var d = document.documentElement;
  var s = null;
  d.classList.add('js');
  try {
    s = JSON.parse(window.localStorage.getItem('pholoso-comfort') || 'null');
  } catch {
    s = null; // storage blocked: settings still work for this visit once chosen
  }
  if (!s || s.v !== 1) s = { v: 1 };

  function mq(q) {
    return !!(window.matchMedia && window.matchMedia(q).matches);
  }

  // Device preferences apply only until the visitor makes a choice.
  var theme = s.theme;
  if (!theme)
    theme = mq('(prefers-contrast: more)')
      ? 'contrast'
      : mq('(prefers-color-scheme: dark)')
        ? 'dim'
        : 'standard';
  if (theme === 'calm' || theme === 'contrast' || theme === 'dim')
    d.setAttribute('data-theme', theme);

  var text = s.text === 125 ? 130 : s.text; // the previous site's single "larger" step
  if (text === 115 || text === 130 || text === 150) d.setAttribute('data-text', String(text));

  var reduced = s.motion ? s.motion === 'reduced' : mq('(prefers-reduced-motion: reduce)');
  if (reduced) d.setAttribute('data-motion', 'reduced');

  if (s.spacing) d.setAttribute('data-spacing', 'on');
  if (s.simple) d.setAttribute('data-simple', 'on');
  if (s.images === false) d.setAttribute('data-images', 'off');
  if (s.guide) d.setAttribute('data-guide', 'on');
  if (s.focus === 'strong') d.setAttribute('data-focus', 'strong');
  if (s.identityFirst) d.setAttribute('data-identity', 'first');
})();
