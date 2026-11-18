/**
 * Kids' World games. Every page works without these: content is all shown, and the cards
 * are native <details>.
 *
 * - Mascot wave: tap the mascot and it waves back (under 1 second; not when motion is off).
 * - Pickers ("What do you love?", "How do I feel today?"): big toggle buttons
 *   (aria-pressed) that show one panel at a time. Without JavaScript every panel is shown.
 * - Flip groups: when every card in a [data-flip-group] is open, celebrate and reveal its
 *   [data-flip-done] message ("You're a great learner!").
 * - Daily fact: picks today's "Did you know?" by the date. It never changes while you look.
 */
import { dayNumber } from '../../lib/day-number';
import { announce } from '../announce';
import { celebrate } from './celebrate';
import { play } from './sound';
import { motionAllowed } from './state';

export function initMascot(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-mascot]').forEach((button) => {
    button.disabled = false;
    button.addEventListener('click', () => {
      play('tap');
      announce(`${button.dataset.mascot ?? 'The mascot'} waves hello!`);
      if (!motionAllowed()) return;
      button.classList.remove('is-waving');
      void button.offsetWidth; // restart the wave if tapped again
      button.classList.add('is-waving');
      window.setTimeout(() => button.classList.remove('is-waving'), 900);
    });
  });
}

export function initPickers(): void {
  document.querySelectorAll<HTMLElement>('[data-picker]').forEach((picker) => {
    const buttons = [...picker.querySelectorAll<HTMLButtonElement>('[data-pick]')];
    const panels = buttons
      .map((b) => document.getElementById(b.getAttribute('aria-controls') ?? ''))
      .filter((p): p is HTMLElement => !!p);
    const prompt = document.getElementById(picker.dataset.picker ?? '');

    picker.hidden = false;
    panels.forEach((p) => (p.hidden = true));
    if (prompt) prompt.hidden = false;

    buttons.forEach((button) => {
      button.addEventListener('click', () => {
        play('tap');
        const panel = document.getElementById(button.getAttribute('aria-controls') ?? '');
        buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
        panels.forEach((p) => (p.hidden = p !== panel));
        if (prompt) prompt.hidden = true;
        // Take the child (and screen reader) straight to what they chose
        const heading = panel?.querySelector<HTMLElement>('h2');
        if (heading) {
          heading.tabIndex = -1;
          heading.focus();
        }
      });
    });
  });
}

export function initFlipGroups(): void {
  document.querySelectorAll<HTMLElement>('[data-flip-group]').forEach((group) => {
    const cards = [...group.querySelectorAll<HTMLDetailsElement>('[data-flip]')];
    const done = group.querySelector<HTMLElement>('[data-flip-done]');
    if (done) done.hidden = true;
    let finished = false;
    cards.forEach((card) =>
      card.addEventListener('toggle', () => {
        if (card.open) play('flip');
        if (!finished && cards.every((c) => c.open)) {
          finished = true;
          if (done) done.hidden = false;
          announce(done?.textContent?.trim() || 'Well done!');
          celebrate(done ?? card);
        }
      }),
    );
  });
}

export function initFacts(): void {
  const facts = document.querySelectorAll<HTMLElement>('[data-fact]');
  if (!facts.length) return;
  const today = dayNumber(new Date()) % facts.length;
  facts.forEach((fact, i) => (fact.hidden = i !== today));
}
