/**
 * Days since 1 January 1970 for a date's local calendar day. Used to pick the daily
 * "Did you know?" fact, at build time (no-JavaScript fallback) and in the browser.
 */
export function dayNumber(date: Date): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
}
