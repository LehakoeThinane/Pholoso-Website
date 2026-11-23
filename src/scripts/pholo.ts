/**
 * Pholo's movements (components/kids/Pholo.astro, brief §10b).
 *
 * - A movement plays on its trigger: arriving on a Kids' World page, a tap, finishing an
 *   activity, Start in the Calm corner, or read-aloud. Then Pholo holds still again.
 * - The greeting Pholo waves on arrival, then again every 12 seconds, five waves in all
 *   (about a minute), then stays still (owner's request, 23 November 2026; this replaces the
 *   brief's "never on a timer" rule). The waves stop at once when motion is switched off.
 * - Nothing plays when motion is not allowed (reduced motion on the device, "Reduce motion",
 *   Calm colours or Simplified page): the still pose shows. Switching motion off mid-way stops
 *   every movement at once.
 */

type Trigger = SVGElement & { beginElement(): void };

const WAVES = 5;
const GAP_MS = 12_000;
const allowed = () => document.documentElement.hasAttribute('data-anim');
const timers = new WeakMap<HTMLElement, number>();

function trigger(el: HTMLElement, name: 'go' | 'stop'): void {
  const uid = el.dataset.pholoUid;
  const t = uid ? (el.querySelector(`#${uid}_${name}`) as Trigger | null) : null;
  t?.beginElement?.();
}

/** Plays Pholo's movement once (or, for calm and talk, until stopPholo). */
export function playPholo(el: HTMLElement | null | undefined): void {
  if (!el || !allowed()) return;
  window.clearTimeout(timers.get(el));
  el.setAttribute('data-playing', '');
  trigger(el, 'go'); // starting again restarts the movement from the beginning
  const length = Number(el.dataset.pholoLength ?? 0);
  if (length > 0)
    timers.set(
      el,
      window.setTimeout(() => el.removeAttribute('data-playing'), length),
    );
}

/** Stops Pholo and shows the still pose. */
export function stopPholo(el: HTMLElement | null | undefined): void {
  if (!el) return;
  window.clearTimeout(timers.get(el));
  trigger(el, 'stop');
  el.removeAttribute('data-playing');
}

/** The first Pholo on the page in this pose. */
export const findPholo = (pose: string, root: ParentNode = document) =>
  root.querySelector<HTMLElement>(`[data-pholo="${pose}"]`);

export function initPholo(): void {
  // Arriving: wave hello, then a few more times, then hold still
  document.querySelectorAll<HTMLElement>('[data-pholo-play="arrive"]').forEach((el) => {
    let waves = 0;
    const wave = () => {
      if (!allowed()) return; // motion off: no more waves
      if (!document.hidden && !el.hasAttribute('data-playing')) {
        playPholo(el);
        waves += 1;
      }
      if (waves < WAVES) window.setTimeout(wave, GAP_MS);
    };
    wave();
  });
  // A tap waves
  document.querySelectorAll<HTMLElement>('[data-pholo-tap]').forEach((el) => {
    el.addEventListener('click', () => playPholo(el));
  });
  // Read it to me: the talking Pholo takes the greeting Pholo's place while the audio plays
  document.addEventListener('pholoso:reading', (e) => {
    const on = (e as CustomEvent<{ on: boolean }>).detail.on;
    document.querySelectorAll<HTMLElement>('[data-talk-slot]').forEach((slot) => {
      const talker = slot.querySelector<HTMLElement>('.pholo--talker');
      slot.classList.toggle('is-talking', on);
      if (on) playPholo(talker);
      else stopPholo(talker);
    });
  });
  // Motion switched off mid-way: stop everything
  document.addEventListener('pholoso:prefs', () => {
    if (!allowed())
      document.querySelectorAll<HTMLElement>('[data-pholo][data-playing]').forEach(stopPholo);
  });
  window.addEventListener('pagehide', () =>
    document.querySelectorAll<HTMLElement>('[data-pholo][data-playing]').forEach(stopPholo),
  );
}
