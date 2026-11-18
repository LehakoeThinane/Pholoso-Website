/**
 * Wording pairs for the "Identity-first wording" setting.
 *
 * The Foundation's default is person-first ("child with autism"). Visitors can switch to
 * identity-first ("autistic child") in Comfort & access. Always write these phrases with
 * the <Term> component, never as plain text, so the switch reaches every occurrence.
 * See docs/CONTENT-GUIDE.md.
 */
export const terms = {
  'child-with-autism': { pf: 'child with autism', if: 'autistic child' },
  'children-with-autism': { pf: 'children with autism', if: 'autistic children' },
  'person-with-autism': { pf: 'person with autism', if: 'autistic person' },
  'people-with-autism': { pf: 'people with autism', if: 'autistic people' },
  'young-people-with-autism': { pf: 'young people with autism', if: 'autistic young people' },
  'learners-with-autism': { pf: 'learners with autism', if: 'autistic learners' },
  'adults-with-autism': { pf: 'adults with autism', if: 'autistic adults' },
} as const;

export type TermKey = keyof typeof terms;
