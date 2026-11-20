/**
 * Site-wide enhancements. Loaded on every page as one small external module.
 * Every feature checks for its own elements and does nothing if they are absent, and
 * every page works without any of this.
 */
import { initComfort } from './comfort';
import { initCopy } from './copy';
import { initDemo } from './demo';
import { initFilters } from './filters';
import { initForms } from './forms';
import { initInterests } from './interests';
import { initListen } from './listen';
import { initMenu } from './menu';
import { initPholo } from './pholo';
import { applyTerms } from './terms';

/** Print every expandable section open, then restore. */
function initPrint(): void {
  let opened: HTMLDetailsElement[] = [];
  window.addEventListener('beforeprint', () => {
    opened = [...document.querySelectorAll<HTMLDetailsElement>('details:not([open])')];
    opened.forEach((d) => (d.open = true));
  });
  window.addEventListener('afterprint', () => opened.forEach((d) => (d.open = false)));
}

function run(name: string, fn: () => void): void {
  try {
    fn();
  } catch (error) {
    // One feature failing must never break the others.
    console.warn(`[${name}]`, error);
  }
}

run('terms', () => {
  const api = window.pholosoComfort;
  applyTerms(api ? api.effective(api.read()).identityFirst : false);
});
run('menu', initMenu);
run('pholo', initPholo);
run('comfort', initComfort);
run('listen', initListen);
run('filters', initFilters);
run('interests', initInterests);
run('copy', initCopy);
run('forms', initForms);
run('print', initPrint);
run('demo', initDemo);
