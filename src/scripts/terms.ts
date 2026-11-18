/**
 * Identity-first wording: swaps every <Term> between its person-first (data-pf) and
 * identity-first (data-if) text. Changing the text itself means screen readers, copy and
 * paste, and "Listen" all get the chosen wording.
 */
export function applyTerms(identityFirst: boolean): void {
  document.querySelectorAll<HTMLElement>('.term[data-pf][data-if]').forEach((el) => {
    const text = identityFirst ? el.dataset.if : el.dataset.pf;
    if (text && el.textContent !== text) el.textContent = text;
  });
  document.documentElement.classList.remove('terms-pending');
}
