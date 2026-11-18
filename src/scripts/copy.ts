/**
 * Copy buttons ([data-copy]): copy a value such as an account number. Shown only when
 * the Clipboard API is available (it needs HTTPS or localhost).
 */
import { announce } from './announce';

export function initCopy(): void {
  if (!navigator.clipboard || !window.isSecureContext) return;
  document.querySelectorAll<HTMLButtonElement>('[data-copy]').forEach((button) => {
    button.hidden = false;
    button.addEventListener('click', async () => {
      const label = button.dataset.copyLabel ?? 'Value';
      try {
        await navigator.clipboard.writeText(button.dataset.copy ?? '');
        announce(`${label} copied`);
        const visible = button.firstChild;
        if (visible && visible.nodeType === Node.TEXT_NODE) {
          visible.textContent = 'Copied';
          window.setTimeout(() => (visible.textContent = 'Copy'), 2500);
        }
      } catch {
        announce(`Could not copy. Please select the ${label.toLowerCase()} and copy it yourself.`);
      }
    });
  });
}
