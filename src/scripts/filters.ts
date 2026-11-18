/**
 * FilterBar: toggle buttons that show only items with a matching data-category.
 * The bar is hidden without JavaScript, so every item stays visible.
 */
export function initFilters(): void {
  document.querySelectorAll<HTMLElement>('[data-filter-target]').forEach((bar) => {
    const list = document.getElementById(bar.dataset.filterTarget ?? '');
    if (!list) return;
    const items = list.querySelectorAll<HTMLElement>('[data-category]');
    const buttons = bar.querySelectorAll<HTMLButtonElement>('[data-filter]');
    const status = bar.querySelector<HTMLElement>('[data-filter-status]');
    const one = bar.dataset.nounOne ?? 'item';
    const many = bar.dataset.nounMany ?? 'items';

    bar.hidden = false;
    buttons.forEach((button) =>
      button.addEventListener('click', () => {
        const filter = button.dataset.filter ?? 'all';
        buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
        let shown = 0;
        items.forEach((item) => {
          const match = filter === 'all' || item.dataset.category === filter;
          item.hidden = !match;
          if (match) shown++;
        });
        if (status) {
          const label = filter === 'all' ? '' : ` from ${button.textContent?.trim().toLowerCase()}`;
          status.textContent = `Showing ${shown} ${shown === 1 ? one : many}${label}`;
        }
      }),
    );
  });
}
