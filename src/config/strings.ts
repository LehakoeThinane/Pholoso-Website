/**
 * Interface wording ("chrome") used by layouts and components, kept in one place so
 * another language can be added later without touching the components.
 * Page content lives in the pages and content collections, not here.
 */
export const lang = 'en-ZA';

export interface NavItem {
  href: string;
  label: string;
  /** Optional illustration (see src/lib/illustrations.ts), shown before the label. */
  icon?: string;
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
  { href: '/kids/', label: 'Kids’ World', icon: 'mascot/hello' },
  { href: '/about/', label: 'About us' },
  { href: '/approach/', label: 'Our approach' },
  { href: '/stories/', label: 'Stories' },
  { href: '/get-involved/', label: 'Get involved' },
  { href: '/resources/', label: 'Resources' },
  { href: '/contact/', label: 'Contact' },
];

export const footerExplore: NavItem[] = [
  { href: '/kids/', label: 'Kids’ World' },
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

/* ---------- Kids' World ---------- */

/** Background colours for picture buttons and cards (tokens --kids-* in tokens.css). */
export type KidsColour = 'sky' | 'coral' | 'leaf' | 'lilac' | 'sunshine' | 'gold';

export interface KidsNavItem extends NavItem {
  icon: string;
  colour: KidsColour;
}

export const kids = {
  /**
   * The mascot's name. "Pholo" is a placeholder until the Foundation confirms it (it could be
   * chosen by children in a naming competition). Change it here only.
   */
  mascotName: 'Pholo',
  home: { href: '/kids/', label: 'Kids’ World' },
  navLabel: 'Kids’ World',
  grownUps: { href: '/', label: 'For grown-ups' },
  readToMe: 'Read it to me',
  stopReading: 'Stop reading',
  calmToggle: 'Calm colours',
  soundToggle: 'Sounds',
  helpNote: 'Need help now? Tell a grown-up you trust.',
} as const;

/** Kids' World picture buttons, in order. One or two words each. */
export const kidsNav: KidsNavItem[] = [
  { href: '/kids/what-do-you-love/', label: 'What I love', icon: 'icons/heart', colour: 'coral' },
  { href: '/kids/calm-corner/', label: 'Calm corner', icon: 'icons/cloud', colour: 'sky' },
  { href: '/kids/make-and-do/', label: 'Make and do', icon: 'icons/pencil', colour: 'sunshine' },
  { href: '/kids/kids-like-me/', label: 'Kids like me', icon: 'icons/friends', colour: 'leaf' },
  { href: '/kids/gallery/', label: 'Our gallery', icon: 'icons/frame', colour: 'lilac' },
  { href: '/kids/feelings/', label: 'My feelings', icon: 'icons/smile', colour: 'gold' },
];
