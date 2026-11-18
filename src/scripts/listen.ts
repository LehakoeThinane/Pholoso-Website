/**
 * "Listen" buttons ([data-listen="<id>" or "main"]): read a block aloud with the browser's
 * own speech. Hidden unless the browser can speak; never starts by itself. Reads the text
 * as it appears on the page (so it follows the wording setting), stops on page hide.
 * Voice preference (spec §7.10): South African English, then a natural or neural English
 * voice, then the browser default.
 */
import { announce } from './announce';

let current: HTMLElement | null = null;

function pickVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang.replace('_', '-').toLowerCase() === 'en-za') ??
    voices.find((v) => v.lang.toLowerCase().startsWith('en') && /natural|neural/i.test(v.name)) ??
    voices.find((v) => v.default && v.lang.toLowerCase().startsWith('en')) ??
    voices.find((v) => v.lang.toLowerCase().startsWith('en'))
  );
}

function stop(): void {
  window.speechSynthesis.cancel();
  current?.setAttribute('aria-pressed', 'false');
  current = null;
}

function textOf(el: HTMLElement): string {
  // The page text as shown, including the current wording setting, without buttons,
  // hidden items (e.g. filtered-out stories) or screen-reader-only helper text.
  const clone = el.cloneNode(true) as HTMLElement;
  clone
    .querySelectorAll('button, [hidden], .visually-hidden, [aria-hidden="true"], form, dialog')
    .forEach((n) => n.remove());
  return (clone.textContent ?? '').replace(/\s+/g, ' ').trim();
}

export function initListen(): void {
  if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') return;
  const buttons = document.querySelectorAll<HTMLButtonElement>('[data-listen]');
  if (!buttons.length) return;

  buttons.forEach((button) => {
    button.hidden = false;
    button.closest<HTMLElement>('[data-comfort-listen]')?.removeAttribute('hidden');
    button.addEventListener('click', () => {
      if (current === button) {
        stop();
        announce('Reading stopped');
        return;
      }
      stop();
      const key = button.dataset.listen ?? '';
      const target =
        key === 'main' ? document.getElementById('main') : document.getElementById(key);
      if (!target) return;
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
      window.speechSynthesis.speak(utterance);
    });
  });

  window.addEventListener('pagehide', stop);
}
