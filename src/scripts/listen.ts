/**
 * Reading aloud: "Listen" buttons and Kids' World "Read it to me" ([data-listen="<id>"|"main"]).
 *
 * - A button with data-audio plays that recording (brief v5 §10c): a real recorded voice, or
 *   open-source AI audio made at build time. The file downloads only when pressed. While it
 *   plays, the Pause and Stop buttons next to it appear, and Pholo talks.
 * - Otherwise the browser's own voice reads the text as it appears on the page (the fallback;
 *   hidden unless the browser can speak). Voice preference (spec §7.10): South African English,
 *   then a natural or neural English voice, then the browser default.
 * - Nothing ever starts by itself; everything stops when the page is left.
 *
 * Events: document gets "pholoso:reading" with detail { on: boolean } (Pholo listens to it).
 */
import { announce } from './announce';

let current: HTMLElement | null = null;
let audio: HTMLAudioElement | null = null;

const reading = (on: boolean) =>
  document.dispatchEvent(new CustomEvent('pholoso:reading', { detail: { on } }));

function pickVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang.replace('_', '-').toLowerCase() === 'en-za') ??
    voices.find((v) => v.lang.toLowerCase().startsWith('en') && /natural|neural/i.test(v.name)) ??
    voices.find((v) => v.default && v.lang.toLowerCase().startsWith('en')) ??
    voices.find((v) => v.lang.toLowerCase().startsWith('en'))
  );
}

/** The Pause and Stop buttons that belong to a Read it to me button. */
const controls = (button: HTMLElement) =>
  button.closest('[data-read-group]')?.querySelectorAll<HTMLButtonElement>('[data-read-control]') ??
  [];

function stop(): void {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  if (audio) {
    audio.pause();
    audio = null;
  }
  if (current) {
    current.setAttribute('aria-pressed', 'false');
    controls(current).forEach((c) => (c.hidden = true));
    reading(false);
  }
  current = null;
}

/**
 * The text a button reads: the page text as shown (with the current wording setting),
 * without buttons, hidden items or screen-reader-only helper text. Keep in step with
 * scripts/audio-texts.mjs, which saves the same text for the recordings.
 */
function textOf(el: HTMLElement): string {
  const clone = el.cloneNode(true) as HTMLElement;
  clone
    .querySelectorAll(
      'button, [hidden], .visually-hidden:not([data-read]), [aria-hidden="true"], form, dialog, [data-read-skip]',
    )
    .forEach((n) => n.remove());
  // Unopened cards (<details>) keep their surprise: read the front, not the hidden idea.
  clone.querySelectorAll('details:not([open]) > :not(summary)').forEach((n) => n.remove());
  // Each heading, paragraph and list item is its own sentence, so the voice pauses between them
  clone
    .querySelectorAll('h1, h2, h3, h4, p, li, dt, dd, figcaption, summary, label')
    .forEach((n) => n.append('\n'));
  return (clone.textContent ?? '')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .map((line) => (/[.!?…:”"’]$/.test(line) ? line : `${line}.`))
    .join(' ');
}

export const canSpeak = () =>
  'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';

let stopsOnHide = false;
const once = () => {
  if (!stopsOnHide) {
    window.addEventListener('pagehide', stop);
    stopsOnHide = true;
  }
};

/** Reads `target` aloud with the browser's voice, or stops if `button` is already reading. */
export function toggleSpeech(button: HTMLElement, target: HTMLElement): void {
  once();
  if (current === button) {
    stop();
    announce('Reading stopped');
    return;
  }
  stop();
  const utterance = new SpeechSynthesisUtterance(textOf(target));
  utterance.lang = 'en-ZA';
  const voice = pickVoice();
  if (voice) utterance.voice = voice;
  utterance.rate = window.pholosoComfort?.effective(window.pholosoComfort.read()).rate ?? 1;
  utterance.onend = () => {
    if (current === button) stop();
  };
  utterance.onerror = () => {
    if (current === button) stop();
  };
  current = button;
  button.setAttribute('aria-pressed', 'true');
  reading(true);
  window.speechSynthesis.speak(utterance);
}

/** Plays a button's recording, or stops if it is already playing. */
export function toggleAudio(button: HTMLElement): void {
  once();
  if (current === button) {
    stop();
    announce('Reading stopped');
    return;
  }
  stop();
  const a = new Audio(button.dataset.audio);
  a.preload = 'none';
  a.addEventListener('ended', () => {
    if (current === button) stop();
  });
  a.addEventListener('error', () => {
    if (current === button) stop();
    announce('Sorry, the recording could not play.');
  });
  audio = a;
  current = button;
  button.setAttribute('aria-pressed', 'true');
  controls(button).forEach((c) => {
    c.hidden = false;
    if (c.dataset.readControl === 'pause') c.textContent = 'Pause';
  });
  reading(true);
  // Pause pressed before the file has loaded cancels the start (AbortError): not a failure
  a.play().catch((e: unknown) => {
    if ((e as Error)?.name !== 'AbortError' && current === button) stop();
  });
}

export function initListen(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-listen]').forEach((button) => {
    // Recordings play in every browser; the browser's own voice only where it can speak
    if (!button.dataset.audio && !canSpeak()) return;
    button.hidden = false;
    button.closest<HTMLElement>('[data-comfort-listen]')?.removeAttribute('hidden');
    button.addEventListener('click', () => {
      if (button.dataset.audio) return toggleAudio(button);
      const key = button.dataset.listen ?? '';
      const target =
        key === 'main' ? document.getElementById('main') : document.getElementById(key);
      if (target) toggleSpeech(button, target);
    });
  });
  // Pause / carry on, and Stop
  document.querySelectorAll<HTMLButtonElement>('[data-read-control]').forEach((c) => {
    c.addEventListener('click', () => {
      if (c.dataset.readControl === 'stop') {
        const main = current;
        stop();
        main?.focus();
        return;
      }
      if (!audio) return;
      if (audio.paused) {
        audio.play().catch(() => {});
        c.textContent = 'Pause';
        reading(true);
      } else {
        audio.pause();
        c.textContent = 'Carry on';
        reading(false);
      }
    });
  });
}
