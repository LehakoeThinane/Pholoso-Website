/**
 * Calm corner breathing exercise (components/kids/BreathingGuide.astro).
 * Starts only when a child presses Start. Five rounds of 4 seconds in, 4 seconds out, then it
 * stops by itself; Stop works at any time, and it stops if the child leaves the page.
 * The shape only moves when motion is allowed; otherwise the words and numbers count alone.
 * Screen readers hear "Breathe in…" / "Breathe out…" once per phase, not every number.
 */
import { motionAllowed } from './state';

const ROUNDS = 5;
const PHASE_SECONDS = 4;

export function initBreathing(): void {
  const root = document.querySelector<HTMLElement>('[data-breathe]');
  if (!root) return;
  const q = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const stage = q<HTMLElement>('[data-breathe-stage]');
  const shape = q<HTMLElement>('[data-breathe-shape]');
  const count = q<HTMLElement>('[data-breathe-count]');
  const status = q<HTMLElement>('[data-breathe-status]');
  const start = q<HTMLButtonElement>('[data-breathe-start]');
  const stop = q<HTMLButtonElement>('[data-breathe-stop]');

  let timer: number | undefined;
  let tick = 0;
  stage.hidden = false;

  const end = (message: string) => {
    if (timer !== undefined) window.clearInterval(timer);
    timer = undefined;
    shape.classList.remove('is-breathing');
    count.textContent = '';
    const hadFocus = document.activeElement === stop;
    stop.hidden = true;
    start.hidden = false;
    start.textContent = 'Start again';
    status.textContent = message;
    if (hadFocus) start.focus();
  };

  const step = () => {
    const phase = Math.floor(tick / PHASE_SECONDS);
    if (phase >= ROUNDS * 2) {
      end('Well done! How do you feel now?');
      return;
    }
    const second = tick % PHASE_SECONDS;
    if (second === 0) status.textContent = phase % 2 === 0 ? 'Breathe in…' : 'Breathe out…';
    count.textContent = String(PHASE_SECONDS - second);
    tick++;
  };

  start.addEventListener('click', () => {
    tick = 0;
    start.hidden = true;
    stop.hidden = false;
    stop.focus();
    shape.classList.remove('is-breathing');
    if (motionAllowed()) {
      void shape.offsetWidth; // restart the animation in step with the count
      shape.classList.add('is-breathing');
    }
    step();
    timer = window.setInterval(step, 1000);
  });

  stop.addEventListener('click', () => end('Stopped. You can start again any time.'));
  window.addEventListener('pagehide', () => end(''));
  // If Calm colours or Reduce motion is switched on mid-way, stop the movement at once.
  document.addEventListener('pholoso:prefs', () => {
    if (!motionAllowed()) shape.classList.remove('is-breathing');
  });
}
