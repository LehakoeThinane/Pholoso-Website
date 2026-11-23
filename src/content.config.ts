/**
 * Content collections: content that will grow. Each entry is one Markdown file.
 * Adding an entry: copy an existing file in the same folder and edit it. The build checks
 * every file against the schema below and stops with a clear message if a field is wrong.
 * See docs/CONTENT-GUIDE.md.
 */
import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';

/** Story categories, in the order the filter buttons appear. */
export const storyCategories = {
  parents: { label: 'Parent voice', filter: 'Parent' },
  'young-people': { label: 'Young voice', filter: 'Young person' },
  educators: { label: 'Educator voice', filter: 'Educator' },
  professionals: { label: 'Professional voice', filter: 'Professional' },
} as const;

/** The four areas every interest maps to, in display order. */
export const learningAreas = [
  'Numeracy',
  'Language & literacy',
  'Science & the world',
  'Social & emotional',
] as const;

const stories = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/stories' }),
  schema: z.object({
    order: z.number().int(),
    category: z.enum(Object.keys(storyCategories) as [keyof typeof storyCategories]),
    /** The quote, written as the person said it, without quotation marks. */
    quote: z.string().min(10),
    /** Pseudonym and role, e.g. "Thandi, mother of Sipho, 7". */
    who: z.string(),
    misunderstand: z.string(),
    friction: z.string(),
    helps: z.string(),
    change: z.string(),
    /** Shown on the home page as the featured voice (one story only). */
    featured: z.boolean().default(false),
  }),
});

const interests = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/interests' }),
  schema: z.object({
    order: z.number().int(),
    name: z.string(),
    /** Heading shown when the interest is chosen ("Trains as the curriculum") */
    title: z.string(),
    cards: z
      .array(z.object({ area: z.enum(learningAreas), text: z.string() }))
      .length(4)
      .refine((cards) => cards.every((c, i) => c.area === learningAreas[i]), {
        message: `Cards must be in this order: ${learningAreas.join(', ')}`,
      }),
  }),
});

const resources = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/resources' }),
  schema: z.object({
    order: z.number().int(),
    title: z.string(),
    audience: z.string(),
    summary: z.string(),
    /** 'planned' shows a "Coming soon" card; 'published' also gets its own page. */
    status: z.enum(['planned', 'published']),
    /** What a planned card says instead of a link ("Guide in development") */
    soon: z.string().default('Coming soon'),
    /** Required once published: the date the content was last checked. */
    lastChecked: z.coerce.date().optional(),
  }),
});

const faqs = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/faqs' }),
  schema: z.object({
    order: z.number().int(),
    question: z.string(),
    /** Which page shows this question. */
    page: z.enum(['about', 'donate', 'home']),
    /** Also show it on the home page, in this position (questions with page: home use order). */
    home: z.number().int().optional(),
  }),
});

/* ---------- Kids' World (src/content/kids/*.yaml: one file per collection) ---------- */

/** The four "you could…" ideas every Kids' World interest has, in display order. */
export const kidsIdeaAreas = {
  numbers: { label: 'Numbers', icon: 'numbers' },
  words: { label: 'Words', icon: 'words' },
  science: { label: 'Find out', icon: 'science' },
  friends: { label: 'Friends', icon: 'friends' },
} as const;

/** A short, read-aloud-friendly sentence for children. */
const kidsLine = z.string().min(3).max(110);

const kidsInterests = defineCollection({
  loader: file('src/content/kids/interests.yaml'),
  schema: z.object({
    order: z.number().int(),
    name: z.string().max(20),
    icon: z.string(),
    ideas: z.object({
      numbers: kidsLine,
      words: kidsLine,
      science: kidsLine,
      friends: kidsLine,
    }),
  }),
});

const kidsStories = defineCollection({
  loader: file('src/content/kids/stories.yaml'),
  schema: z.object({
    order: z.number().int(),
    title: z.string().max(40),
    child: z.string(),
    panels: z
      .array(z.object({ text: kidsLine, icon: z.string().optional() }))
      .min(4)
      .max(6),
  }),
});

const kidsFacts = defineCollection({
  loader: file('src/content/kids/facts.yaml'),
  schema: z.object({
    text: kidsLine,
    /** Where an editor can check the fact. Required; not shown on the page. */
    source: z.string().min(5),
  }),
});

const kidsFeelings = defineCollection({
  loader: file('src/content/kids/feelings.yaml'),
  schema: z.object({
    order: z.number().int(),
    name: z.string().max(12),
    face: z.string(),
    message: kidsLine,
    idea: kidsLine,
    link: z
      .object({
        href: z.string().startsWith('/', 'Feelings links must stay on this website'),
        label: z.string(),
      })
      .optional(),
  }),
});

/* ---------- Parent Guide (src/content/guides/*.yaml: one file per topic) ---------- */

/** Rough word count, for the "short replies" rule. */
const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

const guideStep = z.object({
  /** Step number: 1 is where the topic starts. Becomes the URL /parent-guide/<topic>/<step>/. */
  step: z.number().int().min(1),
  /** What the guide says. {name}, {Name} and {interest} are swapped for the parent's settings. */
  message: z.string().min(10),
  /** At most three short, practical ideas. */
  suggestions: z.array(z.string()).max(3).default([]),
  /** Pages on this website that go further. */
  learnMore: z
    .array(
      z.object({
        label: z.string(),
        href: z.string().startsWith('/', 'Guide links must stay on this website'),
      }),
    )
    .max(2)
    .default([]),
  /**
   * Two or three answer buttons. `next` is a step number in this topic, another topic's id
   * (its first step), or "home" (the list of topics). The guide adds "Something else" itself.
   */
  choices: z
    .array(z.object({ label: z.string().max(60), next: z.union([z.number().int(), z.string()]) }))
    .min(2)
    .max(3),
});

const guides = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/guides' }),
  schema: z
    .object({
      order: z.number().int(),
      /** The topic button on the guide's opening screen. */
      title: z.string().max(45),
      /** Extra words people might type when looking for this topic (on-device search). */
      keywords: z.array(z.string()).default([]),
      /**
       * false until a qualified professional chosen by the Foundation has approved this topic.
       * Unreviewed topics show "Draft – under review", their pages are kept out of search
       * engines (noindex), and every build lists them in a warning.
       */
      reviewed: z.boolean(),
      /** Who approved it and when, once reviewed (kept for the record; not shown). */
      reviewedBy: z.string().optional(),
      steps: z.array(guideStep).min(3),
    })
    .superRefine((topic, ctx) => {
      const numbers = topic.steps.map((s) => s.step);
      numbers.forEach((n, i) => {
        if (n !== i + 1)
          ctx.addIssue({ code: 'custom', message: `Steps must be numbered 1, 2, 3… in order` });
      });
      for (const s of topic.steps) {
        const count = words([s.message, ...s.suggestions].join(' '));
        if (count > 120)
          ctx.addIssue({
            code: 'custom',
            message: `Step ${s.step} has ${count} words. Keep each reply to about 120 words.`,
          });
        for (const c of s.choices)
          if (typeof c.next === 'number' && !numbers.includes(c.next))
            ctx.addIssue({
              code: 'custom',
              message: `Step ${s.step}: answer "${c.label}" points to step ${c.next}, which does not exist`,
            });
      }
    }),
});

/* ---------- Parent Coach strategy library (src/content/coach-strategies/<topic>/*.md) ---------- */

const coachStrategies = defineCollection({
  loader: glob({ pattern: '*/*.md', base: './src/content/coach-strategies' }),
  schema: z
    .object({
      id: z.string().regex(/^[a-z0-9-]+$/),
      order: z.number().int(),
      title: z.string().max(40),
      /** An illustration name from src/assets/illustrations (e.g. "icons/blocks"). */
      illustration: z.string(),
      summary: z.string(),
      why: z.string(),
      /** The exact short phrase to use every time. */
      sayThis: z.string().max(120),
      /** How to explain the change to the child at a calm time. */
      introduce: z.string(),
      plan: z.object({ calm: z.string(), ends: z.string(), after: z.string() }),
      consistency: z.string(),
      obstacles: z.array(z.object({ title: z.string(), tip: z.string() })).min(1),
      /** When not to use it (contraindications). */
      avoidWhen: z.string(),
      seekHelp: z.string(),
      /**
       * Only 'approved' entries are ever sent to the AI. Approval needs a qualified South
       * African professional chosen by the Foundation (reviewedBy, reviewedOn).
       */
      status: z.enum(['draft', 'approved']),
      reviewedBy: z.string().default(''),
      reviewedOn: z.string().default(''),
    })
    .refine((s) => s.status !== 'approved' || (s.reviewedBy && s.reviewedOn), {
      message: 'An approved strategy needs reviewedBy and reviewedOn',
    }),
});

export const collections = {
  guides,
  coachStrategies,
  stories,
  interests,
  resources,
  faqs,
  kidsInterests,
  kidsStories,
  kidsFacts,
  kidsFeelings,
};
