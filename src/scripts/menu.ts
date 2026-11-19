/**
 * Header menu (components/SiteHeader.astro).
 *
 * - Below 62rem the navigation becomes a disclosure (Menu button + list). Without JavaScript
 *   the full navigation is simply shown.
 * - Menu groups are native <details>, which already open and close by click, Enter and Space,
 *   and work without JavaScript. This adds what people expect from a menu: only one group
 *   open at a time; Escape closes the open group and returns focus to its heading (a second
 *   Escape closes the phone menu); a click elsewhere, or moving focus out of a group, closes it.
 */
export function initMenu(): void {
  const header = document.querySelector<HTMLElement>('.site-header');
  const button = header?.querySelector<HTMLButtonElement>('.site-header__menu-button');
  if (!header) return;
  const groups = [...header.querySelectorAll<HTMLDetailsElement>('[data-nav-group]')];

  const setOpen = (open: boolean) => {
    if (!button) return;
    header.dataset.menu = open ? 'open' : 'closed';
    button.setAttribute('aria-expanded', String(open));
    if (!open) groups.forEach((g) => (g.open = false));
  };

  if (button) {
    button.hidden = false;
    setOpen(false);
    button.addEventListener('click', () => setOpen(header.dataset.menu !== 'open'));
  }

  // Focus also moves when someone taps or clicks. Closing a group at that moment would shrink
  // the phone menu under their finger, so the tap would land on the wrong item. Taps and
  // clicks are handled by the "one group open at a time" rule instead, after they land.
  let pointerActive = false;
  header.addEventListener('pointerdown', () => (pointerActive = true));
  document.addEventListener('pointerup', () => window.setTimeout(() => (pointerActive = false)));

  groups.forEach((group) => {
    group.addEventListener('toggle', () => {
      if (group.open) groups.forEach((other) => other !== group && (other.open = false));
    });
    group.addEventListener('focusout', (event) => {
      if (pointerActive) return;
      const next = event.relatedTarget as Node | null;
      if (next && !group.contains(next)) group.open = false;
    });
  });

  document.addEventListener('click', (event) => {
    const target = event.target as Node;
    groups.forEach((group) => {
      if (group.open && !group.contains(target)) group.open = false;
    });
  });

  header.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const open = groups.find((g) => g.open);
    if (open) {
      open.open = false;
      open.querySelector<HTMLElement>('summary')?.focus();
      return;
    }
    if (button && header.dataset.menu === 'open') {
      setOpen(false);
      button.focus();
    }
  });
}
