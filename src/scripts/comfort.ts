/**
 * Comfort & access panel (docs/comfort-and-access-spec.md).
 * Settings are applied by window.pholosoComfort (public/prefs.js), saved on this device
 * only, and kept in sync across open tabs.
 */
import { announce } from './announce';
import { applyTerms } from './terms';

type Setting = 'spacing' | 'guide' | 'focus' | 'motion' | 'simple' | 'images' | 'identityFirst';

const LABELS: Record<Setting, string> = {
  spacing: 'Reading spacing',
  guide: 'Reading guide',
  focus: 'Stronger focus outline',
  motion: 'Reduce motion',
  simple: 'Simplified page',
  images: 'Hide images',
  identityFirst: 'Identity-first wording',
};
const THEMES = { standard: 'Standard', calm: 'Calm', contrast: 'High contrast', dim: 'Dim' };

/** Each preset sets individual controls, so the visitor can see and undo what changed. */
const PRESETS: Record<string, { label: string; set: Partial<ComfortPrefs> }> = {
  overwhelmed: {
    label: 'I feel overwhelmed',
    set: { theme: 'calm', motion: 'reduced', simple: true },
  },
  reading: { label: 'Reading is hard', set: { spacing: true, text: 130 } },
  seeing: { label: "I can't see clearly", set: { theme: 'contrast', text: 150, focus: 'strong' } },
};

/** Is the switch for this setting "on"? Some settings are stored the other way round. */
function isOn(e: ComfortEffective, key: Setting): boolean {
  if (key === 'motion') return e.motion === 'reduced';
  if (key === 'images') return !e.images;
  if (key === 'focus') return e.focus === 'strong';
  return e[key];
}

function setSwitch(prefs: ComfortPrefs, key: Setting, on: boolean): void {
  if (key === 'motion') prefs.motion = on ? 'reduced' : 'full';
  else if (key === 'images') prefs.images = !on;
  else if (key === 'focus') prefs.focus = on ? 'strong' : 'normal';
  else prefs[key] = on;
}

export function initComfort(): void {
  const api = window.pholosoComfort;
  const dialog = document.querySelector<HTMLDialogElement>('[data-comfort]');
  const openers = document.querySelectorAll<HTMLElement>(
    '[data-comfort-open], [data-open-comfort]',
  );
  if (!api || !dialog || typeof dialog.showModal !== 'function') return;

  let prefs = api.read();
  let lastOpener: HTMLElement | null = null;
  const status = dialog.querySelector<HTMLElement>('[data-comfort-status]');
  const say = (msg: string) => {
    if (status) {
      status.textContent = '';
      window.setTimeout(() => (status.textContent = msg), 50);
    } else announce(msg);
  };

  /** Apply, save, and bring the controls and page wording up to date. */
  function update(save: boolean): ComfortEffective {
    const e = api!.apply(prefs);
    if (save) api!.write(prefs);
    dialog!.querySelectorAll<HTMLInputElement>('input[name="cp-theme"]').forEach((r) => {
      r.checked = r.value === e.theme;
    });
    dialog!.querySelectorAll<HTMLInputElement>('input[name="cp-text"]').forEach((r) => {
      r.checked = r.value === String(e.text);
    });
    dialog!.querySelectorAll<HTMLInputElement>('input[role="switch"]').forEach((s) => {
      s.checked = isOn(e, s.dataset.setting as Setting);
    });
    const rate = dialog!.querySelector<HTMLSelectElement>('#cp-rate');
    if (rate) rate.value = String(e.rate);
    dialog!.querySelectorAll<HTMLElement>('[data-preset]').forEach((b) => {
      const p = PRESETS[b.dataset.preset ?? ''];
      const active =
        !!p &&
        Object.entries(p.set).every(([k, v]) => (e as unknown as Record<string, unknown>)[k] === v);
      b.setAttribute('aria-pressed', String(active));
    });
    applyTerms(e.identityFirst);
    return e;
  }

  // Controls
  dialog.addEventListener('change', (event) => {
    const t = event.target as HTMLInputElement | HTMLSelectElement;
    if (t.name === 'cp-theme') {
      prefs.theme = t.value as NonNullable<ComfortPrefs['theme']>;
      say(`${THEMES[t.value as keyof typeof THEMES]} colours on`);
    } else if (t.name === 'cp-text') {
      prefs.text = Number(t.value) as NonNullable<ComfortPrefs['text']>;
      say(`Text size ${t.value}%`);
    } else if (t.id === 'cp-rate') {
      prefs.rate = Number(t.value) as NonNullable<ComfortPrefs['rate']>;
      say('Voice speed changed');
    } else if (t instanceof HTMLInputElement && t.getAttribute('role') === 'switch') {
      const key = t.dataset.setting as Setting;
      setSwitch(prefs, key, t.checked);
      say(`${LABELS[key]} ${t.checked ? 'on' : 'off'}`);
    } else return;
    update(true);
  });

  dialog.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    // A click on the backdrop (outside the panel) closes it on wide screens only.
    if (target === dialog) {
      const r = dialog.getBoundingClientRect();
      const e = event as MouseEvent;
      const outside =
        e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
      if (outside && window.matchMedia('(min-width: 40rem)').matches) dialog.close();
      return;
    }
    const preset = target.closest<HTMLElement>('[data-preset]');
    if (preset) {
      const p = PRESETS[preset.dataset.preset ?? ''];
      if (!p) return;
      prefs = { ...prefs, ...p.set };
      update(true);
      say(`${p.label}: settings changed. You can adjust each one below.`);
      return;
    }
    if (target.closest('[data-comfort-reset]')) {
      prefs = { v: 1 };
      api.clear();
      update(false);
      say('Settings reset');
      return;
    }
    if (target.closest('[data-comfort-close]')) dialog.close();
  });

  dialog.addEventListener('close', () => {
    (lastOpener ?? document.querySelector<HTMLElement>('[data-comfort-open]'))?.focus();
  });

  openers.forEach((opener) => {
    opener.hidden = false;
    opener.addEventListener('click', (event) => {
      event.preventDefault();
      lastOpener = opener;
      update(false);
      dialog.showModal();
      dialog.querySelector<HTMLElement>('#cp-title')?.focus();
    });
  });

  // Another tab changed the settings
  window.addEventListener('storage', (event) => {
    if (event.key !== 'pholoso-comfort') return;
    prefs = api.read();
    update(false);
  });

  // Device preferences can change while the page is open (e.g. dark mode at sunset)
  [
    '(prefers-reduced-motion: reduce)',
    '(prefers-contrast: more)',
    '(prefers-color-scheme: dark)',
  ].forEach((q) => window.matchMedia(q).addEventListener('change', () => update(false)));

  update(false);
  initReadingGuide();
}

/** The reading guide band follows the pointer, or the focused element when using a keyboard. */
function initReadingGuide(): void {
  const guide = document.createElement('div');
  guide.className = 'reading-guide';
  guide.setAttribute('aria-hidden', 'true');
  document.body.append(guide);
  const place = (y: number) => {
    guide.style.transform = `translateY(${Math.max(0, y - guide.offsetHeight / 2)}px)`;
  };
  document.addEventListener('pointermove', (e) => place(e.clientY), { passive: true });
  document.addEventListener('focusin', (e) => {
    const r = (e.target as HTMLElement).getBoundingClientRect?.();
    if (r) place(r.top + r.height / 2);
  });
}
