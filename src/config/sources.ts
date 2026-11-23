/**
 * Sources and the statistics taken from them. Every statistic on the site comes from here
 * and is shown with its source link. Wording follows the source closely; check the source
 * again before changing a figure. Last checked: 18 November 2026.
 */
export interface Source {
  label: string;
  href: string;
}

export const sources = {
  ajod: {
    label:
      'Chirowamhangu, R. (2024). Inclusive education pandemic: Learning barriers for children with disabilities in South Africa. African Journal of Disability, 13, a1462',
    href: 'https://doi.org/10.4102/ajod.v13i0.1462',
  },
  hrw: {
    label:
      'Human Rights Watch (2015). South Africa: Education Barriers for Children with Disabilities',
    href: 'https://www.hrw.org/news/2015/08/18/south-africa-education-barriers-children-disabilities',
  },
  who: {
    label: 'World Health Organization. Autism fact sheet (updated 17 September 2025)',
    href: 'https://www.who.int/news-room/fact-sheets/detail/autism-spectrum-disorders',
  },
  whitePaper6: {
    label: 'Department of Education (2001). Special Needs Education: Education White Paper 6',
    href: 'https://www.gov.za/documents/white-papers/special-needs-education-education-white-paper-6-01-jul-2001',
  },
} satisfies Record<string, Source>;

export interface Statistic {
  figure: string;
  text: string;
  source: Source & { prefix?: string };
}

export const stats = {
  /** The article's abstract: "previous studies on South Africa have shown that up to 70%…" */
  outOfSchool: {
    figure: '70%',
    text: 'Up to seven in ten school-aged children with disabilities in South Africa are out of school.',
    source: {
      ...sources.ajod,
      label: 'Chirowamhangu (2024), African Journal of Disability',
      prefix: 'According to studies cited in',
    },
  },
  /** WHO: "It is estimated that worldwide in 2021 about 1 in 127 persons had autism." */
  autismWorldwide: {
    figure: 'About 1 in 127',
    text: 'people worldwide had autism in 2021, according to estimates.',
    source: { ...sources.who, label: 'World Health Organization, autism fact sheet (2025)' },
  },
  /** HRW: "An estimated half-a-million children with disabilities have been shut out…" */
  shutOut: {
    figure: 'About half a million',
    text: 'children with disabilities were shut out of South African schools, Human Rights Watch estimated in 2015.',
    source: { ...sources.hrw, label: 'Human Rights Watch (2015)' },
  },
  /** White Paper 6 was published in 2001. "The promise…" is the Foundation's own assessment. */
  policySince: {
    figure: 'Since 2001',
    text: 'South Africa has held an inclusive-education policy. The promise still outpaces the delivery.',
    source: { ...sources.whitePaper6, label: 'Education White Paper 6' },
  },
} satisfies Record<string, Statistic>;
