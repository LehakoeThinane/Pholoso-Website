/**
 * Websites that Kids' World is allowed to link to. Kids' World never links straight to
 * another website: each link goes to an "Ask a grown-up" page first
 * (/kids/ask-a-grown-up/<slug>/), which says where the link goes so a grown-up can decide.
 *
 * To add one: add an entry below, then use <GrownUpLink slug="…"> on the Kids' World page.
 * Only add websites a grown-up at the Foundation has checked are suitable for children:
 * no ads, no chat with strangers, no sign-up needed.
 *
 * scripts/check-dist.mjs fails if any Kids' World page links elsewhere directly.
 */
export interface KidsExternalLink {
  /** Used in the URL: lowercase letters, numbers and hyphens. */
  slug: string;
  url: string;
  /** The website's name, as a child would say it. */
  name: string;
  /** For the grown-up: who runs it and what it is, in one or two sentences. */
  forGrownUps: string;
  /** For the child: what they will find there, in one short sentence. */
  forKids: string;
}

export const kidsExternalLinks: KidsExternalLink[] = [];

export function kidsExternalLink(slug: string): KidsExternalLink {
  const link = kidsExternalLinks.find((l) => l.slug === slug);
  if (!link)
    throw new Error(`Unknown Kids' World external link "${slug}" (src/config/kids-links.ts)`);
  return link;
}
