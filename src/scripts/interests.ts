/**
 * InterestExplorer: shows one interest at a time, chosen with toggle buttons.
 * Without JavaScript every interest is shown as its own section.
 */
export function initInterests(): void {
  document.querySelectorAll<HTMLElement>('[data-explorer]').forEach((explorer) => {
    const picker = explorer.querySelector<HTMLElement>('[data-explorer-picker]');
    const buttons = explorer.querySelectorAll<HTMLButtonElement>('[data-interest]');
    const panels = explorer.querySelectorAll<HTMLElement>('[data-interest-panel]');
    const status = explorer.querySelector<HTMLElement>('[data-explorer-status]');
    if (!picker || !buttons.length) return;

    const show = (slug: string, announce: boolean) => {
      buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.interest === slug)));
      panels.forEach((p) => (p.hidden = p.dataset.interestPanel !== slug));
      if (announce && status) {
        const name = explorer.querySelector(`[data-interest="${slug}"]`)?.textContent?.trim();
        status.textContent = `Showing ${name}`;
      }
    };

    picker.hidden = false;
    buttons.forEach((b) => b.addEventListener('click', () => show(b.dataset.interest ?? '', true)));
    show(buttons[0]?.dataset.interest ?? '', false);
    // CSS hid the other panels before the first paint (data-js-hide); hidden takes over.
    panels.forEach((p) => p.removeAttribute('data-js-hide'));
  });
}
