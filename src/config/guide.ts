/**
 * Parent Guide settings (pages: src/pages/parent-guide/, topics: src/content/guides/).
 *
 * Phase 1 is a scripted guide written by people. Nothing the parent types or taps is sent
 * anywhere: personal settings stay in the browser, and the free-text box searches this
 * website on the device.
 */
import crisis from '../../public/lib/coach/crisis-words.json';

export const guide = {
  /** Placeholder name: the Foundation may rename it (for example "Ask Pholoso"). */
  name: 'Parent Guide',
  /** localStorage key for the parent's settings (name, child's name, interests). */
  storageKey: 'pholoso-guide',
  /** What {name}, {Name} and {interest} show when the parent has not given them. */
  defaults: { name: 'your child', Name: 'Your child', interest: 'something they love' },
  /** Where "Feedback" and "Report a problem" go: the contact form, with this topic chosen. */
  feedbackHref: '/contact/?topic=general',

  /**
   * Verified, current South African helpline numbers for the "Get help now" card.
   * ONLY the Foundation may add these, after checking each number is current. Never guess.
   * While this list is empty, the card shows general emergency wording and every build warns.
   */
  helplines: [] as { name: string; number: string; when: string }[],

  /**
   * Words that suggest someone may be in danger or need urgent help. If the parent types one,
   * the guide (and the Parent Coach) stops and shows the "Get help now" card. One list for the
   * browser and the server: public/lib/coach/crisis-words.json.
   * Kept broad on purpose: showing the card when it is not needed is far safer than missing it.
   */
  crisisWords: crisis.words,

  /** Pages the free-text box can suggest, with words people might type for each. */
  searchPages: [
    {
      href: '/kids/calm-corner/',
      title: 'The Calm corner (for children)',
      words: 'calm breathing breathe relax quiet anxious worried angry upset',
    },
    {
      href: '/kids/feelings/',
      title: 'How do I feel today? (for children)',
      words: 'feelings emotions feel happy sad worried angry',
    },
    {
      href: '/kids/',
      title: 'Kids’ World',
      words: 'kids children games play activities fun child',
    },
    {
      href: '/kids/make-and-do/',
      title: 'Make and do: printable activities',
      words: 'print printable colouring activities worksheet offline',
    },
    {
      href: '/approach/',
      title: 'Our approach: start with what the child loves',
      words: 'interests interest learning hlompho approach strengths teach',
    },
    {
      href: '/resources/',
      title: 'Resources for families and educators',
      words: 'resources guides checklist reading research articles',
    },
    {
      href: '/stories/',
      title: 'Stories from families and educators',
      words: 'stories parents families experiences alone others',
    },
    {
      href: '/about/#the-gap',
      title: 'The gap between policy and practice',
      words: 'policy rights law government education white paper inclusive',
    },
    {
      href: '/contact/?topic=support',
      title: 'Contact us about support',
      words: 'contact help support talk email question',
    },
    {
      href: '/accessibility/',
      title: 'Accessibility and comfort settings',
      words: 'accessibility text size bigger contrast motion reading',
    },
    {
      href: '/privacy/',
      title: 'Privacy notice',
      words: 'privacy data information popia personal stored',
    },
  ],
} as const;
