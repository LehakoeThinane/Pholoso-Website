/**
 * Calm corner breathing exercise (components/kids/BreathingGuide.astro).
 * Starts only when a child presses Start. Five rounds of 4 seconds in, 4 seconds out, then it
 * stops by itself; Stop works at any time, and it stops if the child leaves the page.
 * Pholo breathes only when motion is allowed; otherwise the words and numbers count alone.
 * Screen readers hear "Breathe in…" / "Breathe out…" once per phase, not every number.
 */
import { playPholo, stopPholo } from '../pholo';
import { soundOn } from './state';

const ROUNDS = 5;
const PHASE_SECONDS = 4;

export function initBreathing(): void {
  const root = document.querySelector<HTMLElement>('[data-breathe]');
  if (!root) return;
  const q = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const stage = q<HTMLElement>('[data-breathe-stage]');
  const pholo = root.querySelector<HTMLElement>('[data-pholo="calm"]');
  const count = q<HTMLElement>('[data-breathe-count]');
  const status = q<HTMLElement>('[data-breathe-status]');
  const start = q<HTMLButtonElement>('[data-breathe-start]');
  const stop = q<HTMLButtonElement>('[data-breathe-stop]');

  const voice = root.hasAttribute('data-breathe-voice');
  let timer: number | undefined;
  let tick = 0;
  stage.hidden = false;

  const end = (message: string) => {
    if (timer !== undefined) window.clearInterval(timer);
    timer = undefined;
    stopPholo(pholo);
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
    if (second === 0) {
      status.textContent = phase % 2 === 0 ? 'Breathe in…' : 'Breathe out…';
      // A soft voice, only when Sounds are on (and the recordings exist)
      if (voice && soundOn())
        new Audio(`/audio/en/${phase % 2 === 0 ? 'breathe-in' : 'breathe-out'}.mp3`)
          .play()
          .catch(() => {});
    }
    count.textContent = String(PHASE_SECONDS - second);
    tick++;
  };

  start.addEventListener('click', () => {
    tick = 0;
    start.hidden = true;
    stop.hidden = false;
    stop.focus();
    playPholo(pholo); // starts in step with the count; does nothing when motion is off
    step();
    timer = window.setInterval(step, 1000);
  });

  stop.addEventListener('click', () => end('Stopped. You can start again any time.'));
  window.addEventListener('pagehide', () => end(''));
  // (Switching motion off mid-way stops Pholo at once: src/scripts/pholo.ts.)
}
