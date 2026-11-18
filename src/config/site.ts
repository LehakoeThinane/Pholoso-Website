import { z } from 'astro/zod';

/**
 * The single source of truth for facts about the Foundation.
 *
 * - Never invent a value. Unknown values start with "TODO:" and are listed in docs/open-questions.md.
 * - `pnpm build` fails while any "TODO:" remains; `pnpm build:preview` allows them and shows
 *   a "To be confirmed" badge where they appear.
 */

const text = z.string().min(1);
const email = z.union([z.email(), z.string().startsWith('TODO:')]);
const url = z.union([z.url(), z.string().startsWith('TODO:')]);

const siteSchema = z.object({
  name: text,
  shortName: text,
  legalForm: text,
  tagline: text,
  coreIdea: text,
  mission: text,
  url: z.url(),
  email,
  founded: z.number().int(),
  location: text,
  address: text,
  informationOfficer: z.object({
    name: text,
    email,
  }),
  registration: z.object({
    npo: text,
    cipc: text,
    pbo: text,
    section18A: z.boolean(),
  }),
  bank: z.object({
    accountName: text,
    bank: text,
    accountNumber: text,
    branchCode: text,
    accountType: text,
    swift: text,
    referencePrefix: text,
  }),
  partner: z.object({
    name: text,
    shortName: text,
    url,
  }),
  hostingProvider: text,
  stories: z.object({
    /** The confirmed provenance notice shown above the stories (owner to confirm). */
    notice: text,
    /** Shown while `notice` is still a placeholder. */
    interimNotice: text,
  }),
  accessibility: z.object({
    responseTime: text,
    lastReviewed: text,
  }),
  privacy: z.object({
    lastUpdated: text,
  }),
});

export type SiteConfig = z.infer<typeof siteSchema>;

export const site: SiteConfig = siteSchema.parse({
  name: 'Pholoso Afrika Foundation',
  shortName: 'PAF',
  legalForm: 'Registered non-profit company and SARS-approved Public Benefit Organisation',
  tagline: 'Every mind learns differently. Education should be built that way.',
  coreIdea: 'Understand the learner. Adapt the system. Connect the support.',
  mission:
    'Advance inclusive, adaptive, learner-centred education for neurodivergent children in South Africa and Africa.',
  url: 'https://pholoso.africa',
  email: 'know@pholoso.africa',
  founded: 2025,
  location: 'South Africa (we work remotely)',
  address: 'TODO: physical or postal address',
  informationOfficer: {
    name: 'TODO: name of the POPIA Information Officer',
    email: 'know@pholoso.africa',
  },
  registration: {
    npo: '333-132-NPO',
    cipc: '2025/951168/08',
    pbo: '930090077',
    section18A: true,
  },
  bank: {
    accountName: 'Pholoso Afrika Foundation',
    bank: 'TODO: bank name',
    accountNumber: 'TODO: account number',
    branchCode: 'TODO: branch code',
    accountType: 'TODO: account type',
    swift: 'TODO: SWIFT code',
    referencePrefix: 'DONATE',
  },
  partner: {
    name: '2to.iQ (Pty) Ltd',
    shortName: '2to.iQ',
    url: 'https://2toiq.africa',
  },
  hostingProvider: 'GoDaddy',
  stories: {
    // Suggested wording, if the Foundation confirms the stories are composites:
    // "These are composite stories based on common experiences. Names are pseudonyms, and no
    // real child or family can be identified."
    notice:
      'TODO: confirm whether the stories are composites, pseudonymised accounts or real accounts shared with permission, and approve the notice wording',
    interimNotice:
      'We are confirming the source of these stories, their publication permission, and whether the names are pseudonyms. Please contact us with any concern or request to remove a story.',
  },
  accessibility: {
    responseTime:
      'TODO: how quickly accessibility problems will be answered (e.g. "within 5 working days")',
    lastReviewed: '18 November 2026',
  },
  privacy: {
    lastUpdated: '18 November 2026',
  },
});

/** "NPO 333-132-NPO · CIPC 2025/951168/08 · PBO 930090077 (Section 18A approved)" */
export const registrationLine = [
  `NPO ${site.registration.npo}`,
  `CIPC ${site.registration.cipc}`,
  `PBO ${site.registration.pbo}${site.registration.section18A ? ' (Section 18A approved)' : ''}`,
].join(' · ');
