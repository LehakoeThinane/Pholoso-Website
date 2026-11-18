/**
 * Interface wording ("chrome") used by layouts and components, kept in one place so
 * another language can be added later without touching the components.
 * Page content lives in the pages and content collections, not here.
 */
export const lang = 'en-ZA';

export interface NavItem {
  href: string;
  label: string;
}

export const strings = {
  skipLink: 'Skip to main content',
  homeLinkLabel: 'Pholoso Afrika Foundation, home',
  primaryNavLabel: 'Main',
  footerNavLabel: 'Footer',
  menuButton: 'Menu',
  donate: 'Donate',
  externalLink: '(opens another website)',
  toBeConfirmed: 'To be confirmed',
  footer: {
    explore: 'Explore',
    getInvolved: 'Get involved',
    contact: 'Contact us',
    privacy: 'Privacy notice',
    accessibility: 'Accessibility',
  },
} as const;

/** Primary navigation, in order. Donate is rendered separately as a button. */
export const primaryNav: NavItem[] = [
  { href: '/about/', label: 'About us' },
  { href: '/approach/', label: 'Our approach' },
  { href: '/stories/', label: 'Stories' },
  { href: '/get-involved/', label: 'Get involved' },
  { href: '/resources/', label: 'Resources' },
  { href: '/contact/', label: 'Contact' },
];

export const footerExplore: NavItem[] = [
  { href: '/about/', label: 'About us' },
  { href: '/approach/', label: 'Our approach' },
  { href: '/stories/', label: 'Stories' },
  { href: '/resources/', label: 'Resources' },
];

export const footerGetInvolved: NavItem[] = [
  { href: '/donate/', label: 'Donate' },
  { href: '/get-involved/#donors', label: 'Give as an individual' },
  { href: '/get-involved/#partners', label: 'Partner as a company or funder' },
  { href: '/get-involved/#schools', label: 'Schools and educators' },
];
