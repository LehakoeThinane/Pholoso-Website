/**
 * Polite screen-reader announcements through one shared live region
 * (#announcer in BaseLayout). Clearing first makes repeated messages announce again.
 */
export function announce(message: string): void {
  const region = document.getElementById('announcer');
  if (!region) return;
  region.textContent = '';
  window.setTimeout(() => {
    region.textContent = message;
  }, 50);
}
