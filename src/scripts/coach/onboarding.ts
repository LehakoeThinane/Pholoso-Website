/**
 * Parent Coach onboarding (src/pages/parent-coach/start.astro): one question per screen,
 * with Back, a segmented progress bar plus "Step 2 of 5" as text, Skip and Continue.
 * Continue stays unavailable (aria-disabled, so it can still be reached and explains why)
 * until the step has an answer.
 *
 * Steps: your name → your children → one step per child → an important note → getting ready.
 * Practice mode keeps the answers in this browser tab only (sessionStorage).
 */
import { announce } from '../announce';
import type { Child, Profile } from './types';

const PROFILE = 'pholoso-coach-profile';

export function initOnboarding(): void {
  const root = document.querySelector<HTMLElement>('[data-onboard]');
  if (!root) return;
  const steps = {
    name: root.querySelector<HTMLFormElement>('[data-ob-step="name"]')!,
    kids: root.querySelector<HTMLFormElement>('[data-ob-step="kids"]')!,
    child: root.querySelector<HTMLFormElement>('[data-ob-step="child"]')!,
    note: root.querySelector<HTMLFormElement>('[data-ob-step="note"]')!,
    loading: root.querySelector<HTMLElement>('[data-ob-step="loading"]')!,
  };
  const progress = root.querySelector<HTMLElement>('[data-ob-progress]')!;
  const stepText = root.querySelector<HTMLElement>('[data-ob-steptext]')!;
  const back = root.querySelector<HTMLButtonElement>('[data-ob-back]')!;
  const rows = root.querySelector<HTMLElement>('[data-ob-rows]')!;
  const rowTemplate = root.querySelector<HTMLTemplateElement>('template[data-ob-row]')!;
  const childName = root.querySelectorAll<HTMLElement>('[data-ob-child]');

  const profile: Profile = { parent: '', children: [] };
  /** Where we are: a list of screens, rebuilt when the children change. */
  let screens: { step: keyof typeof steps; child?: number }[] = [];
  let at = 0;
  const rebuild = () => {
    screens = [
      { step: 'name' },
      { step: 'kids' },
      ...profile.children.map((_, i) => ({ step: 'child' as const, child: i })),
      { step: 'note' },
    ];
  };
  rebuild();

  let rowCount = 0;
  const addRow = (focus: boolean) => {
    const row = rowTemplate.content.firstElementChild!.cloneNode(true) as HTMLElement;
    const n = ++rowCount;
    row.querySelectorAll<HTMLInputElement | HTMLLabelElement>('[data-id]').forEach((el) => {
      const id = `${el.dataset.id}-${n}`;
      if (el instanceof HTMLLabelElement) el.htmlFor = id;
      else el.id = id;
    });
    rows.append(row);
    syncRows();
    if (focus) row.querySelector('input')?.focus();
  };
  const syncRows = () => {
    const all = rows.querySelectorAll('[data-ob-remove]');
    all.forEach((b, i) => {
      (b as HTMLButtonElement).hidden = all.length === 1;
      b.querySelector('.visually-hidden')!.textContent = `Remove child ${i + 1}`;
    });
    update();
  };

  const readChildren = (): Child[] =>
    [...rows.querySelectorAll<HTMLElement>('[data-ob-row-item]')]
      .map((r, i) => ({
        name: (r.querySelector<HTMLInputElement>('[data-ob-name]')?.value ?? '').trim(),
        age: (r.querySelector<HTMLInputElement>('[data-ob-age]')?.value ?? '').trim(),
        differences: profile.children[i]?.differences ?? [],
      }))
      .filter((c) => c.name);

  /** Has the current step got an answer? */
  const ready = (): boolean => {
    const s = screens[at]!;
    if (s.step === 'name') return !!steps.name.querySelector('input')!.value.trim();
    if (s.step === 'kids') return readChildren().length > 0;
    if (s.step === 'child') return !!steps.child.querySelector('input:checked');
    return true;
  };
  function update(): void {
    const s = screens[at];
    if (!s) return;
    const form = steps[s.step] as HTMLElement;
    const cont = form.querySelector<HTMLButtonElement>('[data-ob-continue]');
    if (cont) cont.setAttribute('aria-disabled', String(!ready()));
  }

  function show(index: number, focus = true): void {
    at = index;
    const s = screens[at]!;
    Object.values(steps).forEach((el) => (el.hidden = true));
    const el = steps[s.step];
    if (s.step === 'child') {
      const c = profile.children[s.child!]!;
      childName.forEach((n) => (n.textContent = c.name));
      el.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((box) => {
        box.checked = c.differences.includes(box.value);
      });
    }
    el.hidden = false;
    progress.replaceChildren(
      ...screens.map((_, i) => {
        const seg = document.createElement('span');
        seg.className = i <= at ? 'onboard__seg is-done' : 'onboard__seg';
        return seg;
      }),
    );
    stepText.textContent = `Step ${at + 1} of ${screens.length}`;
    update();
    if (focus) el.querySelector<HTMLElement>('h2')?.focus();
  }

  function next(): void {
    const s = screens[at]!;
    if (s.step === 'name') profile.parent = steps.name.querySelector('input')!.value.trim();
    if (s.step === 'kids') {
      profile.children = readChildren();
      rebuild();
    }
    if (s.step === 'child') {
      profile.children[s.child!]!.differences = [
        ...steps.child.querySelectorAll<HTMLInputElement>('input:checked'),
      ].map((b) => b.value);
    }
    show(at + 1);
  }

  // Continue (submit) and Skip
  Object.values(steps).forEach((el) => {
    if (!(el instanceof HTMLFormElement)) return;
    el.addEventListener('submit', (e) => {
      e.preventDefault();
      const s = screens[at]!;
      if (s.step === 'note') return start();
      if (!ready()) {
        announce(
          s.step === 'name'
            ? 'Type a name to continue, or choose Skip.'
            : s.step === 'kids'
              ? 'Add a name to continue, or choose Skip.'
              : 'Choose at least one answer to continue, or choose Skip.',
        );
        return;
      }
      next();
    });
    el.addEventListener('input', update);
    el.addEventListener('change', update);
    el.querySelector('[data-ob-skip]')?.addEventListener('click', () => {
      const s = screens[at]!;
      if (s.step === 'name') profile.parent = '';
      if (s.step === 'kids') {
        profile.children = [];
        rebuild();
      }
      show(at + 1);
    });
  });

  // "None that I know of" clears the other answers, and the others clear it
  steps.child.addEventListener('change', (e) => {
    const box = e.target as HTMLInputElement;
    if (box.type !== 'checkbox' || !box.checked) return;
    steps.child.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((other) => {
      if (other !== box && (box.value === 'none' || other.value === 'none')) other.checked = false;
    });
  });

  root.querySelector('[data-ob-add]')?.addEventListener('click', () => addRow(true));
  rows.addEventListener('click', (e) => {
    const remove = (e.target as Element).closest('[data-ob-remove]');
    if (!remove) return;
    remove.closest('[data-ob-row-item]')?.remove();
    syncRows();
    rows.querySelector('input')?.focus();
  });

  back.addEventListener('click', () => {
    if (at === 0) location.href = '/parent-coach/';
    else show(at - 1);
  });

  function start(): void {
    Object.values(steps).forEach((el) => (el.hidden = true));
    steps.loading.hidden = false;
    back.hidden = true;
    if (root!.dataset.mode === 'live') {
      // Live: the server creates the session and gives it its own address
      fetch('/api/coach/start.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(profile),
      })
        .then((r) => r.json() as Promise<{ ok: boolean; url?: string; message?: string }>)
        .then((r) => {
          if (r.ok && r.url) location.assign(r.url);
          else failed(r.message);
        })
        .catch(() => failed());
      return;
    }
    // Practice: everything stays in this browser tab
    try {
      sessionStorage.setItem(PROFILE, JSON.stringify(profile));
    } catch {
      /* Storage blocked: the chat will ask again */
    }
    window.setTimeout(() => location.assign('/parent-coach/chat/'), 600);
  }

  function failed(
    message = 'The coach could not start just now. Please try again in a moment.',
  ): void {
    steps.loading.hidden = true;
    back.hidden = false;
    show(screens.length - 1);
    announce(message);
    const note = steps.note.querySelector<HTMLElement>('[data-ob-error]');
    if (note) {
      note.textContent = message;
      note.hidden = false;
    }
  }

  addRow(false);
  show(0, false);
}

initOnboarding();
