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

/** A menu heading that opens a short list of related pages (a dropdown in the header). */
export interface NavGroup {
  label: string;
  children: NavItem[];
}

export type NavEntry = NavItem | NavGroup;

export const strings = {
  skipLink: 'Skip to main content',
  homeLinkLabel: 'Pholoso Afrika Foundation, home',
  primaryNavLabel: 'Main',
  footerNavLabel: 'Footer',
  menuButton: 'Menu',
  donate: 'Donate',
  /** Second header button (wide screens), next to Donate. */
  seeHowWeWork: { href: '/approach/', label: 'See how we work' },
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

/**
 * Primary navigation, in order: four entries, so the menu fits on one row between the logo
 * and the Donate button (rendered separately). Groups open a short list of related pages.
 * Every page is also listed in the footer.
 */
export const primaryNav: NavEntry[] = [
  // Kids' World is a floating button now (KidsWorldFloat); "How we work" is the header's
  // "See how we work" button (owner's requests, 24 November 2026)
  { href: '/about/', label: 'About' },
  {
    label: 'Stories & resources',
    children: [
      { href: '/stories/', label: 'Stories' },
      { href: '/resources/', label: 'Resources' },
    ],
  },
  {
    label: 'Get involved',
    children: [
      { href: '/get-involved/', label: 'Ways to help' },
      { href: '/contact/', label: 'Contact us' },
    ],
  },
];

/** The footer's one line of links: the main pages, kept short. */
export const footerLinks: NavItem[] = [
  { href: '/kids/', label: 'Kids’ World' },
  { href: '/about/', label: 'Who we are' },
  { href: '/approach/', label: 'How we work' },
  { href: '/stories/', label: 'Stories' },
  { href: '/resources/', label: 'Resources' },
  { href: '/parent-guide/', label: 'Parent Guide' },
  { href: '/get-involved/', label: 'Get involved' },
  { href: '/donate/', label: 'Donate' },
  { href: '/contact/', label: 'Contact' },
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
