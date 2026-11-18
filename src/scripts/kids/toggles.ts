/**
 * The two big Kids' World toggles in the header:
 * - Calm colours: one tap to the Calm theme (softer colours; no celebrations, wave or sounds).
 * - Sounds: off by default. Stays off while Calm colours are on.
 * Both save to the same Comfort & access settings as the panel (public/prefs.js), on this
 * device only, and stay in step with the panel and other open tabs.
 */
import { announce } from '../announce';
import { play } from './sound';

export function initToggles(): void {
  const api = window.pholosoComfort;
  const buttons = document.querySelectorAll<HTMLButtonElement>('[data-kids-toggle]');
  if (!api || !buttons.length) return;

  const sync = () => {
    const e = api.effective(api.read());
    buttons.forEach((b) => {
      const on =
        b.dataset.kidsToggle === 'calm' ? e.theme === 'calm' : e.sound && e.theme !== 'calm';
      b.setAttribute('aria-pressed', String(on));
      const state = b.querySelector('[data-kids-toggle-state]');
      if (state) state.textContent = on ? 'on' : 'off';
    });
  };

  buttons.forEach((button) => {
    button.hidden = false;
    button.addEventListener('click', () => {
      const prefs = api.read();
      const e = api.effective(prefs);
      if (button.dataset.kidsToggle === 'calm') {
        if (e.theme === 'calm') {
          delete prefs.theme; // back to the default, which follows the device's own settings
          announce('Calm colours off');
        } else {
          prefs.theme = 'calm';
          announce('Calm colours on. Sounds and celebrations are off.');
        }
      } else {
        if (e.theme === 'calm') {
          announce('Sounds stay off while Calm colours are on.');
          return;
        }
        prefs.sound = !e.sound;
        announce(prefs.sound ? 'Sounds on' : 'Sounds off');
      }
      api.write(prefs);
      api.apply(prefs); // fires "pholoso:prefs", which runs sync()
      if (button.dataset.kidsToggle === 'sound') play('tap');
    });
  });

  document.addEventListener('pholoso:prefs', sync);
  window.addEventListener('storage', (event) => {
    if (event.key === 'pholoso-comfort') api.apply(api.read());
  });
  sync();
}
