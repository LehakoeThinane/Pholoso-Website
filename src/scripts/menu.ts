/**
 * Header menu: below 62rem the navigation becomes a disclosure (button + list).
 * Without JavaScript the full navigation is simply shown. Escape closes the menu and
 * returns focus to the button.
 */
export function initMenu(): void {
  const header = document.querySelector<HTMLElement>('.site-header');
  const button = header?.querySelector<HTMLButtonElement>('.site-header__menu-button');
  if (!header || !button) return;

  const setOpen = (open: boolean) => {
    header.dataset.menu = open ? 'open' : 'closed';
    button.setAttribute('aria-expanded', String(open));
  };

  button.hidden = false;
  setOpen(false);
  button.addEventListener('click', () => setOpen(header.dataset.menu !== 'open'));
  header.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && header.dataset.menu === 'open') {
      setOpen(false);
      button.focus();
    }
  });
}
