/**
 * A small, happy burst of stars when a child finishes something. Only ever in response to
 * the child's own action; lasts 0.75 seconds; each star fades once (no flashing, WCAG 2.3.1).
 * Skipped entirely when motion is not allowed (see state.ts). Plays the "yay" sound if
 * Sounds are on.
 */
import { playPholo } from '../pholo';
import { play } from './sound';
import { motionAllowed } from './state';

const STAR =
  '<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false"><polygon points="32,6 39.5,23 58,24.5 44,37 48,55.5 32,46 16,55.5 20,37 6,24.5 24.5,23" fill="#EEA838" stroke="#2B1F04" stroke-width="3" stroke-linejoin="round"/></svg>';

export function celebrate(from?: Element | null): void {
  play('yay');
  if (!motionAllowed()) return;
  // A celebrating Pholo near the child's activity (or anywhere visible) jumps for joy
  const pholo = [...document.querySelectorAll<HTMLElement>('[data-pholo="celebrate"]')].find(
    (p) => p.offsetParent !== null,
  );
  playPholo(pholo);
  const layer = document.querySelector<HTMLElement>('[data-celebrate]');
  if (!layer) return;

  const r = from?.getBoundingClientRect();
  const burst = document.createElement('div');
  burst.className = 'celebrate__burst';
  // CSSOM positioning is allowed by the Content-Security-Policy (style="" attributes are not).
  burst.style.left = `${r ? r.left + r.width / 2 : window.innerWidth / 2}px`;
  burst.style.top = `${r ? r.top + r.height / 2 : window.innerHeight / 2}px`;
  for (let i = 0; i < 8; i++) {
    const star = document.createElement('span');
    star.className = 'celebrate__star';
    star.innerHTML = STAR;
    burst.append(star);
  }
  layer.append(burst);
  window.setTimeout(() => burst.remove(), 900);
}
