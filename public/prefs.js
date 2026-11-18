/*
 * Comfort & access: applies saved settings before the first paint so the page never
 * flashes in the default theme. Loaded render-blocking in <head> as an external file
 * (the Content-Security-Policy forbids inline scripts). Keep it tiny and dependency-free.
 *
 * Storage: localStorage "pholoso-comfort" = {"v":1, theme, text, spacing, guide, motion,
 * simple, images, focus, identityFirst, rate}. Settings never leave the device.
 * The same key and format were used by the previous site, so saved choices carry over.
 *
 * This file owns the mapping from settings to <html> attributes. The panel
 * (src/scripts/comfort.ts) calls window.pholosoComfort.apply() instead of repeating it.
 */
(function () {
  var KEY = 'pholoso-comfort';
  var d = document.documentElement;
  d.classList.add('js');

  function mq(q) {
    return !!(window.matchMedia && window.matchMedia(q).matches);
  }

  function read() {
    var s = null;
    try {
      s = JSON.parse(window.localStorage.getItem(KEY) || 'null');
    } catch {
      s = null; // storage blocked: settings still work for this visit once chosen
    }
    if (!s || s.v !== 1) s = { v: 1 };
    if (s.text === 125) s.text = 130; // the previous site's single "larger" step
    return s;
  }

  function write(s) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      /* not saved; still applied for this visit */
    }
  }

  function clear() {
    try {
      window.localStorage.removeItem(KEY);
    } catch {
      /* nothing to clear */
    }
  }

  /** Effective settings: saved choices first, then device preferences. */
  function effective(s) {
    return {
      theme:
        s.theme ||
        (mq('(prefers-contrast: more)')
          ? 'contrast'
          : mq('(prefers-color-scheme: dark)')
            ? 'dim'
            : 'standard'),
      text: s.text === 115 || s.text === 130 || s.text === 150 ? s.text : 100,
      motion: s.motion ? s.motion : mq('(prefers-reduced-motion: reduce)') ? 'reduced' : 'full',
      spacing: !!s.spacing,
      guide: !!s.guide,
      simple: !!s.simple,
      images: s.images !== false,
      focus: s.focus === 'strong' ? 'strong' : 'normal',
      identityFirst: !!s.identityFirst,
      rate: [0.75, 1, 1.25, 1.5].indexOf(s.rate) > -1 ? s.rate : 1,
    };
  }

  function set(name, value) {
    if (value) d.setAttribute(name, value);
    else d.removeAttribute(name);
  }

  function apply(s) {
    var e = effective(s);
    set('data-theme', e.theme === 'standard' ? '' : e.theme);
    set('data-text', e.text === 100 ? '' : String(e.text));
    set('data-motion', e.motion === 'reduced' ? 'reduced' : '');
    set('data-spacing', e.spacing ? 'on' : '');
    set('data-guide', e.guide ? 'on' : '');
    set('data-simple', e.simple ? 'on' : '');
    set('data-images', e.images ? '' : 'off');
    set('data-focus', e.focus === 'strong' ? 'strong' : '');
    set('data-identity', e.identityFirst ? 'first' : '');
    return e;
  }

  var saved = read();
  var e = apply(saved);
  // Hide switchable wording until the panel script has swapped it, so person-first wording
  // never flashes for visitors who chose identity-first. Released after 2s regardless.
  if (e.identityFirst) {
    d.classList.add('terms-pending');
    window.setTimeout(function () {
      d.classList.remove('terms-pending');
    }, 2000);
  }

  window.pholosoComfort = {
    read: read,
    write: write,
    clear: clear,
    apply: apply,
    effective: effective,
  };
})();
